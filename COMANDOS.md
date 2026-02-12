# 🌋 Bot SASMEX WhatsApp - Guía Completa de Comandos

## 📱 Tabla de Contenidos

1. [Comandos Básicos](#comandos-básicos)
2. [Comandos de Alertas](#comandos-de-alertas)
3. [Configuración Personal](#configuración-personal)
4. [Comandos de Administrador](#comandos-de-administrador)
5. [Escala de Severidad](#escala-de-severidad)
6. [Recomendaciones de Seguridad](#recomendaciones-de-seguridad)
7. [Información de Emergencia](#información-de-emergencia)

---

## Comandos Básicos

| Comando | Alias | Descripción | Ejemplo |
|---------|-------|-------------|---------|
| `!start` | `!suscribir`, `!activar` | Suscribirse a las alertas sísmicas | `!start` |
| `!stop` | `!desuscribir`, `!desactivar` | Cancelar la suscripción | `!stop` |
| `!menu` | `!ayuda`, `!help` | Mostrar el menú completo de comandos | `!menu` |
| `!info` | - | Información detallada sobre SASMEX | `!info` |

### Detalles:

**!start (Suscribirse)**
- Te registra como suscriptor
- Activates automáticamente el monitoreo
- Envía mensaje de bienvenida personalizado
- Configura severidad por defecto: "all"

**!stop (Desuscribirse)**
- Cancela tu suscripción
- No recibirás más alertas
- Puedes reinscribirse en cualquier momento

**!menu (Menú de ayuda)**
- Muestra todos los comandos disponibles
- Incluye ejemplos de uso
- Muestra enlaces útiles

**!info (Información SASMEX)**
- Explicación detallada del sistema
- Instituciones responsables
- Acciones en caso de sismo
- Kit de emergencia recomendado

---

## Comandos de Alertas

| Comando | Alias | Descripción | Uso |
|---------|-------|-------------|-----|
| `!alerta` | `!ultima` | Ver última alerta sísmica con detalles | `!alerta` |
| `!test` | `!prueba` | Prueba del sistema (genera imagen de prueba) | `!test` |
| `!estado` | `!status` | Ver estado detallado del bot | `!estado` |

### Detalles:

**!alerta (Ver última alerta)**
- Consulta SASMEX en tiempo real
- Genera imagen de alta calidad
- Incluye recomendaciones específicas
- Muestra datos completos del evento
- Determina color de alerta (Verde/Amarillo/Rojo)

**!test (Prueba del sistema)**
- Verifica que todo funciona correctamente
- Prueba generación de imágenes
- Prueba envío de mensajes
- Genera reporte completo del sistema
- Muestra estado de todos los componentes

**!estado (Estado del bot)**
- Información detallada del bot
- Estadísticas de rendimiento
- Memoria usada
- Número de suscriptores
- Última verificación de SASMEX

---

## Configuración Personal

| Comando | Parámetros | Descripción |
|---------|-----------|-------------|
| `!config` | - | Ver tu configuración actual |
| `!severidad` | `all`, `menor`, `moderada`, `mayor` | Cambiar nivel de severidad |
| `!silenciar` | - | Silenciar alertas temporalmente |
| `!activar_alertas` | - | Reactivar las alertas |

### Niveles de Severidad:

**🟢 all (Todas)**
- Recibe TODAS las alertas sin filtros
- Máxima protección
- Nivel predeterminado para nuevos usuarios

**🟢 menor (Menor en adelante)**
- Recibe alertas Menor, Moderada y Mayor
- Equilibrio entre protección e información

**🟡 moderada (Moderada en adelante)**
- Recibe alertas Moderada y Mayor
- Filtra alertas poco significativas
- Recomendado para usuarios con experiencia

**🔴 mayor (Solo Mayor)**
- Recibe SOLO alertas de severidad Mayor
- Máximo filtrado
- Solo para impactos significativos

### Ejemplos de Uso:

```
!severidad all       → Recibir todas las alertas
!severidad menor     → Solo Menor o superior
!severidad moderada  → Solo Moderada o superior
!severidad mayor     → Solo alertas Mayor

!silenciar           → Pausar alertas
!activar_alertas     → Reanudar alertas
!config              → Ver configuración actual
```

---

## Comandos de Administrador

Estos comandos solo funcionan si tienes permisos de administrador configurados.

### Requisito:
Configura la variable de entorno `ADMIN_NUMBER` en tu `.env`:
```bash
ADMIN_NUMBER=5215512345678
```

| Comando | Parámetros | Descripción |
|---------|-----------|-------------|
| `!admin` | - | Ver panel de administración |
| `!stats` | - | Ver estadísticas detalladas |
| `!logs` | `[n]` | Ver últimos n logs (default: 15) |
| `!broadcast` | `[mensaje]` | Enviar mensaje a todos los suscriptores |

### Detalles:

**!admin (Panel de Administración)**
- Muestra panel de control
- Estadísticas rápidas
- Accesos a otros comandos admin

**!stats (Estadísticas Detalladas)**
- Total de usuarios y grupos
- Usuarios activos vs inactivos
- Usuarios silenciados
- Uso de memoria del sistema
- Información de uptime
- Configuración del sistema

**!logs [n] (Ver Logs)**
```
!logs              → Ver últimos 15 logs
!logs 50           → Ver últimos 50 logs
!logs 100          → Ver últimos 100 logs
```

**!broadcast [mensaje] (Enviar a Todos)**
```
!broadcast Hola a todos, prueba del sistema
!broadcast ⚠️ Actualización importante
```

---

## Escala de Severidad

### 🟢 Verde (MENOR)
- **Descripción**: Sismo detectado sin impacto esperado
- **Magnitud**: Baja
- **Alcance**: Limitado
- **Acción**: Mantener información
- **Recomendación**: Estar atento

### 🟡 Amarillo (MODERADA)
- **Descripción**: Sismo con impacto moderado esperado
- **Magnitud**: Media
- **Alcance**: Regional
- **Acción**: Buscar refugio seguro
- **Recomendación**: Protegerse bajo muebles sólidos

### 🔴 Rojo (MAYOR)
- **Descripción**: Sismo con impacto severo esperado
- **Magnitud**: Alta
- **Alcance**: Amplio
- **Acción**: Evacuación inmediata
- **Recomendación**: Dirigirse a zona segura

---

## Recomendaciones de Seguridad

### ⚡ ANTES DE UN SISMO:

✓ Identifica zonas seguras en tu casa/oficina/escuela  
✓ Prepara un kit de emergencia  
✓ Conoce rutas de evacuación  
✓ Mantén números de emergencia a mano  
✓ Suscríbete a este bot para alertas  
✓ Educa a tu familia sobre protocolo sísmico  
✓ Asegura muebles pesados a las paredes  

### ⚡ DURANTE UN SISMO:

**MANTÉN LA CALMA** - Lo más importante es no entrar en pánico

**En casa/oficina:**
- ✓ Aléjate de ventanas y espejos
- ✓ Protégete bajo mesa resistente o mueble sólido
- ✓ Sujétate con las manos
- ✓ Si no hay mesa, protege tu cabeza con los brazos
- ✓ NO USES ELEVADORES

**En la calle:**
- ✓ Aléjate de edificios y líneas eléctricas
- ✓ Evita lugares cerrados
- ✓ Si es posible, acuéstate en zona abierta
- ✓ Protege tu cabeza

**En un vehículo:**
- ✓ Detén el vehículo de forma segura
- ✓ Mantente dentro del vehículo
- ✓ Aléjate de puentes y estructuras

### ⚡ DESPUÉS DE UN SISMO:

- ✓ Verifica tu seguridad y la de otros
- ✓ Revisa daños estructurales
- ✓ Corta el gas si detectas fugas
- ✓ No muevas objetos pesados que podrían caer
- ✓ Usa escaleras, nunca elevadores
- ✓ Reporta emergencias al 911
- ✓ Síguenos para información actualizada
- ✓ Ayuda a personas necesitadas

---

## Kit de Emergencia Recomendado

Mantén preparado:

### Esenciales:
- 🥤 Agua potable (1 litro por persona/día, mínimo 3 días)
- 🍞 Alimentos no perecederos
- 🩹 Botiquín de primeros auxilios
- 🔦 Linterna y pilas (LED recomendado)
- 📻 Radio portátil (batería/cuerda)
- 📱 Cargador portátil de teléfono

### Seguridad:
- 🔨 Herramientas básicas (martillo, destornillador)
- 🧤 Guantes de trabajo
- 😷 Mascarillas (para polvo)
- 🛑 Cinta adhesiva
- 📋 Documentos importantes (fotografías, respaldos)

### Medicamentos:
- 💊 Medicinas personales
- 💉 Inyectores si es necesario
- 🩸 Materiales para heridas
- 🌡️ Termómetro

### Valuables:
- 💵 Efectivo en pequeñas denominaciones
- 🎫 Documentos de identidad
- 📸 Fotos de familia
- 💎 Documentos de propiedad

---

## Información de Emergencia

### 📞 Números Importantes:

**EMERGENCIAS:**
- 🚨 **911** - Policía, Ambulancia, Bomberos (Número único)

**Otros:**
- 🏥 Servicios de Salud Local
- 🏢 Protección Civil Local
- 👨‍🚒 Cuerpo de Bomberos Local
- 🏛️ Municipalidad

### 🌐 Sitios Oficiales:

**SASMEX (Sistema de Alerta Sísmica):**
- 🔗 https://www.sasmex.net
- 📡 https://rss.sasmex.net

**CENAPRED (Centro Nacional de Prevención de Desastres):**
- 🔗 https://www.cenapred.unam.mx

**CIRES (Centro de Instrumentación y Registro Sísmico):**
- 🔗 https://www.cires.org.mx

**SSN UNAM (Servicio Sismológico Nacional):**
- 🔗 https://www.ssn.unam.mx

---

## Variables de Entorno

Crea un archivo `.env` en la raiz del proyecto:

```bash
# Número de administrador (sin + ni espacios, con código de país)
ADMIN_NUMBER=5215512345678
```

**Formato del número:**
- ✓ Correcto: `5215512345678`
- ✗ Incorrecto: `+52 15512345678`
- ✗ Incorrecto: `+52 1 551 234 5678`

---

## 🚀 Iniciar el Bot

```bash
# Instalar dependencias
npm install

# Iniciar el bot
npm start

# O ejecutar directamente
node index.js
```

El bot mostrará un código QR para escanear con WhatsApp.

### Pasos para conectar:
1. Ejecuta el bot
2. Escanea el código QR con WhatsApp
3. Ve a Dispositivos vinculados
4. Selecciona "Vincular dispositivo"
5. ¡Listo! El bot está configurado

---

## 📊 Archivos Generados

El bot crea automáticamente:

- `data.json` - Base de datos de suscriptores
- `bot.log` - Registro de todos los eventos
- `alerta.png` - Imagen de la última alerta
- `.wwebjs_auth/` - Sesión de WhatsApp

---

## 💡 Tips Importantes

✓ Mantén el bot funcionando 24/7  
✓ Revisa tu configuración periódicamente  
✓ Prueba el sistema regularmente con `!test`  
✓ Comparte el bot con familia y amigos  
✓ Sé responsable con broadcast (solo si es necesario)  
✓ Respeta los permisos de administrador  
✓ Actualiza regularmente tu kit de emergencia  

---

## ⚠️ Avisos Legales

- Este bot es una herramienta de información
- No reemplaza sistemas oficiales de alerta
- Siempre sigue instrucciones de autoridades
- SASMEX es el sistema oficial de México
- Protección Civil es tu guía en emergencias

---

## 📬 Soporte

Para reportar problemas o sugerencias:
- Revisa los logs con `!logs`
- Prueba el sistema con `!test`
- Verifica conexión de internet
- Reinicia el bot si es necesario

---

**Bot SASMEX WhatsApp v1.0 Avanzada**  
Última actualización: 11 de febrero de 2026  
Mantente seguro 🌋

