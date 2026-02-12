# 🔐 SISTEMA ADMINISTRATIVO ULTRA AVANZADO

## Panel de Control del Propietario

Este documento describe todos los comandos administrativos ultra avanzados para controlar completamente el bot SASMEX WhatsApp.

---

## ⚙️ Configuración Inicial

Para habilitar los comandos de propietario, agrega tu número de WhatsApp al archivo `.env`:

```bash
ADMIN_NUMBER=5215512345678
```

**Formato:**
- ✅ Correcto: `5215512345678` (con código de país, sin +, sin espacios)
- ❌ Incorrecto: `+52 1 5512345678`

---

## 📊 Panel Principal

### `!admin-panel`
Accede al panel principal de propietario.

**Respuesta:**
- Estado general del bot
- Estadísticas de usuarios y grupos
- Lista de todos los comandos disponibles
- Información de última verificación

**Uso:**
```
!admin-panel
```

---

## 🔍 Monitoreo y Estado

### `!admin-status`
Estado ultra detallado del bot con toda la información relevante.

**Información mostrada:**
- ✅ Estado operativo (Online/Offline)
- ⏱️ Tiempo de funcionamiento (uptime)
- 💾 Uso de memoria detallado
- 👥 Estadísticas de usuarios y grupos
- 🔔 Información de alertas
- 📁 Estado de archivos
- 🌐 Estado de conexión
- 🔧 Configuración actual

**Uso:**
```
!admin-status
```

**Ejemplo de respuesta:**
```
╔══════════════════════════════════════════════════════════════╗
║            📊 ESTADO ULTRA DETALLADO DEL BOT                ║
╚══════════════════════════════════════════════════════════════╝

🟢 *ESTATUS GENERAL*
├─ Estado: ✅ OPERATIVO
├─ Versión: 1.0 Avanzada
├─ Plataforma: DARWIN
├─ Node.js: v20.x.x
└─ PID: 12345

[... más información ...]
```

### `!admin-system`
Información completa del sistema incluyendo hardware, proceso Node.js, y configuración.

**Información mostrada:**
- 💻 Hardware (CPUs, memoria, carga)
- 📊 Proceso Node.js (PID, versión, memoria)
- 📁 Directorio y archivos
- 🌐 Configuración del bot
- 📈 Estadísticas de base de datos

**Uso:**
```
!admin-system
```

---

## 💻 Ejecución de Código

### `!admin-eval [código JavaScript]`
Ejecuta código JavaScript arbitrario en el contexto del bot.

⚠️ **ADVERTENCIA**: Comando muy poderoso. Úsalo solo si sabes lo que haces.

**Uso:**
```
!admin-eval 5 + 3
!admin-eval Object.keys(data.users).length
!admin-eval process.uptime()
!admin-eval require('os').cpus().length
```

**Respuesta:**
```
✅ *RESULTADO:*
```
resultado
```
```

### `!admin-exec [comando]`
Ejecuta comandos del sistema operativo.

⚠️ **ADVERTENCIA**: Comando muy poderoso. Úsalo solo si sabes lo que haces.

**Uso:**
```
!admin-exec ls -la
!admin-exec df -h
!admin-exec whoami
!admin-exec date
```

**Respuesta:**
```
✅ *EJECUTADO:*
```
salida del comando
```
```

---

## 🔄 Control del Bot

### `!admin-restart`
Reinicia el bot completamente.

**Uso:**
```
!admin-restart
```

**Proceso:**
1. Envía confirmación de reinicio
2. Guarda datos pendientes
3. Cierra conexión WhatsApp
4. Sale del proceso
5. Sistema inicia el bot nuevamente

### `!admin-maintenance [on/off]`
Activa o desactiva el modo mantenimiento.

En modo mantenimiento:
- ✅ El bot sigue funcionando
- ❌ No responde a usuarios normales
- ✅ Aún responde a comandos del propietario

**Uso:**
```
!admin-maintenance on    → Activar modo mantenimiento
!admin-maintenance off   → Desactivar modo mantenimiento
```

---

## 💾 Respaldo y Restauración

### `!admin-backup`
Crea una copia de seguridad de toda la base de datos.

**Archivos creados:**
- `data.json.backup.TIMESTAMP.json` - Copia completa de todos los datos

**Uso:**
```
!admin-backup
```

**Respuesta:**
```
✅ Backup creado:
• Archivo: data.json.backup.2026-02-11T12-30-45-123Z.json
• Tamaño: 45.23KB
```

