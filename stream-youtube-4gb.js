/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING YOUTUBE A KICK - OPTIMIZADO PARA 4GB RAM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Script completo para transmitir YouTube a Kick
 * - Video: https://www.youtube.com/watch?v=3CMVAtg8BTM
 * - Sin anuncios, pantalla completa
 * - Optimizado para 4GB RAM
 * - Anti-detección de bot
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Intentar usar ffmpeg de npm si está disponible
let ffmpegPath = 'ffmpeg';
try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpegPath = ffmpegInstaller.path;
    console.log('✅ Usando ffmpeg de npm');
} catch (e) {
    console.log('ℹ️  Usando ffmpeg del sistema');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const KICK_STREAM_KEY = 'sk_us-west-2_qaJSZ28Skfyc_EFop1LvD87ltP2cMSZSVPVObXxa563';
const KICK_RTMPS_URL = 'rtmps://fa723fc1b171.global-contribute.live-video.net';
const STREAM_URL = `${KICK_RTMPS_URL}/app/${KICK_STREAM_KEY}`;

// Configuración optimizada para 4GB RAM
const STREAM_DURATION = 0; // 0 = infinito (24 horas)
const FPS = 10;
const RESOLUTION = '1280x720';
const BITRATE = '1500k';
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;
const SCREENSHOT_QUALITY = 60;
const SCREENSHOT_TIMEOUT = 8000;
const MAX_BUFFER_SIZE = 512 * 1024;

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function streamToKick(retryCount = 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 STREAMING YOUTUBE A KICK - 4GB RAM');
    console.log('═'.repeat(70));
    console.log(`📡 RTMPS: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 30)}...`);
    console.log(`💾 Optimizado para: 4GB RAM máximo`);
    console.log(`📊 Config: ${FPS} fps, ${RESOLUTION}, ${BITRATE} bitrate`);
    if (retryCount > 0) {
        console.log(`🔄 Reintento #${retryCount}`);
    }
    console.log('═'.repeat(70) + '\n');

    let browser = null;
    let page = null;
    let ffmpegProcess = null;
    let isStreaming = false;

    try {
        // Inicializar navegador (HEADLESS FORZADO)
        console.log('🌐 Iniciando navegador (headless mode)...');
        browser = await puppeteer.launch({
            headless: true, // FORZAR headless
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,720',
                '--disable-blink-features=AutomationControlled',
                '--autoplay-policy=no-user-gesture-required',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',
                '--js-flags=--max-old-space-size=512',
                '--memory-pressure-off',
                '--max_old_space_size=512',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setViewport({ width: 1280, height: 720 });

        // Anti-detección de bot
        console.log('🛡️  Configurando anti-detección...');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en-US', 'en'] });
            window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
        });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });
        console.log('✅ Anti-detección configurado');

        // Navegar a YouTube
        const YOUTUBE_URL = 'https://www.youtube.com/watch?v=3CMVAtg8BTM';
        console.log('📡 Navegando a YouTube...');
        console.log(`🎥 Video: ${YOUTUBE_URL}`);

        // Comportamiento humano: primero Google
        await page.goto('https://www.google.com', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Luego YouTube
        await page.goto(YOUTUBE_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ Página de YouTube cargada');

        // Aceptar cookies
        try {
            await page.evaluate(() => {
                const acceptButton = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent?.includes('Aceptar') || 
                    btn.textContent?.includes('Accept')
                );
                if (acceptButton) acceptButton.click();
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {}

        // Reproducir video y pantalla completa
        console.log('▶️  Configurando video...');
        try {
            await page.waitForSelector('video', { timeout: 15000 });
            
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    video.play();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Pantalla completa
            await page.evaluate(() => {
                const fullscreenButton = document.querySelector('.ytp-fullscreen-button');
                if (fullscreenButton) {
                    fullscreenButton.click();
                }
            });
            
            // Saltar anuncios automáticamente
            await page.evaluate(() => {
                const skipAds = () => {
                    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
                    if (skipButton && skipButton.offsetParent !== null) {
                        skipButton.click();
                    }
                };
                setInterval(skipAds, 1000);
                window.skipYouTubeAds = skipAds;
            });

            console.log('✅ Video configurado');
        } catch (error) {
            console.log('⚠️  Error configurando video:', error.message);
        }

        // Iniciar ffmpeg
        console.log('\n🎥 Iniciando transmisión RTMPS...');
        const ffmpegArgs = [
            '-y',
            '-f', 'image2pipe',
            '-vcodec', 'mjpeg',
            '-framerate', String(FPS),
            '-i', 'pipe:0',
            '-s', RESOLUTION,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-b:v', BITRATE,
            '-maxrate', BITRATE,
            '-bufsize', String(parseInt(BITRATE) * 1.5) + 'k',
            '-g', String(FPS * 2),
            '-keyint_min', String(FPS),
            '-sc_threshold', '0',
            '-profile:v', 'baseline',
            '-pix_fmt', 'yuv420p',
            '-threads', '1',
            '-f', 'flv',
            '-flvflags', 'no_duration_filesize',
            STREAM_URL
        ];

        ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        ffmpegProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('frame=') || output.includes('time=') || output.includes('bitrate=')) {
                process.stdout.write(data);
            }
        });

        ffmpegProcess.on('error', (error) => {
            console.error('\n❌ Error en ffmpeg:', error.message);
            isStreaming = false;
            if (retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    streamToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
                return;
            }
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`\n📡 Transmisión finalizada. Código: ${code}`);
            isStreaming = false;
            if (code !== 0 && code !== null && retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    streamToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
            }
        });

        // Captura y transmisión
        isStreaming = true;
        let frameCount = 0;
        const startTime = Date.now();
        const frameInterval = 1000 / FPS;

        console.log('🎬 Iniciando captura y transmisión...\n');

        const captureAndStream = async () => {
            if (!isStreaming) return;

            try {
                let screenshotBuffer = null;
                
                try {
                    screenshotBuffer = await page.screenshot({
                        fullPage: false,
                        encoding: 'binary',
                        type: 'jpeg',
                        quality: SCREENSHOT_QUALITY,
                        timeout: SCREENSHOT_TIMEOUT,
                        clip: { x: 0, y: 0, width: 1280, height: 720 }
                    });
                } catch (e) {
                    try {
                        screenshotBuffer = await page.screenshot({
                            fullPage: false,
                            encoding: 'binary',
                            type: 'jpeg',
                            quality: 50,
                            timeout: SCREENSHOT_TIMEOUT
                        });
                    } catch (e2) {
                        screenshotBuffer = await page.screenshot({
                            encoding: 'binary',
                            timeout: SCREENSHOT_TIMEOUT
                        }).catch(() => null);
                    }
                }

                if (screenshotBuffer && ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    if (ffmpegProcess.stdin.writableLength < MAX_BUFFER_SIZE) {
                        const written = ffmpegProcess.stdin.write(screenshotBuffer, (err) => {
                            if (err && err.message !== 'write EPIPE') {}
                        });
                        if (!written) {
                            await new Promise(resolve => {
                                ffmpegProcess.stdin.once('drain', resolve);
                                setTimeout(resolve, 100);
                            });
                        }
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    screenshotBuffer = null;
                }

                frameCount++;
                const frameTime = Date.now() - startTime;

                if (frameCount % (FPS * 10) === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    const fpsActual = (frameCount / elapsed).toFixed(1);
                    const memUsage = process.memoryUsage();
                    const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
                    console.log(`📹 Transmitiendo... ${frameCount} frames | ${elapsed}s | ${fpsActual} fps | RAM: ${memMB}MB`);
                    
                    if (memUsage.heapUsed > 3 * 1024 * 1024 * 1024) {
                        if (global.gc) {
                            global.gc();
                            console.log('🧹 Garbage collection ejecutado');
                        }
                    }
                }

                if (STREAM_DURATION > 0 && (Date.now() - startTime) >= STREAM_DURATION * 1000) {
                    isStreaming = false;
                    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                        ffmpegProcess.stdin.end();
                    }
                    return;
                }

                if (STREAM_DURATION === 0 && frameCount % (FPS * 60) === 0 && frameCount > 0) {
                    const hours = Math.floor((Date.now() - startTime) / (1000 * 60 * 60));
                    const minutes = Math.floor(((Date.now() - startTime) % (1000 * 60 * 60)) / (1000 * 60));
                    console.log(`\n⏰ Tiempo: ${hours}h ${minutes}m | Frames: ${frameCount} | TRANSMITIENDO`);
                }

                const actualFrameTime = Date.now() - startTime;
                const waitTime = Math.max(0, frameInterval - (actualFrameTime % frameInterval));

                if (isStreaming) {
                    setTimeout(captureAndStream, waitTime);
                }

            } catch (error) {
                if (isStreaming) {
                    setTimeout(captureAndStream, frameInterval * 2);
                }
            }
        };

        await new Promise(resolve => setTimeout(resolve, 1000));
        captureAndStream();

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
            console.log('🔄 Transmisión continua 24/7. Presiona Ctrl+C para detener.\n');
            const healthCheck = setInterval(() => {
                if (!isStreaming && retryCount < MAX_RETRIES) {
                    clearInterval(healthCheck);
                    setTimeout(() => {
                        streamToKick(retryCount + 1).catch(console.error);
                    }, RETRY_DELAY);
                } else if (!isStreaming) {
                    clearInterval(healthCheck);
                }
            }, 10000);
            await new Promise(() => {});
        }

        if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
            ffmpegProcess.stdin.end();
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!ffmpegProcess.killed) {
            ffmpegProcess.kill();
        }

        console.log('\n✅ Transmisión completada!');
        console.log(`📊 Total de frames: ${frameCount}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (retryCount < MAX_RETRIES) {
            console.log(`\n🔄 Reconectando en ${RETRY_DELAY/1000} segundos... (${retryCount + 1}/${MAX_RETRIES})`);
            try {
                if (browser) await browser.close();
            } catch (e) {}
            setTimeout(() => {
                streamToKick(retryCount + 1).catch(console.error);
            }, RETRY_DELAY);
            return;
        } else {
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {}
            }
            throw error;
        }
    } finally {
        if (retryCount >= MAX_RETRIES || !isStreaming) {
            try {
                if (browser) await browser.close();
                console.log('🔒 Navegador cerrado');
            } catch (e) {}
        }
    }
}

// Manejo de señales
let isShuttingDown = false;
process.on('SIGINT', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log('\n\n⚠️  Deteniendo transmisión...');
        setTimeout(() => process.exit(0), 3000);
    }
});

process.on('SIGTERM', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log('\n\n⚠️  Deteniendo transmisión...');
        setTimeout(() => process.exit(0), 3000);
    }
});

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
