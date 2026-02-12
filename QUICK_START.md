# ⚡ QUICK START - Inicio Rápido

## 5 Pasos para Empezar

### 1️⃣ Instalar Dependencias
```bash
cd "/Users/chente/Desktop/SISMOS V2"
npm install
```

### 2️⃣ Configurar Admin
Crea un archivo `.env` en la carpeta raíz:
```
ADMIN_NUMBER=5215512345678
```

Reemplaza `5215512345678` con tu número de WhatsApp (con código de país 52 para México).

### 3️⃣ Iniciar el Bot
```bash
npm start
```

### 4️⃣ Escanear QR
- Abre WhatsApp en tu teléfono
- Ve a **Dispositivos vinculados**
- Selecciona **Vincular dispositivo**
- Escanea el código QR que aparece en la terminal
- ¡Listo!

### 5️⃣ Probar el Bot
```
!menu           → Ver todos los comandos
!admin-panel    → Panel de propietario (solo admin)
!test           → Prueba del sistema
```

---

## 📱 Primeros Comandos

### Como Usuario
```
!start          → Suscribirse
!alerta         → Ver última alerta
!config         → Ver tu configuración
!menu           → Listar todos los comandos
```

### Como Propietario
```
!admin-panel           → Panel principal
!admin-status          → Estado completo
!admin-system          → Información del sistema
!admin-users           → Listar usuarios
!admin-eval 2+2        → Probar eval
```

---

## 🔐 Seguridad Básica

✅ **Haz esto:**
- Usa un número confiable como admin
- Guarda `.env` fuera del control de versiones
- Haz backups regularmente (`!admin-backup`)
- Revisa logs periódicamente (`!admin-view-logs`)

❌ **No hagas esto:**
- No compartas tu `.env`
- No ejecutes código desconocido con eval
- No dejes el bot sin supervisión
- No uses eval si no sabes JavaScript

---

## 🐛 Problemas Comunes

### "El navegador ya está ejecutándose"
```bash
rm -rf .wwebjs_auth
npm start
```

### "Acceso denegado" en admin
Verifica que `.env` tenga tu número:
```bash
cat .env
# Debe mostrar: ADMIN_NUMBER=5215512345678
```

### El bot responde lento
```
!admin-clean        → Limpiar base de datos
!admin-clear-logs   → Eliminar logs viejos
```

---

## 📊 Comandos Útiles del Propietario

```
!admin-backup           → Respaldo de datos
!admin-restore          → Ver respaldos disponibles
!admin-restart          → Reiniciar el bot
!admin-status           → Ver estado completo
!admin-system           → Información del sistema
!admin-users            → Listar usuarios
!admin-groups           → Listar grupos
!admin-clean            → Limpiar base de datos
!admin-view-logs [50]   → Ver últimos 50 logs
```

---

## 📁 Estructura de Carpetas

```
SISMOS V2/
├── index.js              ← Código principal
├── package.json          ← Dependencias
├── .env                  ← Variables de entorno (CREAR)
├── data.json             ← Base de datos (AUTO)
├── bot.log               ← Logs (AUTO)
├── alerta.png            ← Última alerta (AUTO)
├── COMANDOS.md           ← Guía de comandos
├── ADMIN_COMMANDS.md     ← Guía admin avanzada
├── README.md             ← Documentación completa
├── QUICK_START.md        ← Este archivo
└── node_modules/         ← Dependencias instaladas
```

---

## 🚀 Próximos Pasos

1. **Personalizar**: Cambia el número de admin en `.env`
2. **Probar**: Usa `!test` para verificar que todo funciona
3. **Configurar**: Ajusta parámetros en `index.js` si es necesario
4. **Ejecutar 24/7**: Considera usar `pm2` o `systemd`
5. **Monitorear**: Usa `!admin-status` regularmente

---

## 📚 Documentación

- **README.md** - Documentación completa
- **COMANDOS.md** - Guía de todos los comandos
- **ADMIN_COMMANDS.md** - Comandos administrativos avanzados
- **QUICK_START.md** - Este archivo (inicio rápido)

---

## 💡 Tips

- El bot verifica SASMEX cada 30 segundos
- Los datos se guardan automáticamente en `data.json`
- Todos los eventos se registran en `bot.log`
- Haz backup antes de hacer cambios importantes
- Usa `!admin-eval` solo si sabes JavaScript

---

**¡Listo para empezar!** 🚀

Ejecuta:
```bash
npm start
```

Y escanea el QR. ¡A disfrutar!
