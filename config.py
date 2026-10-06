import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # ------------------------------------------------------------------
    # Core / session
    # ------------------------------------------------------------------
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-only-insecure-key")
    WTF_CSRF_TIME_LIMIT = None  # tokens never expire (long-lived sessions)

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///streamsense.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # ------------------------------------------------------------------
    # External APIs
    # ------------------------------------------------------------------
    TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
    OMDB_API_KEY = os.environ.get("OMDB_API_KEY")

    # ------------------------------------------------------------------
    # Caching (Flask-Caching)
    # ------------------------------------------------------------------
    CACHE_TYPE = os.environ.get("CACHE_TYPE", "FileSystemCache")
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get("CACHE_DEFAULT_TIMEOUT", "600"))
    CACHE_DIR = os.path.join(BASE_DIR, "cache")

    # Production option — switch with: CACHE_TYPE=RedisCache
    # CACHE_REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ------------------------------------------------------------------
    # Rate limiting (Flask-Limiter)
    # ------------------------------------------------------------------
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_STRATEGY = "moving-window"
    RATELIMIT_DEFAULT = "300 per minute"

    # ------------------------------------------------------------------
    # Security
    # ------------------------------------------------------------------
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB upload cap

    @classmethod
    def validate(cls):
        missing = [
            name for name in ("TMDB_API_KEY", "OMDB_API_KEY")
            if not getattr(cls, name)
        ]
        if missing:
            raise RuntimeError(
                f"Missing required environment variable(s): {', '.join(missing)}. "
                "Copy .env.example to .env and fill in real values."
            )