FROM python:3.12-slim

WORKDIR /app
COPY license_server.py /app/license_server.py

ENV LICENSE_DB=/data/licenses.sqlite3
VOLUME ["/data"]

EXPOSE 8008
CMD ["python", "license_server.py", "serve", "--host", "0.0.0.0"]
