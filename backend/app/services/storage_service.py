import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
HISTORY_FILE = DATA_DIR / "history.json"

class StorageService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.cache: Dict[str, Dict[str, Any]] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            if "id" in item:
                                self.cache[item["id"]] = item
                    elif isinstance(data, dict):
                        self.cache = data
            except Exception as e:
                print(f"[StorageService] Failed to load history: {e}")
                self.cache = {}

    def _save_to_disk(self):
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                # Save as list ordered by creation time
                items = list(self.cache.values())
                json.dump(items, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[StorageService] Failed to persist history: {e}")

    def save(self, analysis_id: str, record: Dict[str, Any]):
        self.cache[analysis_id] = record
        self._save_to_disk()

    def get_all(self, limit: int = 50) -> List[Dict[str, Any]]:
        # Sort by created_at descending
        items = list(self.cache.values())
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items[:limit]

    def get_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        return self.cache.get(analysis_id)

    def delete(self, analysis_id: str) -> bool:
        if analysis_id in self.cache:
            del self.cache[analysis_id]
            self._save_to_disk()
            return True
        return False

    def clear(self) -> bool:
        self.cache.clear()
        self._save_to_disk()
        return True

storage_service = StorageService()
