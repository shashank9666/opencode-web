@echo off
cd /d "%~dp0"

echo Starting opencode web...

echo [1/3] Starting backend (port 4096)...
start "opencode-backend" bun run --conditions=browser ./packages/opencode/src/index.ts serve --port 4096

echo [2/3] Starting frontend (port 4444)...
start "opencode-frontend" bun --cwd packages\app dev -- --port 4444

echo [3/3] Opening browser...
timeout /t 5 /nobreak >nul
start http://localhost:4444

echo Done.
