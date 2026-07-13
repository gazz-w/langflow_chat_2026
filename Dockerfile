FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 5000

# gthread: threads atendem requisições longas (SSE/streaming) sem prender o
# worker inteiro — e requisições >30s não são mais mortas pelo arbiter.
CMD ["gunicorn", "-w", "2", "--worker-class", "gthread", "--threads", "8", "-b", "0.0.0.0:5000", "app:app"]
