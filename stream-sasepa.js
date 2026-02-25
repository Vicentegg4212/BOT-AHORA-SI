/**
 * Script para hacer streaming/grabación de https://www.sasepa.mx/
 * usando Puppeteer por 1 minuto
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function streamSasepa() {
    console.log('🚀 Iniciando Puppeteer...');
    
    const videoPath = path.join(__dirname, 'sasepa-stream.mp4');
    const screenshotsDir = path.join(__dirname, 'screenshots');
    
    // Limpiar screenshots anteriores
    if (fs.existsSync(screenshotsDir)) {
        fs.rmSync(screenshotsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(screenshotsDir, { recursive: true });
    
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Activar JavaScript explícitamente (ya está activado por defecto, pero lo confirmamos)
        await page.setJavaScriptEnabled(true);
        
        // Configurar viewport
        await page.setViewport({
            width: 1920,
            height: 1080
        });

        console.log('📡 Navegando a https://www.sasepa.mx/...');
        console.log('✅ JavaScript habilitado en el navegador');
        
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏳ Esperando a que JavaScript se ejecute completamente...');
        // Esperar a que el JavaScript de la página se ejecute
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        });
        
        // Esperar un poco más para que las animaciones y scripts dinámicos se ejecuten
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Configuración de grabación
        const duration = 60; // segundos (1 minuto)
        const fps = 10; // frames por segundo (más suave)
        const totalFrames = duration * fps;
        const frameInterval = 1000 / fps; // milisegundos entre frames

        console.log(`🎥 Iniciando grabación por ${duration} segundos (1 minuto) a ${fps} fps...`);
        console.log(`📸 Capturando ${totalFrames} frames...`);
        console.log(`⏱️  Tiempo estimado: ~${Math.ceil(totalFrames * frameInterval / 1000)} segundos`);
        
        // Capturar frames
        for (let i = 0; i < totalFrames; i++) {
            const framePath = path.join(screenshotsDir, `frame-${String(i).padStart(4, '0')}.png`);
            
            // Asegurar que JavaScript se ejecute antes de cada screenshot
            await page.evaluate(() => {
                // Forzar ejecución de cualquier script pendiente
                return Promise.resolve();
            });
            
            await page.screenshot({
                path: framePath,
                fullPage: false
            });
            
            // Mostrar progreso cada 50 frames o en puntos clave
            if ((i + 1) % 50 === 0 || i === 0 || (i + 1) === totalFrames) {
                const progress = ((i + 1) / totalFrames * 100).toFixed(1);
                const elapsed = ((i + 1) * frameInterval / 1000).toFixed(1);
                console.log(`✅ Frame ${i + 1}/${totalFrames} capturado (${progress}% - ${elapsed}s)`);
            }
            
            // Esperar antes del siguiente frame (excepto en el último)
            if (i < totalFrames - 1) {
                await new Promise(resolve => setTimeout(resolve, frameInterval));
            }
        }

        console.log('✅ Todos los frames capturados!');
        console.log(`📁 Frames guardados en: ${screenshotsDir}`);
        
        // Crear video con ffmpeg
        try {
            console.log('🎞️  Creando video con ffmpeg...');
            execSync(`ffmpeg -y -framerate ${fps} -i ${screenshotsDir}/frame-%04d.png -c:v libx264 -pix_fmt yuv420p -crf 23 -preset fast ${videoPath}`, {
                stdio: 'inherit'
            });
            console.log(`\n✅ Video creado exitosamente: ${videoPath}`);
            console.log(`📹 Puedes ver el video en: ${videoPath}`);
            
            // Mostrar información del video
            const stats = fs.statSync(videoPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`📊 Tamaño del video: ${sizeMB} MB`);
        } catch (ffmpegError) {
            console.error('❌ Error al crear video con ffmpeg:', ffmpegError.message);
            console.log('💡 Los frames están en la carpeta screenshots/');
            console.log(`   Ejecuta manualmente: ffmpeg -framerate ${fps} -i screenshots/frame-%04d.png -c:v libx264 -pix_fmt yuv420p ${videoPath}`);
        }

        // Tomar un screenshot final de alta calidad
        const finalScreenshot = path.join(__dirname, 'sasepa-final.png');
        await page.screenshot({
            path: finalScreenshot,
            fullPage: true
        });
        console.log(`📸 Screenshot final guardado: ${finalScreenshot}`);

    } catch (error) {
        console.error('❌ Error durante la grabación:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('🔒 Navegador cerrado');
    }
}

// Ejecutar
streamSasepa()
    .then(() => {
        console.log('\n✨ Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
