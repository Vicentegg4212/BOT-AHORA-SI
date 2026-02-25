#!/bin/bash
# Script para detener el streaming

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/stream-24h.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  No se encontró el archivo PID. El streaming puede no estar corriendo."
    exit 1
fi

STREAM_PID=$(cat "$PID_FILE")

if ! ps -p $STREAM_PID > /dev/null 2>&1; then
    echo "⚠️  El proceso no está corriendo (PID: $STREAM_PID)"
    rm -f "$PID_FILE"
    exit 1
fi

echo "🛑 Deteniendo streaming (PID: $STREAM_PID)..."
kill -SIGTERM $STREAM_PID

# Esperar a que termine
sleep 3

if ps -p $STREAM_PID > /dev/null 2>&1; then
    echo "⚠️  El proceso no terminó. Forzando cierre..."
    kill -9 $STREAM_PID
fi

rm -f "$PID_FILE"
echo "✅ Streaming detenido"
