# 🌋 Bot SASMEX WhatsApp - Versión 1.0 Avanzada

Sistema ultra completo de alertas sísmicas para WhatsApp con panel administrativo avanzado.

## ✨ Características Principales

### 🎯 Para Usuarios
- ✅ Alertas sísmicas en tiempo real desde SASMEX
- ✅ Filtrado por severidad personalizado
- ✅ Imágenes de alta calidad de alertas
- ✅ Configuración personal
- ✅ Silenciado temporal de alertas
- ✅ Información detallada sobre sismos

### 🔐 Para Propietario
- ✅ Panel administrativo ultra avanzado
- ✅ Eval para ejecutar código JavaScript
- ✅ Ejecución de comandos del sistema
- ✅ Control total de usuarios y grupos
- ✅ Sistema de backup y restauración
- ✅ Monitoreo detallado del sistema
- ✅ Estadísticas en tiempo real
- ✅ Gestión de logs
- ✅ Modo mantenimiento
- ✅ Broadcast de mensajes

---

## 🚀 Instalación Rápida

### 1. Clonar/Descargar el proyecto
```bash
cd /ruta/del/proyecto
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env`:
```bash
ADMIN_NUMBER=5215512345678
```

### 4. Iniciar el bot
```bash
npm start
```

El bot mostrará un código QR. Escanéalo con WhatsApp.

---

## 📱 Comandos para Usuarios

### Comandos Básicos
```
!start              → Suscribirse
!stop               → Desuscribirse
!menu               → Ver menú completo
!info               → Información sobre SASMEX
```

### Alertas
```
!alerta             → Ver última alerta con detalles
!test               → Prueba del sistema
!estado             → Estado del bot
```

### Configuración
```
!config             → Ver tu configuración
!severidad [nivel]  → Cambiar filtro de severidad
!silenciar          → Pausar alertas
!activar_alertas    → Reanudar alertas
```

Niveles de severidad: `all`, `menor`, `moderada`, `mayor`

### Admin
```
!admin              → Panel de administración
!stats              → Estadísticas del bot
!logs [n]           → Ver últimos n logs
!broadcast [msg]    → Enviar mensaje a todos
```

---

## 🔐 Comandos del Propietario

### Panel y Monitoreo
```
!admin-panel        → Panel principal del propietario
!admin-status       → Estado ultra detallado del bot
!admin-system       → Información completa del sistema
```

### Ejecución de Código
```
!admin-eval [código]      → Ejecutar JavaScript
!admin-exec [comando]     → Ejecutar comandos del sistema
```

### Control del Bot
```
!admin-restart            → Reiniciar el bot
!admin-maintenance [on/off]  → Activar modo mantenimiento
```

### Respaldos
```
!admin-backup       → Crear respaldo de datos
!admin-restore      → Restaurar desde respaldo
```

### Limpieza
```
!admin-clean        → Limpiar registros inválidos
!admin-clear-logs   → Eliminar todos los logs
!admin-view-logs [n]  → Ver últimos n logs
```

### Gestión de Usuarios
```
!admin-users        → Listar todos los usuarios
!admin-groups       → Listar todos los grupos
!admin-ban [usuario]    → Bloquear usuario
!admin-unban [usuario]  → Desbloquear usuario
```

### Alertas
```
!admin-set-alert [texto]  → Establecer alerta manual
```

---

## 📋 Archivos Generados

El bot crea y usa automáticamente:

```
SISMOS V2/
├── index.js                    # Código principal del bot
├── package.json                # Dependencias del proyecto
├── .env                        # Variables de entorno
├── data.json                   # Base de datos de usuarios
├── bot.log                     # Logs del sistema
├── alerta.png                  # Última imagen de alerta
├── .wwebjs_auth/               # Sesión de WhatsApp
└── node_modules/               # Dependencias instaladas
```

### data.json
Estructura de la base de datos:
```json
{
  "users": {
    "5215512345678@c.us": {
      "subscribed": true,
      "severityLevel": "all",
      "muted": false,
      "banned": false,
      "joinDate": "2026-02-11T12:00:00Z"
    }
  },
  "groups": {
    "120383958395-1391291312@g.us": {
      "subscribed": true,
      "severityLevel": "all",
      "muted": false,
      "joinDate": "2026-02-11T12:00:00Z"
    }
  },
  "lastAlert": "2026-02-11T12:30:00Z",
  "lastContent": "Contenido de la última alerta..."
}
```

