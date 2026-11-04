FROM python:3.12-slim
WORKDIR /srv/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ /srv/backend
COPY db/ /srv/db
RUN useradd -m app && chown -R app /srv
USER app
EXPOSE 8000
