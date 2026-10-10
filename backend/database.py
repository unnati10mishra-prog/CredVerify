import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "credverify.db")


def get_db():
    """SQLite connection dependency for FastAPI routes."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # enables row['ColumnName'] access
    conn.execute("PRAGMA foreign_keys = ON") # enforce FK constraints
    try:
        yield conn
    finally:
        conn.close()
