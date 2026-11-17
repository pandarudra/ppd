from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from model_registry import ModelRegistry

RISK_THRESHOLDS = [
    ("CRITICAL", 0.9),
    ("HIGH", 0.75),
    ("MEDIUM", 0.5),
]


def risk_level_for(confidence: float) -> str:
    for level, threshold in RISK_THRESHOLDS:
        if confidence >= threshold:
            return level
    return "LOW"


@asynccontextmanager
async def lifespan(app: FastAPI):
    ModelRegistry.load_all()
    yield


app = FastAPI(title="SENTINEL ML Service", lifespan=lifespan)


class PredictRequest(BaseModel):
    features: dict


class BatchPredictRequest(BaseModel):
    items: list[PredictRequest]


def _predict_one(features: dict) -> dict:
    result = ModelRegistry.predict(features)
    return {
        "prediction": result["prediction"],
        "confidence_score": result["confidence"],
        "risk_level": risk_level_for(result["confidence"]),
        "anomaly_score": result["anomaly_score"],
        "model_scores": result["model_scores"],
    }


@app.post("/predict")
async def predict(payload: PredictRequest):
    if not ModelRegistry.is_loaded():
        raise HTTPException(status_code=503, detail="Models not loaded")
    return _predict_one(payload.features)


@app.post("/batch")
async def batch_predict(payload: BatchPredictRequest):
    if not ModelRegistry.is_loaded():
        raise HTTPException(status_code=503, detail="Models not loaded")
    return {"results": [_predict_one(item.features) for item in payload.items]}


@app.get("/models")
async def list_models():
    return {"models": ModelRegistry.metrics()}


@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": ModelRegistry.is_loaded()}
