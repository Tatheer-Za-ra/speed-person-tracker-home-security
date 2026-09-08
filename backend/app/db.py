from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import Config

engine = create_engine(
    Config.DATABASE_URL,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True
)

Base = declarative_base()


def get_db_session():
    return SessionLocal()


def check_and_migrate_db():
    """Ensure newly added columns exist in the SQLite database without dropping tables."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check existing columns in 'videos' table
            result = conn.execute(text("PRAGMA table_info(videos)"))
            existing_cols = {row[1] for row in result.fetchall()}

            if existing_cols:
                if "recording_start_time" not in existing_cols:
                    conn.execute(text("ALTER TABLE videos ADD COLUMN recording_start_time DATETIME"))
                    print("[DB Migration] Added column 'recording_start_time' to 'videos' table.")
                if "duration_seconds" not in existing_cols:
                    conn.execute(text("ALTER TABLE videos ADD COLUMN duration_seconds FLOAT"))
                    print("[DB Migration] Added column 'duration_seconds' to 'videos' table.")
                conn.commit()
    except Exception as e:
        print(f"[DB Migration] Notice: migration check encountered: {e}")