import sys
import os
import shutil
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
backend_path = BASE_DIR / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# In serverless environments (like Vercel), the filesystem is read-only except /tmp
# Copy SQLite database to /tmp to allow read & write operations (e.g. alert logging)
data_dir = backend_path / "data"
src_db = data_dir / "setu.db"

if os.environ.get("VERCEL") or not os.access(str(data_dir), os.W_OK):
    tmp_db = Path("/tmp/setu.db")
    if src_db.exists() and not tmp_db.exists():
        try:
            shutil.copy2(str(src_db), str(tmp_db))
        except Exception as e:
            print(f"Warning: could not copy db to /tmp: {e}")
    if tmp_db.exists():
        os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"

try:
    from app.main import app
except ImportError:
    from backend.app.main import app
