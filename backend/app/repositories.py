import os
import json
from app.models import FaceTemplate, KnownPerson, User, Video, ProcessingLog, UploadBatch, Event, Snapshot, SpeedThreshold
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

    def get_events_by_video_id(self, video_id: int, user_id: int | None = None):
        query = self.db.query(Event).filter(Event.video_id == video_id)
        if user_id is not None:
            query = query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        return (
            query.order_by(Event.timestamp_seconds.asc())
            .all()
        )

    def get_event_by_id(self, event_id: int, user_id: int | None = None):
        query = self.db.query(Event).filter(Event.id == event_id)
        if user_id is not None:
            query = query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        return query.first()

    def get_filtered_events(
        self,
        user_id: int | None = None,
        video_id: int | None = None,
        event_type: str | None = None,
        label: str | None = None,
        is_alert: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ):
        query = self.db.query(Event)

        if user_id is not None:
            query = query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)

        if video_id is not None:
            query = query.filter(Event.video_id == video_id)
        if event_type:
            query = query.filter(Event.event_type == event_type)
        if label:
            query = query.filter(Event.label == label)
        if is_alert is not None:
            query = query.filter(Event.is_alert == is_alert)

        return query.order_by(Event.timestamp_seconds.asc(), Event.id.asc()).offset(offset).limit(limit).all()

    def get_alert_events(self, user_id: int | None = None, limit: int = 50):
        query = self.db.query(Event).filter(Event.is_alert == True)
        if user_id is not None:
            query = query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        return (
            query.order_by(Event.id.desc())
            .limit(limit)
            .all()
        )

    def get_summary_stats(self, user_id: int | None = None):
        events_query = self.db.query(Event)
        videos_query = self.db.query(Video)

        if user_id is not None:
            events_query = events_query.join(Video, Event.video_id == Video.id).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
            videos_query = videos_query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)

        total_events = events_query.with_entities(func.count(Event.id)).scalar() or 0
        total_alerts = events_query.filter(Event.is_alert == True).with_entities(func.count(Event.id)).scalar() or 0
        total_videos = videos_query.with_entities(func.count(Video.id)).scalar() or 0

        type_counts = dict(
            events_query.with_entities(Event.event_type, func.count(Event.id))
            .group_by(Event.event_type)
            .all()
        )

        label_counts = dict(
            events_query.filter(Event.label.isnot(None))
            .with_entities(Event.label, func.count(Event.id))
            .group_by(Event.label)
            .all()
        )

        return {
            "total_events": total_events,
            "total_alerts": total_alerts,
            "total_videos": total_videos,
            "breakdown_by_type": type_counts,
            "breakdown_by_label": label_counts,
        }


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

    def create_video(
        self,
        batch_id: int,
        original_filename: str,
        stored_path: str,
        site_calibration_json: str | None = None,
        calibration_diagnostic_path: str | None = None
    ):
        video = Video(
            batch_id=batch_id,
            original_filename=original_filename,
            stored_path=stored_path,
            site_calibration_json=site_calibration_json,
            calibration_diagnostic_path=calibration_diagnostic_path,
        )
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    def update_video_calibration(
        self,
        video_id: int,
        site_calibration_json: str,
        calibration_diagnostic_path: str | None = None
    ):
        v = self.db.query(Video).filter(Video.id == video_id).first()
        if v:
            v.site_calibration_json = site_calibration_json
            if calibration_diagnostic_path:
                v.calibration_diagnostic_path = calibration_diagnostic_path
            self.db.commit()
            self.db.refresh(v)
        return v

    def get_all_videos(self, user_id: int | None = None):
        query = self.db.query(Video)
        if user_id is not None:
            query = query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        return (
            query.order_by(Video.id.asc())
            .all()
        )

    def get_video_by_id(self, video_id: int, user_id: int | None = None):
        query = self.db.query(Video).filter(Video.id == video_id)
        if user_id is not None:
            query = query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        return query.first()

    def get_videos_by_batch_id(self, batch_id: int):
        return (
            self.db.query(Video)
            .filter(Video.batch_id == batch_id)
            .order_by(Video.id.asc())
            .all()
        )

    def get_all_videos_with_stats(self, user_id: int | None = None):
        """
        Returns all videos joined with processing status, total event count, and alert count.
        Filtered strictly by user_id.
        """
        if user_id is None:
            return []

        query = self.db.query(Video).join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
        videos = query.order_by(Video.id.desc()).all()

        # Map each batch_id to user-specific sequential batch number (1, 2, 3...)
        user_batch_maps = {}  # user_id -> { global_batch_id: sequential_number }
        batch_query = self.db.query(UploadBatch)
        if user_id is not None:
            batch_query = batch_query.filter(UploadBatch.user_id == user_id)
        all_batches = batch_query.order_by(UploadBatch.id.asc()).all()

        for b in all_batches:
            if b.user_id not in user_batch_maps:
                user_batch_maps[b.user_id] = {}
            seq_num = len(user_batch_maps[b.user_id]) + 1
            user_batch_maps[b.user_id][b.id] = seq_num

        result = []
        for v in videos:
            log = self.db.query(ProcessingLog).filter(ProcessingLog.video_id == v.id).first()
            status = log.status if log else "completed"
            message = log.message if log else None
            completed_at = log.completed_at if log else v.uploaded_at

            events = self.db.query(Event).filter(Event.video_id == v.id).all()
            total_events = len(events)
            alert_count = sum(
                1 for e in events
                if e.is_alert or (e.label == "person" and (json.loads(e.metadata_json or "{}")).get("face_match_status") != "known")
            )

            run_thresholds = {"car": 30.0, "motorcycle": 40.0, "truck": 25.0}
            batch = self.db.query(UploadBatch).filter(UploadBatch.id == v.batch_id).first()
            if batch:
                st_records = self.db.query(SpeedThreshold).filter(SpeedThreshold.user_id == batch.user_id).all()
                for rec in st_records:
                    run_thresholds[rec.vehicle_category] = float(rec.limit_kmh)

            for e in events:
                if e.metadata_json and e.label in run_thresholds:
                    try:
                        m = json.loads(e.metadata_json)
                        if "speed_limit_kmh" in m and m["speed_limit_kmh"] is not None:
                            run_thresholds[e.label] = float(m["speed_limit_kmh"])
                    except Exception:
                        pass

            user_seq_batch_num = v.batch_id
            if batch and batch.user_id in user_batch_maps and v.batch_id in user_batch_maps[batch.user_id]:
                user_seq_batch_num = user_batch_maps[batch.user_id][v.batch_id]

            has_standalone_site_calibration = bool(v.calibration_diagnostic_path)

            site_calib = None
            is_active_profile_fallback = False

            if v.site_calibration_json:
                try:
                    site_calib = json.loads(v.site_calibration_json)
                except Exception:
                    pass
            else:
                # Video was uploaded without auto-calibration: fallback to active account camera calibration profile
                from app.config_routes import get_camera_calibration_config
                active_config = get_camera_calibration_config(self.db, user_id=user_id)
                site_calib = active_config
                is_active_profile_fallback = True

            diag_url = f"/api/videos/{v.id}/calibration-diagnostic"

            result.append({
                "video_id": v.id,
                "batch_id": v.batch_id,
                "batch_number": user_seq_batch_num,
                "original_filename": v.original_filename,
                "stored_path": v.stored_path,
                "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
                "status": status,
                "message": message,
                "completed_at": completed_at.isoformat() if completed_at else None,
                "total_events": total_events,
                "alert_count": alert_count,
                "run_thresholds": run_thresholds,
                "site_calibration": site_calib,
                "calibration_diagnostic_url": diag_url,
                "has_standalone_site_calibration": has_standalone_site_calibration,
                "is_active_profile_fallback": is_active_profile_fallback,
            })
        return result

    def delete_video_cascade(self, video_id: int, user_id: int | None = None) -> bool:
        """
        Deletes a video record and permanently unlinks all snapshot images and related DB rows.
        """
        v = self.get_video_by_id(video_id, user_id=user_id)
        if not v:
            return False

        # 1. Fetch all events for video
        events = self.db.query(Event).filter(Event.video_id == video_id).all()
        event_ids = [e.id for e in events]

        # 2. Unlink snapshot files from disk & delete snapshot records
        if event_ids:
            snapshots = self.db.query(Snapshot).filter(Snapshot.event_id.in_(event_ids)).all()
            for s in snapshots:
                if s.file_path and os.path.exists(s.file_path):
                    try:
                        os.remove(s.file_path)
                    except Exception as err:
                        print(f"Could not remove snapshot file {s.file_path}: {err}")
                self.db.delete(s)

            # 3. Delete events
            for e in events:
                self.db.delete(e)

        # 4. Delete processing logs
        logs = self.db.query(ProcessingLog).filter(ProcessingLog.video_id == video_id).all()
        for log in logs:
            self.db.delete(log)

        # 5. Delete stored video file if exists
        if v.stored_path and os.path.exists(v.stored_path):
            try:
                os.remove(v.stored_path)
            except Exception as err:
                print(f"Could not remove video file {v.stored_path}: {err}")

        # 6. Delete video record
        self.db.delete(v)
        self.db.commit()
        return True

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


class SpeedThresholdRepository:
    def __init__(self, db_session):
        self.db = db_session

    def get_thresholds_for_user(self, user_id: int):
        return (
            self.db.query(SpeedThreshold)
            .filter(SpeedThreshold.user_id == user_id)
            .all()
        )

    def get_threshold_map(self, user_id: int) -> dict:
        records = self.get_thresholds_for_user(user_id)
        defaults = {"car": 30.0, "motorcycle": 40.0, "truck": 25.0}
        for rec in records:
            defaults[rec.vehicle_category] = float(rec.limit_kmh)
        return defaults

    def set_threshold_for_user(self, user_id: int, vehicle_category: str, limit_kmh: float):
        record = (
            self.db.query(SpeedThreshold)
            .filter(
                SpeedThreshold.user_id == user_id,
                SpeedThreshold.vehicle_category == vehicle_category,
            )
            .first()
        )
        if record:
            record.limit_kmh = limit_kmh
        else:
            record = SpeedThreshold(
                user_id=user_id,
                vehicle_category=vehicle_category,
                limit_kmh=limit_kmh,
            )
            self.db.add(record)

        self.db.commit()
        self.db.refresh(record)
        return record