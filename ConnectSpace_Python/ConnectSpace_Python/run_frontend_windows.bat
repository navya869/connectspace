@echo off
cd /d "%~dp0client"
if not exist node_modules (
  npm install
)
npm run dev
pause
