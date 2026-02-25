/**
 * Servidor HTTP simple para servir el video de sasepa
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const videoPath = path.join(__dirname, 'sasepa-stream.mp4');

// Verificar que el video existe
if (!fs.existsSync(videoPath)) {
    console.error('❌ Error: El video no existe en:', videoPath);
    console.log('💡 Ejecuta primero: node stream-sasepa.js');
    process.exit(1);
}

const server = http.createServer((req, res) => {
    // Servir el video
    if (req.url === '/' || req.url === '/video' || req.url === '/sasepa-stream.mp4') {
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Soporte para range requests (streaming)
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Enviar todo el archivo
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } else {
        // Página HTML simple
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Video SASEPA</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a1a;
            color: white;
        }
        video {
            max-width: 90%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        h1 {
            margin-bottom: 20px;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: #2a2a2a;
            border-radius: 8px;
            text-align: center;
        }
        a {
            color: #4CAF50;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1>🎥 Video SASEPA - Streaming</h1>
    <video controls autoplay>
        <source src="/video" type="video/mp4">
        Tu navegador no soporta video HTML5.
    </video>
    <div class="info">
        <p><strong>Link directo del video:</strong></p>
        <p><a href="/video" download>Descargar video</a></p>
        <p><small>Servidor corriendo en puerto ${PORT}</small></p>
    </div>
</body>
</html>
        `);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor HTTP iniciado!');
    console.log(`📹 Video disponible en:`);
    console.log(`   http://localhost:${PORT}/video`);
    console.log(`   http://localhost:${PORT}/`);
    console.log(`\n🌐 Si estás en un servidor remoto, usa la IP pública del servidor`);
    console.log(`   Ejemplo: http://TU_IP:${PORT}/video`);
    console.log(`\n⏹️  Presiona Ctrl+C para detener el servidor`);
});
