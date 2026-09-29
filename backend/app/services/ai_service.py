import json
import httpx
from typing import Optional, Dict, Any
from app.utils.config import settings

AI_PROMPT_TEMPLATE = """You are an expert algorithmic code reviewer, compiler engineer, and performance optimizer.
Analyze the following {language} code thoroughly.

Return ONLY a valid JSON object matching this exact structure:
{{
  "time_complexity": "e.g. O(n^2) or O(n log n)",
  "space_complexity": "e.g. O(1) or O(n)",
  "time_complexity_optimized": "e.g. O(n)",
  "space_complexity_optimized": "e.g. O(n)",
  "quality_score": 85,
  "summary": "Brief executive review of the code's efficiency, style, and correctness.",
  "issues": [
    {{
      "severity": "critical" | "warning" | "suggestion",
      "title": "Short title",
      "description": "Specific issue description",
      "line": 1
    }}
  ],
  "suggestions": [
    {{
      "title": "Suggestion Title",
      "description": "Remediation or best practice advice"
    }}
  ],
  "optimized_code": "Complete refactored, idiomatic, and highly efficient code version",
  "optimization_explanation": "Detailed explanation of what algorithmic or structural improvements were made and why complexity changed."
}}

Source code to review:
```{language}
{code}
```
"""

async def analyze_with_ai(code: str, language: str, custom_api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    api_key = (custom_api_key or settings.AI_API_KEY or "").strip()
    if not api_key:
        return None

    model_name = settings.AI_MODEL or "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    prompt = AI_PROMPT_TEMPLATE.format(language=language, code=code)

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"[AIService] Gemini API error: {resp.status_code} - {resp.text}")
                return None
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean possible markdown fence
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            parsed = json.loads(content.strip())
            return parsed
    except Exception as e:
        print(f"[AIService] AI Analysis failed or timed out: {e}")
        return None
