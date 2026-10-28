# Lightweight smoke-test instructions:
# 1. Start the backend with: python -m uvicorn app.main:socket_app --port 5000
# 2. Open http://localhost:5000/api/health and verify {"status":"ok", ...}
# 3. Register, create a meeting, then join from a second browser.
