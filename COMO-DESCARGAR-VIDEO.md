# 📥 Cómo Descargar el Video

## 📍 Ubicación del Workspace

El workspace está en el **servidor remoto** en:
```
/workspace
```

Los archivos del video están en:
- `/workspace/sasepa-stream.mp4` (44 KB)
- `/workspace/video-sasepa.html` (3.7 KB)
- `/workspace/sasepa-video-package.zip` (42 KB - contiene ambos)

---

## 🔽 Opciones para Descargar

### Opción 1: Desde GitHub (RECOMENDADO)

Los archivos están en el repositorio de GitHub en la rama:
```
cursor/puppeteer-stream-granbando-1e2b
```

**Repositorio:** https://github.com/Vicentegg4212/BOT-AHORA-SI

**Pasos:**
1. Ve a: https://github.com/Vicentegg4212/BOT-AHORA-SI/tree/cursor/puppeteer-stream-granbando-1e2b
2. Busca los archivos:
   - `sasepa-stream.mp4`
   - `video-sasepa.html`
   - `sasepa-video-package.zip`
3. Haz clic en cada archivo y luego en "Download" o "Raw"

**O clona el repositorio:**
```bash
git clone https://github.com/Vicentegg4212/BOT-AHORA-SI.git
cd BOT-AHORA-SI
git checkout cursor/puppeteer-stream-granbando-1e2b
```

---

### Opción 2: Links Directos del Servidor

Si tienes acceso SSH al servidor:
```bash
# IP del servidor: 35.174.58.0
scp usuario@35.174.58.0:/workspace/sasepa-stream.mp4 ./
scp usuario@35.174.58.0:/workspace/sasepa-video-package.zip ./
```

---

### Opción 3: Servidores HTTP (si están accesibles)

**Servidor Node.js:**
- Video: http://35.174.58.0:8080/video
- Descarga directa: http://35.174.58.0:8080/video (click derecho → Guardar como)

**Servidor Python:**
- Video: http://35.174.58.0:9000/sasepa-stream.mp4
- HTML: http://35.174.58.0:9000/video-sasepa.html

---

### Opción 4: Desde tu Máquina Local

Si estás trabajando en `/Users/chente/BOT-AHORA-SI-1/`, puedes:

1. **Hacer pull del repositorio:**
```bash
cd /Users/chente/BOT-AHORA-SI-1
git fetch origin
git checkout cursor/puppeteer-stream-granbando-1e2b
git pull origin cursor/puppeteer-stream-granbando-1e2b
```

2. **O ejecutar el script localmente:**
```bash
cd /Users/chente/BOT-AHORA-SI-1
node stream-sasepa.js
```

---

## 📦 Archivo Recomendado

**`sasepa-video-package.zip`** - Contiene todo lo necesario:
- ✅ `sasepa-stream.mp4` (el video)
- ✅ `video-sasepa.html` (reproductor HTML)

Solo descomprime el ZIP y abre `video-sasepa.html` en tu navegador.

---

## 🔍 Verificar Archivos en GitHub

Ve directamente a:
https://github.com/Vicentegg4212/BOT-AHORA-SI/tree/cursor/puppeteer-stream-granbando-1e2b

Ahí encontrarás todos los archivos del video.
