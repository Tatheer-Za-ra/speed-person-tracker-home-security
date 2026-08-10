from app.db import Base, engine
from app.models import (
    User,
    KnownPerson,
    FaceTemplate,
    Config,
    Video,
    ProcessingLog,
    Event,
    Snapshot,
    UploadBatch
)


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully.")


if __name__ == "__main__":
    init_db()