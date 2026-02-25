# 📦 Instalación de Dependencias - Streaming SASEPA a Kick

## 🔍 Librerías Necesarias

### 1. Dependencias de Node.js

El script `stream-sasepa-kick.js` requiere las siguientes librerías:

#### ✅ Librerías NPM (instalar con npm):

```bash
npm install puppeteer
```

**O si ya tienes un `package.json`:**

```bash
npm install
```

#### ✅ Módulos Nativos de Node.js (NO necesitan instalación):
- `child_process` - Para ejecutar ffmpeg
- `fs` - Para operaciones de archivos
- `path` - Para manejo de rutas

Estos vienen incluidos con Node.js, no necesitas instalarlos.

---

### 2. Dependencias del Sistema

#### ✅ ffmpeg (REQUERIDO)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y ffmpeg
```

**Verificar instalación:**
```bash
ffmpeg -version
```

**Debe mostrar:**
- Versión de ffmpeg
- Codec libx264 habilitado

---

## 📋 Instalación Completa Paso a Paso

### Opción 1: Instalación Rápida (Recomendada)

```bash
# 1. Instalar dependencias de Node.js
npm install puppeteer

# 2. Verificar que ffmpeg esté instalado
ffmpeg -version

# 3. Si ffmpeg no está instalado:
sudo apt update && sudo apt install -y ffmpeg

# 4. Listo! Puedes ejecutar el script
node stream-sasepa-kick.js
```

### Opción 2: Usando package.json

Si ya tienes un `package.json` con las dependencias:

```bash
# Instalar todas las dependencias
npm install

# Verificar que puppeteer esté instalado
npm list puppeteer
```

---

## ✅ Verificación de Instalación

### Verificar Node.js:
```bash
node --version
# Debe mostrar: v18.x o superior
```

### Verificar npm:
```bash
npm --version
# Debe mostrar: 9.x o superior
```

### Verificar Puppeteer:
```bash
npm list puppeteer
# Debe mostrar la versión instalada
```

### Verificar ffmpeg:
```bash
ffmpeg -version
# Debe mostrar información de ffmpeg
```

### Verificar libx264 (codec H.264):
```bash
ffmpeg -codecs | grep h264
# Debe mostrar: DEV.LS h264 ... (encoders: libx264 ...)
```

---

## 📦 package.json Completo

Si quieres crear un `package.json` específico para el streaming:

```json
{
  "name": "sasepa-stream-kick",
  "version": "1.0.0",
  "description": "Streaming SASEPA a Kick",
  "main": "stream-sasepa-kick.js",
  "scripts": {
    "start": "node stream-sasepa-kick.js",
    "stream": "node stream-sasepa-kick.js"
  },
  "dependencies": {
    "puppeteer": "^24.37.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Luego ejecuta:
```bash
npm install
```

---

## 🚀 Ejecutar el Script

Una vez instaladas las dependencias:

```bash
# Opción 1: Directo
node stream-sasepa-kick.js

# Opción 2: Con script de inicio
./start-sasepa-stream.sh

# Opción 3: Con npm (si agregaste script)
npm start
```

---

## ⚠️ Solución de Problemas

### Error: "Cannot find module 'puppeteer'"
```bash
npm install puppeteer
```

### Error: "ffmpeg: command not found"
```bash
sudo apt update
sudo apt install -y ffmpeg
```

### Error: "libx264 not found"
```bash
# ffmpeg debe estar compilado con libx264
# En Ubuntu/Debian generalmente viene incluido
# Si no, reinstalar:
sudo apt remove ffmpeg
sudo apt install -y ffmpeg
```

### Error de permisos
```bash
# Dar permisos de ejecución
chmod +x stream-sasepa-kick.js
chmod +x start-sasepa-stream.sh
```

---

## 📊 Resumen de Dependencias

| Dependencia | Tipo | Instalación |
|------------|------|-------------|
| **puppeteer** | NPM | `npm install puppeteer` |
| **ffmpeg** | Sistema | `sudo apt install ffmpeg` |
| child_process | Nativo | ✅ Incluido en Node.js |
| fs | Nativo | ✅ Incluido en Node.js |
| path | Nativo | ✅ Incluido en Node.js |

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado (v18+)
- [ ] npm instalado
- [ ] Puppeteer instalado (`npm install puppeteer`)
- [ ] ffmpeg instalado (`ffmpeg -version`)
- [ ] libx264 disponible en ffmpeg
- [ ] Script con permisos de ejecución
- [ ] Conexión a internet activa

---

## 🎯 Comando de Instalación Completa

```bash
# Todo en un comando:
npm install puppeteer && \
sudo apt update && \
sudo apt install -y ffmpeg && \
chmod +x stream-sasepa-kick.js start-sasepa-stream.sh && \
echo "✅ Instalación completada!"
```
