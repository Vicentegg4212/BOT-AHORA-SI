/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    STREAM LIVE DE SASEPA.MX CON PUPPETEER
 * ═══════════════════════════════════════════════════════════════════════════
 */

const puppeteer = require('puppeteer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const PORT = process.env.PORT || 3001;
const TARGET_URL = 'https://www.sasepa.mx/';

// Configuración de Puppeteer para Heroku/Cloud
const puppeteerOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
    ]
};

let browser = null;
let page = null;
let isStreaming = false;
let streamInterval = null;

// Crear servidor Express
const app = express();

// Habilitar CORS para todas las rutas
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Servir página HTML para ver el stream
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stream Live - SASEPA.MX</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        .container {
            width: 100%;
            max-width: 1920px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #stream {
            width: 100%;
            height: auto;
            display: block;
            background: #000;
            max-height: 100vh;
            object-fit: contain;
        }
        .status {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            font-weight: bold;
        }
        .status.online {
            color: #4ade80;
        }
        .status.offline {
            color: #f87171;
        }
        .info {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 18px;
            z-index: 999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status offline" id="status">● Desconectado</div>
        <div class="loading" id="loading">Cargando stream...</div>
        <img id="stream" src="/stream" alt="Stream Live SASEPA" style="display: none;">
        <div class="info" id="info">Esperando conexión...</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const streamImg = document.getElementById('stream');
        const statusEl = document.getElementById('status');
        const infoEl = document.getElementById('info');
        const loadingEl = document.getElementById('loading');
        let frameCount = 0;
        
        socket.on('connect', () => {
            console.log('Conectado al servidor');
            statusEl.textContent = '● Conectado';
            statusEl.className = 'status online';
            loadingEl.style.display = 'block';
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            statusEl.textContent = '● Desconectado';
            statusEl.className = 'status offline';
            loadingEl.style.display = 'block';
            streamImg.style.display = 'none';
        });
        
        socket.on('frame', (data) => {
            frameCount++;
            streamImg.src = 'data:image/png;base64,' + data;
            streamImg.style.display = 'block';
            loadingEl.style.display = 'none';
            infoEl.textContent = 'Frames recibidos: ' + frameCount + ' | Última actualización: ' + new Date().toLocaleTimeString();
        });
        
        socket.on('error', (error) => {
            console.error('Error:', error);
            infoEl.textContent = 'Error: ' + error;
            loadingEl.textContent = 'Error: ' + error;
        });
        
        // Recargar imagen si hay error
        streamImg.onerror = () => {
            streamImg.src = '/stream?' + Date.now();
        };
        
        // Recargar cada 30 segundos como fallback
        setInterval(() => {
            if (streamImg.src && !streamImg.complete) {
                streamImg.src = '/stream?' + Date.now();
            }
        }, 30000);
    </script>
</body>
</html>
    `);
});

// Endpoint para obtener frame individual (fallback)
app.get('/stream', async (req, res) => {
    try {
        if (!page || page.isClosed()) {
            return res.status(503).send('Stream no disponible - página no inicializada');
        }
        
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(screenshot);
    } catch (error) {
        console.error('Error capturando frame:', error.message);
        res.status(500).send('Error capturando frame: ' + error.message);
    }
});

// Inicializar Puppeteer y página
async function initBrowser() {
    try {
        // Cerrar navegador anterior si existe
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.log('⚠️ Error cerrando navegador anterior:', e.message);
            }
        }
        
        console.log('🚀 Iniciando navegador Puppeteer...');
        browser = await puppeteer.launch(puppeteerOptions);
        
        console.log('📄 Creando nueva página...');
        page = await browser.newPage();
        
        // Configurar viewport
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
        });
        
        // Configurar user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Prevenir detección de automatización
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });
        
        console.log(`🌐 Navegando a ${TARGET_URL}...`);
        await page.goto(TARGET_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log('✅ Página cargada exitosamente');
        
        // Esperar a que la página esté completamente cargada
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Mantener la página activa - prevenir cierre automático
        page.on('close', () => {
            console.log('⚠️ Página cerrada, se reinicializará...');
            page = null;
            isStreaming = false;
            if (streamInterval) {
                clearInterval(streamInterval);
                streamInterval = null;
            }
            setTimeout(initBrowser, 2000);
        });
        
        // Mantener la página viva con actividad periódica
        setInterval(async () => {
            if (page && !page.isClosed()) {
                try {
                    await page.evaluate(() => {
                        // Simular actividad del usuario
                        return document.title;
                    });
                } catch (e) {
                    // Ignorar errores
                }
            }
        }, 30000);
        
        // Iniciar streaming
        startStreaming();
        
    } catch (error) {
        console.error('❌ Error inicializando navegador:', error.message);
        page = null;
        browser = null;
        isStreaming = false;
        setTimeout(initBrowser, 10000); // Reintentar en 10 segundos
    }
}

// Función para capturar y enviar frames
async function startStreaming() {
    if (isStreaming) {
        console.log('⚠️ Streaming ya está activo');
        return;
    }
    
    isStreaming = true;
    console.log('📡 Iniciando streaming...');
    
    // Limpiar intervalo anterior si existe
    if (streamInterval) {
        clearInterval(streamInterval);
    }
    
    const captureFrame = async () => {
        try {
            if (!page || !isStreaming) {
                return;
            }
            
            // Verificar que la página no esté cerrada
            if (page.isClosed()) {
                console.log('⚠️ Página cerrada durante captura, reinicializando...');
                isStreaming = false;
                if (streamInterval) {
                    clearInterval(streamInterval);
                    streamInterval = null;
                }
                await initBrowser();
                return;
            }
            
            // Capturar screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: false,
                encoding: 'base64'
            });
            
            // Enviar a todos los clientes conectados
            io.emit('frame', screenshot);
            
        } catch (error) {
            const errorMsg = error.message || String(error);
            if (errorMsg.includes('Session closed') || 
                errorMsg.includes('Target closed') || 
                errorMsg.includes('TargetCloseError') ||
                errorMsg.includes('Protocol error')) {
                console.log('⚠️ Sesión cerrada, reinicializando navegador...');
                isStreaming = false;
                if (streamInterval) {
                    clearInterval(streamInterval);
                    streamInterval = null;
                }
                if (browser) {
                    try {
                        await browser.close();
                    } catch (e) {}
                }
                browser = null;
                page = null;
                setTimeout(initBrowser, 3000);
            } else {
                console.error('Error capturando frame:', errorMsg);
                io.emit('error', errorMsg);
            }
        }
    };
    
    // Capturar frames cada 500ms (2 FPS)
    streamInterval = setInterval(async () => {
        if (!isStreaming) {
            clearInterval(streamInterval);
            streamInterval = null;
            return;
        }
        await captureFrame();
    }, 500);
    
    // Capturar primer frame inmediatamente
    await captureFrame();
}

// Manejar desconexión de clientes
io.on('connection', (socket) => {
    console.log(`👤 Cliente conectado: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`👤 Cliente desconectado: ${socket.id}`);
    });
    
    // Enviar frame inmediatamente al conectar
    const sendInitialFrame = async () => {
        if (page && isStreaming && !page.isClosed()) {
            try {
                const screenshot = await page.screenshot({
                    type: 'png',
                    fullPage: false,
                    encoding: 'base64'
                });
                socket.emit('frame', screenshot);
            } catch (err) {
                console.error('Error enviando frame inicial:', err.message);
            }
        }
    };
    
    sendInitialFrame();
});

// Limpiar recursos al cerrar
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    isStreaming = false;
    
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
    }
    
    if (browser) {
        await browser.close();
    }
    
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

// Función para obtener IP pública
async function getPublicIP() {
    try {
        const https = require('https');
        return new Promise((resolve) => {
            https.get('https://api.ipify.org?format=json', (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data).ip);
                    } catch (e) {
                        resolve('N/A');
                    }
                });
            }).on('error', () => resolve('N/A')).setTimeout(5000, () => {
                resolve('N/A');
            });
        });
    } catch (error) {
        return 'N/A';
    }
}

// Iniciar servidor
server.listen(PORT, '0.0.0.0', async () => {
    const publicIP = await getPublicIP();
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Obtener IP local
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }
    
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║     STREAM LIVE SASEPA.MX - PUPPETEER                        ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`\n🌐 Servidor iniciado en puerto ${PORT}`);
    console.log(`📺 Accede localmente: http://${localIP}:${PORT}`);
    if (publicIP !== 'N/A') {
        console.log(`📺 Accede remotamente: http://${publicIP}:${PORT}`);
    }
    console.log(`🎯 Stream de: ${TARGET_URL}\n`);
    
    // Inicializar navegador
    await initBrowser();
});
