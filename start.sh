#!/usr/bin/env bash
set -e

echo "============================================"
echo "  VayuDrishti 2.0 — Starting up"
echo "============================================"
echo ""

# Get script directory so it works from anywhere
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "[1/4] Installing Python dependencies..."
pip install -r backend/requirements.txt -q
echo "      Done."

echo "[2/4] Starting FastAPI backend on :8000..."
cd backend
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd "$DIR"
sleep 2

echo "[3/4] Installing Node dependencies..."
cd frontend
npm install -q
echo "      Done."

echo "[4/4] Starting React dev server on :5173..."
npm run dev &
FRONTEND_PID=$!
cd "$DIR"

echo ""
echo "============================================"
echo "  VayuDrishti is running!"
echo "  Open: http://localhost:5173"
echo "  API:  http://localhost:8000/docs"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'" INT TERM
wait

# Keep window open if something goes wrong
read -p "Press Enter to close..."
