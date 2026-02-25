#!/bin/bash
# Script para iniciar el streaming de SASEPA a Kick

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/sasepa-stream.log"
PID_FILE="$SCRIPT_DIR/sasepa-stream.pid"

echo "🚀 Iniciando streaming SASEPA a Kick..."
echo "📝 Logs: $LOG_FILE"
echo "🆔 PID: $PID_FILE"

# Verificar si ya está corriendo
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  El streaming ya está corriendo (PID: $OLD_PID)"
        echo "💡 Para detenerlo: kill $OLD_PID"
        exit 1
    else
        echo "🧹 Limpiando PID file obsoleto..."
        rm -f "$PID_FILE"
    fi
fi

# Iniciar en background con nohup
cd "$SCRIPT_DIR"
nohup node stream-sasepa-kick.js >> "$LOG_FILE" 2>&1 &
STREAM_PID=$!

# Guardar PID
echo $STREAM_PID > "$PID_FILE"

echo "✅ Streaming iniciado!"
echo "📊 PID: $STREAM_PID"
echo "📝 Ver logs: tail -f $LOG_FILE"
echo "🛑 Detener: kill $STREAM_PID"
echo ""
echo "El stream estará activo las 24 horas."
