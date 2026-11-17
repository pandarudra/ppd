from fastapi import FastAPI

app = FastAPI(title="SENTINEL ML Service")


@app.get("/health")
async def health():
    return {"status": "ok"}