### `!admin-restore`
Lista los backups disponibles para restauración.

**Uso:**
```
!admin-restore
```

**Respuesta:**
```
📋 *Backups disponibles:*

1. data.json.backup.2026-02-11T12-30-45-123Z.json
2. data.json.backup.2026-02-10T18-15-32-456Z.json
3. data.json.backup.2026-02-09T09-45-12-789Z.json

_Responde con el número del backup a restaurar._
```

---

## 🗑️ Limpieza y Mantenimiento

### `!admin-clean`
Limpia la base de datos eliminando registros inválidos o incompletos.

**Elimina:**
- ✓ Usuarios sin datos válidos
- ✓ Usuarios sin estar suscritos
- ✓ Grupos sin datos válidos
- ✓ Grupos sin estar suscritos

**Uso:**
```
!admin-clean
```

**Respuesta:**
```
✅ Limpieza completada:
• Registros eliminados: 15
• Usuarios restantes: 245
• Grupos restantes: 32
```

### `!admin-clear-logs`
Elimina todos los logs del sistema.

⚠️ **Nota**: Esta acción es irreversible.

**Uso:**
```
!admin-clear-logs
```

**Respuesta:**
```
✅ Logs limpios:
• Tamaño anterior: 234.56KB
• Estado: Vacío
```

---

## 📋 Visualización de Logs

### `!admin-view-logs [n]`
Muestra los últimos n logs del sistema.

**Parámetros:**
- `[n]` - Número de logs a mostrar (default: 50)

**Uso:**
```
!admin-view-logs              → Últimos 50 logs
!admin-view-logs 100          → Últimos 100 logs
!admin-view-logs 200          → Últimos 200 logs
```

**Respuesta:**
```
📝 *ÚLTIMOS 50 LOGS:*
```
[2026-02-11 12:30:45] INIT: Bot iniciado
[2026-02-11 12:30:48] AUTH: Sesión de WhatsApp autenticada
[2026-02-11 12:31:02] ALERT: Nueva alerta procesada
[...]
```
```

---

## 👥 Gestión de Usuarios

### `!admin-users`
Lista todos los usuarios registrados con su estado.

**Información mostrada:**
- Estado (✅ activo, 🔇 silenciado, 🚫 baneado)
- ID del usuario
- Nivel de severidad configurado
- Fecha de unión

**Uso:**
```
!admin-users
```

**Respuesta:**
```
👥 *LISTA DE USUARIOS (456):*

1. ✅ 5215512345678@c.us
   Severidad: all | Unido: 11/02/2026
2. 🔇 5212223334444@c.us
   Severidad: mayor | Unido: 10/02/2026
3. 🚫 5211115556666@c.us
   Severidad: moderada | Unido: 09/02/2026

_Mostrando últimos 20 de 456_
```

### `!admin-groups`
Lista todos los grupos registrados con su estado.

**Información mostrada:**
- Estado (✅ activo, 🔇 silenciado)
- ID del grupo
- Nivel de severidad configurado
- Fecha de unión

**Uso:**
```
!admin-groups
```

**Respuesta:**
```
👥 *LISTA DE GRUPOS (32):*

1. ✅ 120383958395-1391291312@g.us
   Severidad: all | Unido: 08/02/2026
2. ✅ 130394949439-2392302323@g.us
   Severidad: mayor | Unido: 07/02/2026

_Mostrando últimos 20 de 32_
```

---

## 🚫 Control de Usuarios

### `!admin-ban [usuario]`
Bloquea a un usuario de recibir alertas.

**Uso:**
```
!admin-ban 5215512345678@c.us
!admin-ban 120383958395-1391291312@g.us
```

**Respuesta:**
```
✅ Usuario baneado: 5215512345678@c.us
```

**Efectos:**
- Usuario no recibe más alertas
- Usuario no puede usar comandos
- Usuario sigue en la base de datos (para registro)

### `!admin-unban [usuario]`
Desbloquea a un usuario para recibir alertas nuevamente.

**Uso:**
```
!admin-unban 5215512345678@c.us
```

**Respuesta:**
```
✅ Usuario desbaneado: 5215512345678@c.us
```

---

## 🔔 Control de Alertas

### `!admin-set-alert [texto]`
Establece una alerta manual sin esperar datos de SASMEX.

Útil para:
- ✓ Pruebas
- ✓ Alertas manuales
- ✓ Actualizaciones importantes
- ✓ Mensajes de mantenimiento

