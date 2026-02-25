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
const STREAM_DURATION = 0; // 0 = infinito (24 horas)
const FPS = 30;
const RESOLUTION = '1920x1080';
const BITRATE = '2500k';
const MAX_RETRIES = 10; // Intentos de reconexión
const RETRY_DELAY = 5000; // 5 segundos entre reintentos

async function streamToKick(retryCount = 0) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Iniciando streaming EN VIVO a Kick (24 HORAS)...');
    console.log(`📡 RTMPS: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 30)}...`);
    console.log(`🎥 URL completa: ${STREAM_URL.substring(0, 60)}...`);
    if (retryCount > 0) {
        console.log(`🔄 Reintento #${retryCount}`);
    }
    console.log('='.repeat(60) + '\n');
    
    const browser = await puppeteer.launch({
        headless: 'new', // Usar headless para servidor sin X
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-gpu',
            '--disable-software-rasterizer'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setViewport({ width: 1920, height: 1080 });

        // URL del video de YouTube
        const YOUTUBE_URL = 'https://www.youtube.com/watch?v=3CMVAtg8BTM';
        
        console.log('📡 Navegando a YouTube...');
        console.log(`🎥 Video: ${YOUTUBE_URL}`);
        
        // Navegar a YouTube
        await page.goto(YOUTUBE_URL, {
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
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ Página de YouTube cargada');

        // Aceptar cookies si aparece
        try {
            await page.evaluate(() => {
                const acceptButton = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent?.includes('Aceptar') || 
                    btn.textContent?.includes('Accept') ||
                    btn.textContent?.includes('Acepto')
                );
                if (acceptButton) {
                    acceptButton.click();
                    return true;
                }
                return false;
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {}

        // Reproducir el video y poner en pantalla completa
        console.log('▶️  Reproduciendo video y configurando pantalla completa...');
        
        try {
            // Esperar a que el reproductor esté listo
            await page.waitForSelector('video', { timeout: 10000 });
            
            // Reproducir el video
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    video.play();
                    // Saltar anuncios si es posible
                    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
                    if (skipButton) {
                        skipButton.click();
                    }
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Intentar poner en pantalla completa
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    // Intentar entrar en pantalla completa
                    if (video.requestFullscreen) {
                        video.requestFullscreen();
                    } else if (video.webkitRequestFullscreen) {
                        video.webkitRequestFullscreen();
                    } else if (video.mozRequestFullScreen) {
                        video.mozRequestFullScreen();
                    } else if (video.msRequestFullscreen) {
                        video.msRequestFullscreen();
                    }
                    
                    // También intentar con el botón de YouTube
                    const fullscreenButton = document.querySelector('.ytp-fullscreen-button');
                    if (fullscreenButton) {
                        fullscreenButton.click();
                    }
                }
            });
            
            console.log('✅ Video en reproducción');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Configurar para saltar anuncios automáticamente
            await page.evaluate(() => {
                // Observar y saltar anuncios
                const observer = new MutationObserver(() => {
                    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
                    if (skipButton && skipButton.offsetParent !== null) {
                        skipButton.click();
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });

        } catch (error) {
            console.log('⚠️  Error configurando video:', error.message);
            console.log('💡 Continuando con la transmisión...');
        }

        console.log('\n🎥 Iniciando transmisión EN VIVO a Kick...');
        console.log(`⏱️  Duración: ${STREAM_DURATION > 0 ? STREAM_DURATION + ' segundos' : '24 HORAS CONTINUAS (Ctrl+C para detener)'}`);
        console.log(`📊 Configuración: ${FPS} fps, ${RESOLUTION}, ${BITRATE} bitrate`);
        console.log(`🔄 Reintentos automáticos: ${MAX_RETRIES} intentos máximo\n`);

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
            // Intentar reconectar si no hemos excedido los reintentos
            if (retryCount < MAX_RETRIES) {
                console.log(`\n🔄 Intentando reconectar en ${RETRY_DELAY/1000} segundos...`);
                setTimeout(() => {
                    streamToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
                return;
            } else {
                console.error('\n💥 Máximo de reintentos alcanzado. Deteniendo...');
                process.exit(1);
            }
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`\n📡 Transmisión finalizada. Código de salida: ${code}`);
            isStreaming = false;
            
            // Si el código no es 0 (éxito) y no es una terminación manual, intentar reconectar
            if (code !== 0 && code !== null && retryCount < MAX_RETRIES) {
                console.log(`\n🔄 Código de error: ${code}. Intentando reconectar en ${RETRY_DELAY/1000} segundos...`);
                setTimeout(() => {
                    streamToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
                return;
            } else if (code !== 0 && code !== null) {
                console.error('\n💥 Máximo de reintentos alcanzado. Deteniendo...');
                process.exit(1);
            }
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

                // Verificar duración (solo si está configurada)
                if (STREAM_DURATION > 0 && (Date.now() - startTime) >= STREAM_DURATION * 1000) {
                    console.log('\n⏱️  Duración alcanzada, finalizando transmisión...');
                    isStreaming = false;
                    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                        ffmpegProcess.stdin.end();
                    }
                    return;
                }
                
                // Mostrar tiempo transcurrido cada minuto (para transmisión 24h)
                if (STREAM_DURATION === 0 && frameCount % (FPS * 60) === 0 && frameCount > 0) {
                    const hours = Math.floor((Date.now() - startTime) / (1000 * 60 * 60));
                    const minutes = Math.floor(((Date.now() - startTime) % (1000 * 60 * 60)) / (1000 * 60));
                    console.log(`\n⏰ Tiempo transcurrido: ${hours}h ${minutes}m | Frames: ${frameCount} | Estado: TRANSMITIENDO`);
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
            console.log('🔄 Transmisión continua 24/7. Presiona Ctrl+C para detener.');
            console.log('📊 El script se mantendrá activo y transmitiendo indefinidamente.\n');
            
            // Mantener el proceso vivo y monitorear la conexión
            const healthCheck = setInterval(() => {
                if (!isStreaming && retryCount < MAX_RETRIES) {
                    clearInterval(healthCheck);
                    console.log('\n⚠️  Transmisión detenida. Intentando reconectar...');
                    setTimeout(() => {
                        streamToKick(retryCount + 1).catch(console.error);
                    }, RETRY_DELAY);
                } else if (!isStreaming) {
                    clearInterval(healthCheck);
                }
            }, 10000); // Verificar cada 10 segundos
            
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
        
        // Intentar reconectar si no hemos excedido los reintentos
        if (retryCount < MAX_RETRIES) {
            console.log(`\n🔄 Error capturado. Intentando reconectar en ${RETRY_DELAY/1000} segundos... (Intento ${retryCount + 1}/${MAX_RETRIES})`);
            try {
                await browser.close();
            } catch (e) {}
            
            setTimeout(() => {
                streamToKick(retryCount + 1).catch(console.error);
            }, RETRY_DELAY);
            return;
        } else {
            console.error('\n💥 Máximo de reintentos alcanzado. Deteniendo...');
            try {
                await browser.close();
            } catch (e) {}
            throw error;
        }
    } finally {
        // Solo cerrar el navegador si no vamos a reintentar
        if (retryCount >= MAX_RETRIES || !isStreaming) {
            try {
                await browser.close();
                console.log('🔒 Navegador cerrado');
            } catch (e) {}
        }
    }
}

// Manejar señales para detener gracefully
let isShuttingDown = false;

process.on('SIGINT', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log('\n\n⚠️  Señal de interrupción recibida (Ctrl+C).');
        console.log('🛑 Deteniendo transmisión de forma segura...');
        console.log('⏳ Esto puede tomar unos segundos...\n');
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    }
});

process.on('SIGTERM', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log('\n\n⚠️  Señal de terminación recibida.');
        console.log('🛑 Deteniendo transmisión de forma segura...\n');
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    }
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
