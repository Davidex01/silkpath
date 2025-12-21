from fastapi import FastAPI

app = FastAPI(
    title="SilkFlow API",
    version="0.1.0",
    description="Backend for SilkFlow B2B messenger (MVP)"
)

@app.get("/health")
def health():
    return {"status": "ok"}