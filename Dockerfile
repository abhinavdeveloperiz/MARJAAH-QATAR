# Use an official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn for serving the Django app
RUN pip install gunicorn

# Copy the rest of the project
COPY . /app/

# Collect static files for Django
ENV SECRET_KEY=dummy_key_for_build_only
RUN python manage.py collectstatic --noinput

# Cloud Run sets the PORT environment variable. It usually defaults to 8080.
# We bind gunicorn to this port.
CMD exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 8 --timeout 0 marjaah.wsgi:application
