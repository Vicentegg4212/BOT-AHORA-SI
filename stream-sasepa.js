/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                    STREAM LIVE DE SASEPA.MX CON PUPPETEER
 * ═══════════════════════════════════════════════════════════════════════════
 */

const puppeteer = require('puppeteer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
        '--window-size=1920,1080'
    ]
};

let browser = null;
let page = null;
let isStreaming = false;

// Crear servidor Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
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
        }
        .container {
            width: 100%;
            max-width: 1920px;
            position: relative;
        }
        #stream {
            width: 100%;
            height: auto;
            display: block;
            background: #000;
        }
        .status {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
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
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status offline" id="status">● Desconectado</div>
        <img id="stream" src="/stream" alt="Stream Live SASEPA">
        <div class="info" id="info">Esperando conexión...</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const streamImg = document.getElementById('stream');
        const statusEl = document.getElementById('status');
        const infoEl = document.getElementById('info');
        
        socket.on('connect', () => {
            console.log('Conectado al servidor');
            statusEl.textContent = '● Conectado';
            statusEl.className = 'status online';
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            statusEl.textContent = '● Desconectado';
            statusEl.className = 'status offline';
        });
        
        socket.on('frame', (data) => {
            streamImg.src = 'data:image/png;base64,' + data;
            infoEl.textContent = 'Última actualización: ' + new Date().toLocaleTimeString();
        });
        
        socket.on('error', (error) => {
            console.error('Error:', error);
            infoEl.textContent = 'Error: ' + error;
        });
        
        // Recargar imagen si hay error
        streamImg.onerror = () => {
            streamImg.src = '/stream?' + Date.now();
        };
    </script>
</body>
</html>
    `);
});

// Endpoint para obtener frame individual (fallback)
app.get('/stream', async (req, res) => {
    try {
        if (!page) {
            return res.status(503).send('Stream no disponible');
        }
        
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false,
            quality: 80
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(screenshot);
    } catch (error) {
        console.error('Error capturando frame:', error);
        res.status(500).send('Error capturando frame');
    }
});

// Inicializar Puppeteer y página
async function initBrowser() {
    try {
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
        
        console.log(`🌐 Navegando a ${TARGET_URL}...`);
        await page.goto(TARGET_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log('✅ Página cargada exitosamente');
        
        // Esperar a que la página esté completamente cargada
        await page.waitForTimeout(3000);
        
        // Iniciar streaming
        startStreaming();
        
    } catch (error) {
        console.error('❌ Error inicializando navegador:', error);
        setTimeout(initBrowser, 5000); // Reintentar en 5 segundos
    }
}

// Función para capturar y enviar frames
async function startStreaming() {
    if (isStreaming) return;
    
    isStreaming = true;
    console.log('📡 Iniciando streaming...');
    
    const captureFrame = async () => {
        try {
            if (!page || !isStreaming) return;
            
            // Capturar screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: false,
                quality: 80,
                encoding: 'base64'
            });
            
            // Enviar a todos los clientes conectados
            io.emit('frame', screenshot);
            
        } catch (error) {
            console.error('Error capturando frame:', error);
            io.emit('error', error.message);
        }
    };
    
    // Capturar frames cada 500ms (2 FPS)
    const interval = setInterval(async () => {
        if (!isStreaming) {
            clearInterval(interval);
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
    if (page && isStreaming) {
        page.screenshot({
            type: 'png',
            fullPage: false,
            quality: 80,
            encoding: 'base64'
        }).then(screenshot => {
            socket.emit('frame', screenshot);
        }).catch(err => {
            console.error('Error enviando frame inicial:', err);
        });
    }
});

// Limpiar recursos al cerrar
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    isStreaming = false;
    
    if (browser) {
        await browser.close();
    }
    
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

// Iniciar servidor
server.listen(PORT, async () => {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║     STREAM LIVE SASEPA.MX - PUPPETEER                        ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`\n🌐 Servidor iniciado en puerto ${PORT}`);
    console.log(`📺 Accede a: http://localhost:${PORT}`);
    console.log(`🎯 Stream de: ${TARGET_URL}\n`);
    
    // Inicializar navegador
    await initBrowser();
});
