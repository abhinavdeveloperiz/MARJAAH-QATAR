#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --no-input

echo "=== Running database migrations ==="
python manage.py migrate

echo "=== Seeding catalogue data (only if DB is empty) ==="
python manage.py seed_data --safe || echo "Seed skipped (data already present)"

echo "=== Creating superuser (if env vars are set) ==="
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser \
    --noinput \
    --username "$DJANGO_SUPERUSER_USERNAME" \
    --email "${DJANGO_SUPERUSER_EMAIL:-admin@marjaah.qa}" \
    2>/dev/null || echo "Superuser already exists — skipping."
fi

echo "=== Build complete ==="
