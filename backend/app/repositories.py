from app.models import FaceTemplate, KnownPerson, User ,Video,ProcessingLog,UploadBatch,Event, Snapshot, Video
from sqlalchemy import func

class UserRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()

    def create_user(self, name: str, email: str, password_hash: str):
        user = User(name=name, email=email, password_hash=password_hash)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

class KnownPersonRepository:
    def __init__(self, db_session):
        self.db = db_session

    def list_all_for_user(self, user_id: int):
        return (
            self.db.query(KnownPerson)
            .filter(KnownPerson.user_id == user_id)
            .order_by(KnownPerson.id.desc())
            .all()
        )

    def get_by_id_for_user(self, person_id: int, user_id: int):
        return (
            self.db.query(KnownPerson)
            .filter(
                KnownPerson.id == person_id,
                KnownPerson.user_id == user_id,
            )
            .first()
        )

    def find_duplicate(self, image_hash: str, exclude_id: int | None = None):
        query = self.db.query(KnownPerson).filter(
            KnownPerson.image_hash == image_hash)

        if exclude_id is not None:
            query = query.filter(KnownPerson.id != exclude_id)

        return query.first()
    
    def create_person(self, user_id: int, name: str, category: str | None, image_path: str, image_hash: str):
        person = KnownPerson(
            user_id=user_id,
            name=name,
            category=category,
            image_path=image_path,
            image_hash=image_hash,
        )
        self.db.add(person)
        self.db.commit()
        self.db.refresh(person)
        return person

    def update_person(self, person, name: str, category: str | None, image_path: str | None = None, image_hash: str | None = None):
        person.name = name
        person.category = category

        if image_path is not None:
            person.image_path = image_path

        if image_hash is not None:
            person.image_hash = image_hash

        self.db.commit()
        self.db.refresh(person)
        return person

    def delete_person(self, person):
        self.db.delete(person)
        self.db.commit()

from app.db import SessionLocal

class EventRepository:
    def __init__(self, db_session=None):
        self.db = db_session or SessionLocal()

    def create_event(
        self,
        video_id: int,
        event_type: str,
        timestamp_seconds: float,
        track_id: int | None = None,
        label: str | None = None,
        confidence: float | None = None,
        metadata_json: str | None = None,
        is_alert: bool = False,
    ):
        event = Event(
            video_id=video_id,
            track_id=track_id,
            event_type=event_type,
            label=label,
            timestamp_seconds=timestamp_seconds,
            confidence=confidence,
            metadata_json=metadata_json,
            is_alert=is_alert,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_events_by_video_id(self, video_id: int):
        return (
            self.db.query(Event)
            .filter(Event.video_id == video_id)
            .order_by(Event.timestamp_seconds.asc())
            .all()
        )

    def get_event_by_id(self, event_id: int):
        return (
            self.db.query(Event)
            .filter(Event.id == event_id)
            .first()
        )


class ProcessingLogRepository:
    def __init__(self, db_session=None):
        self.db = db_session or SessionLocal()

    def create_log(
        self,
        video_id: int,
        status: str = "queued",
        message: str | None = None,
    ):
        log = ProcessingLog(
            video_id=video_id,
            status=status,
            message=message,
        )

        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_log_by_video_id(self, video_id: int):
        return (
            self.db.query(ProcessingLog)
            .filter(ProcessingLog.video_id == video_id)
            .first()
        )

    def get_all_logs(self):
        return (
            self.db.query(ProcessingLog)
            .order_by(ProcessingLog.id.desc())
            .all()
        )

class VideoRepository:
    def __init__(self, db_session=None):
        self.db = db_session or SessionLocal()

    def create_video(self, batch_id: int, original_filename: str, stored_path: str):
        video = Video(
        batch_id=batch_id,
        original_filename=original_filename,
        stored_path=stored_path,
        )
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    

    def get_all_videos(self):
        return (
            self.db.query(Video)
            .order_by(Video.id.asc())
            .all()
        )

    def get_video_by_id(self, video_id: int):
        return (
            self.db.query(Video)
            .filter(Video.id == video_id)
            .first()
        )
    def get_videos_by_batch_id(self, batch_id: int):
        return (
        self.db.query(Video)
        .filter(Video.batch_id == batch_id)
        .order_by(Video.id.asc())
        .all()
    )

class UploadBatchRepository:
    def __init__(self, db_session):
        self.db = db_session

    def create_batch(self, user_id: int):
        batch = UploadBatch(user_id=user_id)
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def get_latest_batch_for_user(self, user_id: int):
        return (
            self.db.query(UploadBatch)
            .filter(UploadBatch.user_id == user_id)
            .order_by(UploadBatch.id.desc())
            .first()
        )

class FaceTemplateRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_by_person_id(self, known_person_id: int):
        return (
            self.db.query(FaceTemplate)
            .filter(FaceTemplate.known_person_id == known_person_id)
            .first()
        )

    def upsert_template(self, known_person_id: int, embedding_data: str):
        template = self.get_by_person_id(known_person_id)

        if template:
            template.embedding_data = embedding_data
        else:
            template = FaceTemplate(
                known_person_id=known_person_id,
                embedding_data=embedding_data,
            )
            self.db.add(template)

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_by_person_id(self, known_person_id: int):
        template = self.get_by_person_id(known_person_id)
        if template:
            self.db.delete(template)
            self.db.commit()

    def list_all_templates(self):
        return (
            self.db.query(FaceTemplate)
            .order_by(FaceTemplate.id.asc())
            .all()
        )

    def get_templates_by_user_id(self, user_id: int):
        return (
            self.db.query(FaceTemplate)
            .join(KnownPerson, FaceTemplate.known_person_id == KnownPerson.id)
            .filter(KnownPerson.user_id == user_id)
            .all()
        )

    def get_templates_for_user(self, user_id: int):
        return (
            self.db.query(FaceTemplate)
            .join(KnownPerson, FaceTemplate.known_person_id == KnownPerson.id)
            .filter(KnownPerson.user_id == user_id)
            .all()
        )
    
class SnapshotRepository:
    def __init__(self, db_session=None):
        self.db = db_session or SessionLocal()

    def create_snapshot(self, event_id: int, file_path: str):
        snapshot = Snapshot(
            event_id=event_id,
            file_path=file_path,
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def get_snapshot_by_event_id(self, event_id: int):
        return (
            self.db.query(Snapshot)
            .filter(Snapshot.event_id == event_id)
            .first()
        )
   