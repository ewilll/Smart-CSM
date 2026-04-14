"""Load Smart-CSM/.env from a predictable path regardless of process cwd."""
from pathlib import Path
from typing import Optional


def load_smart_csm_dotenv() -> Optional[Path]:
    """
    Try several locations so uvicorn/manage.py always see keys after copying .env.
    Returns the path loaded, or None if nothing was found.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return None

    here = Path(__file__).resolve().parent
    candidates = [
        here.parent / ".env",
        here / ".env",
        Path.cwd() / ".env",
        Path.cwd().parent / ".env",
    ]
    for path in candidates:
        try:
            if path.is_file() and path.stat().st_size > 0:
                load_dotenv(path, override=True)
                print(f"[env] Loaded {path}")
                return path
        except OSError:
            continue
    print(
        "[env] WARNING: No non-empty .env found. "
        "Place .env in Smart-CSM/ (same folder as package.json), then restart the server."
    )
    return None