### bot.log
Registro de todos los eventos:
```
[2026-02-11 12:30:45] INIT: Bot iniciado
[2026-02-11 12:30:48] AUTH: Sesión de WhatsApp autenticada
[2026-02-11 12:31:02] ALERT: Nueva alerta procesada
[2026-02-11 12:31:03] BROADCAST: Enviando a 456 usuarios
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno (.env)

```bash
# Número del propietario (SIN +, SIN espacios, CON código de país)
ADMIN_NUMBER=5215512345678
```

### Configuración en index.js (CONFIG)

```javascript
const CONFIG = {
    adminNumber: process.env.ADMIN_NUMBER || '',
    webUrl: 'https://rss.sasmex.net',
    apiUrl: 'https://rss.sasmex.net/api/v1/alerts/latest/cap/',
    checkInterval: 30,        // Verificar cada 30 segundos
    fetchTimeout: 15000,      // Timeout de 15 segundos para fetch
    pageTimeout: 30000,       // Timeout de 30 segundos para página
    prefix: '!'               // Prefijo de comandos
};
```

---

## 🌐 Fuentes de Datos

### SASMEX (Sistema de Alerta Sísmica Mexicano)
- **Sitio**: https://www.sasmex.net
- **RSS**: https://rss.sasmex.net/api/v1/alerts/latest/cap/
- **Descripción**: Sistema oficial de alertas sísmicas de México

### CENAPRED (Centro Nacional de Prevención de Desastres)
- **Sitio**: https://www.cenapred.unam.mx
- **Descripción**: Centro de información sobre desastres naturales

### SSN UNAM (Servicio Sismológico Nacional)
- **Sitio**: https://www.ssn.unam.mx
- **Descripción**: Datos técnicos de sismos registrados

---

## 📊 Estadísticas y Monitoreo

### Estado del Bot (!admin-status)
- Estatus operativo
- Tiempo de funcionamiento
- Uso de memoria
- Estadísticas de usuarios y grupos
- Estado de alertas
- Configuración del sistema

### Sistema (!admin-system)
- Información de hardware (CPUs, memoria)
- Proceso Node.js
- Directorio y archivos
- Configuración del bot
- Estadísticas de base de datos

---

## 🔒 Seguridad

### Autenticación
- Solo el número configurado en `ADMIN_NUMBER` puede usar comandos de propietario
- Cada comando administrativo queda registrado en logs

### Respaldos
- Haz respaldos regularmente con `!admin-backup`
- Los respaldos incluyen toda la base de datos de usuarios
- Puedes restaurar desde respaldos previos

### Logs
- Todos los eventos quedan registrados en `bot.log`
- Puedes ver logs con `!admin-view-logs`
- Limpiar logs con `!admin-clear-logs` si es necesario

---

## 🐛 Troubleshooting

### El bot no se inicia
```bash
# Limpia sesión anterior
rm -rf .wwebjs_auth

# Reinstala dependencias
npm install

# Intenta nuevamente
npm start
```

### "Acceso denegado" en comandos admin
- Verifica que tu número esté en `.env`
- El formato debe ser: `5215512345678` (sin +, sin espacios)
- Incluye el código de país (52 para México)

### El bot responde lentamente
```
!admin-status       → Verificar uso de memoria
!admin-clean        → Limpiar registros inválidos
!admin-clear-logs   → Limpiar logs viejos
```

### Base de datos corrupta
```
!admin-backup       → Verificar que tienes respaldo
!admin-restore      → Restaurar desde versión anterior
```

---

## 📚 Documentación Adicional

- **COMANDOS.md** - Guía completa de todos los comandos
- **ADMIN_COMMANDS.md** - Documentación detallada de comandos administrativos

---

## 📦 Dependencias

```json
{
  "whatsapp-web.js": "^1.34.6",      // Cliente de WhatsApp Web
  "qrcode-terminal": "^0.12.0",       // QR en terminal
  "puppeteer": "^24.37.2",            // Navegador sin interfaz
  "xml2js": "^0.6.2",                 // Parser XML
  "node-fetch": "^2.7.0"              // Cliente HTTP
}
```

---

## 🎯 Requisitos del Sistema

- **Node.js**: v14.0.0 o superior
- **npm**: v6.0.0 o superior
- **WhatsApp**: Cuenta activa
- **Conexión**: Internet estable

---

## 📝 Notas Importantes

1. **Monitoreo 24/7**: El bot verifica SASMEX cada 30 segundos
2. **Auto-suscripción**: Cualquier mensaje del usuario lo suscribe
3. **Auto-limpieza**: Los usuarios bloqueados se eliminan automáticamente
4. **Persistencia**: Todos los datos se guardan en `data.json`
5. **Auditoría**: Todos los eventos se registran en `bot.log`

---

## 🚀 Roadmap Futuro

- [ ] Base de datos SQL
- [ ] Dashboard web
- [ ] Notificaciones push
- [ ] Múltiples idiomas
- [ ] API REST
- [ ] Webhook para integraciones
- [ ] Estadísticas avanzadas
- [ ] Predicciones de sismos

---

## 📞 Soporte

Para problemas o sugerencias:
1. Revisa los logs con `!admin-view-logs`
2. Prueba el sistema con `!test`
3. Verifica conexión de internet
4. Reinicia con `!admin-restart`

---

**Bot SASMEX WhatsApp v1.0 Avanzada**  
Sistema ultra completo con panel administrativo avanzado  
Última actualización: 11 de febrero de 2026
