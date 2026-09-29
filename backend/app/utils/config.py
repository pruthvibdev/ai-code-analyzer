import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "CodeLens AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # AI Configuration
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-2.0-flash"
    
    # MongoDB Configuration
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "codelens_ai"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
