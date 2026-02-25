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

// Configuración de streaming (optimizado para 4GB RAM)
const STREAM_DURATION = 0; // 0 = infinito (24 horas)
const FPS = 10; // FPS reducido para menor uso de RAM
const RESOLUTION = '1280x720'; // Resolución reducida (720p)
const BITRATE = '1500k'; // Bitrate reducido
const MAX_RETRIES = 10; // Intentos de reconexión
const RETRY_DELAY = 5000; // 5 segundos entre reintentos
const SCREENSHOT_QUALITY = 60; // Calidad reducida para menor RAM
const SCREENSHOT_TIMEOUT = 8000;
const MAX_BUFFER_SIZE = 512 * 1024; // Buffer máximo 512KB

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
    console.log('💾 Optimizado para: 4GB RAM máximo\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
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
            '--disable-javascript-harmony-shipping',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection',
            '--js-flags=--max-old-space-size=512',
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setViewport({ width: 1280, height: 720 });
        
        // Anti-detección de bot
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

        // URL del video de YouTube
        const YOUTUBE_URL = 'https://www.youtube.com/watch?v=3CMVAtg8BTM';
        
        console.log('📡 Navegando a YouTube...');
        console.log(`🎥 Video: ${YOUTUBE_URL}`);
        
        // Navegar a YouTube con comportamiento humano
        console.log('📡 Navegando a YouTube (simulando navegador real)...');
        
        // Primero ir a google.com para parecer más natural
        await page.goto('https://www.google.com', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Luego navegar a YouTube
        await page.goto(YOUTUBE_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Simular movimiento de mouse aleatorio
        await page.mouse.move(Math.random() * 1280, Math.random() * 720);
        await new Promise(resolve => setTimeout(resolve, 500));

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

        // Reproducir el video, saltar anuncios y poner en pantalla completa
        console.log('▶️  Configurando video: reproducción, sin anuncios y pantalla completa...');
        
        try {
            // Esperar a que el reproductor esté listo
            await page.waitForSelector('video', { timeout: 15000 });
            console.log('✅ Reproductor de video detectado');
            
            // Configurar para saltar anuncios automáticamente ANTES de reproducir
            await page.evaluate(() => {
                // Función para saltar anuncios
                const skipAds = () => {
                    // Buscar botón de saltar anuncio
                    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
                    if (skipButton && skipButton.offsetParent !== null) {
                        skipButton.click();
                        console.log('✅ Anuncio saltado');
                        return true;
                    }
                    
                    // Buscar overlay de anuncio y cerrarlo
                    const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');
                    if (adOverlay) {
                        adOverlay.click();
                        return true;
                    }
                    
                    return false;
                };
                
                // Observar cambios en el DOM para detectar anuncios
                const adObserver = new MutationObserver(() => {
                    skipAds();
                });
                
                adObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'style']
                });
                
                // También verificar periódicamente
                setInterval(skipAds, 500);
                
                // Guardar función globalmente
                window.skipYouTubeAds = skipAds;
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Reproducir el video
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    // Forzar reproducción
                    video.muted = false;
                    video.play().catch(e => {
                        console.log('Error al reproducir:', e);
                    });
                    
                    // Saltar anuncios inmediatamente
                    if (window.skipYouTubeAds) {
                        window.skipYouTubeAds();
                    }
                }
            });
            
            console.log('✅ Video iniciado');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Intentar poner en pantalla completa - Múltiples métodos
            console.log('🖥️  Activando pantalla completa...');
            await page.evaluate(() => {
                const video = document.querySelector('video');
                const player = document.querySelector('#movie_player');
                
                // Método 1: Botón de pantalla completa de YouTube
                const fullscreenButton = document.querySelector('.ytp-fullscreen-button, button[aria-label*="Pantalla completa"], button[aria-label*="Full screen"]');
                if (fullscreenButton) {
                    fullscreenButton.click();
                    console.log('✅ Pantalla completa activada (botón)');
                    return true;
                }
                
                // Método 2: API de pantalla completa del video
                if (video) {
                    if (video.requestFullscreen) {
                        video.requestFullscreen().catch(e => console.log('Error fullscreen:', e));
                    } else if (video.webkitRequestFullscreen) {
                        video.webkitRequestFullscreen();
                    } else if (video.mozRequestFullScreen) {
                        video.mozRequestFullScreen();
                    } else if (video.msRequestFullscreen) {
                        video.msRequestFullscreen();
                    }
                }
                
                // Método 3: API de pantalla completa del documento
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(e => console.log('Error fullscreen doc:', e));
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                }
                
                return false;
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verificar si está en pantalla completa
            const isFullscreen = await page.evaluate(() => {
                return !!(document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement);
            });
            
            if (isFullscreen) {
                console.log('✅ Pantalla completa activada');
            } else {
                console.log('⚠️  No se pudo activar pantalla completa automáticamente');
            }

            // Configurar monitoreo continuo para saltar anuncios durante la transmisión
            await page.evaluate(() => {
                // Observador mejorado para anuncios
                const adMonitor = setInterval(() => {
                    // Buscar y saltar anuncios
                    const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
                    skipButtons.forEach(btn => {
                        if (btn.offsetParent !== null) {
                            btn.click();
                        }
                    });
                    
                    // Cerrar overlays de anuncios
                    const closeButtons = document.querySelectorAll('.ytp-ad-overlay-close-button, .ytp-ad-text');
                    closeButtons.forEach(btn => {
                        if (btn.offsetParent !== null && btn.textContent?.includes('Cerrar')) {
                            btn.click();
                        }
                    });
                    
                    // Si hay un anuncio reproduciéndose, intentar saltarlo
                    const adPlaying = document.querySelector('.ad-showing, .ad-interrupting');
                    if (adPlaying && window.skipYouTubeAds) {
                        window.skipYouTubeAds();
                    }
                }, 1000); // Verificar cada segundo
                
                // Guardar intervalo para limpiar después
                window.adMonitorInterval = adMonitor;
            });

            console.log('✅ Configuración completa: Video reproduciendo, anuncios bloqueados, pantalla completa activada');

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
            '-vcodec', 'mjpeg', // Cambiado a mjpeg para JPEG
            '-framerate', String(FPS),
            '-i', 'pipe:0',
            '-c:v', 'libx264',
            '-preset', 'ultrafast', // Cambiado a ultrafast para mejor rendimiento
            '-tune', 'zerolatency',
            '-b:v', BITRATE,
            '-maxrate', BITRATE,
            '-bufsize', String(parseInt(BITRATE) * 2) + 'k',
            '-g', String(FPS * 2),
            '-keyint_min', String(FPS),
            '-sc_threshold', '0',
            '-profile:v', 'baseline', // Cambiado a baseline para menor latencia
            '-pix_fmt', 'yuv420p',
            '-threads', '2', // Limitar threads para mejor estabilidad
            '-f', 'flv',
            '-flvflags', 'no_duration_filesize', // Optimización para streaming
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

        // Función para capturar y transmitir frames en tiempo real (OPTIMIZADA)
        const captureAndStream = async () => {
            if (!isStreaming) return;

            const frameStartTime = Date.now();
            
            try {
                // Capturar screenshot optimizado (más rápido y robusto)
                let screenshotBuffer = null;
                
                try {
                    screenshotBuffer = await page.screenshot({
                        fullPage: false,
                        encoding: 'binary',
                        type: 'jpeg', // JPEG es más rápido que PNG
                        quality: SCREENSHOT_QUALITY,
                        timeout: SCREENSHOT_TIMEOUT
                    });
                } catch (screenshotError) {
                    // Si falla, intentar método alternativo sin clip
                    try {
                        screenshotBuffer = await page.screenshot({
                            fullPage: false,
                            encoding: 'binary',
                            type: 'jpeg',
                            quality: 60,
                            timeout: SCREENSHOT_TIMEOUT
                        });
                    } catch (retryError) {
                        // Si sigue fallando, usar método básico
                        screenshotBuffer = await page.screenshot({
                            encoding: 'binary',
                            timeout: SCREENSHOT_TIMEOUT
                        }).catch(() => null);
                    }
                }

                if (screenshotBuffer && ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    // Verificar que el pipe no esté lleno antes de escribir
                    if (ffmpegProcess.stdin.writableLength < 1024 * 1024) { // Menos de 1MB en buffer
                        ffmpegProcess.stdin.write(screenshotBuffer, (err) => {
                            if (err) {
                                console.error('⚠️  Error escribiendo a ffmpeg:', err.message);
                            }
                        });
                    } else {
                        // Buffer lleno, esperar un poco
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }

                frameCount++;
                const frameTime = Date.now() - frameStartTime;

                // Mostrar progreso cada 5 segundos (menos frecuente para no saturar logs)
                if (frameCount % (FPS * 5) === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    const fpsActual = (frameCount / elapsed).toFixed(1);
                    const avgFrameTime = (frameTime).toFixed(0);
                    console.log(`📹 Transmitiendo... ${frameCount} frames | ${elapsed}s | ${fpsActual} fps | Frame: ${avgFrameTime}ms`);
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

                // Calcular tiempo de espera dinámico basado en el tiempo real del frame
                const actualFrameTime = Date.now() - frameStartTime;
                const waitTime = Math.max(0, frameInterval - actualFrameTime);

                // Programar siguiente frame
                if (isStreaming) {
                    setTimeout(captureAndStream, waitTime);
                }

            } catch (error) {
                // Manejo de errores mejorado - no detener, solo reintentar
                if (error.message && !error.message.includes('timeout')) {
                    console.error('⚠️  Error capturando frame:', error.message);
                }
                
                // Reintentar después de un breve delay
                if (isStreaming) {
                    setTimeout(captureAndStream, frameInterval * 2); // Esperar el doble si hay error
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
