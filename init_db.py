"""Database initialization.

Usage:
    python init_db.py

Creates all tables and the filesystem cache directory. For schema changes in
production, prefer Flask-Migrate: flask db init / flask db migrate / flask db upgrade
"""
import os

from app import app
from extensions import db

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    with app.app_context():
        db.create_all()
        print("Database tables created.")
        print("Cache directory ready.")


if __name__ == "__main__":
    main()