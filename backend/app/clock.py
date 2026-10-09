import time


def now_ms() -> int:
    """The one definition of "now" (ms since epoch, UTC) so tests can freeze time."""
    return int(time.time() * 1000)
