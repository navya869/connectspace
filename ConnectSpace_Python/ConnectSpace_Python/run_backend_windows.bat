@echo off
cd /d "%~dp0backend"
if not exist .venv (
  py -m venv .venv
)
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist .env copy .env.example .env
echo.
echo If this is your first run, open backend\.env and replace JWT_SECRET with a secret at least 32 characters long.
echo Starting ConnectSpace Python API at http://localhost:5000
python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 5000 --reload
pause
