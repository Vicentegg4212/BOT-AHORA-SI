# 🚀 INSTRUCCIONES PARA SUBIR A HEROKU (Sin Consola Interactiva)

## Paso 1: Preparar Git

```bash
cd "/Users/chente/Desktop/SISMOS V2"

# Inicializar Git si no existe
git init
git config user.email "bot@sasmex.local"
git config user.name "SASMEX Bot"

# Agregar archivos
git add .

# Commit
git commit -m "Bot SASMEX - Deploy v1.0"
```

## Paso 2: Login en Heroku (Alternativa sin consola)

### Opción A: Token de autenticación

```bash
# Obtener token desde: https://dashboard.heroku.com/account/applications/authorizations

# Guardar token (reemplaza YOUR_TOKEN)
echo "YOUR_TOKEN" > ~/.heroku/token.txt

# O directamente en el comando
heroku login --interactive
```

### Opción B: Usar archivo de configuración

```bash
# Crear archivo de configuración
mkdir -p ~/.heroku
cat > ~/.heroku/credentials << EOF
{
  "login": "tu-email@gmail.com",
  "password": "tu-api-key-de-heroku"
}
EOF
```

## Paso 3: Crear App en Heroku

```bash
# Desde terminal (una sola vez)
heroku create sasmex-bot-2026

# Si el nombre existe, usa otro:
heroku create sasmex-whatsapp-alerts
```

## Paso 4: Agregar Git Remote (Si no se agregó automáticamente)

```bash
heroku git:remote -a sasmex-bot-2026
```

## Paso 5: Configurar Variables de Entorno

```bash
# IMPORTANTE: Reemplaza 5215512345678 con tu número
heroku config:set ADMIN_NUMBER=5215512345678 -a sasmex-bot-2026
heroku config:set NODE_ENV=production -a sasmex-bot-2026

# Verificar
heroku config -a sasmex-bot-2026
```

## Paso 6: Configurar Stack Docker

```bash
heroku stack:set container -a sasmex-bot-2026
```

## Paso 7: Hacer Push a Heroku

```bash
# Push a Heroku (esto inicia el deploy automáticamente)
git push heroku main

# Si tienes otra rama:
git push heroku master

# Si es la primera vez y tienes conflictos:
git push heroku HEAD:main --force
```

## Paso 8: Monitorear el Deploy

```bash
# Ver logs en tiempo real (mientras se despliega)
heroku logs --tail -a sasmex-bot-2026

# Ver solo últimas 50 líneas
heroku logs --lines 50 -a sasmex-bot-2026

# Ver solo errores
heroku logs --grep ERROR -a sasmex-bot-2026
```

## Paso 9: Escanear QR en WhatsApp

1. Abre la aplicación WhatsApp en tu teléfono
2. Ve a Chats
3. Busca el número de la app (que aparecerá en los logs)
4. Escanea el código QR que aparecerá en los logs
5. El bot se conectará automáticamente

## Paso 10: Probar el Bot

```bash
# Una vez conectado, desde WhatsApp envía:
!menu          # Ver todos los comandos
!test          # Verificar que todo funciona
!start         # Suscribirse a alertas
```

---

## 🔍 VERIFICAR ESTADO

```bash
# Ver si el bot está corriendo
heroku ps -a sasmex-bot-2026

# Reiniciar si es necesario
heroku dyno:restart -a sasmex-bot-2026

# Ver información de la app
heroku info -a sasmex-bot-2026

# Ver configuración
heroku config -a sasmex-bot-2026
```

## 📱 OBTENER EL NÚMERO DEL BOT

El número aparecerá en los logs cuando se conecte:

```bash
heroku logs --lines 100 -a sasmex-bot-2026 | grep -i "whatsapp\|connected\|ready"
```

## ⚙️ VARIABLES IMPORTANTES

| Variable | Valor | Dónde |
|----------|-------|-------|
| ADMIN_NUMBER | Tu número sin + | Heroku Config Vars |
| NODE_ENV | production | Heroku Config Vars |
| PORT | Auto asignado | Heroku |

## 🐛 TROUBLESHOOTING

### Si ves errores de Puppeteer:

```bash
# El Dockerfile ya tiene Chromium instalado
# Si aún da error, reinstalar:
heroku dyno:restart -a sasmex-bot-2026
```

### Si el bot no se conecta:

```bash
# Ver logs completos
heroku logs --lines 200 -a sasmex-bot-2026

# Reiniciar
heroku dyno:restart -a sasmex-bot-2026

# Verificar configuración
heroku config -a sasmex-bot-2026
```

### Si necesitas limpiar la sesión:

```bash
# Los archivos se guardan en /tmp en Heroku
# Para resetear, simplemente:
heroku dyno:restart -a sasmex-bot-2026

# Esto borrará la sesión y mostrará nuevo QR
```

## 📊 MONITOREAR EN VIVO

Abre 2 terminales:

**Terminal 1 - Ver logs:**
```bash
heroku logs --tail -a sasmex-bot-2026
```

**Terminal 2 - Interactuar:**
```bash
# Desde WhatsApp envía comandos
# Los verás reflejados en Terminal 1
```

## 🎯 DESPUÉS DEL DEPLOY

1. ✅ Bot está en Heroku
2. ✅ Escanear QR
3. ✅ Enviar !test
4. ✅ Usuarios se suscriben con !start
5. ✅ Bot envía alertas automáticamente

---

**Nombre de app sugerido:** `sasmex-bot-2026`
**URL:** `https://sasmex-bot-2026.herokuapp.com`

¿Necesitas help? Usa: `heroku help`
