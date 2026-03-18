#!/usr/bin/env bash
# Lance le backend et le frontend en parallèle

trap 'kill 0' EXIT

echo "▶ Démarrage du backend (port 8000)..."
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &

echo "▶ Démarrage du frontend (port 5173)..."
cd frontend && npm run dev &

wait
