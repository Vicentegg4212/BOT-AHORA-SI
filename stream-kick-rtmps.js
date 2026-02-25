/**
 * Script para hacer streaming a Kick usando Puppeteer y RTMPS
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
const STREAM_DURATION = 60; // segundos
const FPS = 30;
const RESOLUTION = '1920x1080';
const BITRATE = '2500k';

async function streamToKick() {
    console.log('🚀 Iniciando streaming a Kick...');
    console.log(`📡 RTMPS: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 25)}...`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--start-maximized',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
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
        console.log('📍 Geolocalización: Ciudad de México');

        console.log('📡 Navegando a https://www.sasepa.mx/...');
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Activar botón de alerta sísmica
        console.log('🔴 Activando botón de alerta sísmica...');
        try {
            await page.evaluate(() => {
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
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('✅ Alerta sísmica activada');
        } catch (error) {
            console.log('⚠️  Error con botón:', error.message);
        }

        console.log('🎥 Iniciando transmisión RTMPS a Kick...');
        console.log(`⏱️  Duración: ${STREAM_DURATION} segundos`);

        // Método: Capturar frames con Puppeteer y transmitir con ffmpeg
        const framesDir = path.join(__dirname, 'kick-stream-frames');
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }
        fs.mkdirSync(framesDir, { recursive: true });

        const totalFrames = STREAM_DURATION * FPS;
        const frameInterval = 1000 / FPS;
        let frameCount = 0;
        const startTime = Date.now();

        console.log(`📸 Capturando ${totalFrames} frames a ${FPS} fps...`);

        // Función para capturar frames
        const captureFrame = async () => {
            if (frameCount >= totalFrames) return;

            try {
                const framePath = path.join(framesDir, `frame-${String(frameCount).padStart(6, '0')}.png`);
                await page.screenshot({ path: framePath, fullPage: false });
                frameCount++;

                if (frameCount % 30 === 0 || frameCount === 1) {
                    const progress = (frameCount / totalFrames * 100).toFixed(1);
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`📹 Frame ${frameCount}/${totalFrames} (${progress}% - ${elapsed}s)`);
                }

                if (frameCount < totalFrames) {
                    setTimeout(captureFrame, frameInterval);
                }
            } catch (error) {
                console.error('❌ Error capturando:', error.message);
            }
        };

        // Iniciar captura
        captureFrame();

        // Esperar a que se capturen suficientes frames antes de iniciar transmisión
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Iniciar ffmpeg para transmitir a RTMPS
        console.log('📡 Iniciando ffmpeg para transmisión RTMPS...');
        
        const ffmpegProcess = spawn('ffmpeg', [
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
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        ffmpegProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Mostrar solo líneas importantes de ffmpeg
            if (output.includes('frame=') || output.includes('time=') || output.includes('bitrate=')) {
                process.stdout.write(data);
            }
        });

        ffmpegProcess.on('error', (error) => {
            console.error('❌ Error en ffmpeg:', error.message);
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`\n📡 Transmisión finalizada. Código: ${code}`);
        });

        // Esperar a que se completen todos los frames
        while (frameCount < totalFrames) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Todos los frames capturados');
        
        // Esperar a que ffmpeg procese y transmita
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Cerrar ffmpeg
        if (!ffmpegProcess.killed) {
            ffmpegProcess.kill();
        }

        console.log('✅ Transmisión completada!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await browser.close();
        console.log('🔒 Navegador cerrado');
    }
}

// Ejecutar
streamToKick()
    .then(() => {
        console.log('\n✨ Proceso completado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