**Uso:**
```
!admin-set-alert ⚠️ ALERTA IMPORTANTE: Sistema en mantenimiento
!admin-set-alert 🔴 SISMO DETECTADO: Magnitud 6.5 en Guerrero
!admin-set-alert ✅ El sistema está funcionando normalmente
```

**Respuesta:**
```
✅ Alerta manual establecida:

⚠️ ALERTA IMPORTANTE: Sistema en mantenimiento
```

---

## 📊 Estadísticas

El comando `!admin-status` ya incluye estadísticas completas, pero aquí está el desglose:

**Estadísticas mostradas:**
- Total de usuarios: Número total de personas suscritas
- Usuarios activos: Usuarios no silenciados ni baneados
- Usuarios silenciados: Usuarios con alertas pausadas
- Usuarios baneados: Usuarios bloqueados
- Total de grupos: Número total de grupos suscritos
- Grupos activos: Grupos no silenciados
- Suscriptores totales: Suma de usuarios + grupos

**Memoria:**
- Heap usado: Memoria JavaScript actual
- Heap total: Memoria JavaScript asignada
- Externa: Memoria nativa
- RSS: Memoria total residente
- Porcentaje: Uso de memoria en %
- Disponible: Memoria libre en heap

---

## 🔐 Seguridad

### Buenas Prácticas

✅ **DO:**
- Cambia tu número de admin regularmente
- Revisa logs periódicamente
- Haz backups frecuentes
- Usa eval solo cuando sea necesario
- Documenta cambios importantes

❌ **DON'T:**
- No compartas tu número de admin
- No ejecutes código desconocido con eval
- No uses exec sin entender el comando
- No dejes el bot en modo mantenimiento indefinidamente
- No elimines logs sin hacer backup primero

### Auditoría

Todos los comandos administrativos quedan registrados en `bot.log`:

```
[OWNER] Panel accedido
[OWNER] Estado ultra detallado consultado
[OWNER] EVAL ejecutado: 5 + 3
[OWNER] EXEC: ls -la
[OWNER] Reinicio solicitado
[OWNER] Backup creado: data.json.backup.2026-02-11T12-30-45-123Z.json
```

---

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Revisar Salud del Sistema
```
!admin-status      → Ver estado actual
!admin-system      → Ver información hardware
!admin-view-logs   → Revisar logs recientes
```

### Ejemplo 2: Crear Backup
```
!admin-backup      → Crear copia
!admin-admin-users → Listar usuarios antes de cambios
```

### Ejemplo 3: Limpiar y Optimizar
```
!admin-clean       → Eliminar registros inválidos
!admin-clear-logs  → Limpiar logs viejos
!admin-backup      → Hacer backup post-limpieza
```

### Ejemplo 4: Debugging
```
!admin-eval Object.keys(data.users).length
!admin-eval process.memoryUsage()
!admin-eval require('os').cpus()[0]
```

### Ejemplo 5: Bloquear Usuarios Problemáticos
```
!admin-users       → Encontrar usuario problemático
!admin-ban 5215512345678@c.us
!admin-view-logs   → Verificar que se bloqueó correctamente
```

---

## 🆘 Troubleshooting

### Problema: "Acceso denegado"
**Solución:** Verifica que tu número esté configurado en `ADMIN_NUMBER` en `.env`

### Problema: "El browser ya está ejecutándose"
**Solución:** Ejecuta `!admin-restart` para reiniciar limpiamente

### Problema: Error en eval
**Solución:** Revisa la sintaxis de JavaScript. El error aparecerá en la respuesta

### Problema: Database corrupta
**Solución:** Usa `!admin-restore` para volver a una versión anterior

### Problema: Bot responde lento
**Solución:** 
```
!admin-clean        → Limpiar registros inválidos
!admin-clear-logs   → Limpiar logs viejos
!admin-status       → Verificar uso de memoria
```

---

## 📝 Notas Importantes

1. **Potencia**: Estos comandos son muy poderosos. Úsalos responsablemente.
2. **Seguridad**: Solo el admin puede usar estos comandos.
3. **Auditoría**: Todos los comandos quedan registrados en logs.
4. **Backup**: Siempre haz backup antes de cambios importantes.
5. **Testing**: Prueba comandos en una copia antes de producción.

---

**Sistema Administrativo v1.0 Avanzada**  
Última actualización: 11 de febrero de 2026  
Documentación completa para propietario del bot
