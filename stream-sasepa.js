/**
 * Script para hacer streaming/grabación de https://www.sasepa.mx/
 * usando Puppeteer por unos segundos
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function streamSasepa() {
    console.log('🚀 Iniciando Puppeteer...');
    
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
        
        // Configurar viewport
        await page.setViewport({
            width: 1920,
            height: 1080
        });

        console.log('📡 Navegando a https://www.sasepa.mx/...');
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏳ Esperando a que la página cargue completamente...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos para que cargue todo

        // Iniciar grabación de video (si está disponible)
        const videoPath = path.join(__dirname, 'sasepa-stream.mp4');
        
        console.log('🎥 Iniciando grabación por 5 segundos...');
        
        // Puppeteer no tiene grabación de video nativa, pero podemos:
        // 1. Tomar múltiples screenshots
        // 2. O usar la API experimental de video si está disponible
        
        // Opción 1: Múltiples screenshots (más compatible)
        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }

        const duration = 5; // segundos
        const fps = 2; // frames por segundo
        const totalFrames = duration * fps;

        console.log(`📸 Capturando ${totalFrames} frames...`);
        
        for (let i = 0; i < totalFrames; i++) {
            const screenshotPath = path.join(screenshotsDir, `frame-${String(i).padStart(3, '0')}.png`);
            await page.screenshot({
                path: screenshotPath,
                fullPage: false
            });
            console.log(`✅ Frame ${i + 1}/${totalFrames} capturado`);
            await new Promise(resolve => setTimeout(resolve, 1000 / fps)); // Esperar entre frames
        }

        console.log('✅ Grabación completada!');
        console.log(`📁 Screenshots guardados en: ${screenshotsDir}`);
        
        // Intentar usar la API de video si está disponible (experimental)
        try {
            const client = await page.target().createCDPSession();
            await client.send('Page.startScreencast', {
                format: 'png',
                quality: 100,
                maxWidth: 1920,
                maxHeight: 1080
            });

            const frames = [];
            const frameHandler = (frame) => {
                frames.push(Buffer.from(frame.data, 'base64'));
            };
            
            client.on('Page.screencastFrame', async (event) => {
                frameHandler(event);
                await client.send('Page.screencastFrameAck', { sessionId: event.sessionId });
            });

            console.log('🎬 Grabando video por 5 segundos...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            await client.send('Page.stopScreencast');
            client.removeAllListeners('Page.screencastFrame');

            if (frames.length > 0) {
                console.log(`✅ Capturados ${frames.length} frames del screencast`);
                // Guardar el primer frame como ejemplo
                fs.writeFileSync(
                    path.join(__dirname, 'sasepa-screencast-frame.png'),
                    frames[0]
                );
                console.log('💾 Frame del screencast guardado como sasepa-screencast-frame.png');
            }
        } catch (error) {
            console.log('⚠️  API de screencast no disponible, usando solo screenshots');
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
        console.log('✨ Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
