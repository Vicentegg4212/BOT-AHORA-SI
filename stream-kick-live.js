/**
 * Script para hacer streaming EN VIVO a Kick usando Puppeteer y RTMPS
 * Stream Key: sk_us-west-2_qaJSZ28Skfyc_EFop1LvD87ltP2cMSZSVPVObXxa563
 * RTMPS URL: rtmps://fa723fc1b171.global-contribute.live-video.net
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración de Kick
const KICK_STREAM_KEY = 'sk_us-west-2_qaJSZ28Skfyc_EFop1LvD87ltP2cMSZSVPVObXxa563';
const KICK_RTMPS_URL = 'rtmps://fa723fc1b171.global-contribute.live-video.net';
const STREAM_URL = `${KICK_RTMPS_URL}/app/${KICK_STREAM_KEY}`;

// Configuración de streaming
const STREAM_DURATION = 60; // segundos (0 = infinito)
const FPS = 30;
const RESOLUTION = '1920x1080';
const BITRATE = '2500k';

async function streamToKick() {
    console.log('🚀 Iniciando streaming EN VIVO a Kick...');
    console.log(`📡 RTMPS: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 30)}...`);
    console.log(`🎥 URL completa: ${STREAM_URL.substring(0, 60)}...`);
    
    const browser = await puppeteer.launch({
        headless: false, // Necesario para capturar
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--start-maximized',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setViewport({ width: 1920, height: 1080 });

        // Configurar geolocalización
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.sasepa.mx', ['geolocation']);
        await page.setGeolocation({
            latitude: 19.4326,
            longitude: -99.1332,
            accuracy: 10
        });
        console.log('📍 Geolocalización configurada: Ciudad de México (19.4326, -99.1332)');

        console.log('📡 Navegando a https://www.sasepa.mx/...');
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Esperar a que cargue completamente
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Página cargada completamente');

        // Activar botón de alerta sísmica
        console.log('🔴 Buscando y activando botón de alerta sísmica...');
        try {
            const buttonClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase().trim();
                    if ((text.includes('alerta') || text.includes('alert')) && 
                        (text.includes('sísmica') || text.includes('sismica') || text.includes('sismic'))) {
                        btn.click();
                        return { clicked: true, text: btn.textContent };
                    }
                }
                return { clicked: false };
            });
            
            if (buttonClicked.clicked) {
                console.log(`✅ Botón activado: "${buttonClicked.text}"`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.log('⚠️  No se encontró el botón de alerta sísmica');
            }
        } catch (error) {
            console.log('⚠️  Error al buscar botón:', error.message);
        }

        console.log('\n🎥 Iniciando transmisión EN VIVO a Kick...');
        console.log(`⏱️  Duración: ${STREAM_DURATION > 0 ? STREAM_DURATION + ' segundos' : 'Infinito (Ctrl+C para detener)'}`);
        console.log(`📊 Configuración: ${FPS} fps, ${RESOLUTION}, ${BITRATE} bitrate\n`);

        // Crear pipe para transmitir frames en tiempo real
        const framesDir = path.join(__dirname, 'kick-live-frames');
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }
        fs.mkdirSync(framesDir, { recursive: true });

        // Iniciar ffmpeg para transmitir a RTMPS
        // Usaremos un pipe para enviar frames en tiempo real
        console.log('📡 Iniciando ffmpeg para transmisión RTMPS...');
        
        const ffmpegArgs = [
            '-y',
            '-f', 'image2pipe',
            '-vcodec', 'png',
            '-framerate', String(FPS),
            '-i', 'pipe:0',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-b:v', BITRATE,
            '-maxrate', BITRATE,
            '-bufsize', String(parseInt(BITRATE) * 2) + 'k',
            '-g', String(FPS * 2),
            '-keyint_min', String(FPS),
            '-sc_threshold', '0',
            '-profile:v', 'main',
            '-pix_fmt', 'yuv420p',
            '-f', 'flv',
            STREAM_URL
        ];

        if (STREAM_DURATION > 0) {
            ffmpegArgs.splice(1, 0, '-t', String(STREAM_DURATION));
        }

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let frameCount = 0;
        const startTime = Date.now();
        const frameInterval = 1000 / FPS;
        let isStreaming = true;

        // Manejar salida de ffmpeg
        ffmpegProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Mostrar progreso de ffmpeg
            if (output.includes('frame=') || output.includes('time=') || output.includes('bitrate=')) {
                process.stdout.write(data);
            }
        });

        ffmpegProcess.on('error', (error) => {
            console.error('\n❌ Error en ffmpeg:', error.message);
            isStreaming = false;
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`\n📡 Transmisión finalizada. Código de salida: ${code}`);
            isStreaming = false;
        });

        // Función para capturar y transmitir frames en tiempo real
        const captureAndStream = async () => {
            if (!isStreaming) return;

            try {
                // Capturar screenshot como buffer
                const screenshotBuffer = await page.screenshot({
                    fullPage: false,
                    encoding: 'binary'
                });

                // Enviar frame a ffmpeg a través del pipe
                if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    ffmpegProcess.stdin.write(screenshotBuffer);
                }

                frameCount++;

                // Mostrar progreso cada segundo
                if (frameCount % FPS === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    const fpsActual = (frameCount / elapsed).toFixed(1);
                    console.log(`📹 Transmitiendo... ${frameCount} frames | ${elapsed}s | ${fpsActual} fps`);
                }

                // Verificar duración
                if (STREAM_DURATION > 0 && (Date.now() - startTime) >= STREAM_DURATION * 1000) {
                    console.log('\n⏱️  Duración alcanzada, finalizando transmisión...');
                    isStreaming = false;
                    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                        ffmpegProcess.stdin.end();
                    }
                    return;
                }

                // Programar siguiente frame
                if (isStreaming) {
                    setTimeout(captureAndStream, frameInterval);
                }

            } catch (error) {
                console.error('❌ Error capturando frame:', error.message);
                if (isStreaming) {
                    setTimeout(captureAndStream, frameInterval);
                }
            }
        };

        // Esperar un momento antes de iniciar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Iniciar captura y transmisión
        console.log('🎬 Iniciando captura y transmisión...\n');
        captureAndStream();

        // Esperar a que termine (si hay duración limitada)
        if (STREAM_DURATION > 0) {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (!isStreaming || (Date.now() - startTime) >= STREAM_DURATION * 1000) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 1000);
            });
        } else {
            // Si es infinito, esperar hasta que se detenga manualmente
            console.log('🔄 Transmisión continua. Presiona Ctrl+C para detener.');
            await new Promise(() => {}); // Esperar indefinidamente
        }

        // Cerrar pipe de ffmpeg
        if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
            ffmpegProcess.stdin.end();
        }

        // Esperar a que ffmpeg termine
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!ffmpegProcess.killed) {
            ffmpegProcess.kill();
        }

        console.log('\n✅ Transmisión completada!');
        console.log(`📊 Total de frames transmitidos: ${frameCount}`);

    } catch (error) {
        console.error('❌ Error durante la transmisión:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('🔒 Navegador cerrado');
    }
}

// Manejar señales para detener gracefully
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Señal de interrupción recibida. Deteniendo transmisión...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Señal de terminación recibida. Deteniendo transmisión...');
    process.exit(0);
});

// Ejecutar
streamToKick()
    .then(() => {
        console.log('\n✨ Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
