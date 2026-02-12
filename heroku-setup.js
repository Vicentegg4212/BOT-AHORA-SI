/**
 * Configuración para Heroku
 * Este archivo configura el bot para funcionar correctamente en Heroku
 */

const fs = require('fs');
const path = require('path');

// Detectar si está en Heroku
const isHeroku = !!process.env.DYNO;

console.log('🔧 Configurando para Heroku...');
console.log(`   Ambiente: ${isHeroku ? '🟢 HEROKU' : '🔵 LOCAL'}`);

// Configurar directorios para Heroku
if (isHeroku) {
    // En Heroku, usar directorios en /tmp que persisten durante la dyno
    const tempDir = process.env.HOME || '/tmp';
    
    // Crear directorios si no existen
    const dirs = [
        path.join(tempDir, '.wwebjs_auth'),
        path.join(tempDir, '.wwebjs_cache'),
        path.join(tempDir, 'logs')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Creado: ${dir}`);
        }
    });
    
    // Establecer variables de entorno para Puppeteer en Heroku
    process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
    process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
    
    console.log('   ✅ Puppeteer configurado para usar Chromium del sistema');
}

// Configurar puerto para Heroku
const PORT = process.env.PORT || 3000;
process.env.PORT = PORT;

console.log(`   ✅ Puerto configurado: ${PORT}`);
console.log('   ✅ Setup completado\n');
