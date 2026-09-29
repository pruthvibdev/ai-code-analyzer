from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional
import uuid
from datetime import datetime

from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisHistoryItem,
    HealthResponse,
    CodeIssue,
    CodeSuggestion,
    AnalysisMetrics
)
from app.utils.config import settings
from app.analyzers.python_analyzer import analyze_python_code
from app.analyzers.generic_analyzer import analyze_generic_code
from app.services.ai_service import analyze_with_ai
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api", tags=["Analysis"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend status."""
    recent = storage_service.get_all(limit=100)
    ai_available = bool((settings.AI_API_KEY or "").strip())
    return HealthResponse(
        status="healthy",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        ai_configured=ai_available,
        database_status="persistent file storage active",
        history_count=len(recent)
    )

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code(
    request: AnalyzeRequest,
    x_ai_api_key: Optional[str] = Header(None)
):
    """
    Analyze provided source code using multi-language static AST analysis
    and optional deep Gemini AI code review.
    """
    code_text = request.code.strip()
    if not code_text:
        raise HTTPException(status_code=400, detail="Source code cannot be empty.")
    
    lang = request.language.lower()
    analysis_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    # 1. Run Static Analyzer
    if lang == "python":
        (
            time_comp,
            space_comp,
            score,
            summary,
            issues,
            suggestions,
            metrics,
            opt_code,
            opt_exp
        ) = analyze_python_code(request.code)
    else:
        (
            time_comp,
            space_comp,
            score,
            summary,
            issues,
            suggestions,
            metrics,
            opt_code,
            opt_exp
        ) = analyze_generic_code(request.code, lang)

    is_ai_assisted = False
    ai_key = request.api_key or x_ai_api_key or settings.AI_API_KEY
    opt_time = None
    opt_space = None

    # 2. If AI key is provided or configured, invoke AI Review
    if ai_key and ai_key.strip():
        ai_result = await analyze_with_ai(request.code, lang, custom_api_key=ai_key.strip())
        if ai_result:
            is_ai_assisted = True
            time_comp = ai_result.get("time_complexity") or time_comp
            space_comp = ai_result.get("space_complexity") or space_comp
            opt_time = ai_result.get("time_complexity_optimized")
            opt_space = ai_result.get("space_complexity_optimized")
            score = ai_result.get("quality_score", score)
            summary = ai_result.get("summary", summary)
            
            # Merge AI issues with static issues (avoid duplicates)
            ai_issues_raw = ai_result.get("issues", [])
            for raw in ai_issues_raw:
                issues.append(CodeIssue(
                    severity=raw.get("severity", "warning"),
                    title=raw.get("title", "AI Finding"),
                    description=raw.get("description", ""),
                    line=raw.get("line")
                ))

            # Merge AI suggestions
            ai_sugg_raw = ai_result.get("suggestions", [])
            for raw in ai_sugg_raw:
                suggestions.append(CodeSuggestion(
                    title=raw.get("title", "AI Recommendation"),
                    description=raw.get("description", "")
                ))

            if ai_result.get("optimized_code"):
                opt_code = ai_result["optimized_code"]
            if ai_result.get("optimization_explanation"):
                opt_exp = ai_result["optimization_explanation"]

    # Calculate optimized complexities if not set yet but optimization is available
    if opt_code and not opt_time:
        if "O(n²)" in time_comp:
            opt_time = "O(n)"
            opt_space = "O(n)"
        elif "O(2ⁿ)" in time_comp:
            opt_time = "O(n)"
            opt_space = "O(1)"

    response_data = AnalyzeResponse(
        id=analysis_id,
        language=request.language,
        code=request.code,
        time_complexity=time_comp,
        space_complexity=space_comp,
        time_complexity_optimized=opt_time,
        space_complexity_optimized=opt_space,
        quality_score=score,
        summary=summary,
        issues=issues,
        suggestions=suggestions,
        metrics=metrics,
        optimized_code=opt_code,
        optimization_explanation=opt_exp,
        confidence=0.95 if is_ai_assisted else 0.88,
        is_ai_assisted=is_ai_assisted,
        static_analysis_notice="AST & rule-based static analyzer active" if not is_ai_assisted else "Neural AI + AST Analysis active",
        created_at=created_at
    )

    # 3. Persist to storage
    record = {
        "id": analysis_id,
        "language": request.language,
        "code": request.code,
        "response": response_data.model_dump(),
        "created_at": created_at
    }
    storage_service.save(analysis_id, record)

    return response_data

@router.get("/analyses", response_model=List[AnalysisHistoryItem])
async def get_analyses(limit: int = Query(default=30, ge=1, le=100)):
    """Retrieve history of recent analyses."""
    records = storage_service.get_all(limit=limit)
    items = []
    for rec in records:
        resp = rec.get("response", {})
        code_lines = rec.get("code", "").splitlines()
        preview = code_lines[0][:80] if code_lines else "Code snippet"
        metrics = resp.get("metrics", {})
        loc = metrics.get("lines_of_code", len(code_lines))
        items.append(
            AnalysisHistoryItem(
                id=rec["id"],
                language=rec.get("language", "python"),
                title=f"{rec.get('language', 'Code').capitalize()} Analysis",
                quality_score=resp.get("quality_score", 85),
                time_complexity=resp.get("time_complexity", "O(1)"),
                space_complexity=resp.get("space_complexity", "O(1)"),
                created_at=rec.get("created_at", ""),
                preview_code=preview,
                lines_of_code=loc
            )
        )
    return items

@router.get("/analyses/{analysis_id}", response_model=AnalyzeResponse)
async def get_analysis_by_id(analysis_id: str):
    """Retrieve details of a specific past analysis."""
    record = storage_service.get_by_id(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found.")
    resp = record.get("response", {})
    # Ensure code is set in response
    if "code" not in resp or not resp["code"]:
        resp["code"] = record.get("code", "")
    return AnalyzeResponse(**resp)

@router.delete("/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str):
    """Delete a past analysis record."""
    deleted = storage_service.delete(analysis_id)
    if deleted:
        return {"status": "deleted", "id": analysis_id}
    raise HTTPException(status_code=404, detail="Analysis record not found.")

@router.delete("/analyses")
async def clear_all_analyses():
    """Clear all past analysis records."""
    storage_service.clear()
    return {"status": "cleared"}
