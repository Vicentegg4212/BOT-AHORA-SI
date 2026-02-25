#!/bin/bash
# Script para verificar el estado del streaming

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/stream-24h.pid"
LOG_FILE="$SCRIPT_DIR/stream-24h.log"

echo "📊 Estado del Streaming 24h"
echo "================================"

if [ ! -f "$PID_FILE" ]; then
    echo "❌ Streaming NO está corriendo (no hay archivo PID)"
    exit 1
fi

STREAM_PID=$(cat "$PID_FILE")

if ps -p $STREAM_PID > /dev/null 2>&1; then
    echo "✅ Streaming ACTIVO"
    echo "🆔 PID: $STREAM_PID"
    echo "📝 Logs: $LOG_FILE"
    echo ""
    echo "📊 Últimas líneas del log:"
    echo "---"
    tail -n 10 "$LOG_FILE" 2>/dev/null || echo "No hay logs aún"
    echo "---"
    echo ""
    echo "💡 Ver logs en tiempo real: tail -f $LOG_FILE"
else
    echo "❌ Streaming NO está corriendo (proceso no existe)"
    echo "🧹 Limpiando PID file..."
    rm -f "$PID_FILE"
    exit 1
fi
