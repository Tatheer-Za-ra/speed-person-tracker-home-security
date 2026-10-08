# backend/app/retention_service.py

import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.models import Config, Video, UploadBatch
from app.repositories import VideoRepository


DEFAULT_RETENTION_DAYS = 30


def get_retention_settings(db_session, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Retrieves current retention policy configuration & storage stats for user."""
    days_key = f"retention_days_user_{user_id}" if user_id else "retention_days"
    cleanup_key = f"last_cleanup_at_user_{user_id}" if user_id else "last_cleanup_at"

    days_item = db_session.query(Config).filter(Config.key == days_key).first()
    cleanup_item = db_session.query(Config).filter(Config.key == cleanup_key).first()

    retention_days = int(days_item.value) if days_item and days_item.value.isdigit() else DEFAULT_RETENTION_DAYS
    last_cleanup_at = cleanup_item.value if cleanup_item else None

    # Count total videos in database for user
    video_query = db_session.query(Video)
    if user_id is not None:
        video_query = video_query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
    total_videos = video_query.count()

    return {
        "retention_days": retention_days,
        "last_cleanup_at": last_cleanup_at,
        "total_videos": total_videos,
    }


def update_retention_settings(db_session, retention_days: int, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Updates retention policy days threshold in config table."""
    if retention_days < 0:
        raise ValueError("Retention days threshold must be non-negative (0 to disable).")

    days_key = f"retention_days_user_{user_id}" if user_id else "retention_days"
    days_item = db_session.query(Config).filter(Config.key == days_key).first()
    if days_item:
        days_item.value = str(retention_days)
    else:
        days_item = Config(key=days_key, value=str(retention_days))
        db_session.add(days_item)

    db_session.commit()
    return get_retention_settings(db_session, user_id=user_id)


def run_retention_cleanup(db_session, explicit_days: Optional[int] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Executes automated data retention cleanup:
    Purges video runs, timeline events, and unlinks snapshot files older than retention_days.
    """
    settings = get_retention_settings(db_session, user_id=user_id)
    retention_days = explicit_days if explicit_days is not None else settings["retention_days"]

    if retention_days <= 0:
        return {
            "status": "skipped",
            "message": "Retention cleanup is disabled (retention_days = 0).",
            "purged_videos": 0,
            "retention_days": 0,
        }

    cutoff_date = datetime.now() - timedelta(days=retention_days)
    video_repo = VideoRepository(db_session)

    # Find videos uploaded prior to cutoff date
    video_query = db_session.query(Video).filter(Video.uploaded_at < cutoff_date)
    if user_id is not None:
        video_query = video_query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
    old_videos = video_query.all()

    purged_count = 0
    for v in old_videos:
        success = video_repo.delete_video_cascade(v.id, user_id=user_id)
        if success:
            purged_count += 1

    # Record execution timestamp
    now_str = datetime.now().isoformat()
    cleanup_key = f"last_cleanup_at_user_{user_id}" if user_id else "last_cleanup_at"
    cleanup_item = db_session.query(Config).filter(Config.key == cleanup_key).first()
    if cleanup_item:
        cleanup_item.value = now_str
    else:
        cleanup_item = Config(key=cleanup_key, value=now_str)
        db_session.add(cleanup_item)

    db_session.commit()

    return {
        "status": "success",
        "message": f"Storage retention cleanup complete. Purged {purged_count} video runs older than {retention_days} days.",
        "purged_videos": purged_count,
        "retention_days": retention_days,
        "cutoff_date": cutoff_date.isoformat(),
        "last_cleanup_at": now_str,
    }


def get_retention_warning_info(db_session, user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Checks if any videos will reach the user's auto-purge retention threshold
    within the next 24 hours (or are already overdue for the next purge cycle).
    """
    settings = get_retention_settings(db_session, user_id=user_id)
    retention_days = settings.get("retention_days", 0)

    if retention_days <= 0:
        return {
            "has_warning": False,
            "retention_days": 0,
            "expiring_count": 0,
            "expiring_videos": [],
            "message": "",
        }

    now = datetime.now()
    video_query = db_session.query(Video)
    if user_id is not None:
        video_query = video_query.join(UploadBatch, Video.batch_id == UploadBatch.id).filter(UploadBatch.user_id == user_id)
    all_videos = video_query.all()

    expiring_videos = []
    for v in all_videos:
        if not v.uploaded_at:
            continue
        expiry_dt = v.uploaded_at + timedelta(days=retention_days)
        time_until_purge = expiry_dt - now
        hours_until_purge = time_until_purge.total_seconds() / 3600.0

        # Trigger warning if within <= 24 hours or already overdue
        if hours_until_purge <= 24.0:
            expiring_videos.append({
                "video_id": v.id,
                "original_filename": v.original_filename,
                "uploaded_at": v.uploaded_at.isoformat(),
                "hours_until_purge": max(0.0, round(hours_until_purge, 1)),
                "is_overdue": hours_until_purge <= 0.0,
            })

    if expiring_videos:
        return {
            "has_warning": True,
            "retention_days": retention_days,
            "expiring_count": len(expiring_videos),
            "expiring_videos": expiring_videos,
            "message": (
                f"Data Retention Notice: Your policy is set to {retention_days} Days. "
                f"{len(expiring_videos)} video session(s) will reach the expiration limit within the next 24 hours "
                f"and will be automatically purged by the daily scheduled retention service."
            ),
        }

    return {
        "has_warning": False,
        "retention_days": retention_days,
        "expiring_count": 0,
        "expiring_videos": [],
        "message": "",
    }


def run_scheduled_daily_retention_cleanup(db_session) -> Dict[str, Any]:
    """
    Automated background cleanup task running every 24 hours.
    Iterates over all user accounts and triggers purge if 24 hours have elapsed
    since their last cleanup.
    """
    now = datetime.now()
    results = []

    user_ids = set()
    from app.models import User
    try:
        users = db_session.query(User).all()
        for u in users:
            user_ids.add(u.id)
    except Exception:
        pass

    cfg_user_rows = db_session.query(Config).filter(Config.key.like("retention_days_user_%")).all()
    for row in cfg_user_rows:
        try:
            uid = int(row.key.replace("retention_days_user_", ""))
            user_ids.add(uid)
        except Exception:
            pass

    if not user_ids:
        user_ids.add(None)

    for uid in user_ids:
        try:
            settings = get_retention_settings(db_session, user_id=uid)
            ret_days = settings.get("retention_days", 0)
            if ret_days <= 0:
                continue

            last_clean = settings.get("last_cleanup_at")
            should_run = False
            if not last_clean:
                should_run = True
            else:
                try:
                    last_dt = datetime.fromisoformat(last_clean)
                    if (now - last_dt) >= timedelta(hours=24):
                        should_run = True
                except Exception:
                    should_run = True

            if should_run:
                res = run_retention_cleanup(db_session, user_id=uid)
                print(f"[Automated Retention Purge] User {uid}: {res.get('message')}")
                results.append({"user_id": uid, "result": res})
        except Exception as err:
            print(f"[Automated Retention Purge Error] User {uid}: {err}")

    return {"status": "completed", "executed_purges": results}
