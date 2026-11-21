"""CPU handwriting-to-LaTeX API for Memoraid's authenticated relay."""

import hmac
import io
import os
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from PIL import Image

MAX_PNG_BYTES = 1_500_000
# The Memoraid canvas is 1000 × 400 before cropping.
MAX_WIDTH = 1600
MAX_HEIGHT = 800
MAX_TOKENS = 384
UNREADABLE = {"latex": "", "unreadable": True}


class Recognizer:
    def __init__(self, model_dir: Path):
        import torch
        from omegaconf import OmegaConf
        from unimernet.models.unimernet.unimernet import UniMERModel
        from unimernet.processors import load_processor

        self.torch = torch
        torch.set_num_threads(int(os.environ.get("UNIMERNET_THREADS", "2")))
        self.model = UniMERModel.from_config(
            OmegaConf.create({
                "model_config": {"model_name": str(model_dir), "max_seq_len": MAX_TOKENS},
                "tokenizer_config": {"path": str(model_dir)},
                "load_pretrained": False,
            })
        )
        checkpoint = torch.load(
            model_dir / "unimernet_tiny.pth",
            map_location="cpu",
            weights_only=True,
            mmap=True,
        )
        self.model.load_state_dict(checkpoint.get("model", checkpoint))
        self.model.eval()
        self.process = load_processor("formula_image_eval", {"image_size": [192, 672]})

    def recognize(self, png: bytes):
        try:
            with Image.open(io.BytesIO(png), formats=["PNG"]) as decoded:
                if decoded.width > MAX_WIDTH or decoded.height > MAX_HEIGHT:
                    raise HTTPException(413, "Drawing dimensions exceed the limit.")
                decoded.load()
                ink = decoded.convert("RGBA")
                image = Image.new("RGB", ink.size, "white")
                image.paste(ink, mask=ink.getchannel("A"))
        except (OSError, SyntaxError, ValueError, Image.DecompressionBombError) as error:
            raise HTTPException(400, "Invalid PNG drawing.") from error

        darkest, lightest = image.convert("L").getextrema()
        if lightest == darkest:
            return UNREADABLE

        prepared = self.process(image)
        if prepared is None:
            return UNREADABLE
        with self.torch.inference_mode():
            prediction = self.model.generate({"image": prepared.unsqueeze(0)})
        latex = prediction["pred_str"][0].strip()
        if not latex or len(latex) > 10_000 or prediction["pred_ids"].shape[-1] >= MAX_TOKENS:
            return UNREADABLE
        return {"latex": latex, "unreadable": False}


@asynccontextmanager
async def lifespan(app: FastAPI):
    token = os.environ.get("UNIMERNET_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Set UNIMERNET_TOKEN before starting the service.")
    app.state.authorization = f"Bearer {token}".encode()
    app.state.recognizer = Recognizer(Path(os.environ["UNIMERNET_MODEL_DIR"]).resolve())
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
inference_lock = Lock()


@app.get("/healthz")
def health():
    return {"ready": True}


def recognize_once(recognizer: Recognizer, png: bytes):
    # Keep the lock until CPU work finishes, even if the relay disconnects.
    if not inference_lock.acquire(blocking=False):
        raise HTTPException(503, "Recognizer busy.")
    try:
        return recognizer.recognize(png)
    finally:
        inference_lock.release()


@app.post("/recognize")
async def recognize(request: Request):
    authorization = request.headers.get("Authorization", "").encode()
    if not hmac.compare_digest(authorization, request.app.state.authorization):
        raise HTTPException(401, "Unauthorized.")
    if request.headers.get("Content-Type") != "image/png":
        raise HTTPException(415, "Expected image/png.")

    png = bytearray()
    async for chunk in request.stream():
        if len(png) + len(chunk) > MAX_PNG_BYTES:
            raise HTTPException(413, "Drawing exceeds the size limit.")
        png.extend(chunk)
    result = await run_in_threadpool(recognize_once, request.app.state.recognizer, bytes(png))
    return JSONResponse(result, headers={"Cache-Control": "no-store"})
