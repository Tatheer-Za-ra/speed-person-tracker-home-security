import multiprocessing
import time

from app.processing.worker import ProcessingWorker


def _worker_process_loop(interval_seconds, stop_event):
    """
    Isolated process worker loop running AI inference off the main Flask GIL.
    """
    worker = ProcessingWorker()
    while not stop_event.is_set():
        try:
            worker.process_next_queued_video()
        except Exception as e:
            print(f"[Scheduler Process] Error while processing queue: {e}")

        # Ticked sleep to allow immediate shutdown handling
        steps = max(1, int(interval_seconds * 10))
        for _ in range(steps):
            if stop_event.is_set():
                break
            time.sleep(0.1)


class ProcessingScheduler:
    def __init__(self, interval_seconds=5):
        self.interval_seconds = interval_seconds
        self.process = None
        self.stop_event = None

    def start(self):
        if self.process and self.process.is_alive():
            return

        self.stop_event = multiprocessing.Event()
        self.process = multiprocessing.Process(
            target=_worker_process_loop,
            args=(self.interval_seconds, self.stop_event),
            daemon=True,
        )
        self.process.start()
        print(f"[Scheduler] Background processing worker started in isolated OS process (PID: {self.process.pid}).")

    def stop(self):
        if self.stop_event:
            self.stop_event.set()
        if self.process and self.process.is_alive():
            self.process.terminate()
            self.process.join(timeout=2.0)
        print("[Scheduler] Background processing scheduler stopped.")