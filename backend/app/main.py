from fastapi import FastAPI

app = FastAPI(title="SENTINEL Backend")


@app.get("/health")
async def health():
    return {"status": "ok"}
