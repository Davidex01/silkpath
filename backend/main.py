from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import os
import json
from pathlib import Path

load_dotenv()

app = FastAPI(title="SilkPath AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    text: str


class TrainingData(BaseModel):
    instruction: str
    response: str


TRAINING_FILE = Path("training_data.json")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def load_training_data() -> list[dict]:
    if TRAINING_FILE.exists():
        with open(TRAINING_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_training_data(data: list[dict]):
    with open(TRAINING_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.get("/")
def root():
    return {"message": "SilkPath AI Agent is running"}


@app.post("/api/chat")
async def chat(message: ChatMessage):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")

    # Формируем системный промпт с обучающими данными
    training_data = load_training_data()
    system_prompt = "Ты полезный AI-ассистент проекта SilkPath."

    if training_data:
        examples = "\n".join([
            f"Q: {item['instruction']}\nA: {item['response']}"
            for item in training_data
        ])
        system_prompt += f"\n\nИспользуй эти примеры:\n{examples}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",  # Бесплатная модель
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message.text}
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=30.0
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "reply": data["choices"][0]["message"]["content"],
                    "status": "success"
                }
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timeout")


@app.post("/api/train")
async def train(data: TrainingData):
    training = load_training_data()
    training.append({
        "instruction": data.instruction,
        "response": data.response
    })
    save_training_data(training)
    return {"status": "success", "total": len(training)}


@app.get("/api/training-data")
async def get_training():
    return {"data": load_training_data()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)