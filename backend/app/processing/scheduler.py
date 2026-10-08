import threading
import time

from app.processing.worker import ProcessingWorker
from app.db import SessionLocal
from app.retention_service import run_scheduled_daily_retention_cleanup


class ProcessingScheduler:
    def __init__(self, interval_seconds=5, retention_check_interval_seconds=300):
        self.interval_seconds = interval_seconds
        self.retention_check_interval_seconds = retention_check_interval_seconds
        self.worker = ProcessingWorker()
        self.thread = None
        self.is_running = False
        self.last_retention_check = 0.0

    def _check_and_run_retention(self):
        now = time.time()
        # Periodic check every 5 minutes whether 24 hours have elapsed since the user's last purge
        if now - self.last_retention_check >= self.retention_check_interval_seconds:
            self.last_retention_check = now
            db = SessionLocal()
            try:
                run_scheduled_daily_retention_cleanup(db)
            except Exception as e:
                print(f"[Scheduler] Error during scheduled retention cleanup: {e}")
            finally:
                db.close()

    def _run_loop(self):
        while self.is_running:
            try:
                self.worker.process_next_queued_video()
            except Exception as e:
                print(f"[Scheduler] Error while processing queue: {e}")

            # Check retention cleanup when worker finishes/idles
            try:
                self._check_and_run_retention()
            except Exception as e:
                print(f"[Scheduler] Retention check error: {e}")

            time.sleep(self.interval_seconds)

    def start(self):
        if self.is_running:
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("[Scheduler] Background processing scheduler started.")

    def stop(self):
        self.is_running = False
        print("[Scheduler] Background processing scheduler stopped.")
