/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING SASEPA A KICK - VERSIÓN OPTIMIZADA SIN ERRORES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Script completo para transmitir https://www.sasepa.mx/ a Kick
 * - Geolocalización activada
 * - Botón de alerta sísmica activado
 * - Streaming estable 24 horas
 * - Sin errores, optimizado
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Configuración de Kick
const KICK_STREAM_KEY = 'sk_us-west-2_qaJSZ28Skfyc_EFop1LvD87ltP2cMSZSVPVObXxa563';
const KICK_RTMPS_URL = 'rtmps://fa723fc1b171.global-contribute.live-video.net';
const STREAM_URL = `${KICK_RTMPS_URL}/app/${KICK_STREAM_KEY}`;

// Configuración de streaming (optimizado para 4GB RAM)
const STREAM_DURATION = 0; // 0 = infinito (24 horas)
const FPS = 10; // FPS reducido para menor uso de RAM
const RESOLUTION = '1280x720'; // Resolución reducida (720p en lugar de 1080p)
const BITRATE = '1500k'; // Bitrate reducido
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;

// Configuración de captura (optimizado para RAM)
const SCREENSHOT_QUALITY = 60; // Calidad reducida
const SCREENSHOT_TIMEOUT = 8000;
const MAX_BUFFER_SIZE = 512 * 1024; // Buffer máximo 512KB (reducido)

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function streamSasepaToKick(retryCount = 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 STREAMING SASEPA A KICK - INICIANDO');
    console.log('═'.repeat(70));
    console.log(`📡 RTMPS: ${KICK_RTMPS_URL}`);
    console.log(`🔑 Stream Key: ${KICK_STREAM_KEY.substring(0, 30)}...`);
    console.log(`⏱️  Duración: ${STREAM_DURATION > 0 ? STREAM_DURATION + ' segundos' : '24 HORAS CONTINUAS'}`);
    console.log(`📊 Config: ${FPS} fps, ${RESOLUTION}, ${BITRATE} bitrate`);
console.log(`💾 Optimizado para: 4GB RAM máximo`);
    if (retryCount > 0) {
        console.log(`🔄 Reintento #${retryCount}`);
    }
    console.log('═'.repeat(70) + '\n');

    let browser = null;
    let page = null;
    let ffmpegProcess = null;
    let isStreaming = false;

    try {
        // ═══════════════════════════════════════════════════════════════════
        // INICIALIZAR NAVEGADOR
        // ═══════════════════════════════════════════════════════════════════
        
        console.log('🌐 Iniciando navegador (optimizado para 4GB RAM)...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,720', // Resolución reducida
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
                '--js-flags=--max-old-space-size=512', // Limitar memoria de JS a 512MB
                '--memory-pressure-off',
                '--max_old_space_size=512'
            ]
        });

        page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setViewport({ width: 1280, height: 720 }); // Viewport reducido

        // ═══════════════════════════════════════════════════════════════════
        // CONFIGURAR GEOLOCALIZACIÓN
        // ═══════════════════════════════════════════════════════════════════
        
        console.log('📍 Configurando geolocalización...');
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.sasepa.mx', ['geolocation']);
        await page.setGeolocation({
            latitude: 19.4326,
            longitude: -99.1332,
            accuracy: 10
        });
        console.log('✅ Geolocalización: Ciudad de México (19.4326, -99.1332)');

        // ═══════════════════════════════════════════════════════════════════
        // NAVEGAR A SASEPA
        // ═══════════════════════════════════════════════════════════════════
        
        console.log('📡 Navegando a https://www.sasepa.mx/...');
        await page.goto('https://www.sasepa.mx/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Esperar carga completa
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Página cargada completamente');

        // ═══════════════════════════════════════════════════════════════════
        // ACTIVAR BOTÓN DE ALERTA SÍSMICA
        // ═══════════════════════════════════════════════════════════════════
        
        console.log('🔴 Buscando y activando botón de alerta sísmica...');
        try {
            const buttonResult = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase().trim();
                    if ((text.includes('alerta') || text.includes('alert')) && 
                        (text.includes('sísmica') || text.includes('sismica') || text.includes('sismic'))) {
                        btn.click();
                        return { clicked: true, text: btn.textContent.trim() };
                    }
                }
                return { clicked: false };
            });
            
            if (buttonResult.clicked) {
                console.log(`✅ Botón activado: "${buttonResult.text}"`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.log('⚠️  No se encontró el botón de alerta sísmica');
            }
        } catch (error) {
            console.log('⚠️  Error al buscar botón:', error.message);
        }

        // ═══════════════════════════════════════════════════════════════════
        // INICIAR FFMPEG PARA TRANSMISIÓN
        // ═══════════════════════════════════════════════════════════════════
        
        console.log('\n🎥 Iniciando transmisión RTMPS a Kick...');
        console.log('📡 Configurando ffmpeg...\n');

        const ffmpegArgs = [
            '-y',
            '-f', 'image2pipe',
            '-vcodec', 'mjpeg',
            '-framerate', String(FPS),
            '-i', 'pipe:0',
            '-s', RESOLUTION, // Forzar resolución
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-b:v', BITRATE,
            '-maxrate', BITRATE,
            '-bufsize', String(parseInt(BITRATE) * 1.5) + 'k', // Buffer reducido
            '-g', String(FPS * 2),
            '-keyint_min', String(FPS),
            '-sc_threshold', '0',
            '-profile:v', 'baseline',
            '-pix_fmt', 'yuv420p',
            '-threads', '1', // Un solo thread para menor RAM
            '-thread_type', 'slice',
            '-x264opts', 'threads=1:thread-input=1:thread-lookahead=1', // Optimización de threads
            '-f', 'flv',
            '-flvflags', 'no_duration_filesize',
            STREAM_URL
        ];

        if (STREAM_DURATION > 0) {
            ffmpegArgs.splice(1, 0, '-t', String(STREAM_DURATION));
        }

        ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Manejar salida de ffmpeg
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
                console.log(`\n🔄 Intentando reconectar en ${RETRY_DELAY/1000} segundos...`);
                setTimeout(() => {
                    streamSasepaToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
                return;
            }
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`\n📡 Transmisión finalizada. Código: ${code}`);
            isStreaming = false;
            
            if (code !== 0 && code !== null && retryCount < MAX_RETRIES) {
                console.log(`\n🔄 Código de error: ${code}. Reconectando en ${RETRY_DELAY/1000} segundos...`);
                setTimeout(() => {
                    streamSasepaToKick(retryCount + 1).catch(console.error);
                }, RETRY_DELAY);
                return;
            }
        });

        // ═══════════════════════════════════════════════════════════════════
        // CAPTURA Y TRANSMISIÓN DE FRAMES
        // ═══════════════════════════════════════════════════════════════════
        
        isStreaming = true;
        let frameCount = 0;
        const startTime = Date.now();
        const frameInterval = 1000 / FPS;

        console.log('🎬 Iniciando captura y transmisión...\n');

        const captureAndStream = async () => {
            if (!isStreaming) return;

            const frameStartTime = Date.now();
            
            try {
                // Capturar screenshot optimizado
                let screenshotBuffer = null;
                
                try {
                    // Captura optimizada para bajo uso de RAM
                    screenshotBuffer = await page.screenshot({
                        fullPage: false,
                        encoding: 'binary',
                        type: 'jpeg',
                        quality: SCREENSHOT_QUALITY,
                        timeout: SCREENSHOT_TIMEOUT,
                        clip: {
                            x: 0,
                            y: 0,
                            width: 1280,
                            height: 720
                        }
                    });
                } catch (screenshotError) {
                    // Reintentar con configuración más simple
                    try {
                        screenshotBuffer = await page.screenshot({
                            fullPage: false,
                            encoding: 'binary',
                            type: 'jpeg',
                            quality: 50, // Calidad aún más baja
                            timeout: SCREENSHOT_TIMEOUT
                        });
                    } catch (retryError) {
                        // Método básico como último recurso
                        screenshotBuffer = await page.screenshot({
                            encoding: 'binary',
                            timeout: SCREENSHOT_TIMEOUT
                        }).catch(() => null);
                    }
                }

                if (screenshotBuffer && ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                    // Verificar buffer antes de escribir (reducido para 4GB RAM)
                    if (ffmpegProcess.stdin.writableLength < MAX_BUFFER_SIZE) {
                        const written = ffmpegProcess.stdin.write(screenshotBuffer, (err) => {
                            if (err && err.message !== 'write EPIPE') {
                                // Ignorar errores de pipe cerrado
                            }
                        });
                        
                        // Si el buffer está lleno, esperar
                        if (!written) {
                            await new Promise(resolve => {
                                ffmpegProcess.stdin.once('drain', resolve);
                                setTimeout(resolve, 100); // Timeout de seguridad
                            });
                        }
                    } else {
                        // Buffer lleno, esperar más tiempo
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Limpiar referencia para ayudar al GC
                    screenshotBuffer = null;
                }

                frameCount++;
                const frameTime = Date.now() - frameStartTime;

                // Mostrar progreso cada 10 segundos (menos frecuente para ahorrar recursos)
                if (frameCount % (FPS * 10) === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    const fpsActual = (frameCount / elapsed).toFixed(1);
                    const avgFrameTime = (frameTime).toFixed(0);
                    
                    // Mostrar uso de memoria si está disponible
                    const memUsage = process.memoryUsage();
                    const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
                    
                    console.log(`📹 Transmitiendo... ${frameCount} frames | ${elapsed}s | ${fpsActual} fps | Frame: ${avgFrameTime}ms | RAM: ${memMB}MB`);
                    
                    // Forzar garbage collection si el uso de RAM es alto
                    if (memUsage.heapUsed > 3 * 1024 * 1024 * 1024) { // Más de 3GB
                        if (global.gc) {
                            global.gc();
                            console.log('🧹 Garbage collection ejecutado');
                        }
                    }
                }

                // Verificar duración
                if (STREAM_DURATION > 0 && (Date.now() - startTime) >= STREAM_DURATION * 1000) {
                    console.log('\n⏱️  Duración alcanzada, finalizando...');
                    isStreaming = false;
                    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
                        ffmpegProcess.stdin.end();
                    }
                    return;
                }
                
                // Mostrar tiempo transcurrido cada minuto
                if (STREAM_DURATION === 0 && frameCount % (FPS * 60) === 0 && frameCount > 0) {
                    const hours = Math.floor((Date.now() - startTime) / (1000 * 60 * 60));
                    const minutes = Math.floor(((Date.now() - startTime) % (1000 * 60 * 60)) / (1000 * 60));
                    console.log(`\n⏰ Tiempo: ${hours}h ${minutes}m | Frames: ${frameCount} | Estado: TRANSMITIENDO`);
                }

                // Calcular tiempo de espera dinámico
                const actualFrameTime = Date.now() - frameStartTime;
                const waitTime = Math.max(0, frameInterval - actualFrameTime);

                // Programar siguiente frame
                if (isStreaming) {
                    setTimeout(captureAndStream, waitTime);
                }

            } catch (error) {
                // Manejo de errores - no detener, solo reintentar
                if (error.message && !error.message.includes('timeout') && !error.message.includes('EPIPE')) {
                    // Solo mostrar errores importantes
                }
                
                // Reintentar después de un breve delay
                if (isStreaming) {
                    setTimeout(captureAndStream, frameInterval * 2);
                }
            }
        };

        // Esperar un momento antes de iniciar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Iniciar captura y transmisión
        captureAndStream();

        // ═══════════════════════════════════════════════════════════════════
        // MANTENER STREAMING ACTIVO
        // ═══════════════════════════════════════════════════════════════════
        
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
            
            // Monitoreo de salud
            const healthCheck = setInterval(() => {
                if (!isStreaming && retryCount < MAX_RETRIES) {
                    clearInterval(healthCheck);
                    console.log('\n⚠️  Transmisión detenida. Intentando reconectar...');
                    setTimeout(() => {
                        streamSasepaToKick(retryCount + 1).catch(console.error);
                    }, RETRY_DELAY);
                } else if (!isStreaming) {
                    clearInterval(healthCheck);
                }
            }, 10000);
            
            await new Promise(() => {}); // Esperar indefinidamente
        }

        // Cerrar pipe de ffmpeg
        if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
            ffmpegProcess.stdin.end();
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!ffmpegProcess.killed) {
            ffmpegProcess.kill();
        }

        console.log('\n✅ Transmisión completada!');
        console.log(`📊 Total de frames transmitidos: ${frameCount}`);

    } catch (error) {
        console.error('❌ Error durante la transmisión:', error.message);
        
        if (retryCount < MAX_RETRIES) {
            console.log(`\n🔄 Error capturado. Reconectando en ${RETRY_DELAY/1000} segundos... (Intento ${retryCount + 1}/${MAX_RETRIES})`);
            try {
                if (browser) await browser.close();
            } catch (e) {}
            
            setTimeout(() => {
                streamSasepaToKick(retryCount + 1).catch(console.error);
            }, RETRY_DELAY);
            return;
        } else {
            console.error('\n💥 Máximo de reintentos alcanzado. Deteniendo...');
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

// ═══════════════════════════════════════════════════════════════════════════
// MANEJO DE SEÑALES
// ═══════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;

process.on('SIGINT', () => {
    if (!isShuttingDown) {
        isShuttingDown = true;
        console.log('\n\n⚠️  Señal de interrupción recibida (Ctrl+C).');
        console.log('🛑 Deteniendo transmisión de forma segura...');
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

// ═══════════════════════════════════════════════════════════════════════════
// EJECUTAR
// ═══════════════════════════════════════════════════════════════════════════

streamSasepaToKick()
    .then(() => {
        console.log('\n✨ Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
