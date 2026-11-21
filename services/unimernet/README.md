# UniMERNet recognition service

Memoraid's `study-ai` relay sends a cropped PNG to this CPU service. It runs
UniMERNet Tiny and returns an editable LaTeX transcription. The service loads one
model on startup and processes one drawing at a time.

## Run locally

Use Python 3.11 on Linux x86-64. The upstream OpenCV package needs `libgl1` and
`libglib2.0-0` on a minimal Debian install. Run from the repository root.

```sh
python3.11 -m venv .venv-unimernet
. .venv-unimernet/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch==2.6.0+cpu torchvision==0.21.0+cpu
pip install -r services/unimernet/requirements.txt

export UNIMERNET_MODEL_DIR="$PWD/.venv-unimernet/model"
python - <<'PY'
import os
from huggingface_hub import snapshot_download

snapshot_download(
    "wanderkid/unimernet_tiny",
    revision="3f09ac4b1cd583be47ea20a7d7daef839473028a",
    allow_patterns=[
        "config.json", "preprocessor_config.json", "tokenizer.json",
        "tokenizer_config.json", "unimernet_tiny.pth",
    ],
    local_dir=os.environ["UNIMERNET_MODEL_DIR"],
    token=False,
)
PY

export UNIMERNET_TOKEN="$(openssl rand -hex 32)"
NO_ALBUMENTATIONS_UPDATE=1 HF_HUB_OFFLINE=1 PYTHONDONTWRITEBYTECODE=1 \
  python -m uvicorn server:app --app-dir services/unimernet --port 8765 --workers 1 --limit-concurrency 8 --no-access-log
```

In another terminal, check startup with `curl -fsS http://127.0.0.1:8765/healthz`.
To try a real equation, send an opaque PNG of a single expression (dark ink on a
light background). Use the token from the service terminal.

```sh
curl --fail-with-body http://127.0.0.1:8765/recognize \
  -H "Authorization: Bearer $UNIMERNET_TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @equation.png
```

The JSON response contains `latex` and `unreadable`. A blank or unreadable
drawing returns an empty transcription with `unreadable: true`.

## Connect the authenticated relay

Give `study-ai` these server-side variables through a local function env file or
the hosted project's Edge Function secrets.

| Variable | Value |
|---|---|
| `UNIMERNET_URL` | Full URL ending in `/recognize` as seen by the relay |
| `UNIMERNET_TOKEN` | Same bearer token used to start the service |

For a local relay that runs on the host, use `http://127.0.0.1:8765/recognize`.
For the Supabase CLI's Docker-based relay, put the recognizer container on the
same Docker network and use `http://memoraid-unimernet:8765/recognize`.
From an initialized local Supabase project, pass the environment file to
`supabase functions serve study-ai --env-file /path/to/relay.env`.

## Run in a container

Download the pinned model files above and mount that directory read-only.
The files and directory need to be readable by the container's UID 65532.

```sh
docker build -t memoraid-unimernet services/unimernet
docker run --rm --name memoraid-unimernet \
  -p 127.0.0.1:8765:8765 \
  --env UNIMERNET_TOKEN \
  -v "$UNIMERNET_MODEL_DIR:/model:ro,Z" \
  memoraid-unimernet
```

If Docker's build network cannot reach the package indexes on Linux, run
`docker build --network host -t memoraid-unimernet services/unimernet`.
`Z` lets a container on an SELinux host read its dedicated model directory.
For a local Linux test where Docker port forwarding fails, replace the
`-p` argument with `--network host` and append
`python -m uvicorn server:app --host 127.0.0.1 --port 8765 --workers 1 --limit-concurrency 8 --no-access-log`
after the image name. This binds the test server to loopback.

Connect the container to the local Supabase network with
`docker network connect <local-supabase-network> memoraid-unimernet` when needed.
For a hosted Supabase project, expose the endpoint to its Edge Function through
HTTPS and configure the relay secrets before publishing the app. Keep the
backing service port private. Use one worker and start with 4 GiB RAM for a
dedicated host. `UNIMERNET_THREADS` defaults to two. Measure peak memory and
recognition latency with actual handwriting before sizing a shared host.
