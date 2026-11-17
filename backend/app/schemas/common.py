import re
from typing import Annotated

from pydantic import AfterValidator

# A plain regex check instead of pydantic's EmailStr (email-validator) because
# that library rejects .local/.test/etc as "special-use" domains, which this
# project's seed data and plan/ docs use throughout (admin@sentinel.local).
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    if not _EMAIL_RE.match(value):
        raise ValueError("value is not a valid email address")
    return value


Email = Annotated[str, AfterValidator(_validate_email)]
