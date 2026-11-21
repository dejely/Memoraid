FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
      torch==2.6.0+cpu torchvision==0.21.0+cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY server.py ./
ENV HOME=/tmp UNIMERNET_MODEL_DIR=/model PYTHONDONTWRITEBYTECODE=1 NO_ALBUMENTATIONS_UPDATE=1 HF_HUB_OFFLINE=1
USER 65532:65532
EXPOSE 8765
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "1", "--limit-concurrency", "8", "--no-access-log"]
