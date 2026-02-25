#!/bin/bash
# Script para compartir el video de diferentes formas

VIDEO_FILE="sasepa-stream.mp4"
HTML_FILE="video-sasepa.html"

echo "🎥 Opciones para compartir el video:"
echo ""
echo "1️⃣  HTML Standalone (recomendado)"
echo "   - Abre: $HTML_FILE en tu navegador"
echo "   - Asegúrate de que $VIDEO_FILE esté en la misma carpeta"
echo ""

echo "2️⃣  Servidor HTTP local"
echo "   - Ejecuta: node serve-video.js"
echo "   - Abre: http://localhost:8080/video"
echo ""

echo "3️⃣  Compartir archivos directamente"
if [ -f "$VIDEO_FILE" ]; then
    SIZE=$(ls -lh "$VIDEO_FILE" | awk '{print $5}')
    echo "   - Archivo: $VIDEO_FILE ($SIZE)"
    echo "   - Ubicación: $(pwd)/$VIDEO_FILE"
fi
echo ""

echo "4️⃣  Crear ZIP con HTML y video"
if [ -f "$VIDEO_FILE" ] && [ -f "$HTML_FILE" ]; then
    ZIP_NAME="sasepa-video-package.zip"
    zip -q "$ZIP_NAME" "$VIDEO_FILE" "$HTML_FILE"
    echo "   ✅ Creado: $ZIP_NAME"
    echo "   - Puedes compartir este ZIP que contiene ambos archivos"
fi
echo ""

echo "5️⃣  Verificar servidor HTTP"
if pgrep -f "node serve-video" > /dev/null; then
    echo "   ✅ Servidor HTTP activo en puerto 8080"
    IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
    echo "   - Link: http://$IP:8080/video"
else
    echo "   ⚠️  Servidor HTTP no está corriendo"
    echo "   - Ejecuta: node serve-video.js"
fi
