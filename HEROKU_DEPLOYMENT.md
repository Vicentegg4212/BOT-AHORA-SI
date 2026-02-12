# 🚀 GUÍA DE DESPLIEGUE EN HEROKU

## 📋 REQUISITOS

- ✅ Cuenta de Heroku (https://heroku.com)
- ✅ Heroku CLI instalado
- ✅ Git instalado
- ✅ Cuenta WhatsApp con número verificado
- ✅ Número de administrador

## 🔧 PASOS DE INSTALACIÓN

### 1. Preparar Git (Si no está configurado)

```bash
cd /Users/chente/Desktop/SISMOS\ V2

# Inicializar repositorio Git
git init

# Configurar usuario
git config user.email "tu@email.com"
git config user.name "Tu Nombre"

# Agregar todos los archivos
git add .

# Commit inicial
git commit -m "Bot SASMEX Heroku v1.0"
```

### 2. Crear aplicación en Heroku

```bash
# Login en Heroku
heroku login

# Crear aplicación
heroku create sasmex-whatsapp-bot

# Si el nombre ya existe, usa otro:
heroku create sasmex-bot-tuapodo
```

### 3. Configurar Variables de Entorno

```bash
# Establecer número de administrador
heroku config:set ADMIN_NUMBER=5215512345678

# Verificar configuración
heroku config
```

### 4. Desplegar a Heroku

**Opción A: Usar Dockerfile (Recomendado)**
```bash
heroku stack:set container

git push heroku main
```

**Opción B: Usar Procfile (Más rápido)**
```bash
git push heroku main
```

### 5. Monitorear Despliegue

```bash
# Ver logs en tiempo real
heroku logs --tail

# Ver logs solo de errores
heroku logs --grep ERROR --tail

# Ver logs de las últimas 100 líneas
heroku logs --lines 100
```

## 📱 PRIMERA CONEXIÓN

1. El bot iniciará y mostrará un código QR en los logs
2. Escanea el código QR con WhatsApp
3. El bot se conectará automáticamente
4. El bot guardará la sesión automáticamente

```bash
# Ver logs para encontrar el QR
heroku logs --tail

# Busca algo como:
# [QR CODE IMAGE]
```

## 🎮 COMANDOS DISPONIBLES DESPUÉS DE DESPLEGAR

Desde cualquier chat de WhatsApp, escribe a tu número de bot:

```
!start          - Suscribirse a alertas
!stop           - Desuscribirse
!menu           - Ver menú de comandos
!test           - Probar sistema (muestra estado real)
!admin          - Acceder a panel admin (solo admins)
!stats          - Ver estadísticas
```

## 🔍 TROUBLESHOOTING

### Bot no se conecta

```bash
# Ver logs detallados
heroku logs --tail

# Reiniciar dyno
heroku dyno:restart

# Ver estado
heroku ps
```

### QR no aparece en logs

```bash
# El QR se muestra solo en la primera conexión
# Si la sesión ya está guardada, no aparecerá

# Para resetear sesión:
heroku config:unset SESSION_SAVED  # Si existe
heroku dyno:restart
```

### Error: "chromium not found"

Asegúrate de que el Dockerfile está configurado correctamente:
```dockerfile
FROM node:18-alpine

RUN apk add --no-cache chromium

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Memoria insuficiente

Heroku dyno estándar tiene 512 MB. Si es insuficiente:

```bash
# Cambiar a dyno más grande
heroku dyno:type standard-1x
# Costo adicional ~$7-10/mes

# O optimizar código
heroku config:set NODE_ENV=production
```

## 📊 MONITOREO CONTINUO

### Ver logs de alertas

```bash
heroku logs --grep ALERT --tail
```

### Ver logs de errores

```bash
heroku logs --grep ERROR --tail
```

### Ver todas las acciones

```bash
heroku logs --tail
```

### Ver proceso en tiempo real

```bash
heroku ps
```

## 🛡️ MANTENIMIENTO

### Backup de datos

Los datos se guardan en `/tmp` dentro del dyno. Para permanencia:

```bash
# Conectar base de datos PostgreSQL (opcional)
heroku addons:create heroku-postgresql:hobby-dev

# O usar archivo de sincronización
# (Se implementará en próxima versión)
```

### Actualizar código

```bash
# Hacer cambios locales
# ...editar archivos...

git add .
git commit -m "Actualización del bot"
git push heroku main

# Heroku redesplegará automáticamente
```

### Reiniciar bot

```bash
heroku dyno:restart
```

### Ver configuración actual

```bash
heroku config
```

## 🚨 ESCENARIOS COMUNES

### Usuario reporta que no recibe alertas

1. Verificar que está suscrito: `!test`
2. Verificar severidad configurada: `!config`
3. Revisar logs: `heroku logs --tail`

### Bot se desconecta frecuentemente

1. Revisar logs de error: `heroku logs --grep ERROR`
2. Aumentar dyno size si hay timeout
3. Revisar límite de conexiones WhatsApp

### Imagen de alerta no se envía

1. Verificar memoria disponible: `heroku ps`
2. Ver error específico: `heroku logs --grep IMAGE`
3. Fallback a texto está habilitado

## 📈 ESCALAMIENTO

Para producción con muchos usuarios:

```bash
# Aumentar workers (si aplica)
heroku scale web=1 worker=2

# Cambiar dyno type
heroku dyno:type standard-2x

# Agregar recursos
heroku addons:create rediscloud:30
heroku addons:create heroku-postgresql:hobby-dev
```

## 💰 COSTO ESTIMADO

| Componente | Costo |
|-----------|-------|
| Dyno básico | Gratis (550 horas/mes) |
| Dyno estándar | ~$7/mes (730 horas/mes) |
| PostgreSQL hobby | Gratis |
| Redis | Opcional (desde $20) |
| **Total básico** | **Gratis** |
| **Total escalado** | **~$27/mes** |

## ✅ CHECKLIST FINAL

- [ ] Git configurado localmente
- [ ] Heroku CLI instalado
- [ ] Archivo Procfile presente
- [ ] Dockerfile presente
- [ ] package.json con scripts correctos
- [ ] ADMIN_NUMBER configurado
- [ ] Repositorio creado en Heroku
- [ ] Código pusheado
- [ ] Logs muestran conexión exitosa
- [ ] QR escaneado en WhatsApp
- [ ] Bot responde a !menu
- [ ] Bot responde a !test
- [ ] Datos se guardan correctamente

## 🎯 PRÓXIMOS PASOS

1. Desplegar en Heroku
2. Escanear QR en WhatsApp
3. Hacer prueba: `!test`
4. Suscribir usuarios: `!start`
5. Monitorear logs diariamente

---

**¿Necesitas ayuda?**
- Revisa: `heroku logs --tail`
- Contacta: [Tu email]
- Documentación: https://devcenter.heroku.com/

**Última actualización:** 11 de febrero de 2026
