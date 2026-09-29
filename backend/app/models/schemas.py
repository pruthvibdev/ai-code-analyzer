from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class CodeIssue(BaseModel):
    severity: Literal["critical", "warning", "suggestion"] = "warning"
    title: str
    description: str
    line: Optional[int] = None
    column: Optional[int] = None
    rule_id: Optional[str] = None

class CodeSuggestion(BaseModel):
    title: str
    description: str

class AnalysisMetrics(BaseModel):
    lines_of_code: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    cyclomatic_complexity: int = 1
    max_nesting_depth: int = 0
    loop_count: int = 0
    function_count: int = 0
    class_count: int = 0
    recursion_detected: bool = False

class AnalyzeRequest(BaseModel):
    code: str = Field(..., max_length=100000, description="Source code to analyze")
    language: str = Field(default="python", description="Language of source code (python, javascript, java, cpp)")
    api_key: Optional[str] = Field(default=None, description="Optional user-provided Gemini API key")

class AnalyzeResponse(BaseModel):
    id: Optional[str] = None
    language: str
    code: Optional[str] = None
    time_complexity: str = "O(1)"
    space_complexity: str = "O(1)"
    time_complexity_optimized: Optional[str] = None
    space_complexity_optimized: Optional[str] = None
    quality_score: int = Field(ge=0, le=100, default=85)
    summary: str
    issues: List[CodeIssue] = []
    suggestions: List[CodeSuggestion] = []
    metrics: AnalysisMetrics = AnalysisMetrics()
    optimized_code: Optional[str] = None
    optimization_explanation: Optional[str] = None
    confidence: float = 0.90
    is_ai_assisted: bool = False
    static_analysis_notice: Optional[str] = None
    created_at: Optional[str] = None

class AnalysisHistoryItem(BaseModel):
    id: str
    language: str
    title: str
    quality_score: int
    time_complexity: str
    space_complexity: str
    created_at: str
    preview_code: str
    lines_of_code: Optional[int] = 0

class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    ai_configured: bool
    database_status: str
    history_count: Optional[int] = 0
