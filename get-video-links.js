/**
 * Script para obtener todos los links disponibles del video
 */

const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const videoPath = path.join(__dirname, 'sasepa-stream.mp4');

console.log('🔍 Buscando métodos para acceder al video...\n');

// Obtener IPs
let publicIP = 'No disponible';
let localIP = '127.0.0.1';

try {
    publicIP = execSync('curl -s ifconfig.me 2>/dev/null || hostname -I | awk \'{print $1}\'', { encoding: 'utf8' }).trim();
} catch (e) {}

try {
    localIP = execSync('hostname -I | awk \'{print $1}\'', { encoding: 'utf8' }).trim() || '127.0.0.1';
} catch (e) {}

console.log('📹 VIDEO DISPONIBLE EN:\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Método 1: Archivo directo
if (fs.existsSync(videoPath)) {
    const stats = fs.statSync(videoPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('1️⃣  ARCHIVO DIRECTO:');
    console.log(`   📁 Ruta: ${videoPath}`);
    console.log(`   💾 Tamaño: ${sizeMB} MB\n`);
}

// Método 2: Servidor Node.js
console.log('2️⃣  SERVIDOR NODE.JS (puerto 8080):');
console.log(`   🌐 Público: http://${publicIP}:8080/video`);
console.log(`   🏠 Local:   http://localhost:8080/video`);
console.log(`   📄 HTML:    http://${publicIP}:8080/\n`);

// Método 3: Servidor Python
console.log('3️⃣  SERVIDOR PYTHON (puerto 9000):');
console.log(`   🌐 Público: http://${publicIP}:9000/sasepa-stream.mp4`);
console.log(`   🏠 Local:   http://localhost:9000/sasepa-stream.mp4`);
console.log(`   📄 HTML:    http://${publicIP}:9000/video-sasepa.html\n`);

// Método 4: HTML Standalone
const htmlPath = path.join(__dirname, 'video-sasepa.html');
if (fs.existsSync(htmlPath)) {
    console.log('4️⃣  HTML STANDALONE:');
    console.log(`   📄 Archivo: ${htmlPath}`);
    console.log(`   💡 Abre este archivo en tu navegador (necesita el .mp4 en la misma carpeta)\n`);
}

// Método 5: ZIP Package
const zipPath = path.join(__dirname, 'sasepa-video-package.zip');
if (fs.existsSync(zipPath)) {
    console.log('5️⃣  PAQUETE ZIP:');
    console.log(`   📦 Archivo: ${zipPath}`);
    console.log(`   💡 Contiene HTML + Video, listo para compartir\n`);
}

console.log('═══════════════════════════════════════════════════════════\n');
console.log('💡 RECOMENDACIONES:');
console.log('   - Si los links públicos no funcionan, usa el HTML standalone');
console.log('   - O descarga el ZIP y ábrelo localmente');
console.log('   - Verifica que los puertos 8080 y 9000 estén abiertos en el firewall\n');

// Verificar servidores activos
console.log('🔌 ESTADO DE SERVIDORES:\n');
try {
    const nodeServer = execSync('pgrep -f "node serve-video"', { encoding: 'utf8' }).trim();
    console.log('   ✅ Servidor Node.js: ACTIVO');
} catch (e) {
    console.log('   ⚠️  Servidor Node.js: INACTIVO (ejecuta: node serve-video.js)');
}

try {
    const pythonServer = execSync('pgrep -f "python.*9000"', { encoding: 'utf8' }).trim();
    console.log('   ✅ Servidor Python: ACTIVO');
} catch (e) {
    console.log('   ⚠️  Servidor Python: INACTIVO (ejecuta: python3 -m http.server 9000)');
}

console.log('');
