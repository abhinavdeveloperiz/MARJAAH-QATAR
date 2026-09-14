import sys
import os

# ─── cPanel Phusion Passenger WSGI Entry Point ────────────────────────────────
# Place this file in the root of your Python application in cPanel.
# cPanel Python App Manager will use this to start the Django application.
#
# Setup:
#   1. In cPanel → Python App: set Application startup file = passenger_wsgi.py
#   2. Set Application Entry point = application
#   3. Set your virtual environment path
# ─────────────────────────────────────────────────────────────────────────────

# Add the project root directory to Python path
INTERP = os.path.join(os.environ.get('PYTHONHOME', ''), 'bin', 'python3')
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

cwd = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, cwd)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marjaah.settings')

# Load .env file for cPanel production credentials
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(cwd, '.env'))
except ImportError:
    pass

# Create the WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
