# 📦 Instalar ffmpeg en Servidor Pterodactyl

## 🔧 Métodos de Instalación

### Método 1: Dentro del Contenedor (Recomendado)

Si tienes acceso SSH al servidor o puedes ejecutar comandos en el contenedor:

```bash
# Actualizar paquetes
apt update

# Instalar ffmpeg
apt install -y ffmpeg

# Verificar instalación
ffmpeg -version
```

---

### Método 2: Usando Dockerfile (Si tienes acceso)

Si puedes modificar la imagen Docker del servidor:

```dockerfile
FROM ubuntu:20.04

# Instalar dependencias
RUN apt update && \
    apt install -y ffmpeg && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Resto de tu configuración...
```

---

### Método 3: Script de Inicio (Startup Command)

En el panel de Pterodactyl, puedes agregar la instalación al comando de inicio:

**Startup Command:**
```bash
apt update && apt install -y ffmpeg || true && node stream-sasepa-kick.js
```

O crear un script separado:

```bash
#!/bin/bash
# Verificar e instalar ffmpeg si no existe
if ! command -v ffmpeg &> /dev/null; then
    echo "Instalando ffmpeg..."
    apt update
    apt install -y ffmpeg
fi

# Ejecutar tu script
node stream-sasepa-kick.js
```

---

### Método 4: Usando el Panel de Pterodactyl

1. **Accede al servidor** desde el panel
2. **Ve a "Console"** o "File Manager"
3. **Abre la terminal** o ejecuta comandos
4. **Ejecuta:**
   ```bash
   apt update && apt install -y ffmpeg
   ```

---

### Método 5: Instalación Manual (Si tienes root)

Si tienes acceso root al servidor host (fuera del contenedor):

```bash
# Conectar al contenedor
docker exec -it <nombre_contenedor> bash

# O si usas docker-compose
docker-compose exec <servicio> bash

# Dentro del contenedor:
apt update && apt install -y ffmpeg
```

---

## ✅ Verificación

Después de instalar, verifica:

```bash
# Verificar que está instalado
ffmpeg -version

# Verificar codec H.264
ffmpeg -codecs | grep h264

# Debe mostrar: DEV.LS h264 ... (encoders: libx264 ...)
```

---

## ⚠️ Notas Importantes

1. **Permisos**: Asegúrate de tener permisos para instalar paquetes
2. **Imagen Base**: Si usas una imagen Alpine Linux, usa `apk` en lugar de `apt`:
   ```bash
   apk add ffmpeg
   ```
3. **Persistencia**: Si el contenedor se reinicia, la instalación puede perderse. Considera:
   - Usar un Dockerfile personalizado
   - Agregar la instalación al startup command
   - Montar un volumen con ffmpeg preinstalado

---

## 🚀 Comando Rápido

```bash
apt update && apt install -y ffmpeg && ffmpeg -version
```

---

## 📝 Para Imágenes Alpine Linux

Si tu servidor usa Alpine (más común en Pterodactyl):

```bash
apk update
apk add ffmpeg
ffmpeg -version
```

---

## 🔍 Detectar Tipo de Sistema

```bash
# Ver qué sistema operativo usa
cat /etc/os-release

# Si es Ubuntu/Debian → usa apt
# Si es Alpine → usa apk
```
