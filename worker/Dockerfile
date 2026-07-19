FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
COPY config ./config
COPY scripts ./scripts

RUN pip install --no-cache-dir .

CMD ["python", "-m", "worker.bot"]
