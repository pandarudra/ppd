import logging

logger = logging.getLogger(__name__)


def process_event_stub(event_id: int) -> None:
    """Placeholder background task; replaced by the real ML pipeline in Task 6."""
    logger.info("process_event_stub called for event id=%s (no-op)", event_id)
