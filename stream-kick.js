/**
 * Script para hacer streaming a Kick usando Puppeteer y RTMPS
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
const STREAM_DURATION = 60; // segundos (1 minuto)
const FPS = 30; // frames por segundo para streaming
const RESOLUTION = '1920x1080';
const BITRATE = '2500k'; // bitrate para streaming

async function streamToKick() {
    console.log('🚀 Iniciando Puppeteer para streaming a Kick...');
    console.log(`📡 URL de transmisión: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 20)}...`);
    
    const browser = await puppeteer.launch({
        headless: false, // Necesitamos ver el navegador para capturar
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--start-maximized',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Activar JavaScript
        await page.setJavaScriptEnabled(true);
        
        // Configurar viewport
        await page.setViewport({
            width: 1920,
            height: 1080
        });

        // Configurar geolocalización
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.sasepa.mx', ['geolocation']);
        const mexicoCityCoords = {
            latitude: 19.4326,
            longitude: -99.1332,
            accuracy: 10
        };
        await page.setGeolocation(mexicoCityCoords);
        console.log('📍 Geolocalización configurada: Ciudad de México');

        console.log('📡 Navegando a https://www.sasepa.mx/...');
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏳ Esperando a que la página cargue...');
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Buscar y hacer clic en el botón de alerta sísmica
        console.log('🔴 Buscando botón de alerta sísmica...');
        try {
            const buttonClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                for (const btn of buttons) {
                    const text = btn.textContent?.toLowerCase() || '';
                    if (text.includes('alerta') && (text.includes('sísmica') || text.includes('sismica'))) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (buttonClicked) {
                console.log('✅ Botón de alerta sísmica activado');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.log('⚠️  No se pudo hacer clic en el botón:', error.message);
        }

        console.log('🎥 Iniciando captura de pantalla y transmisión a Kick...');
        console.log(`⏱️  Duración: ${STREAM_DURATION} segundos`);
        
        // Obtener el PID del proceso de Chrome para capturar su ventana
        const browserProcess = browser.process();
        console.log(`🖥️  PID del navegador: ${browserProcess?.pid || 'N/A'}`);

        // Método 1: Usar x11grab para capturar la pantalla (si está disponible)
        // Método 2: Capturar frames con Puppeteer y transmitirlos con ffmpeg
        
        // Crear directorio temporal para frames
        const framesDir = path.join(__dirname, 'stream-frames');
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }
        fs.mkdirSync(framesDir, { recursive: true });

        // Iniciar ffmpeg para transmitir
        console.log('📡 Iniciando transmisión RTMPS a Kick...');
        
        // Comando ffmpeg para transmitir desde frames
        // Primero capturamos frames, luego los transmitimos en tiempo real
        const totalFrames = STREAM_DURATION * FPS;
        const frameInterval = 1000 / FPS;

        console.log(`📸 Capturando y transmitiendo ${totalFrames} frames a ${FPS} fps...`);

        // Capturar frames y transmitir en tiempo real
        let frameCount = 0;
        const startTime = Date.now();

        // Función para capturar y transmitir un frame
        const captureAndStream = async () => {
            if (frameCount >= totalFrames) {
                return;
            }

            try {
                const framePath = path.join(framesDir, `frame-${String(frameCount).padStart(6, '0')}.png`);
                
                // Capturar screenshot
                await page.screenshot({
                    path: framePath,
                    fullPage: false
                });

                frameCount++;

                // Mostrar progreso
                if (frameCount % 30 === 0 || frameCount === 1) {
                    const progress = (frameCount / totalFrames * 100).toFixed(1);
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`📹 Frame ${frameCount}/${totalFrames} (${progress}% - ${elapsed}s)`);
                }

                // Programar siguiente frame
                if (frameCount < totalFrames) {
                    setTimeout(captureAndStream, frameInterval);
                }
            } catch (error) {
                console.error('❌ Error capturando frame:', error.message);
            }
        };

        // Iniciar captura de frames
        captureAndStream();

        // Mientras capturamos frames, iniciar ffmpeg para transmitir
        // Usaremos un enfoque diferente: transmitir directamente desde x11grab o usar un pipe
        
        // Alternativa: Usar ffmpeg con x11grab para capturar la ventana directamente
        console.log('🎬 Iniciando transmisión con ffmpeg...');
        
        // Comando ffmpeg para transmitir a RTMPS
        const ffmpegArgs = [
            '-f', 'x11grab',
            '-s', RESOLUTION,
            '-r', String(FPS),
            '-i', ':0.0+0,0', // Capturar desde pantalla principal
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-b:v', BITRATE,
            '-maxrate', BITRATE,
            '-bufsize', String(parseInt(BITRATE) * 2) + 'k',
            '-g', String(FPS * 2), // GOP size
            '-keyint_min', String(FPS),
            '-sc_threshold', '0',
            '-profile:v', 'main',
            '-level', '3.1',
            '-pix_fmt', 'yuv420p',
            '-f', 'flv',
            STREAM_URL
        ];

        console.log('📡 Comando ffmpeg:', 'ffmpeg', ffmpegArgs.join(' '));
        
        // Intentar método alternativo si x11grab no funciona
        // Usar frames capturados y transmitirlos
        const useFrameStream = true; // Cambiar a false para usar x11grab directo

        if (useFrameStream) {
            // Esperar a que tengamos algunos frames
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Transmitir frames capturados
            const streamFfmpeg = spawn('ffmpeg', [
                '-y',
                '-framerate', String(FPS),
                '-i', path.join(framesDir, 'frame-%06d.png'),
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
            ]);

            streamFfmpeg.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            streamFfmpeg.stderr.on('data', (data) => {
                process.stderr.write(data);
            });

            streamFfmpeg.on('close', (code) => {
                console.log(`\n📡 Transmisión finalizada con código: ${code}`);
            });

            // Esperar a que termine la captura
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (frameCount >= totalFrames) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 1000);
            });

            // Esperar un poco más para que ffmpeg procese todos los frames
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Cerrar ffmpeg
            streamFfmpeg.kill();
        } else {
            // Método directo con x11grab
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            ffmpegProcess.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            ffmpegProcess.stderr.on('data', (data) => {
                process.stderr.write(data);
            });

            ffmpegProcess.on('close', (code) => {
                console.log(`\n📡 Transmisión finalizada con código: ${code}`);
            });

            // Transmitir por el tiempo especificado
            await new Promise(resolve => setTimeout(resolve, STREAM_DURATION * 1000));

            // Detener ffmpeg
            ffmpegProcess.kill();
        }

        console.log('✅ Transmisión completada!');

    } catch (error) {
        console.error('❌ Error durante la transmisión:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('🔒 Navegador cerrado');
    }
}

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
