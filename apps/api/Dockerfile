# Build context is apps/api.
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app ./app
RUN useradd --system --no-create-home appuser
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/health')" || exit 1
# GROQ_API_KEY, DATABASE_URL and CORS_ORIGINS come from the environment (see .env.example).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
