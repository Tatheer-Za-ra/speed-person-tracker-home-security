import threading
import time

from app.processing.worker import ProcessingWorker


class ProcessingScheduler:
    def __init__(self, interval_seconds=5):
        self.interval_seconds = interval_seconds
        self.worker = ProcessingWorker()
        self.thread = None
        self.is_running = False

    def _run_loop(self):
        while self.is_running:
            try:
                self.worker.process_next_queued_video()
            except Exception as e:
                print(f"[Scheduler] Error while processing queue: {e}")

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