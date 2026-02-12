#!/bin/bash

# ============================================
# BOT SASMEX - Script de Inicio y Monitoreo
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║      🤖 INICIANDO BOT SASMEX - VERSIÓN AVANZADA      ║"
echo "║     Verificación 100% Completa - Sistema Robusto      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 Directorio: $PROJECT_DIR"
echo ""

# 1. Verificar Node.js
echo "🔍 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION encontrado"
echo ""

# 2. Verificar npm
echo "🔍 Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION encontrado"
echo ""

# 3. Verificar dependencies
echo "🔍 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules no encontrado, instalando..."
    npm install --no-save
    echo "✅ Dependencias instaladas"
else
    echo "✅ node_modules encontrado"
fi
echo ""

# 4. Verificar sintaxis
echo "🔍 Verificando sintaxis de código..."
if node -c index.js 2>&1; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis detectado"
    exit 1
fi
echo ""

# 5. Verificar archivo de configuración
echo "🔍 Verificando archivo de configuración..."
if grep -q "CONFIG\s*=" index.js; then
    echo "✅ CONFIG encontrado en index.js"
else
    echo "⚠️  CONFIG no encontrado en index.js"
fi
echo ""

# 6. Verificar datos
echo "🔍 Verificando archivo de datos..."
if [ -f "data.json" ]; then
    echo "✅ data.json existe"
    SIZE=$(du -h data.json | cut -f1)
    echo "   Tamaño: $SIZE"
else
    echo "ℹ️  data.json no existe (se creará automáticamente)"
fi
echo ""

# 7. Mostrar estado de la sesión
echo "🔍 Verificando sesión WhatsApp..."
if [ -d ".wwebjs_auth" ]; then
    echo "✅ Sesión encontrada (.wwebjs_auth)"
    CACHE_SIZE=$(du -sh .wwebjs_auth | cut -f1)
    echo "   Tamaño: $CACHE_SIZE"
else
    echo "ℹ️  Sesión nueva - se mostrará código QR al conectar"
fi
echo ""

# 8. Verificar logs
echo "🔍 Verificando archivo de logs..."
if [ -f "bot.log" ]; then
    echo "✅ bot.log existe"
    LOG_LINES=$(wc -l < bot.log)
    echo "   Líneas: $LOG_LINES"
    # Mostrar últimas 3 líneas
    echo "   Últimas 3 líneas:"
    tail -3 bot.log | sed 's/^/   /'
else
    echo "ℹ️  bot.log se creará al iniciar"
fi
echo ""

# 9. Resumen de características
echo "📋 CARACTERÍSTICAS ACTIVADAS:"
echo "   ✅ Alertas sísmicas en tiempo real"
echo "   ✅ Generación de imágenes personalizadas"
echo "   ✅ Filtrado por severidad"
echo "   ✅ Silenciado temporal"
echo "   ✅ Estadísticas detalladas"
echo "   ✅ Historial de eventos (bot.log)"
echo "   ✅ Recomendaciones de seguridad"
echo "   ✅ Panel de administración"
echo "   ✅ Mensajes broadcast"
echo "   ✅ Sistema de auto-reparación"
echo "   ✅ Manejo avanzado de errores"
echo "   ✅ Verificaciones dinámicas"
echo ""

# 10. Instrucciones de uso
echo "📱 PRIMEROS PASOS:"
echo "   1. Escanea el código QR con WhatsApp"
echo "   2. Envía !menu para ver los comandos"
echo "   3. Envía !start para suscribirte"
echo "   4. Envía !test para verificar el sistema"
echo ""

echo "📊 MONITOREO:"
echo "   • Logs en tiempo real:"
echo "     tail -f bot.log"
echo ""
echo "   • En otra terminal, para ver solo errores:"
echo "     tail -f bot.log | grep ERROR"
echo ""
echo "   • Para ver solo alertas:"
echo "     tail -f bot.log | grep ALERT"
echo ""

echo "🛑 CONTROL:"
echo "   • Presiona Ctrl+C para detener el bot"
echo "   • El bot guarda automáticamente antes de cerrar"
echo ""

# 11. Iniciar el bot
echo "════════════════════════════════════════════════════════"
echo "🚀 INICIANDO BOT..."
echo "════════════════════════════════════════════════════════"
echo ""

node index.js

# Si el bot se detiene, mostrar mensaje
echo ""
echo "════════════════════════════════════════════════════════"
echo "⚠️  BOT DETENIDO"
echo ""
echo "Razones posibles:"
echo "  • Presionaste Ctrl+C"
echo "  • Error no capturado (revisar bot.log)"
echo "  • Problemas de conexión WhatsApp"
echo ""
echo "Para reiniciar:"
echo "  npm start"
echo "════════════════════════════════════════════════════════"
echo ""
