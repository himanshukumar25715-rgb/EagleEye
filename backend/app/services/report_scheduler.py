import logging
import threading
import time
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.config import settings
from app.db.session import SessionLocal

logger = logging.getLogger("eagle_eye.report_scheduler")

class ReportScheduler:
    def __init__(self):
        self.auto_enabled: bool = getattr(settings, "AUTO_REPORT_ENABLED", True)
        self.scheduled_hour: int = getattr(settings, "AUTO_REPORT_HOUR", 23)
        self.scheduled_minute: int = getattr(settings, "AUTO_REPORT_MINUTE", 59)
        self.default_recipient: str = getattr(settings, "REPORT_DEFAULT_RECIPIENT", "")
        self.last_run_date: Optional[str] = None
        self._thread: Optional[threading.Thread] = None
        self._running: bool = False

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="ReportSchedulerThread")
        self._thread.start()
        logger.info(f"ReportScheduler started. Automated End-of-Day report scheduled at {self.scheduled_hour:02d}:{self.scheduled_minute:02d} for {self.default_recipient}")

    def stop(self):
        self._running = False

    def get_config(self) -> Dict[str, Any]:
        return {
            "auto_enabled": self.auto_enabled,
            "scheduled_hour": self.scheduled_hour,
            "scheduled_minute": self.scheduled_minute,
            "default_recipient": self.default_recipient,
            "last_run_date": self.last_run_date,
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "smtp_user": settings.SMTP_USER,
            "from_name": settings.SMTP_FROM_NAME,
        }

    def update_config(self, auto_enabled: bool, scheduled_hour: int, scheduled_minute: int, default_recipient: str):
        self.auto_enabled = auto_enabled
        self.scheduled_hour = scheduled_hour
        self.scheduled_minute = scheduled_minute
        self.default_recipient = default_recipient
        logger.info(f"Updated ReportScheduler config: enabled={auto_enabled}, time={scheduled_hour:02d}:{scheduled_minute:02d}, recipient={default_recipient}")

    def _run_loop(self):
        while self._running:
            try:
                if self.auto_enabled:
                    now = datetime.now()
                    today_str = now.strftime("%Y-%m-%d")

                    # Check if current time matches scheduled hour and minute
                    if (
                        now.hour == self.scheduled_hour
                        and now.minute == self.scheduled_minute
                        and self.last_run_date != today_str
                    ):
                        logger.info(f"Triggering automated End-of-Day report for {today_str}...")
                        self.last_run_date = today_str
                        self._dispatch_daily_report()
            except Exception as e:
                logger.error(f"Error in ReportScheduler loop: {e}")

            time.sleep(30)

    def _dispatch_daily_report(self):
        from app.services.email_service import send_and_save_report
        db = SessionLocal()
        try:
            send_and_save_report(db, period="day", recipient_email=self.default_recipient)
            logger.info("Automated End-of-Day report successfully sent.")
        except Exception as err:
            logger.error(f"Failed to send scheduled End-of-Day report: {err}")
        finally:
            db.close()

scheduler = ReportScheduler()

