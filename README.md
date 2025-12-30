## SilkFlow: запуск без Docker на любом устройстве (готовый гайд с командами)

Проект:  
- `backend/` — FastAPI  
- `web/` — Vite + React

Нужно открыть **2 терминала**: один для бэкенда, второй для фронтенда.

---

# 0) Требования

### Windows
- Python 3.10+ (лучше 3.11/3.12), добавлен в PATH
- Node.js 20+
- npm

Проверка:
```powershell
python --version
node -v
npm -v
```

### macOS (Homebrew)
```bash
brew install python node
python3 --version
node -v
npm -v
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip
```

Node 20 (рекомендуется):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

# 1) Backend (FastAPI) — терминал №1

Перейди в папку бэкенда:
```bash
cd backend
```

## 1.1 Создать venv и активировать

### Windows PowerShell
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### macOS/Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 1.2 Установить зависимости
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 1.3 Запустить сервер
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Проверка:
- Health: `http://127.0.0.1:8000/health`
- Swagger: `http://127.0.0.1:8000/docs`

---

# 2) Frontend (Vite/React) — терминал №2

Перейди в папку фронтенда:
```bash
cd web
```

## 2.1 Настроить адрес API (обязательно)
У тебя в репозитории есть `web/.env.development`. Поставь там **8000**, чтобы фронт ходил в бэк:

**Файл `web/.env.development`:**
```env
VITE_API_BASE=http://127.0.0.1:8000
```

Быстрая замена:

### Windows PowerShell
```powershell
(Get-Content .env.development) -replace 'http://localhost:8001','http://127.0.0.1:8000' | Set-Content .env.development
```

### macOS/Linux
```bash
sed -i.bak 's|http://localhost:8001|http://127.0.0.1:8000|g' .env.development
```

## 2.2 Установить зависимости
```bash
npm install
```

## 2.3 Запустить фронт (важно: формат с "=" для Windows)
```bash
npm run dev -- --host=127.0.0.1 --port=5173
```

Открыть:
- `http://127.0.0.1:5173/`

> Если порт 5173 занят, Vite предложит другой (5174 и т.д.). Открывай тот, который он покажет в `Local:`.

---

# 3) Проверка “всё работает”

### Проверить backend
```bash
# Windows:
curl.exe http://127.0.0.1:8000/health
# macOS/Linux:
curl http://127.0.0.1:8000/health
```
Ожидается:
```json
{"status":"ok"}
```

### Проверить frontend (что он отдаёт HTML)
```bash
# Windows:
curl.exe -I http://127.0.0.1:5173/
# macOS/Linux:
curl -I http://127.0.0.1:5173/
```
Ожидается `200 OK` и `text/html`.

---

# 4) Тесты бэкенда (опционально)

Из `backend/` в активированном venv:
```bash
pip install pytest
pytest -q
```

---

# 5) Частые проблемы и быстрые фиксы

## 5.1 В браузере 404 на 5173
Это почти всегда значит, что на 5173 слушает не Vite или Vite запущен “не тем способом”.
Запускай именно так:
```bash
npm run dev -- --host=127.0.0.1 --port=5173
```

## 5.2 Фронт не видит бэк
- Проверь `.env.development` → `VITE_API_BASE=http://127.0.0.1:8000`
- Перезапусти `npm run dev`
- Проверь `http://127.0.0.1:8000/health`

## 5.3 Порт занят (Windows)
Проверить, кто слушает:
```powershell
netstat -ano | findstr :5173
netstat -ano | findstr :8000
```
Убить процесс по PID:
```powershell
taskkill /PID <PID> /F
```

---

## Рекомендуемые “стандартные” порты
- Backend: `127.0.0.1:8000`
- Frontend: `127.0.0.1:5173`
- `web/.env.development`: `VITE_API_BASE=http://127.0.0.1:8000`

Этот набор у тебя гарантированно работает (ты уже подтвердил запуск фронта командой с `--host=127.0.0.1`).