# ConnectSpace — Python backend edition

This package keeps the **same React pages, CSS design, dashboard, meeting-room interface, and browser WebRTC code** from the uploaded ConnectSpace project, and replaces the Node/Express/MongoDB backend with a Python FastAPI backend, SQLite storage, JWT authentication, and Python Socket.IO signaling.

## Features carried over from the supplied project
- Sign-up/sign-in and session restoration
- Personal dashboard and searchable meeting list
- Create/schedule meetings, join by 8-character code, share invite link, delete meetings
- Live browser audio/video, mute, camera toggle and screen sharing
- Authenticated Socket.IO room presence, WebRTC signaling and in-room chat
- Responsive React UI retained from your original ZIP

## Important
The website UI is the same supplied frontend; **Python runs the API and real-time signaling server**. Browser camera/microphone, screen share and WebRTC need browser JavaScript, so the frontend remains React/JavaScript. A Python-only browser frontend would not preserve the same website or browser media behavior.

This remains a starter/MVP. The supplied project itself notes that it has no meeting recording, persistent chat history, file storage, calendar sync, or AI feature. Group calls use peer-to-peer mesh WebRTC and a public STUN server, which may fail on some networks and does not scale well. A TURN server and SFU are recommended for reliable production meetings. Do not present it as a production-ready Zoom replacement.

## Requirements
- Python 3.10+ (3.11 recommended)
- Node.js 20+ and npm
- VS Code and Chrome/Edge/Firefox
- Camera and microphone permissions for video calls

## Run on Windows (VS Code)
1. Extract the ZIP.
2. Open the `ConnectSpace_Python` folder in VS Code.
3. Open `backend/.env.example`, copy it to `backend/.env`, and set `JWT_SECRET` to a private random string of at least 32 characters. Keep `.env` private and never upload it to GitHub.
4. Double-click `run_backend_windows.bat`. On the first run it creates a virtual environment and installs the Python dependencies. Keep this terminal open.
5. In another terminal, double-click `run_frontend_windows.bat` or run:
   ```powershell
   cd client
   npm install
   npm run dev
   ```
6. Open `http://localhost:5173`.
7. Register an account, create a meeting, and copy its invite link. Open it in a second browser/device and sign in to test joining.

API health check: `http://localhost:5000/api/health`

## Manual backend setup
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and set JWT_SECRET
python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 5000 --reload
```

## Data storage
Accounts and meetings are stored in `backend/connectspace.db` (SQLite), created automatically on first start. Back up this file if you want to preserve local accounts/meetings. This edition does not require MongoDB Atlas.

## Troubleshooting
- **PowerShell blocks activation:** use `run_backend_windows.bat`, or run the venv's Python executable directly.
- **Python package installation fails:** check that Python is installed and `py --version` works.
- **Frontend cannot reach API:** confirm the backend terminal is running on port 5000.
- **Camera/mic blocked:** allow permissions in browser settings; media access requires `localhost` or HTTPS.
- **Remote video does not connect:** peer-to-peer WebRTC may be blocked by network/NAT. A TURN server is needed for better connectivity; larger rooms need an SFU.
- **Port already in use:** change `PORT` and the uvicorn command consistently, and set `VITE_API_URL` in `client/.env` if changing the API port.

## API routes
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/meetings?q=...` (Bearer token)
- `POST /api/meetings` (Bearer token)
- `GET /api/meetings/join/{code}` (Bearer token)
- `PATCH /api/meetings/{id}/end` (Bearer token)
- `DELETE /api/meetings/{id}` (Bearer token)

## Privacy
Do not commit `.env` or share your JWT secret. Use HTTPS and a professional security review before real customer use. This starter stores JWTs in browser localStorage, as did the supplied project.
