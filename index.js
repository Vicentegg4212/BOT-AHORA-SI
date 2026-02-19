/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                        BOT DE ALERTAS SASMEX
 *                         VERSIÓN WHATSAPP
 *                  ✅ CÓDIGO CORREGIDO v1.0 + HEROKU FULL
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Detectar si está en Heroku
const IS_HEROKU = !!process.env.DYNO;
const PORT = process.env.PORT || 3000;

// Configurar variables de entorno para Heroku
if (IS_HEROKU) {
    // Puppeteer descargará Chromium automáticamente en Heroku
    // No necesita configuración adicional
    console.log('🟢 Modo HEROKU detectado');
}

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const util = require('util');

// ═══════════════════════════════════════════════════════════════════════════
//                    🔧 COMPATIBILIDAD CON NODE.JS
// ═══════════════════════════════════════════════════════════════════════════

let fetch;
if (typeof globalThis.fetch === 'undefined') {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ ERROR: Instala node-fetch con: npm install node-fetch@2');
        process.exit(1);
    }
} else {
    fetch = globalThis.fetch;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// Configurar rutas de archivos según ambiente
const DATA_DIR = IS_HEROKU ? (process.env.HOME || '/tmp') : __dirname;

const CONFIG = {
    // Admin (número con código de país, sin + ni espacios)
    adminNumber: process.env.ADMIN_NUMBER || '', // Ej: '5215512345678'
    
    // URLs SASMEX
    webUrl: 'https://rss.sasmex.net',
    apiUrl: 'https://rss.sasmex.net/api/v1/alerts/latest/cap/',
    
    // Configuración
    checkInterval: 30, // segundos
    dataFile: path.join(DATA_DIR, 'data.json'),
    screenshotFile: path.join(DATA_DIR, 'alerta.png'),
    logFile: path.join(DATA_DIR, 'bot.log'),
    sessionFolder: path.join(DATA_DIR, '.wwebjs_auth'),
    cacheFolder: path.join(DATA_DIR, '.wwebjs_cache'),
    
    // Timeouts
    fetchTimeout: 15000,
    pageTimeout: 30000,
    
    // 🛡️ SISTEMA ANTI-CRASH
    maxRetries: 5,
    retryDelay: 3000,
    circuitBreakerThreshold: 10,
    circuitBreakerTimeout: 60000,
    healthCheckInterval: 15000,
    autoRestartOnCrash: true,
    maxConsecutiveErrors: 20,
    errorResetTime: 300000, // 5 minutos
    
    // Puppeteer para imágenes
    puppeteerOptions: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=800,600',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--single-process'
        ]
    },
    
    // Prefijo de comandos
    prefix: '!',
    
    // Configuración de simulacros
    simulacros: {
        duracionMinutos: 10,
        recordatorios: [24, 12, 6, 1, 0.5], // horas antes
        puntosParticipacion: 50,
        puntosCompletacion: 100,
        tiempoEvaluacion: 30 // minutos después
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//                    🛡️ SISTEMA ANTI-CRASH ULTRA ROBUSTO
// ═══════════════════════════════════════════════════════════════════════════

class CircuitBreaker {
    constructor(threshold = 10, timeout = 60000) {
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
    }

    async execute(fn, fallback = null) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                console.log('⚠️ Circuit Breaker ABIERTO - usando fallback');
                return fallback ? fallback() : null;
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            if (fallback) return fallback();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`🔴 Circuit Breaker ABIERTO por ${this.timeout}ms`);
        }
    }

    reset() {
        this.failureCount = 0;
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }
}

const circuitBreakers = {
    sasmex: new CircuitBreaker(CONFIG.circuitBreakerThreshold, CONFIG.circuitBreakerTimeout),
    whatsapp: new CircuitBreaker(CONFIG.circuitBreakerThreshold, CONFIG.circuitBreakerTimeout),
    browser: new CircuitBreaker(CONFIG.circuitBreakerThreshold, CONFIG.circuitBreakerTimeout)
};

async function retryOperation(fn, maxRetries = CONFIG.maxRetries, delay = CONFIG.retryDelay, operationName = 'Operación') {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (attempt > 1) {
                console.log(`✅ ${operationName} exitosa en intento ${attempt}/${maxRetries}`);
            }
            return result;
        } catch (error) {
            lastError = error;
            console.error(`⚠️ ${operationName} falló (${attempt}/${maxRetries}): ${error.message}`);
            
            if (attempt < maxRetries) {
                const waitTime = delay * attempt; // Exponential backoff
                console.log(`⏳ Reintentando en ${waitTime}ms...`);
                await sleep(waitTime);
            }
        }
    }
    
    console.error(`❌ ${operationName} falló después de ${maxRetries} intentos`);
    throw lastError;
}

function safeExecute(fn, fallbackValue = null, errorMessage = 'Error en operación') {
    try {
        return fn();
    } catch (error) {
        console.error(`${errorMessage}: ${error.message}`);
        logToFile('ERROR', `${errorMessage}: ${error.message}\n${error.stack}`);
        return fallbackValue;
    }
}

async function safeExecuteAsync(fn, fallbackValue = null, errorMessage = 'Error en operación asíncrona') {
    try {
        return await fn();
    } catch (error) {
        console.error(`${errorMessage}: ${error.message}`);
        logToFile('ERROR', `${errorMessage}: ${error.message}\n${error.stack}`);
        return fallbackValue;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                           BASE DE DATOS LOCAL
// ═══════════════════════════════════════════════════════════════════════════

function loadData() {
    try {
        if (fs.existsSync(CONFIG.dataFile)) {
            const content = fs.readFileSync(CONFIG.dataFile, 'utf8');
            if (content.trim()) {
                return JSON.parse(content);
            }
        }
    } catch (error) {
        console.error('⚠️ Error cargando datos:', error.message);
        if (fs.existsSync(CONFIG.dataFile)) {
            const backupFile = CONFIG.dataFile + '.backup';
            fs.copyFileSync(CONFIG.dataFile, backupFile);
        }
    }
    return { users: {}, groups: {}, lastContent: '', lastAlert: null };
}

function saveData(data) {
    try {
        const tempFile = CONFIG.dataFile + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempFile, CONFIG.dataFile);
        return true;
    } catch (error) {
        console.error('❌ Error guardando datos:', error.message);
        return false;
    }
}

function logToFile(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;
    try {
        fs.appendFileSync(CONFIG.logFile, logEntry);
    } catch (error) {
        console.error('Error escribiendo log:', error.message);
    }
}

function getLogs(lines = 50) {
    try {
        if (!fs.existsSync(CONFIG.logFile)) return 'No hay logs disponibles';
        const logs = fs.readFileSync(CONFIG.logFile, 'utf8');
        const logLines = logs.split('\n').filter(line => line.trim());
        return logLines.slice(-lines).join('\n') || 'Sin logs recientes';
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

function clearLogs() {
    try {
        fs.writeFileSync(CONFIG.logFile, '');
        logToFile('INFO', 'Logs limpiados');
        return true;
    } catch (error) {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                        GESTIÓN DE SUSCRIPTORES
// ═══════════════════════════════════════════════════════════════════════════

function getSubscribers() {
    const data = loadData();
    const users = data.users || {};
    const groups = data.groups || {};
    
    const activeUsers = Object.keys(users).filter(id => {
        const user = users[id];
        return user && user.subscribed && !user.muted;
    });
    const activeGroups = Object.keys(groups).filter(id => {
        const group = groups[id];
        return group && group.subscribed && !group.muted;
    });
    
    return [...activeUsers, ...activeGroups];
}

function addSubscriber(chatId, isGroup = false) {
    if (!chatId) return false;
    
    const data = loadData();
    const collection = isGroup ? 'groups' : 'users';
    
    if (!data[collection]) data[collection] = {};
    
    const id = String(chatId);
    if (!data[collection][id]) {
        data[collection][id] = {
            subscribed: true,
            severity: 'all',
            muted: false,
            joinedAt: new Date().toISOString()
        };
        if (saveData(data)) {
            console.log(`✅ Nuevo suscriptor: ${id} (${isGroup ? 'grupo' : 'usuario'})`);
            return true;
        }
    } else if (!data[collection][id].subscribed) {
        data[collection][id].subscribed = true;
        saveData(data);
        return true;
    }
    return false;
}

function removeSubscriber(chatId, isGroup = false) {
    if (!chatId) return false;
    
    const data = loadData();
    const collection = isGroup ? 'groups' : 'users';
    
    if (!data[collection]) return false;
    
    const id = String(chatId);
    if (data[collection][id]) {
        data[collection][id].subscribed = false;
        if (saveData(data)) {
            console.log(`❌ Suscriptor eliminado: ${id}`);
            return true;
        }
    }
    return false;
}

function getUserConfig(chatId) {
    const data = loadData();
    const id = String(chatId);
    
    // Buscar en usuarios y grupos
    if (data.users && data.users[id] && typeof data.users[id] === 'object') {
        return data.users[id];
    }
    if (data.groups && data.groups[id] && typeof data.groups[id] === 'object') {
        return data.groups[id];
    }
    
    return {
        subscribed: false,
        severity: 'all',
        muted: false
    };
}

function updateUserConfig(chatId, updates, isGroup = false) {
    const data = loadData();
    const collection = isGroup ? 'groups' : 'users';
    
    if (!data[collection]) data[collection] = {};
    
    const id = String(chatId);
    if (!data[collection][id]) {
        data[collection][id] = {
            subscribed: false,
            severity: 'all',
            muted: false
        };
    }
    
    Object.assign(data[collection][id], updates);
    return saveData(data);
}

function setUserSeverity(chatId, severity, isGroup = false) {
    if (!['all', 'menor', 'moderada', 'mayor'].includes(severity)) return false;
    return updateUserConfig(chatId, { severity }, isGroup);
}

function setUserMuted(chatId, muted, isGroup = false) {
    return updateUserConfig(chatId, { muted }, isGroup);
}

function shouldSendAlert(chatId, alertSeverity) {
    const config = getUserConfig(chatId);
    if (!config || !config.subscribed || config.muted) return false;
    
    const severityLevels = { 'menor': 1, 'moderada': 2, 'mayor': 3 };
    const userLevel = config.severity === 'all' ? 0 : (severityLevels[config.severity] || 2);
    
    let alertLevel = 2;
    const sevLower = String(alertSeverity || '').toLowerCase();
    if (sevLower.includes('menor')) alertLevel = 1;
    else if (sevLower.includes('mayor')) alertLevel = 3;
    
    return alertLevel >= userLevel;
}

function isAdmin(chatId) {
    if (!CONFIG.adminNumber) return false;
    const id = String(chatId).replace('@c.us', '').replace('@g.us', '');
    return id.includes(CONFIG.adminNumber);
}

function getLastContent() {
    const data = loadData();
    return data.lastContent || '';
}

function setLastContent(content) {
    const data = loadData();
    data.lastContent = content || '';
    data.lastUpdate = new Date().toISOString();
    saveData(data);
}

// ═══════════════════════════════════════════════════════════════════════════
//                    PUPPETEER - NAVEGADOR PARA IMÁGENES
// ═══════════════════════════════════════════════════════════════════════════

let imageBrowser = null;
let browserLock = false;

async function initImageBrowser() {
    let attempts = 0;
    while (browserLock && attempts < 10) {
        await sleep(500);
        attempts++;
    }
    
    if (imageBrowser) {
        try {
            const pages = await imageBrowser.pages();
            if (pages) return imageBrowser;
        } catch (error) {
            console.log('⚠️ Browser inactivo, reiniciando...');
            imageBrowser = null;
        }
    }
    
    browserLock = true;
    
    try {
        console.log('🌐 Iniciando navegador para imágenes...');
        imageBrowser = await puppeteer.launch(CONFIG.puppeteerOptions);
        
        imageBrowser.on('disconnected', () => {
            console.log('⚠️ Browser desconectado');
            imageBrowser = null;
        });
        
        console.log('✅ Navegador para imágenes iniciado');
        return imageBrowser;
    } catch (error) {
        console.error('❌ Error iniciando navegador:', error.message);
        imageBrowser = null;
        throw error;
    } finally {
        browserLock = false;
    }
}

async function closeImageBrowser() {
    if (imageBrowser) {
        try {
            await imageBrowser.close();
            console.log('🌐 Navegador para imágenes cerrado');
        } catch (error) {
            console.error('⚠️ Error cerrando navegador:', error.message);
        } finally {
            imageBrowser = null;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
//                      OBTENCIÓN DE DATOS SASMEX
// ═══════════════════════════════════════════════════════════════════════════

async function getWebContent() {
    return await circuitBreakers.sasmex.execute(
        async () => {
            return await retryOperation(
                async () => {
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timeoutId = setTimeout(() => {
                        if (controller) controller.abort();
                    }, CONFIG.fetchTimeout);
                    
                    try {
                        console.log('📡 Obteniendo RSS SASMEX...');
                        
                        const fetchOptions = {
                            headers: {
                                'User-Agent': 'SASMEX-WhatsApp-Bot/2.0-Ultra-Robust',
                                'Accept': 'application/xml, text/xml, */*',
                                'Cache-Control': 'no-cache'
                            }
                        };
                        
                        if (controller) fetchOptions.signal = controller.signal;
                        
                        const response = await fetch(CONFIG.apiUrl, fetchOptions);
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        
        if (!xmlText || xmlText.trim().length === 0) {
            throw new Error('Respuesta vacía del servidor');
        }
        
        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: false,
            trim: true
        });
        
        const parseString = util.promisify(parser.parseString.bind(parser));
        const result = await parseString(xmlText);
        
        if (!result) {
            throw new Error('Error parseando XML');
        }
        
        let entry = null;
        if (result.feed && result.feed.entry) {
            entry = Array.isArray(result.feed.entry)
                ? result.feed.entry[0]
                : result.feed.entry;
        } else if (result.rss && result.rss.channel && result.rss.channel.item) {
            entry = Array.isArray(result.rss.channel.item)
                ? result.rss.channel.item[0]
                : result.rss.channel.item;
        }
        
        if (!entry) {
            return {
                success: false,
                error: 'No se encontró entrada en el feed'
            };
        }
        
        const id = entry.id || entry.guid || entry.link || '';
        const title = entry.title || 'Alerta Sísmica';
        const updated = entry.updated || entry.pubDate || new Date().toISOString();
        
        function stripRssBoilerplate(text) {
            if (!text || typeof text !== 'string') return '';
            return text
                .split(/\r?\n/)
                .filter(line => {
                    const t = line.trim();
                    if (!t) return false;
                    if (/^ALERTA\s+SÍSMICA\s+SASMEX$/i.test(t)) return false;
                    if (/^Sistema\s+de\s+Alerta\s+Sísmica\s+Mexicano$/i.test(t)) return false;
                    if (/Consulta:\s*https?:\/\/cires\.org\.mx\/reportes_sasmex\//i.test(t)) return false;
                    if (/^[━─]+/.test(t) && /Consulta:/i.test(t)) return false;
                    return true;
                })
                .join('\n')
                .trim();
        }
        
        let description = '';
        let headline = title;
        let severity = 'Unknown';
        
        if (entry.content) {
            if (typeof entry.content === 'string') {
                description = String(entry.content);
            } else if (entry.content && entry.content.alert && entry.content.alert.info) {
                const info = Array.isArray(entry.content.alert.info) ? entry.content.alert.info[0] : entry.content.alert.info;
                headline = info.headline || title;
                description = info.description ? String(info.description) : '';
                severity = info.severity ? String(info.severity) : 'Unknown';
            } else if (entry.content && entry.content._) {
                description = String(entry.content._);
            }
        } else if (entry.description) {
            description = typeof entry.description === 'string'
                ? String(entry.description)
                : (entry.description && entry.description._ ? String(entry.description._) : '');
        } else if (entry.summary) {
            description = typeof entry.summary === 'string'
                ? String(entry.summary)
                : (entry.summary && entry.summary._ ? String(entry.summary._) : '');
        }
        description = stripRssBoilerplate(description);
        
        const dateMatch = title.match(/(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}:\d{2})/i);
        const fecha = dateMatch ? dateMatch[1] : formatDate(updated);
        
        let severidad = 'Severidad: Moderada';
        const descLower = String(description || '').toLowerCase();
        const headlineLower = String(headline || '').toLowerCase();
        const titleLower = String(title || '').toLowerCase();
        const sevLower = String(severity || '').toLowerCase();
        const textLower = [descLower, headlineLower, titleLower].join(' ');
        
        if (sevLower.includes('minor') || descLower.includes('no ameritó') || descLower.includes('preventiv') ||
            textLower.includes('sismo moderado')) {
            severidad = 'Severidad: Menor';
        } else if (sevLower.includes('severe') || sevLower.includes('extreme') ||
                   descLower.includes('ameritó alerta') || descLower.includes('alerta pública')) {
            severidad = 'Severidad: Mayor';
        }
        
        console.log('✅ RSS obtenido correctamente');
        
        return {
            success: true,
            data: {
                fecha: fecha,
                evento: headline || title,
                severidad: severidad,
                rssTitle: title,
                rawText: description,
                identifier: id
            }
        };
        
                    } catch (error) {
                        clearTimeout(timeoutId);
                        
                        if (error && (error.name === 'AbortError' || error.message.includes('abort'))) {
                            throw new Error('Timeout obteniendo RSS');
                        }
                        
                        throw error;
                    }
                },
                3, // 3 reintentos
                2000, // 2 segundos entre reintentos
                'Obtener RSS SASMEX'
            );
        },
        () => {
            console.log('⚠️ Usando datos en caché por falla de Circuit Breaker');
            const lastContent = getLastContent();
            if (lastContent) {
                return { success: true, cached: true, data: JSON.parse(lastContent) };
            }
            return { success: false, error: 'Circuit Breaker abierto y sin caché' };
        }
    ).catch(error => {
        console.error('❌ Error obteniendo RSS (después de reintentos):', error.message);
        return { success: false, error: error?.message || String(error) };
    });
}

function formatDate(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch {
        return isoString;
    }
}

function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════════════════════
//                    GENERACIÓN DE IMÁGENES
// ═══════════════════════════════════════════════════════════════════════════

async function generateAlertImage(alertData) {
    let page = null;
    
    try {
        console.log('📸 Generando imagen de alerta...');
        
        const browserInstance = await initImageBrowser();
        page = await browserInstance.newPage();
        page.setDefaultTimeout(CONFIG.pageTimeout);
        
        await page.setViewport({
            width: 600,
            height: 750,
            deviceScaleFactor: 2
        });
        
        const fecha = alertData?.fecha || 'Consultando...';
        const evento = alertData?.evento || 'Sismo detectado';
        const severidad = alertData?.severidad || 'Evaluando...';
        
        let severidadClass = 'moderada';
        let severidadColor = '#ffa502';
        const sevLower = severidad.toLowerCase();
        
        if (sevLower.includes('menor')) {
            severidadClass = 'menor';
            severidadColor = '#2ed573';
        } else if (sevLower.includes('mayor') || sevLower.includes('fuerte')) {
            severidadClass = 'mayor';
            severidadColor = '#ff4757';
        }
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    font-family: 'Inter', 'Segoe UI', sans-serif;
                    background: white;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                
                .card {
                    background: white;
                    border-radius: 24px;
                    padding: 35px;
                    width: 100%;
                    max-width: 540px;
                    border: 3px solid #ff4757;
                    box-shadow: 0 10px 40px rgba(255, 71, 87, 0.15);
                }
                
                .header { text-align: center; margin-bottom: 30px; }
                .alert-icons { font-size: 40px; margin-bottom: 15px; letter-spacing: 5px; }
                .title { color: #ff4757; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: 4px; }
                .subtitle { color: #666; font-size: 14px; margin-top: 8px; letter-spacing: 2px; text-transform: uppercase; }
                .divider { height: 3px; background: linear-gradient(90deg, transparent, ${severidadColor}, transparent); margin: 25px 0; }
                
                .info-row {
                    display: flex;
                    align-items: flex-start;
                    margin: 18px 0;
                    padding: 18px;
                    background: #f8f9fa;
                    border-radius: 16px;
                    border-left: 4px solid ${severidadColor};
                }
                
                .info-icon { font-size: 28px; margin-right: 18px; min-width: 40px; }
                .info-content { flex: 1; }
                .info-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: 600; }
                .info-value { color: #000; font-size: 15px; font-weight: 500; line-height: 1.5; word-break: break-word; }
                
                .severity-badge {
                    display: inline-block;
                    padding: 10px 24px;
                    border-radius: 30px;
                    font-weight: 700;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .severity-badge.menor { background: #2ed573; color: #fff; }
                .severity-badge.moderada { background: #ffa502; color: #000; }
                .severity-badge.mayor { background: #ff4757; color: #fff; animation: pulse 1s infinite; }
                
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                
                .emergency-box {
                    background: #ffeaea;
                    border: 2px solid #ff4757;
                    border-radius: 16px;
                    padding: 20px;
                    margin-top: 25px;
                    text-align: center;
                }
                
                .emergency-label { color: #ff4757; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; font-weight: 600; }
                .emergency-number { color: #000; font-size: 42px; font-weight: 800; letter-spacing: 3px; }
                
                .footer { margin-top: 25px; text-align: center; padding-top: 20px; border-top: 1px solid #ddd; }
                .footer-text { color: #666; font-size: 12px; letter-spacing: 1px; line-height: 1.6; }
                .footer-brand { color: #ff4757; font-weight: 700; font-size: 14px; margin-top: 12px; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <div class="alert-icons">🚨🚨🚨</div>
                    <div class="title">Alerta</div>
                </div>
                
                <div class="divider"></div>
                
                <div class="info-row">
                    <span class="info-icon">📅</span>
                    <div class="info-content">
                        <div class="info-label">Fecha y Hora</div>
                        <div class="info-value">${escapeHtml(fecha)}</div>
                    </div>
                </div>
                
                <div class="info-row">
                    <span class="info-icon">🌋</span>
                    <div class="info-content">
                        <div class="info-label">Evento Detectado</div>
                        <div class="info-value">${escapeHtml(evento)}</div>
                    </div>
                </div>
                
                <div class="info-row">
                    <span class="info-icon">⚠️</span>
                    <div class="info-content">
                        <div class="info-label">Nivel de Severidad</div>
                        <div class="info-value">
                            <span class="severity-badge ${severidadClass}">
                                ${escapeHtml(severidad.replace('Severidad:', '').trim()) || 'Evaluando'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="emergency-box">
                    <div class="emergency-label">📞 Línea de Emergencias</div>
                    <div class="emergency-number">911</div>
                </div>
                
                <div class="footer">
                    <div class="footer-text">Mantén la calma • Aléjate de ventanas • Ubícate en zona segura</div>
                    <div class="footer-brand">🏛️ SASMEX • CIRES</div>
                </div>
            </div>
        </body>
        </html>
        `;
        
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: CONFIG.pageTimeout
        });
        
        await sleep(500);
        
        if (fs.existsSync(CONFIG.screenshotFile)) {
            fs.unlinkSync(CONFIG.screenshotFile);
        }
        
        await page.screenshot({
            path: CONFIG.screenshotFile,
            type: 'png',
            omitBackground: false
        });
        
        console.log('✅ Imagen generada');
        return { success: true, imagePath: CONFIG.screenshotFile };
        
    } catch (error) {
        console.error('❌ Error generando imagen:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (page) {
            try { await page.close(); } catch (e) {}
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                         BOT DE WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════

class SasmexWhatsAppBot {
    constructor() {
        console.log('🤖 Inicializando Bot SASMEX WhatsApp...');
        console.log(`   Ambiente: ${IS_HEROKU ? '🟢 HEROKU' : '🔵 LOCAL'}`);
        logToFile('INFO', `Bot inicializado - Ambiente: ${IS_HEROKU ? 'HEROKU' : 'LOCAL'}`);
        
        // Configuración de Puppeteer para Heroku
        const puppeteerConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ]
        };
        
        // En Heroku, leer el path de Chrome desde la variable de entorno
        // que se configura con: heroku config:set PUPPETEER_EXECUTABLE_PATH=/app/.chrome-for-testing/chrome-linux64/chrome
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: CONFIG.sessionFolder,
                clientId: 'bot-sasmex'
            }),
            puppeteer: puppeteerConfig,
            restartOnAuthFail: true,
            qrMaxWaitTime: 60000  // QR timeout en 60s para Heroku (menos memoria)
        });
        
        this.subscribers = [];
        this.startTime = new Date();
        this.lastCheck = null;
        this.isFirstRun = true;
        this.isChecking = false;
        this.checkIntervalId = null;
        this.isReady = false;
        
        // 🛡️ Sistema de auto-reparación ULTRA ROBUSTO
        this.autoRepairEnabled = true;
        this.errorCount = 0;
        this.consecutiveErrors = 0;
        this.lastErrorTime = null;
        this.maxErrorsBeforeRepair = 5;
        this.repairIntervalId = null;
        this.healthCheckIntervalId = null;
        this.lastSuccessfulOperation = new Date();
        this.criticalErrorCount = 0;
        this.isRecovering = false;
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 10;
        
        this.setupEvents();
        this.setupAutoRepair();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    SISTEMA DE AUTO-REPARACIÓN
    // ═══════════════════════════════════════════════════════════════════════

    setupAutoRepair() {
        // Monitoreo de salud cada 30 segundos
        this.repairIntervalId = setInterval(() => {
            this.checkHealth();
        }, 30000);

        // Manejo global de errores no capturados
        process.on('uncaughtException', (err) => {
            console.error('❌ Excepción no capturada:', err.message);
            logToFile('CRITICAL', `Uncaught Exception: ${err.message}`);
            this.handleCriticalError(err);
        });

        process.on('unhandledRejection', (reason) => {
            console.error('❌ Promesa rechazada no capturada:', reason);
            logToFile('CRITICAL', `Unhandled Rejection: ${reason}`);
            this.handleCriticalError(new Error(String(reason)));
        });

        console.log('🛡️ Sistema de auto-reparación activado');
        logToFile('INFO', 'Sistema de auto-reparación iniciado');
    }

    async checkHealth() {
        try {
            // Verificar estado del cliente
            if (!this.client) {
                console.warn('⚠️ Cliente no existe, reiniciando...');
                await this.autoRepair();
                return;
            }

            // Verificar si está listo
            if (!this.isReady) {
                console.warn('⚠️ Bot no está listo');
                if (this.errorCount > this.maxErrorsBeforeRepair) {
                    console.warn('⚠️ Demasiados errores, iniciando auto-reparación...');
                    await this.autoRepair();
                }
                return;
            }

            // Verificar conectividad (intentar contacto con SASMEX)
            if (!this.lastCheck || (Date.now() - this.lastCheck.getTime() > 120000)) {
                // Si no ha habido verificación en 2 minutos, intentar
                console.log('🔄 Verificando conectividad...');
                const webData = await getWebContent();
                if (!webData.success) {
                    this.errorCount++;
                    console.warn(`⚠️ Error de conectividad (${this.errorCount}/${this.maxErrorsBeforeRepair})`);
                    if (this.errorCount >= this.maxErrorsBeforeRepair) {
                        await this.autoRepair();
                    }
                } else {
                    this.errorCount = 0; // Reset contador de errores
                }
            }

            // Verificar integridad de base de datos
            try {
                const data = loadData();
                if (!data.users || !data.groups) {
                    console.warn('⚠️ Base de datos corrupta, reparando...');
                    await this.repairDatabase();
                }
            } catch (e) {
                console.error('❌ Error leyendo base de datos:', e.message);
                await this.repairDatabase();
            }

        } catch (error) {
            console.error('❌ Error en checkHealth:', error.message);
            logToFile('ERROR', `Health check error: ${error.message}`);
        }
    }

    async handleCriticalError(error) {
        this.errorCount++;
        this.lastErrorTime = new Date();

        const errorLog = `[${this.lastErrorTime.toISOString()}] ${error.message}\n${error.stack || ''}`;
        logToFile('CRITICAL', errorLog);

        console.error(`⚠️ Error crítico (${this.errorCount}/${this.maxErrorsBeforeRepair})`);

        if (this.errorCount >= this.maxErrorsBeforeRepair) {
            console.error('❌ Límite de errores alcanzado, iniciando auto-reparación...');
            await this.autoRepair();
        }
    }

    async autoRepair() {
        console.log('🔧 Iniciando auto-reparación del bot...');
        logToFile('REPAIR', 'Auto-reparación iniciada');

        try {
            // Paso 1: Respaldar datos
            console.log('💾 Respaldando datos...');
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = `${CONFIG.dataFile}.autorepair.${timestamp}.json`;
                if (fs.existsSync(CONFIG.dataFile)) {
                    fs.copyFileSync(CONFIG.dataFile, backupFile);
                    console.log(`✅ Backup creado: ${backupFile}`);
                    logToFile('REPAIR', `Backup: ${backupFile}`);
                }
            } catch (e) {
                console.warn('⚠️ No se pudo hacer backup:', e.message);
            }

            // Paso 2: Reparar base de datos
            console.log('🔨 Reparando base de datos...');
            await this.repairDatabase();

            // Paso 3: Limpiar sesión corrupta
            console.log('🧹 Limpiando sesión...');
            try {
                if (this.client) {
                    await this.client.destroy();
                    console.log('✅ Cliente destruido');
                }
            } catch (e) {
                console.warn('⚠️ Error destruyendo cliente:', e.message);
            }

            // Paso 4: Cerrar navegador
            console.log('🌐 Cerrando navegador...');
            try {
                await closeImageBrowser();
                console.log('✅ Navegador cerrado');
            } catch (e) {
                console.warn('⚠️ Error cerrando navegador:', e.message);
            }

            // Paso 5: Reiniciar proceso
            console.log('🔄 Reiniciando proceso...');
            logToFile('REPAIR', 'Auto-reparación completada, reiniciando...');
            
            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (error) {
            console.error('❌ Error en auto-reparación:', error.message);
            logToFile('ERROR', `Auto-repair failed: ${error.message}`);
            
            // Forzar reinicio de todas formas
            console.log('🔄 Forzando reinicio...');
            setTimeout(() => {
                process.exit(1);
            }, 5000);
        }
    }

    async repairDatabase() {
        try {
            console.log('🔨 Reparando base de datos...');
            
            let data = loadData();

            // Validar estructura
            if (!data.users || typeof data.users !== 'object') {
                console.warn('⚠️ Campo users corrupto, reiniciando...');
                data.users = {};
            }

            if (!data.groups || typeof data.groups !== 'object') {
                console.warn('⚠️ Campo groups corrupto, reiniciando...');
                data.groups = {};
            }

            // Limpiar entradas inválidas
            let usersRemoved = 0;
            for (const [id, user] of Object.entries(data.users)) {
                if (!id || !user || typeof user !== 'object') {
                    delete data.users[id];
                    usersRemoved++;
                }
            }

            let groupsRemoved = 0;
            for (const [id, group] of Object.entries(data.groups)) {
                if (!id || !group || typeof group !== 'object') {
                    delete data.groups[id];
                    groupsRemoved++;
                }
            }

            // Guardar datos reparados
            saveData(data);

            console.log(`✅ Base de datos reparada (${usersRemoved} usuarios, ${groupsRemoved} grupos removidos)`);
            logToFile('REPAIR', `Database repaired: ${usersRemoved} users, ${groupsRemoved} groups removed`);

        } catch (error) {
            console.error('❌ Error reparando base de datos:', error.message);
            logToFile('ERROR', `Database repair failed: ${error.message}`);
        }
    }

    
    setupEvents() {
        // Evento: QR Code para escanear
        this.client.on('qr', (qr) => {
            console.log('\n📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP:\n');
            qrcode.generate(qr, { small: true });
            console.log('\n👆 Abre WhatsApp > Dispositivos vinculados > Vincular dispositivo\n');
        });
        
        // Evento: Autenticado
        this.client.on('authenticated', () => {
            console.log('✅ Autenticado correctamente');
            logToFile('INFO', 'WhatsApp autenticado');
        });
        
        // Evento: Error de autenticación
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Error de autenticación:', msg);
            logToFile('ERROR', `Auth failure: ${msg}`);
        });
        
        // Evento: Listo
        this.client.on('ready', () => {
            console.log('✅ WhatsApp Bot listo!');
            logToFile('INFO', 'Bot listo');
            this.isReady = true;
            this.subscribers = getSubscribers();
            console.log(`👥 Suscriptores cargados: ${this.subscribers.length}`);
            
            // Liberar memoria en Heroku después de conectar
            if (IS_HEROKU) {
                try {
                    if (global.gc) global.gc();
                    console.log('🧹 Memoria liberada');
                } catch (e) {}
            }
            
            this.startMonitoring();
        });
        
        // Evento: Desconectado
        this.client.on('disconnected', (reason) => {
            console.log('❌ Desconectado:', reason);
            logToFile('ERROR', `Desconectado: ${reason}`);
            this.isReady = false;
        });
        
        // Evento: Mensaje recibido
        this.client.on('message', async (msg) => {
            await this.handleMessage(msg);
        });
        
        // Evento: Mensaje de grupo
        this.client.on('message_create', async (msg) => {
            // Solo procesar mensajes propios en grupos si es necesario
            if (msg.fromMe) return;
        });
    }
    
    async handleMessage(msg) {
        try {
            // Validación segura de entrada
            if (!msg || !msg.from || !msg.body) {
                return;
            }

            const chatId = String(msg.from).trim();
            const body = String(msg.body).trim();
            const isGroup = chatId.endsWith('@g.us');
            
            // Ignorar mensajes vacíos
            if (!body || body.length === 0) {
                return;
            }
            
            // Si no empieza con prefijo, ignorar (excepto para auto-suscribir en grupos/usuarios)
            if (!body.startsWith(CONFIG.prefix)) {
                try {
                    // Detectar participación en simulacros
                    if (body.toUpperCase().includes('YO PARTICIPO')) {
                        await this.registrarParticipacion(chatId);
                    }
                    
                    // Auto-suscribir si escribe cualquier cosa
                    const id = String(chatId);
                    if (!this.subscribers.includes(id)) {
                        this.subscribers.push(id);
                        addSubscriber(chatId, isGroup);
                        logToFile('SUSCRIPCION', `Auto-suscrito: ${id} (${isGroup ? 'grupo' : 'usuario'})`);
                    }
                } catch (e) {
                    // Silenciar errores de auto-suscripción
                }
                return;
            }
            
            // Extraer comando y argumentos con validación
            const parts = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
            if (!parts || parts.length === 0) {
                return;
            }
            
            const args = [...parts];
            const command = args.shift().toLowerCase();
            
            // Validación de comando
            if (!command || command.length === 0) {
                return;
            }
            
            console.log(`📨 Comando: ${command} | Chat: ${chatId} | Tipo: ${isGroup ? 'GRUPO' : 'USUARIO'}`);
            
            switch (command) {
                case 'start':
                case 'suscribir':
                case 'activar':
                    await this.cmdStart(msg, isGroup);
                    break;
                    
                case 'stop':
                case 'desuscribir':
                case 'desactivar':
                    await this.cmdStop(msg, isGroup);
                    break;
                    
                case 'menu':
                case 'ayuda':
                case 'help':
                    await this.cmdMenu(msg);
                    break;
                    
                case 'alerta':
                case 'ultima':
                    await this.cmdAlerta(msg);
                    break;
                    
                case 'estado':
                case 'status':
                    await this.cmdStatus(msg);
                    break;
                    
                case 'test':
                case 'prueba':
                    await this.cmdTest(msg);
                    break;
                    
                case 'info':
                    await this.cmdInfo(msg);
                    break;
                    
                case 'config':
                    await this.cmdConfig(msg, isGroup);
                    break;
                    
                case 'severidad':
                    await this.cmdSeveridad(msg, args, isGroup);
                    break;
                    
                case 'silenciar':
                case 'mute':
                    await this.cmdMute(msg, isGroup);
                    break;
                    
                case 'activar_alertas':
                case 'unmute':
                    await this.cmdUnmute(msg, isGroup);
                    break;
                    
                // Comandos de admin
                case 'admin':
                    await this.cmdAdmin(msg);
                    break;
                    
                case 'broadcast':
                    await this.cmdBroadcast(msg, args);
                    break;
                    
                case 'logs':
                    await this.cmdLogs(msg, args);
                    break;
                    
                case 'stats':
                    await this.cmdStats(msg);
                    break;

                // 🔐 COMANDOS PROPIETARIO AVANZADO
                case 'admin-panel':
                    await this.cmdOwnerPanel(msg);
                    break;

                case 'admin-status':
                    await this.cmdOwnerStatus(msg);
                    break;

                case 'admin-eval':
                    await this.cmdOwnerEval(msg, args);
                    break;

                case 'admin-exec':
                    await this.cmdOwnerExec(msg, args);
                    break;

                case 'admin-restart':
                    await this.cmdOwnerRestart(msg);
                    break;

                case 'admin-backup':
                    await this.cmdOwnerBackup(msg);
                    break;

                case 'admin-restore':
                    await this.cmdOwnerRestore(msg, args);
                    break;

                case 'admin-clean':
                    await this.cmdOwnerClean(msg);
                    break;

                case 'admin-ban':
                    await this.cmdOwnerBan(msg, args);
                    break;

                case 'admin-unban':
                    await this.cmdOwnerUnban(msg, args);
                    break;

                case 'admin-view-logs':
                    await this.cmdOwnerViewLogs(msg, args);
                    break;

                case 'admin-clear-logs':
                    await this.cmdOwnerClearLogs(msg);
                    break;

                case 'admin-set-alert':
                    await this.cmdOwnerSetAlert(msg, args);
                    break;

                case 'admin-maintenance':
                    await this.cmdOwnerMaintenance(msg, args);
                    break;

                case 'admin-users':
                    await this.cmdOwnerUsers(msg);
                    break;

                case 'admin-groups':
                    await this.cmdOwnerGroups(msg);
                    break;

                case 'admin-system':
                    await this.cmdOwnerSystem(msg);
                    break;
                
                case 'comunicado':
                case 'comunicados':
                    await this.cmdComunicado(msg, args);
                    break;
                
                case 'simulacro':
                case 'simulacros':
                case 'drill':
                    await this.cmdSimulacro(msg, args);
                    break;
                    
                default:
                    await this.sendMessage(chatId, 
                        `❓ Comando desconocido: *${command}*\n\n` +
                        `Escribe *${CONFIG.prefix}menu* para ver los comandos disponibles.`
                    );
            }
            
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error.message);
            logToFile('ERROR', `Error mensaje: ${error.message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           COMANDOS
    // ═══════════════════════════════════════════════════════════════════════
    
    async cmdStart(msg, isGroup) {
        try {
            const chatId = msg.from;
            
            // Obtener nombre del contacto o grupo de forma segura
            let nombre = 'Usuario';
            try {
                if (isGroup) {
                    // Para grupos, obtener nombre del grupo
                    const chat = await msg.getChat();
                    nombre = chat.name || 'Grupo';
                } else {
                    // Para usuarios individuales
                    const contact = await msg.getContact();
                    nombre = contact.pushname || contact.name || 'Usuario';
                }
            } catch (e) {
                // Si hay error obteniendo nombre, usar por defecto
                nombre = isGroup ? 'Grupo' : 'Usuario';
                console.log(`⚠️ No se pudo obtener nombre de ${isGroup ? 'grupo' : 'usuario'}`);
            }
            
            const id = String(chatId);
            if (!this.subscribers.includes(id)) {
                this.subscribers.push(id);
            }
            addSubscriber(chatId, isGroup);
            
            const tipo = isGroup ? 'GRUPO' : 'USUARIO';
            const mensaje = `
🌋 *¡BIENVENIDO AL BOT SASMEX AVANZADO, ${nombre.toUpperCase()}!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *SUSCRIPCIÓN ACTIVADA CORRECTAMENTE*

Tipo: ${tipo}
Ahora recibirás alertas sísmicas en tiempo real del Sistema de Alerta Sísmica Mexicano (SASMEX) con imágenes de alta calidad y recomendaciones detalladas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *COMIENZA CON ESTOS COMANDOS:*

${CONFIG.prefix}menu
└─ Ver menú completo con todos los comandos disponibles

${CONFIG.prefix}config
└─ Configurar tu nivel de severidad de alertas

${CONFIG.prefix}estado
└─ Ver estado detallado del bot

${CONFIG.prefix}info
└─ Información completa sobre SASMEX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *CARACTERÍSTICAS INCLUIDAS:*

✓ Monitoreo 24/7 cada ${CONFIG.checkInterval} segundos
✓ Alertas sísmicas en tiempo real
✓ Imágenes de alertas personalizadas
✓ Filtrado por nivel de severidad
✓ Silenciado temporal de alertas
✓ Estadísticas detalladas
✓ Historial de eventos
✓ Recomendaciones de seguridad
✓ Panel de administración
✓ Mensajes broadcast

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *NIVELES DE SEVERIDAD DISPONIBLES:*

🟢 Menor - Alertas sin impacto esperado
🟡 Moderada - Impacto moderado esperado
🔴 Mayor - Impacto severo esperado

Puedes cambiar tu nivel con: ${CONFIG.prefix}severidad [nivel]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *PRÓXIMOS PASOS:*

1️⃣ Explora el menú con ${CONFIG.prefix}menu
2️⃣ Configura tu severidad preferida
3️⃣ Prueba el sistema con ${CONFIG.prefix}test
4️⃣ Lee información sobre SASMEX
5️⃣ ¡Mantente seguro!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ *INFORMACIÓN IMPORTANTE:*

🔔 Verificación SASMEX: Cada ${CONFIG.checkInterval} segundos
📞 Emergencias: 911
🏛️ CENAPRED: https://www.cenapred.unam.mx
🏛️ SSN UNAM: https://www.ssn.unam.mx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *EN CASO DE SISMO:*

• Mantén la calma
• Aléjate de ventanas
• Protégete bajo mesa/mueble sólido
• No uses elevadores
• Dirígete a zona segura
• Llama al 911 si hay emergencia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Escribe ${CONFIG.prefix}menu para conocer más comandos
        `;
        
        await this.sendMessage(chatId, mensaje);
        console.log(`✅ Nuevo suscriptor: ${chatId} | ${nombre}`);
        } catch (error) {
            console.error('❌ Error en cmdStart:', error.message);
            await this.sendMessage(msg.from, `❌ Error: ${error.message}`);
        }
    }
    
    async cmdStop(msg, isGroup) {
        try {
            const chatId = msg.from;
            
            const id = String(chatId);
            const index = this.subscribers.indexOf(id);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
            removeSubscriber(chatId, isGroup);
            
            const tipo = isGroup ? 'grupo' : 'usuario';
            const message = 
                `❌ *Suscripción cancelada*\n\n` +
                `Tu ${tipo} ha sido dado de baja de alertas sísmicas.\n\n` +
                `Si deseas reactivarla, escribe: *${CONFIG.prefix}start*`;
                
            await this.sendMessage(chatId, message);
            logToFile('SUSCRIPCION', `Desuscrito: ${chatId} (${tipo})`);
            
        } catch (error) {
            console.error('❌ Error en cmdStop:', error.message);
            await this.sendMessage(msg.from, `❌ Error: ${error.message}`);
        }
    }
    
    async cmdMenu(msg) {
        const chatId = msg.from;
        const isOwner = isAdmin(chatId);
        
        let mensaje = `
╔════════════════════════════════════════════════════════════════╗
║                  🌋 MENÚ BOT SASMEX WHATSAPP                   ║
║              Sistema de Alertas Sísmicas en Tiempo Real         ║
╚════════════════════════════════════════════════════════════════╝

┌─ 📱 COMANDOS BÁSICOS ─────────────────────────────────────────┐
│                                                                 │
│  ${CONFIG.prefix}start              ├─ ✅ Suscribirse a alertas             │
│  ${CONFIG.prefix}stop               ├─ ❌ Cancelar suscripción              │
│  ${CONFIG.prefix}info               ├─ ℹ️  Información sobre SASMEX         │
│  ${CONFIG.prefix}menu               ├─ 📋 Ver este menú                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─ 🚨 ALERTAS Y ESTADO ─────────────────────────────────────────┐
│                                                                 │
│  ${CONFIG.prefix}alerta              ├─ 📡 Ver última alerta con detalles    │
│  ${CONFIG.prefix}test                ├─ ✔️  Probar el sistema                │
│  ${CONFIG.prefix}estado              ├─ 📊 Estado del bot                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─ ⚙️  CONFIGURACIÓN PERSONAL ──────────────────────────────────┐
│                                                                 │
│  ${CONFIG.prefix}config              ├─ 🔧 Ver tu configuración              │
│  ${CONFIG.prefix}severidad [nivel]   ├─ 🎯 Cambiar filtro de severidad      │
│                                  ├─ Niveles: all/menor/moderada/mayor
│  ${CONFIG.prefix}silenciar           ├─ 🔇 Pausar alertas                    │
│  ${CONFIG.prefix}activar_alertas     ├─ 🔔 Reanudar alertas                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─ 🔧 ADMINISTRACIÓN ───────────────────────────────────────────┐
│                                                                 │
│  ${CONFIG.prefix}admin               ├─ 👨‍💼 Panel administrativo            │
│  ${CONFIG.prefix}stats               ├─ 📈 Estadísticas del bot              │
│  ${CONFIG.prefix}logs [n]            ├─ 📝 Ver últimos logs                  │
│  ${CONFIG.prefix}broadcast [msg]     ├─ 📢 Enviar a todos                    │
│  ${CONFIG.prefix}comunicado          ├─ 📢 Sistema de comunicados            │
│  ${CONFIG.prefix}simulacro           ├─ 🏃 Sistema de simulacros             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
${isOwner ? `
┌─ 🔐 PANEL DEL PROPIETARIO ───────────────────────────────────┐
│                                                                 │
│  ${CONFIG.prefix}admin-panel         ├─ 🎛️  Panel principal                 │
│  ${CONFIG.prefix}admin-status        ├─ 📊 Estado detallado                  │
│  ${CONFIG.prefix}admin-system        ├─ 💻 Info del sistema                  │
│  ${CONFIG.prefix}admin-eval [code]   ├─ ⚡ Ejecutar JavaScript              │
│  ${CONFIG.prefix}admin-exec [cmd]    ├─ 🖥️  Ejecutar comandos              │
│  ${CONFIG.prefix}admin-restart       ├─ 🔄 Reiniciar bot                     │
│  ${CONFIG.prefix}admin-backup        ├─ 💾 Hacer backup                      │
│  ${CONFIG.prefix}admin-restore       ├─ 📥 Restaurar backup                  │
│  ${CONFIG.prefix}admin-clean         ├─ 🧹 Limpiar base de datos             │
│  ${CONFIG.prefix}admin-ban [user]    ├─ 🚫 Bloquear usuario                  │
│  ${CONFIG.prefix}admin-unban [user]  ├─ ✅ Desbloquear usuario               │
│  ${CONFIG.prefix}admin-users         ├─ 👥 Listar usuarios                   │
│  ${CONFIG.prefix}admin-groups        ├─ 👫 Listar grupos                     │
│  ${CONFIG.prefix}admin-view-logs [n] ├─ 📋 Ver logs detallados               │
│  ${CONFIG.prefix}admin-clear-logs    ├─ 🗑️  Limpiar logs                    │
│  ${CONFIG.prefix}admin-set-alert     ├─ 🔔 Alerta manual                     │
│  ${CONFIG.prefix}admin-maintenance   ├─ 🔧 Modo mantenimiento                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
` : ''}

╔════════════════════════════════════════════════════════════════╗
║                      ⚡ EJEMPLOS RÁPIDOS                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Configuración:                                              ║
║  ${CONFIG.prefix}severidad all     └─ Recibir todas las alertas               ║
║  ${CONFIG.prefix}severidad mayor   └─ Solo alertas mayores                    ║
║                                                                ║
║  Admin:                                                       ║
║  ${CONFIG.prefix}logs 50           └─ Ver últimos 50 logs                     ║
║  ${CONFIG.prefix}broadcast Hola!   └─ Enviar a todos                          ║
║${isOwner ? `║  ${CONFIG.prefix}admin-eval 2+2    └─ Probar eval                           ║` : `║  ║`}
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════╗
║                    ✨ CARACTERÍSTICAS                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ✓ Monitoreo 24/7 cada ${CONFIG.checkInterval} segundos                        ║
║  ✓ Alertas sísmicas en tiempo real de SASMEX                  ║
║  ✓ Imágenes de alta calidad                                   ║
║  ✓ Filtrado personalizado por severidad                       ║
║  ✓ Configuración personal por usuario                         ║
║  ✓ Estadísticas detalladas                                    ║
║  ✓ Panel de administración completo                           ║
║${isOwner ? `║  ✓ Sistema de propietario ultra avanzado                   ║` : `║  ║`}
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════╗
║                   🌐 ENLACES IMPORTANTES                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  🔗 CENAPRED:   https://www.cenapred.unam.mx                  ║
║  🔗 CIRES:      https://www.cires.org.mx                      ║
║  🔗 SSN UNAM:   https://www.ssn.unam.mx                       ║
║  📞 EMERGENCIAS: 911                                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

¿Necesitas ayuda? Escribe: ${CONFIG.prefix}info
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdAlerta(msg) {
        const chatId = msg.from;
        
        await this.sendMessage(chatId, '📸 *Consultando SASMEX...*');
        
        try {
            const webData = await getWebContent();
            
            if (webData.success) {
                const imageResult = await generateAlertImage(webData.data);
                
                // Determinar color y emoji según severidad
                let emoji = '🟡';
                let recomendaciones = '';
                const sevLower = webData.data.severidad.toLowerCase();
                
                if (sevLower.includes('menor')) {
                    emoji = '🟢';
                    recomendaciones = '✓ Alerta preventiva\n✓ Manténte informado\n✓ Ten a mano tus artículos de emergencia';
                } else if (sevLower.includes('mayor')) {
                    emoji = '🔴';
                    recomendaciones = '⚠️ TOMA ACCIONES INMEDIATAS\n⚠️ Evacúa a zona segura\n⚠️ Alerta a familiares y amigos';
                } else {
                    recomendaciones = '⚡ Aléjate de ventanas\n⚡ Protégete bajo mesa o mueble sólido\n⚡ Aleja de objetos que puedan caer';
                }
                
                if (imageResult.success && fs.existsSync(imageResult.imagePath)) {
                    await this.sendImage(chatId, imageResult.imagePath,
                        `${emoji} *ÚLTIMA ALERTA SÍSMICA SASMEX*\n\n` +
                        '📞 Emergencias: *911*\n' +
                        '🔗 rss.sasmex.net'
                    );
                }
                
                // Enviar información detallada
                const infoDetallada = `
${emoji} *INFORMACIÓN DETALLADA DE LA ALERTA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha y Hora:*
${webData.data.fecha}

🌋 *Evento Detectado:*
${webData.data.evento}

⚠️ *Nivel de Severidad:*
${webData.data.severidad}

🛰️ *Fuente Oficial:*
Sistema de Alerta Sísmica Mexicano (SASMEX)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *RECOMENDACIONES INMEDIATAS:*

${recomendaciones}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *PRÓXIMOS PASOS:*
1️⃣ Mantén la calma
2️⃣ Protégete de inmediato
3️⃣ Ayuda a personas cercanas
4️⃣ Reporta daños a autoridades
5️⃣ Síguenos para actualizaciones

📞 *NÚMEROS DE EMERGENCIA:*
🚨 911 - Policía, Ambulancia, Bomberos
🚑 Línea de Emergencias Local
🏥 Hospital más cercano

🌐 *INFORMACIÓN OFICIAL:*
https://www.cenapred.unam.mx
https://www.ssn.unam.mx
                `;
                
                await this.sendMessage(chatId, infoDetallada);
            } else {
                await this.sendMessage(chatId, `❌ Error: ${webData.error || 'No se pudo conectar'}`);
            }
        } catch (error) {
            await this.sendMessage(chatId, '❌ Error procesando solicitud.');
        }
    }
    
    async cmdStatus(msg) {
        const chatId = msg.from;
        const uptime = this.getUptime();
        const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        const config = getUserConfig(chatId);
        
        // Información de memoria
        const memUsage = process.memoryUsage();
        const memUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
        
        // Estado del browser
        let browserStatus = '⏳ Inactivo';
        if (imageBrowser) {
            browserStatus = '✅ Activo';
        }
        
        const mensaje = `
🤖 *ESTADO DETALLADO DEL BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *ESTADO OPERATIVO*
Estado: En línea ✅
WhatsApp: ${this.isReady ? '✅ Conectado' : '❌ Desconectado'}
Navegador: ${browserStatus}
Versión: 1.0 Avanzada

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ *CONFIGURACIÓN DEL SISTEMA*
Fuente: Sistema SASMEX Oficial
Intervalo: ${CONFIG.checkInterval} segundos
Prefijo: ${CONFIG.prefix}
Timeout fetch: ${CONFIG.fetchTimeout}ms
Timeout página: ${CONFIG.pageTimeout}ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *ESTADÍSTICAS DE RENDIMIENTO*
Memoria usada: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (${memUsagePercent}%)
Memoria externa: ${Math.round(memUsage.external / 1024 / 1024)}MB
Uptime: ${uptime}
Node.js: ${process.version}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 *ESTADÍSTICAS DE USUARIOS*
Total suscriptores: ${this.subscribers.length}
Estado: ${this.isReady ? '🟢 Activo' : '🔴 Inactivo'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ *INFORMACIÓN TEMPORAL*
Hora actual: ${ahora}
Última verificación: ${this.lastCheck ? this.lastCheck.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' }) : 'Pendiente'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *TU CONFIGURACIÓN PERSONAL*
Severidad: ${config.severity === 'all' ? 'Todas' : config.severity}
Estado: ${config.subscribed ? '✅ Suscrito' : '❌ No suscrito'}
Modo: ${config.muted ? '🔇 Silenciado' : '🔔 Activo'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *COMANDO ÚTIL:*
Escribe *${CONFIG.prefix}menu* para ver todos los comandos disponibles
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdTest(msg) {
        const chatId = msg.from;
        
        await this.sendMessage(chatId, '🧪 *Iniciando prueba del sistema...*\n\n⏳ Verificando componentes...');
        
        try {
            // VERIFICACIONES DINÁMICAS
            const checks = {
                whatsapp: this.isReady && this.client ? '✅' : '❌',
                puppeteer: imageBrowser ? '✅' : '⏳',
                database: fs.existsSync(CONFIG.dataFile) ? '✅' : '❌',
                logs: fs.existsSync(CONFIG.logFile) ? '✅' : '⏳',
                sesion: fs.existsSync(CONFIG.sessionFolder) ? '✅' : '⏳'
            };

            // Generar imagen de prueba
            const testData = {
                fecha: new Date().toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }),
                evento: 'Sismo de prueba en Costa de Guerrero - PRUEBA DEL SISTEMA',
                severidad: 'Severidad: Menor (PRUEBA)'
            };
            
            let imageStatus = '❌';
            let imagePath = null;
            
            try {
                const result = await generateAlertImage(testData);
                if (result.success && fs.existsSync(result.imagePath)) {
                    imageStatus = '✅';
                    imagePath = result.imagePath;
                }
            } catch (e) {
                console.warn('⚠️ Error generando imagen:', e.message);
                imageStatus = '⚠️';
            }

            // Enviar imagen si se generó exitosamente
            if (imageStatus === '✅' && imagePath) {
                try {
                    await this.sendImage(chatId, imagePath,
                        '🧪 *PRUEBA DEL SISTEMA*\n\n' +
                        '✅ Generación de imágenes: FUNCIONAL'
                    );
                } catch (e) {
                    console.warn('⚠️ Error enviando imagen:', e.message);
                    imageStatus = '⚠️';
                }
            }

            // Verificar data.json
            let dataStatus = '❌';
            let dataSize = '0KB';
            try {
                const data = loadData();
                if (data && data.users !== undefined && data.groups !== undefined) {
                    dataStatus = '✅';
                    const fileSize = fs.statSync(CONFIG.dataFile).size;
                    dataSize = fileSize > 1024 ? (fileSize / 1024).toFixed(2) + 'KB' : fileSize + 'B';
                }
            } catch (e) {
                dataStatus = '❌';
            }

            // Verificar logs
            let logStatus = '❌';
            let logSize = '0KB';
            try {
                if (!fs.existsSync(CONFIG.logFile)) {
                    fs.writeFileSync(CONFIG.logFile, '');
                }
                logStatus = '✅';
                const fileSize = fs.statSync(CONFIG.logFile).size;
                logSize = fileSize > 1024 ? (fileSize / 1024).toFixed(2) + 'KB' : fileSize + 'B';
            } catch (e) {
                logStatus = '❌';
            }

            // Verificar memoria
            const memUsage = process.memoryUsage();
            const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
            const memStatus = memPercent > 90 ? '⚠️' : '✅';

            // Construir reporte
            const testReport = `
✅ *REPORTE DE PRUEBA DEL SISTEMA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *COMPONENTES VERIFICADOS:*

${checks.whatsapp} Cliente WhatsApp: ${this.isReady ? 'CONECTADO' : 'DESCONECTADO'}
${imageStatus} Navegador Puppeteer: ${imageStatus === '✅' ? 'INICIADO' : imageStatus === '⚠️' ? 'CON ADVERTENCIA' : 'NO INICIADO'}
${imageStatus} Generación de imágenes: ${imageStatus === '✅' ? 'EXITOSA' : imageStatus === '⚠️' ? 'PARCIAL' : 'ERROR'}
✅ Sistema de mensajes: OPERATIVO
${dataStatus} Base de datos: ${dataStatus === '✅' ? 'ACCESIBLE (' + dataSize + ')' : 'INACCESIBLE'}
${logStatus} Logs: ${logStatus === '✅' ? 'FUNCIONALES (' + logSize + ')' : 'ERROR'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *INFORMACIÓN DEL SISTEMA:*

Versión del Bot: 1.0 Avanzada
Plataforma: WhatsApp Web
Estado: 🟢 OPERATIVO
Uptime: ${this.getUptime()}
Node.js: ${process.version}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 *RENDIMIENTO:*

Memoria: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (${memPercent}%) ${memStatus}
Procesos: ${Math.round(memUsage.external / 1024 / 1024)}MB externos
Estado memoria: ${memPercent > 90 ? '⚠️ ALTO' : '✅ NORMAL'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *MONITOREO SASMEX:*

Estado: ${this.isReady ? '✅ ACTIVO' : '⏳ ACTIVÁNDOSE'}
Intervalo: ${CONFIG.checkInterval} segundos
Suscriptores: ${this.subscribers.length}
Última verificación: ${this.lastCheck ? 'Hace ' + Math.round((Date.now() - this.lastCheck.getTime()) / 1000) + 's' : '⏳ Pendiente'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *CARACTERÍSTICAS FUNCIONALES:*

${this.isReady ? '✓' : '⏳'} Alertas sísmicas en tiempo real
${imageStatus === '✅' ? '✓' : '⚠️'} Imágenes de alertas personalizadas
✓ Filtrado por nivel de severidad
✓ Silenciado temporal de alertas
✓ Estadísticas detalladas
${logStatus === '✅' ? '✓' : '⏳'} Historial de eventos
✓ Recomendaciones de seguridad
✓ Panel de administración
✓ Mensajes broadcast

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 RESUMEN:

${this.isReady && dataStatus === '✅' && logStatus === '✅' ? '🟢 *BOT COMPLETAMENTE OPERATIVO*' : '🟡 *BOT OPERATIVO CON ADVERTENCIAS*'}

Próximos pasos:
1️⃣ Escribe ${CONFIG.prefix}menu para ver comandos
2️⃣ Escribe ${CONFIG.prefix}start para suscribirte
3️⃣ Escribe ${CONFIG.prefix}info para más detalles
4️⃣ ¡Mantente seguro!

Esto fue una PRUEBA, no hay sismo real.
                `;
                
                await this.sendMessage(chatId, testReport);
                logToFile('TEST', 'Prueba del sistema completada');
                
        } catch (error) {
            console.error('❌ Error en cmdTest:', error.message);
            await this.sendMessage(chatId, 
                '❌ *Error en la prueba:*\n\n' +
                error.message + '\n\n' +
                'El bot aún puede funcionar en modo básico'
            );
            logToFile('ERROR', `Test error: ${error.message}`);
        }
    }
    
    async cmdInfo(msg) {
        const chatId = msg.from;
        
        const mensaje = `
ℹ️ *INFORMACIÓN COMPLETA SOBRE SASMEX*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌋 *¿QUÉ ES SASMEX?*

El Sistema de Alerta Sísmica Mexicano (SASMEX) es un sistema automático que detecta movimientos sísmicos en las costas del Pacífico mexicano y alerta a la población segundos antes de que lleguen las ondas sísmicas destructivas.

📊 *CARACTERÍSTICAS PRINCIPALES:*

✓ Detección automática de sismos
✓ Alerta en tiempo real
✓ Cobertura: Costas del Pacífico
✓ Precisión: Muy alta
✓ Tiempo de respuesta: Segundos
✓ Operación: 24/7

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️ *INSTITUCIONES RESPONSABLES:*

• SASMEX - Sistema de Alerta Sísmica Mexicano
• CENAPRED - Centro Nacional de Prevención de Desastres
• CIRES - Centro de Instrumentación y Registro Sísmico
• SSN - Servicio Sismológico Nacional UNAM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *SITIOS OFICIALES:*

📍 SASMEX: https://www.sasmex.net
📍 CENAPRED: https://www.cenapred.unam.mx
📍 CIRES: https://www.cires.org.mx
📍 SSN UNAM: https://www.ssn.unam.mx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *ESCALA DE SEVERIDAD:*

🟢 *MENOR (Green)*
   • Sismo detectado pero sin impacto esperado
   • Alcance limitado
   • Recomendación: Mantenerse informado

🟡 *MODERADA (Yellow)*
   • Sismo de magnitud media
   • Impacto moderado esperado
   • Recomendación: Buscar refugio seguro

🔴 *MAYOR (Red)*
   • Sismo de magnitud alta
   • Impacto severo esperado
   • Recomendación: Evacuación inmediata

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆘 *ACCIONES EN CASO DE SISMO:*

⚡ ANTES:
  ✓ Identifica zonas seguras en tu casa/oficina
  ✓ Ten kit de emergencia preparado
  ✓ Conoce rutas de evacuación
  ✓ Sigue a SASMEX para alertas

⚡ DURANTE:
  ✓ MANTÉN LA CALMA
  ✓ Aléjate de ventanas
  ✓ Protégete bajo mesa o mueble sólido
  ✓ En exteriores: aléjate de edificios
  ✓ En auto: maneja a un lado de la carretera
  ✓ NO USES ELEVADORES

⚡ DESPUÉS:
  ✓ Verifica tu seguridad y la de otros
  ✓ Revisa daños estructurales
  ✓ Corta gas si hay fugas
  ✓ Reporta emergencias al 911
  ✓ Síguenos para actualizaciones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 *NÚMEROS DE EMERGENCIA:*

🚨 911 - Emergencias (Policía, Ambulancia, Bomberos)
🏥 Servicios de Salud Local
🏢 Protección Civil Local
👨‍🚒 Cuerpo de Bomberos Local

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *KIT DE EMERGENCIA RECOMENDADO:*

✓ Agua potable (1 litro por persona/día)
✓ Alimentos no perecederos
✓ Botiquín de primeros auxilios
✓ Linterna y pilas
✓ Radio portátil
✓ Silbato de emergencia
✓ Documentos importantes
✓ Dinero en efectivo
✓ Cargador de teléfono
✓ Medicamentos personales

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *TIPS IMPORTANTES:*

✓ Ten este bot suscrito siempre
✓ Mantén tu teléfono cargado
✓ No confundas alertas de prueba
✓ Sigue instrucciones oficiales
✓ Ayuda a personas en peligro
✓ Reporta daños a autoridades

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *COMANDOS ÚTILES:*

${CONFIG.prefix}menu - Ver todos los comandos
${CONFIG.prefix}alerta - Ver última alerta
${CONFIG.prefix}config - Configurar severidad
${CONFIG.prefix}estado - Estado del bot
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdConfig(msg, isGroup) {
        const chatId = msg.from;
        const config = getUserConfig(chatId);
        
        const status = config.subscribed ? '✅ Suscrito' : '❌ No suscrito';
        const severity = config.severity === 'all' ? 'Todas' : config.severity;
        const muted = config.muted ? '🔇 Silenciado' : '🔔 Activo';
        const joinedAt = config.joinedAt ? new Date(config.joinedAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : 'Desconocido';
        
        const severityExplain = {
            'all': 'Recibirás TODAS las alertas sísmicas',
            'menor': 'Solo alertas MENOR o de mayor magnitud',
            'moderada': 'Solo alertas MODERADA o MAYOR',
            'mayor': 'Solo alertas de severidad MAYOR'
        };
        
        const mensaje = `
⚙️ *TU CONFIGURACIÓN PERSONALIZADA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *ESTADO DE SUSCRIPCIÓN:*

Estado: ${status}
Fecha de registro: ${joinedAt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *FILTRO DE SEVERIDAD ACTUAL:*

Nivel: ${severity}
Descripción: ${severityExplain[config.severity]}

Ejemplos de qué recibirás:
${config.severity === 'all' ? '✓ Alertas Menor, Moderada y Mayor' : config.severity === 'menor' ? '✓ Alertas Menor, Moderada y Mayor' : config.severity === 'moderada' ? '✓ Alertas Moderada y Mayor' : '✓ Solo Alertas Mayor'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 *MODO DE NOTIFICACIÓN:*

Modo: ${muted}

${muted === '🔔 Activo' ? 'Recibirás todas las notificaciones según tu filtro de severidad' : 'Las notificaciones están pausadas temporalmente'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎛️ *CAMBIAR SEVERIDAD:*

${CONFIG.prefix}severidad all
   └─ Recibir TODAS las alertas
   └─ Incluye: Menor, Moderada, Mayor
   
${CONFIG.prefix}severidad menor
   └─ Recibir alertas Menor en adelante
   └─ Incluye: Menor, Moderada, Mayor
   
${CONFIG.prefix}severidad moderada
   └─ Recibir alertas Moderada en adelante
   └─ Incluye: Moderada, Mayor
   
${CONFIG.prefix}severidad mayor
   └─ Recibir SOLO alertas Mayor
   └─ Incluye: Mayor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔊 *CONTROLAR NOTIFICACIONES:*

${CONFIG.prefix}silenciar
   └─ Pausar alertas temporalmente
   └─ Úsalo si no quieres ser molestado
   
${CONFIG.prefix}activar_alertas
   └─ Reanudar alertas después de silenciar
   └─ Volverás a recibir notificaciones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *RECOMENDACIONES:*

✓ Para máxima protección: usa "all"
✓ Para filtrar ruido: usa "mayor"
✓ Para uso normal: usa "moderada"
✓ Revisa periódicamente: ${CONFIG.prefix}alerta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *OTROS COMANDOS ÚTILES:*

${CONFIG.prefix}estado - Ver estado del bot
${CONFIG.prefix}menu - Ver todos los comandos
${CONFIG.prefix}alerta - Ver última alerta
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdSeveridad(msg, args, isGroup) {
        const chatId = msg.from;
        const severity = args[0]?.toLowerCase();
        
        if (!severity || !['all', 'menor', 'moderada', 'mayor'].includes(severity)) {
            await this.sendMessage(chatId,
                `❌ *Uso:* ${CONFIG.prefix}severidad [nivel]\n\n` +
                '*Niveles disponibles:*\n' +
                '• all - Todas las alertas\n' +
                '• menor - Solo Menor o superior\n' +
                '• moderada - Solo Moderada o superior\n' +
                '• mayor - Solo Mayor\n\n' +
                `*Ejemplo:* ${CONFIG.prefix}severidad moderada`
            );
            return;
        }
        
        if (setUserSeverity(chatId, severity, isGroup)) {
            const desc = severity === 'all' ? 'todas las alertas' : `solo alertas ${severity} o superiores`;
            await this.sendMessage(chatId, `✅ *Severidad configurada:* ${severity}\n\nAhora recibirás ${desc}.`);
        } else {
            await this.sendMessage(chatId, '❌ Error guardando configuración.');
        }
    }
    
    async cmdMute(msg, isGroup) {
        const chatId = msg.from;
        
        if (setUserMuted(chatId, true, isGroup)) {
            await this.sendMessage(chatId,
                '🔇 *Alertas silenciadas*\n\n' +
                'No recibirás alertas hasta que uses:\n' +
                `${CONFIG.prefix}activar_alertas`
            );
        } else {
            await this.sendMessage(chatId, '❌ Error silenciando alertas.');
        }
    }
    
    async cmdUnmute(msg, isGroup) {
        const chatId = msg.from;
        
        if (setUserMuted(chatId, false, isGroup)) {
            await this.sendMessage(chatId, '🔔 *Alertas reactivadas*\n\nVolverás a recibir alertas según tu configuración.');
        } else {
            await this.sendMessage(chatId, '❌ Error reactivando alertas.');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      COMANDOS DE ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    async cmdAdmin(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ No tienes permisos de administrador.');
            return;
        }
        
        const mensaje = `
🔧 *PANEL DE ADMINISTRACIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Uptime:* ${this.getUptime()}
👥 *Suscriptores:* ${this.subscribers.length}
💾 *Memoria:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ *COMANDOS ADMIN:*

${CONFIG.prefix}stats ➜ Estadísticas detalladas
${CONFIG.prefix}logs [n] ➜ Ver últimos n logs
${CONFIG.prefix}broadcast [msg] ➜ Enviar a todos

⚠️ *Usa con precaución*
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdStats(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ No tienes permisos.');
            return;
        }
        
        const data = loadData();
        const users = data.users || {};
        const groups = data.groups || {};
        
        const totalUsers = Object.keys(users).length;
        const activeUsers = Object.values(users).filter(u => u && u.subscribed && !u.muted).length;
        const mutedUsers = Object.values(users).filter(u => u && u.muted).length;
        
        const totalGroups = Object.keys(groups).length;
        const activeGroups = Object.values(groups).filter(g => g && g.subscribed && !g.muted).length;
        const mutedGroups = Object.values(groups).filter(g => g && g.muted).length;
        
        const memUsage = process.memoryUsage();
        const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
        
        const mensaje = `
📊 *ESTADÍSTICAS DETALLADAS DEL BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *USUARIOS:*
Total: ${totalUsers}
Activos: ${activeUsers}
Silenciados: ${mutedUsers}
Inactivos: ${totalUsers - activeUsers}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 *GRUPOS:*
Total: ${totalGroups}
Activos: ${activeGroups}
Silenciados: ${mutedGroups}
Inactivos: ${totalGroups - activeGroups}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 *RESUMEN TOTAL:*
Total suscriptores: ${totalUsers + totalGroups}
Receptores activos: ${activeUsers + activeGroups}
En silencio: ${mutedUsers + mutedGroups}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 *SISTEMA:*
Memoria heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (${memPercent}%)
Memoria externa: ${Math.round(memUsage.external / 1024 / 1024)}MB
RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB
Node.js: ${process.version}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ *UPTIME & RENDIMIENTO:*
Uptime: ${this.getUptime()}
Iniciado: ${this.startTime.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
Última verificación SASMEX: ${this.lastCheck ? this.lastCheck.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' }) : 'Pendiente'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ *CONFIGURACIÓN:*
Intervalo monitoreo: ${CONFIG.checkInterval}s
Timeout fetch: ${CONFIG.fetchTimeout}ms
Timeout página: ${CONFIG.pageTimeout}ms
Prefijo: ${CONFIG.prefix}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 *ALMACENAMIENTO:*
Archivo datos: ${CONFIG.dataFile}
Archivo logs: ${CONFIG.logFile}
Carpeta sesión: ${CONFIG.sessionFolder}

🔗 *FUENTE:*
${CONFIG.apiUrl}
        `;
        
        await this.sendMessage(chatId, mensaje);
    }
    
    async cmdLogs(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ No tienes permisos.');
            return;
        }
        
        const lines = args[0] ? parseInt(args[0]) : 15;
        const logs = getLogs(lines);
        
        // WhatsApp tiene límite de caracteres
        const maxLength = 4000;
        const truncatedLogs = logs.length > maxLength ? logs.substring(0, maxLength) + '\n...(truncado)' : logs;
        
        await this.sendMessage(chatId, `📋 *Últimos ${lines} logs:*\n\n${truncatedLogs}`);
    }
    
    async cmdBroadcast(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ No tienes permisos.');
            return;
        }
        
        const message = args.join(' ');
        
        if (!message || message.length === 0) {
            await this.sendMessage(chatId, `❌ *Uso:* ${CONFIG.prefix}broadcast [mensaje]`);
            return;
        }
        
        try {
            const subs = getSubscribers();
            
            if (!subs || subs.length === 0) {
                await this.sendMessage(chatId, '⚠️ No hay suscriptores.');
                return;
            }
            
            await this.sendMessage(chatId, `📢 Enviando a ${subs.length} suscriptores...`);
            
            let sent = 0, failed = 0;
            const broadcastMsg = `📢 *MENSAJE DEL ADMINISTRADOR*\n\n${message}`;
            
            for (const subId of subs) {
                try {
                    if (subId && typeof subId === 'string' && subId.length > 0) {
                        const result = await this.sendMessage(subId, broadcastMsg);
                        if (result) {
                            sent++;
                        } else {
                            failed++;
                        }
                    } else {
                        failed++;
                    }
                } catch (e) {
                    console.error(`Error enviando a ${subId}:`, e.message);
                    failed++;
                }
                // Pequeño delay para evitar rate limiting
                await sleep(200);
            }
            
            const summary = `✅ Broadcast completado:\n• Enviados: ${sent}\n• Fallidos: ${failed}\n• Total: ${subs.length}`;
            await this.sendMessage(chatId, summary);
            logToFile('ADMIN', `Broadcast: ${sent} enviados, ${failed} fallidos de ${subs.length}`);
            
        } catch (error) {
            console.error('❌ Error en broadcast:', error.message);
            await this.sendMessage(chatId, `❌ Error en broadcast: ${error.message}`);
            logToFile('ERROR', `Broadcast error: ${error.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //              📢 SISTEMA DE GENERACIÓN DE COMUNICADOS
    // ═══════════════════════════════════════════════════════════════════════

    async cmdComunicado(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Solo administradores pueden generar comunicados');
            return;
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'menu') {
            const menu = `
📢 *SISTEMA DE COMUNICADOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *COMANDOS DISPONIBLES:*

${CONFIG.prefix}comunicado plantillas
   └─ Ver plantillas disponibles

${CONFIG.prefix}comunicado crear <tipo>
   └─ Crear comunicado desde plantilla
   └─ Tipos: alerta, mantenimiento, aviso, emergencia

${CONFIG.prefix}comunicado custom <mensaje>
   └─ Crear comunicado personalizado

${CONFIG.prefix}comunicado preview <tipo>
   └─ Vista previa de plantilla

${CONFIG.prefix}comunicado enviar <mensaje>
   └─ Enviar comunicado a todos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *EJEMPLO:*
${CONFIG.prefix}comunicado crear alerta
${CONFIG.prefix}comunicado custom Atención: Simulacro mañana
            `;
            await this.sendMessage(chatId, menu);
            return;
        }

        switch (subcommand) {
            case 'plantillas':
                await this.showTemplates(chatId);
                break;
            case 'crear':
                await this.createComunicado(chatId, args.slice(1));
                break;
            case 'custom':
                await this.customComunicado(chatId, args.slice(1));
                break;
            case 'preview':
                await this.previewComunicado(chatId, args.slice(1));
                break;
            case 'enviar':
                await this.sendComunicado(chatId, args.slice(1));
                break;
            default:
                await this.sendMessage(chatId, '❌ Comando no reconocido. Usa: !comunicado menu');
        }
    }

    async showTemplates(chatId) {
        const templates = `
📋 *PLANTILLAS DE COMUNICADOS DISPONIBLES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 *ALERTA*
Comunicado de alerta sísmica oficial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 *MANTENIMIENTO*
Aviso de mantenimiento programado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 *AVISO*
Comunicado general informativo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆘 *EMERGENCIA*
Alerta de emergencia crítica
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 *SIMULACRO*
Aviso de simulacro de sismo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ *INFORMATIVO*
Información general del sistema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *USO:*
${CONFIG.prefix}comunicado crear <tipo>
${CONFIG.prefix}comunicado preview <tipo>
        `;
        await this.sendMessage(chatId, templates);
    }

    async previewComunicado(chatId, args) {
        const tipo = args[0]?.toLowerCase();
        
        if (!tipo) {
            await this.sendMessage(chatId, '❌ Especifica el tipo: !comunicado preview <tipo>');
            return;
        }

        const comunicado = this.generateComunicadoTemplate(tipo);
        
        if (!comunicado) {
            await this.sendMessage(chatId, '❌ Tipo no válido. Usa: !comunicado plantillas');
            return;
        }

        await this.sendMessage(chatId, `📄 *VISTA PREVIA:*\n\n${comunicado}`);
    }

    async createComunicado(chatId, args) {
        const tipo = args[0]?.toLowerCase();
        
        if (!tipo) {
            await this.sendMessage(chatId, '❌ Especifica el tipo: !comunicado crear <tipo>');
            return;
        }

        const comunicado = this.generateComunicadoTemplate(tipo, args.slice(1));
        
        if (!comunicado) {
            await this.sendMessage(chatId, '❌ Tipo no válido. Usa: !comunicado plantillas');
            return;
        }

        await this.sendMessage(chatId, `✅ *COMUNICADO GENERADO:*\n\n${comunicado}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Para enviar: ${CONFIG.prefix}comunicado enviar <mensaje>`);
    }

    async customComunicado(chatId, args) {
        const mensaje = args.join(' ');
        
        if (!mensaje) {
            await this.sendMessage(chatId, '❌ Proporciona el mensaje: !comunicado custom <mensaje>');
            return;
        }

        const fecha = new Date().toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const comunicado = `
╔════════════════════════════════════════════════════════════════╗
║                 📢 COMUNICADO OFICIAL SASMEX                   ║
╚════════════════════════════════════════════════════════════════╝

${mensaje}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* Sistema SASMEX WhatsApp Bot
📞 *Emergencias:* 911

╔════════════════════════════════════════════════════════════════╗
║        Para más información: https://rss.sasmex.net            ║
╚════════════════════════════════════════════════════════════════╝
        `.trim();

        await this.sendMessage(chatId, `✅ *COMUNICADO PERSONALIZADO:*\n\n${comunicado}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Para enviar: ${CONFIG.prefix}comunicado enviar ${mensaje}`);
    }

    async sendComunicado(chatId, args) {
        const mensaje = args.join(' ');
        
        if (!mensaje) {
            await this.sendMessage(chatId, '❌ Proporciona el mensaje: !comunicado enviar <mensaje>');
            return;
        }

        try {
            await this.sendMessage(chatId, '📢 Generando y enviando comunicado...');
            
            const fecha = new Date().toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const comunicado = `
╔════════════════════════════════════════════════════════════════╗
║                 📢 COMUNICADO OFICIAL SASMEX                   ║
╚════════════════════════════════════════════════════════════════╝

${mensaje}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* Sistema SASMEX WhatsApp Bot
📞 *Emergencias:* 911

╔════════════════════════════════════════════════════════════════╗
║     Para más información contacta a las autoridades locales    ║
╚════════════════════════════════════════════════════════════════╝
            `.trim();

            const subscribers = getSubscribers();
            let sent = 0;
            let failed = 0;
            
            for (const subscriberId of subscribers) {
                try {
                    await this.client.sendMessage(subscriberId, comunicado);
                    sent++;
                    await sleep(1500); // Pausa para evitar spam
                } catch (error) {
                    console.error(`Error enviando comunicado a ${subscriberId}:`, error.message);
                    failed++;
                }
                
                if ((sent + failed) % 5 === 0) {
                    await this.sendMessage(chatId, `📊 Enviando: ${sent}/${subscribers.length}`);
                }
            }

            await this.sendMessage(chatId, `✅ *COMUNICADO ENVIADO*\n\n📊 *Estadísticas:*\n• Enviados: ${sent}\n• Fallidos: ${failed}\n• Total: ${subscribers.length}`);
            logToFile('COMUNICADO', `Enviado a ${sent} usuarios: ${mensaje.substring(0, 50)}...`);
        } catch (error) {
            console.error('Error enviando comunicado:', error.message);
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    generateComunicadoTemplate(tipo, extraArgs = []) {
        const fecha = new Date().toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const templates = {
            alerta: `
╔════════════════════════════════════════════════════════════════╗
║           🚨 ALERTA SÍSMICA OFICIAL - SASMEX 🚨                ║
╚════════════════════════════════════════════════════════════════╝

⚠️ *ATENCIÓN CIUDADANÍA*

Se ha detectado actividad sísmica en la región. 

🎯 *ACCIONES INMEDIATAS:*
  ✓ Mantenga la calma
  ✓ Ubíquese en zona segura
  ✓ Aléjese de ventanas y objetos que puedan caer
  ✓ Si está en edificio, NO use elevadores
  ✓ Siga instrucciones de autoridades

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* Sistema de Alerta Sísmica Mexicano (SASMEX)
📞 *Emergencias:* 911
🌐 *Web:* https://rss.sasmex.net

╔════════════════════════════════════════════════════════════════╗
║    Manténgase informado. Siga las indicaciones oficiales.     ║
╚════════════════════════════════════════════════════════════════╝
`,
            mantenimiento: `
╔════════════════════════════════════════════════════════════════╗
║              🔧 AVISO DE MANTENIMIENTO - SASMEX                ║
╚════════════════════════════════════════════════════════════════╝

ℹ️ *MANTENIMIENTO PROGRAMADO*

Se informa a la ciudadanía que el Sistema de Alerta Sísmica 
realizará mantenimiento preventivo.

📋 *DETALLES:*
  • Fecha: ${extraArgs[0] || 'Por confirmar'}
  • Duración estimada: ${extraArgs[1] || '2-4 horas'}
  • Servicios afectados: Alertas temporalmente suspendidas

⚠️ Durante este periodo, las alertas sísmicas podrían presentar
retrasos. Se recomienda mantenerse atento a fuentes oficiales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha de emisión:* ${fecha}
🏛️ *Emisor:* SASMEX - Centro de Operaciones
🌐 *Información:* https://rss.sasmex.net

╔════════════════════════════════════════════════════════════════╗
║           Agradecemos su comprensión y paciencia.              ║
╚════════════════════════════════════════════════════════════════╝
`,
            aviso: `
╔════════════════════════════════════════════════════════════════╗
║                   📢 AVISO OFICIAL - SASMEX                    ║
╚════════════════════════════════════════════════════════════════╝

ℹ️ *COMUNICADO INFORMATIVO*

${extraArgs.join(' ') || 'Información importante del Sistema de Alerta Sísmica Mexicano.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* SASMEX
📞 *Contacto:* 911 (Emergencias)
🌐 *Web:* https://rss.sasmex.net

╔════════════════════════════════════════════════════════════════╗
║              Manténgase informado. SASMEX 24/7.                ║
╚════════════════════════════════════════════════════════════════╝
`,
            emergencia: `
╔════════════════════════════════════════════════════════════════╗
║          🆘 ALERTA DE EMERGENCIA - ACCIÓN INMEDIATA 🆘         ║
╚════════════════════════════════════════════════════════════════╝

🚨🚨🚨 *EMERGENCIA SÍSMICA DETECTADA* 🚨🚨🚨

⚠️ *ACCIÓN INMEDIATA REQUERIDA*

SISMO DE GRAN MAGNITUD DETECTADO

🎯 *INSTRUCCIONES URGENTES:*
  ✓ EVACUE INMEDIATAMENTE edificios de alto riesgo
  ✓ DIRÍJASE a zona segura designada
  ✓ MANTENGA LA CALMA y ayude a personas vulnerables
  ✓ NO REGRESE al edificio sin autorización
  ✓ SIGA instrucciones de Protección Civil

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* SASMEX - ALERTA MÁXIMA
📞 *EMERGENCIAS:* 911
🚨 *Protección Civil:* Activa

╔════════════════════════════════════════════════════════════════╗
║               ⚠️ MANTENGA LA CALMA - ACTÚE YA ⚠️              ║
╚════════════════════════════════════════════════════════════════╝
`,
            simulacro: `
╔════════════════════════════════════════════════════════════════╗
║              📝 AVISO DE SIMULACRO - SASMEX                    ║
╚════════════════════════════════════════════════════════════════╝

🎯 *SIMULACRO DE SISMO PROGRAMADO*

Se informa a la población que se realizará un simulacro de
evacuación por sismo.

📋 *INFORMACIÓN DEL SIMULACRO:*
  • Fecha: ${extraArgs[0] || 'Por confirmar'}
  • Hora: ${extraArgs[1] || 'Por confirmar'}
  • Tipo: Simulacro Nacional
  • Participación: Obligatoria

🎯 *QUÉ HACER:*
  ✓ Al escuchar la alarma, evacue ordenadamente
  ✓ Siga las rutas de evacuación establecidas
  ✓ Diríjase al punto de reunión designado
  ✓ Espere instrucciones de brigadistas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha de emisión:* ${fecha}
🏛️ *Emisor:* SASMEX / Protección Civil
🌐 *Información:* https://rss.sasmex.net

╔════════════════════════════════════════════════════════════════╗
║          El simulacro salva vidas. Participe activamente.      ║
╚════════════════════════════════════════════════════════════════╝
`,
            informativo: `
╔════════════════════════════════════════════════════════════════╗
║              ℹ️ INFORMACIÓN OFICIAL - SASMEX                   ║
╚════════════════════════════════════════════════════════════════╝

📊 *BOLETÍN INFORMATIVO*

${extraArgs.join(' ') || 'El Sistema de Alerta Sísmica Mexicano opera normalmente.\n\nTodos los sistemas funcionando correctamente.\nCobertura: 100%\nEstado: Operativo'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${fecha}
🏛️ *Emisor:* SASMEX - Centro de Información
📞 *Contacto:* 911
🌐 *Web:* https://rss.sasmex.net

╔════════════════════════════════════════════════════════════════╗
║           SASMEX: Vigilando por su seguridad 24/7.             ║
╚════════════════════════════════════════════════════════════════╝
`
        };

        return templates[tipo] ? templates[tipo].trim() : null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //         🏃 SISTEMA ULTRA MEGA TRIPLE SUPER DE SIMULACROS
    // ═══════════════════════════════════════════════════════════════════════

    async cmdSimulacro(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Solo administradores pueden gestionar simulacros.');
            return;
        }

        try {
            const subcomando = args[0]?.toLowerCase();

            if (!subcomando) {
                await this.showSimulacrosMenu(chatId);
                return;
            }

            switch (subcomando) {
                case 'programar':
                case 'agendar':
                case 'schedule':
                    await this.programarSimulacro(chatId, args.slice(1));
                    break;

                case 'listar':
                case 'lista':
                case 'list':
                    await this.listarSimulacros(chatId);
                    break;

                case 'iniciar':
                case 'start':
                case 'comenzar':
                    await this.iniciarSimulacro(chatId, args.slice(1));
                    break;

                case 'finalizar':
                case 'terminar':
                case 'end':
                    await this.finalizarSimulacro(chatId, args.slice(1));
                    break;

                case 'evaluar':
                case 'evaluate':
                    await this.evaluarSimulacro(chatId, args.slice(1));
                    break;

                case 'stats':
                case 'estadisticas':
                case 'estadísticas':
                    await this.statsSimulacros(chatId);
                    break;

                case 'cancelar':
                case 'cancel':
                    await this.cancelarSimulacro(chatId, args.slice(1));
                    break;

                case 'participantes':
                case 'participants':
                    await this.verParticipantes(chatId, args.slice(1));
                    break;

                case 'reporte':
                case 'report':
                    await this.generarReporte(chatId, args.slice(1));
                    break;

                case 'ranking':
                case 'leaderboard':
                    await this.verRanking(chatId);
                    break;

                default:
                    await this.sendMessage(chatId, '❌ Subcomando no reconocido. Usa !simulacro para ver opciones.');
            }

        } catch (error) {
            console.error('❌ Error en cmdSimulacro:', error.message);
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async showSimulacrosMenu(chatId) {
        const menu = `
╔═══════════════════════════════════════════════════════════════╗
║           🏃 SISTEMA DE SIMULACROS ULTRA COMPLETO             ║
║        Sistema de Programación y Evaluación de Simulacros     ║
╚═══════════════════════════════════════════════════════════════╝

┌─ 📅 PROGRAMACIÓN ────────────────────────────────────────────┐
│                                                                │
│  !simulacro programar [fecha] [hora] [magnitud] [lugar]       │
│  └─ Programa un nuevo simulacro con todos los detalles        │
│  └─ Ejemplo: !simulacro programar 2026-03-15 10:00 7.5 CDMX   │
│  └─ Lugar puede tener espacios: Guerrero Costa                │
│                                                                │
│  !simulacro listar                                             │
│  └─ Ver todos los simulacros programados                      │
│                                                                │
│  !simulacro cancelar [id]                                      │
│  └─ Cancelar un simulacro programado                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ ▶️  EJECUCIÓN ──────────────────────────────────────────────┐
│                                                                │
│  !simulacro iniciar [id]                                       │
│  └─ Iniciar un simulacro programado                           │
│                                                                │
│  !simulacro finalizar [id]                                     │
│  └─ Finalizar un simulacro en curso                           │
│                                                                │
│  !simulacro participantes [id]                                 │
│  └─ Ver participantes de un simulacro                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ 📊 EVALUACIÓN Y REPORTES ───────────────────────────────────┐
│                                                                │
│  !simulacro evaluar [id]                                       │
│  └─ Evaluar resultados del simulacro                          │
│                                                                │
│  !simulacro reporte [id]                                       │
│  └─ Generar reporte detallado                                 │
│                                                                │
│  !simulacro stats                                              │
│  └─ Estadísticas generales del sistema                        │
│                                                                │
│  !simulacro ranking                                            │
│  └─ Ver ranking de participación                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║                      ⚡ CARACTERÍSTICAS                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  ✓ Recordatorios automáticos (24h, 12h, 6h, 1h, 30min)       ║
║  ✓ Notificación masiva a todos los usuarios                   ║
║  ✓ Seguimiento de participación en tiempo real                ║
║  ✓ Sistema de puntos y gamificación                           ║
║  ✓ Evaluación automática post-simulacro                       ║
║  ✓ Reportes detallados con estadísticas                       ║
║  ✓ Ranking de usuarios más participativos                     ║
║  ✓ Exportación de datos en formato CSV                        ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

📋 *EJEMPLO DE USO COMPLETO:*

1️⃣ Programar: !simulacro programar 2026-03-20 09:00 7.8 Costa de Guerrero
2️⃣ Sistema envía recordatorios automáticos
3️⃣ Iniciar: !simulacro iniciar 1
4️⃣ Usuarios participan durante ${CONFIG.simulacros.duracionMinutos} minutos
5️⃣ Finalizar: !simulacro finalizar 1
6️⃣ Evaluar: !simulacro evaluar 1
7️⃣ Ver reporte: !simulacro reporte 1

💡 *TIP:* Los usuarios ganan ${CONFIG.simulacros.puntosParticipacion} puntos por participar
y ${CONFIG.simulacros.puntosCompletacion} puntos adicionales por completar!

╔═══════════════════════════════════════════════════════════════╗
║         Para más información contacta a los admins             ║
╚═══════════════════════════════════════════════════════════════╝
        `.trim();

        await this.sendMessage(chatId, menu);
    }

    async programarSimulacro(chatId, args) {
        try {
            if (args.length < 4) {
                await this.sendMessage(chatId, 
                    '❌ Formato incorrecto.\n\n' +
                    'Uso: !simulacro programar [fecha] [hora] [magnitud] [lugar]\n' +
                    'Ejemplo: !simulacro programar 2026-03-15 10:00 7.5 Costa de Guerrero\n\n' +
                    '📝 Campos:\n' +
                    '• Fecha: YYYY-MM-DD\n' +
                    '• Hora: HH:MM (24hrs)\n' +
                    '• Magnitud: 5.0-9.0\n' +
                    '• Lugar: Nombre del epicentro (puede tener espacios)'
                );
                return;
            }

            const fecha = args[0];
            const hora = args[1];
            const magnitud = parseFloat(args[2]);
            const lugar = args.slice(3).join(' ');

            // Validar magnitud
            if (isNaN(magnitud) || magnitud < 3.0 || magnitud > 10.0) {
                await this.sendMessage(chatId, '❌ Magnitud inválida. Debe ser un número entre 3.0 y 10.0');
                return;
            }

        try {
            const fechaHora = new Date(`${fecha}T${hora}:00`);
            const ahora = new Date();

            if (fechaHora <= ahora) {
                await this.sendMessage(chatId, '❌ La fecha debe ser futura.');
                return;
            }

            const data = loadData();
            if (!data.simulacros) data.simulacros = [];
            
            const simulacroId = data.simulacros.length + 1;
            
            const titulo = `Sismo ${magnitud} - ${lugar}`;
            
            const nuevoSimulacro = {
                id: simulacroId,
                titulo,
                magnitud,
                lugar,
                fechaHora: fechaHora.toISOString(),
                estado: 'programado',
                participantes: [],
                respuestas: {},
                creadoPor: chatId,
                creadoEn: new Date().toISOString(),
                recordatoriosEnviados: [],
                inicioReal: null,
                finReal: null,
                duracionMinutos: CONFIG.simulacros.duracionMinutos
            };

            data.simulacros.push(nuevoSimulacro);
            saveData(data);

            this.programarRecordatorios(nuevoSimulacro);

            const confirmacion = `
╔═══════════════════════════════════════════════════════════════╗
║              ✅ SIMULACRO PROGRAMADO EXITOSAMENTE              ║
╚═══════════════════════════════════════════════════════════════╝

🆔 *ID:* ${simulacroId}
📋 *Título:* ${titulo}
📊 *Magnitud:* ${magnitud} Richter
📍 *Lugar:* ${lugar}
📅 *Fecha:* ${fechaHora.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 *Hora:* ${fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
⏱️ *Duración:* ${CONFIG.simulacros.duracionMinutos} minutos

🔔 *RECORDATORIOS AUTOMÁTICOS:*
${CONFIG.simulacros.recordatorios.map(h => `├─ ${h >= 1 ? h + ' horas' : (h * 60) + ' minutos'} antes`).join('\n')}

📊 *SISTEMA ACTIVADO:*
✓ Notificaciones automáticas programadas
✓ Seguimiento de participación
✓ Evaluación post-simulacro
✓ Sistema de puntos activo

Para iniciar manualmente: !simulacro iniciar ${simulacroId}
Para cancelar: !simulacro cancelar ${simulacroId}
            `.trim();

            await this.sendMessage(chatId, confirmacion);
            logToFile('SIMULACRO', `Programado: ${titulo} - ${fechaHora.toISOString()}`);

        } catch (error) {
            console.error('Error programando simulacro:', error.message);
            logToFile('ERROR', `programarSimulacro: ${error.message}\n${error.stack}`);
            await safeExecuteAsync(
                async () => await this.sendMessage(chatId, `❌ Error al programar: ${error.message}`),
                null,
                'Error enviando mensaje de error'
            );
        }
        } catch (fatalError) {
            console.error('💀 ERROR FATAL en programarSimulacro:', fatalError.message);
            logToFile('FATAL', `programarSimulacro FATAL: ${fatalError.message}`);
        }
    }

    programarRecordatorios(simulacro) {
        const fechaSimulacro = new Date(simulacro.fechaHora);
        
        CONFIG.simulacros.recordatorios.forEach(horasAntes => {
            const tiempoRecordatorio = new Date(fechaSimulacro.getTime() - (horasAntes * 60 * 60 * 1000));
            const ahora = new Date();
            const delay = tiempoRecordatorio.getTime() - ahora.getTime();

            if (delay > 0) {
                setTimeout(async () => {
                    await this.enviarRecordatorio(simulacro, horasAntes);
                }, delay);
            }
        });

        const delayInicio = fechaSimulacro.getTime() - Date.now();
        if (delayInicio > 0) {
            setTimeout(async () => {
                await this.iniciarSimulacroAutomatico(simulacro.id);
            }, delayInicio);
        }
    }

    async enviarRecordatorio(simulacro, horasAntes) {
        try {
        const data = loadData();
        const simActual = data.simulacros?.find(s => s.id === simulacro.id);
        
        if (!simActual || simActual.estado !== 'programado') return;

        const tiempoTexto = horasAntes >= 1 
            ? `${horasAntes} ${horasAntes === 1 ? 'hora' : 'horas'}`
            : `${horasAntes * 60} minutos`;

        const recordatorio = `
🔔 ═══════════════════════════════════════════════════════════════
           ⏰ RECORDATORIO DE SIMULACRO
═══════════════════════════════════════════════════════════════

🏃 *SIMULACRO PROGRAMADO*
📋 ${simActual.titulo}
📊 *Magnitud:* ${simActual.magnitud} Richter
📍 *Epicentro:* ${simActual.lugar}

⏰ *TIEMPO RESTANTE:* ${tiempoTexto}
📅 Fecha: ${new Date(simActual.fechaHora).toLocaleDateString('es-MX')}
🕐 Hora: ${new Date(simActual.fechaHora).toLocaleTimeString('es-MX')}

💡 *RECUERDA:*
• Participar suma ${CONFIG.simulacros.puntosParticipacion} puntos
• Completar suma ${CONFIG.simulacros.puntosCompletacion} puntos más
• Duración: ${CONFIG.simulacros.duracionMinutos} minutos
        `.trim();

        const subscribers = getSubscribers();
        for (const userId of subscribers) {
            try {
                await this.client.sendMessage(userId, recordatorio);
                await sleep(1000);
            } catch (error) {
                console.error(`Error enviando recordatorio a ${userId}:`, error.message);
            }
        }

        if (!simActual.recordatoriosEnviados) simActual.recordatoriosEnviados = [];
        simActual.recordatoriosEnviados.push({ horasAntes, enviadoEn: new Date().toISOString() });
        saveData(data);

        logToFile('SIMULACRO', `Recordatorio enviado: ${simActual.titulo} - ${tiempoTexto}`);
        } catch (error) {
            console.error('❌ Error enviando recordatorio:', error.message);
            logToFile('ERROR', `enviarRecordatorio: ${error.message}`);
        }
    }

    async iniciarSimulacroAutomatico(simulacroId) {
        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);
        
        if (!simulacro || simulacro.estado !== 'programado') return;

        await this.iniciarSimulacroCore(simulacro);
    }

    async iniciarSimulacro(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Debes especificar el ID del simulacro.\nEjemplo: !simulacro iniciar 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe un simulacro con ID ${simulacroId}`);
            return;
        }

        if (simulacro.estado !== 'programado') {
            await this.sendMessage(chatId, `❌ El simulacro está en estado: ${simulacro.estado}`);
            return;
        }

        await this.iniciarSimulacroCore(simulacro);
        await this.sendMessage(chatId, '✅ Simulacro iniciado manualmente');
    }

    async iniciarSimulacroCore(simulacro) {
        try {
        const data = loadData();
        const simIndex = data.simulacros.findIndex(s => s.id === simulacro.id);
        
        data.simulacros[simIndex].estado = 'en_curso';
        data.simulacros[simIndex].inicioReal = new Date().toISOString();
        saveData(data);

        const notificacion = `
🚨 ═══════════════════════════════════════════════════════════════
           🏃 SIMULACRO EN CURSO - ¡PARTICIPA AHORA!
═══════════════════════════════════════════════════════════════

📢 *INICIO DE SIMULACRO*
📋 ${simulacro.titulo}
📊 *Magnitud:* ${simulacro.magnitud} Richter
📍 *Epicentro:* ${simulacro.lugar}

🕐 *HORA DE INICIO:* ${new Date().toLocaleTimeString('es-MX')}
⏱️ *DURACIÓN:* ${CONFIG.simulacros.duracionMinutos} minutos

${simulacro.magnitud >= 7.0 ? '⚠️ *MAGNITUD ALTA - EVACUACIÓN INMEDIATA*' : simulacro.magnitud >= 6.0 ? '⚡ *MAGNITUD MODERADA - BUSCAR REFUGIO*' : '💡 *MAGNITUD BAJA - MANTENER PRECAUCIÓN*'}

💰 *RECOMPENSAS:*
• ${CONFIG.simulacros.puntosParticipacion} puntos por participar
• ${CONFIG.simulacros.puntosCompletacion} puntos por completar

🏆 *RESPONDE "YO PARTICIPO" PARA REGISTRARTE*
        `.trim();

        const subscribers = getSubscribers();
        for (const userId of subscribers) {
            try {
                await this.client.sendMessage(userId, notificacion);
                await sleep(1500);
            } catch (error) {
                console.error(`Error notificando inicio a ${userId}:`, error.message);
            }
        }

        setTimeout(async () => {
            await this.finalizarSimulacroAutomatico(simulacro.id);
        }, CONFIG.simulacros.duracionMinutos * 60 * 1000);

        logToFile('SIMULACRO', `Iniciado: ${simulacro.titulo}`);
        } catch (error) {
            console.error('❌ Error iniciando simulacro:', error.message);
            logToFile('ERROR', `iniciarSimulacroCore: ${error.message}`);
        }
    }

    async finalizarSimulacroAutomatico(simulacroId) {
        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);
        
        if (!simulacro || simulacro.estado !== 'en_curso') return;

        await this.finalizarSimulacroCore(simulacro);
    }

    async finalizarSimulacro(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Debes especificar el ID.\nEjemplo: !simulacro finalizar 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe un simulacro con ID ${simulacroId}`);
            return;
        }

        if (simulacro.estado !== 'en_curso') {
            await this.sendMessage(chatId, `❌ El simulacro no está en curso (estado: ${simulacro.estado})`);
            return;
        }

        await this.finalizarSimulacroCore(simulacro);
        await this.sendMessage(chatId, '✅ Simulacro finalizado manualmente');
    }

    async finalizarSimulacroCore(simulacro) {
        try {
        const data = loadData();
        const simIndex = data.simulacros.findIndex(s => s.id === simulacro.id);
        
        data.simulacros[simIndex].estado = 'finalizado';
        data.simulacros[simIndex].finReal = new Date().toISOString();
        saveData(data);

        const participantes = simulacro.participantes.length;
        const totalUsuarios = Object.keys(data.users).length;
        const participacionPct = ((participantes / totalUsuarios) * 100).toFixed(1);

        const notificacionFin = `
✅ ═══════════════════════════════════════════════════════════════
           🏁 SIMULACRO FINALIZADO
═══════════════════════════════════════════════════════════════

📢 *FIN DEL SIMULACRO*
📋 ${simulacro.titulo}

🕐 *HORA DE FIN:* ${new Date().toLocaleTimeString('es-MX')}
📊 *PARTICIPACIÓN:* ${participantes}/${totalUsuarios} usuarios (${participacionPct}%)

💡 *GRACIAS POR PARTICIPAR*
        `.trim();

        const subscribers = getSubscribers();
        for (const userId of subscribers) {
            try {
                await this.client.sendMessage(userId, notificacionFin);
                await sleep(1000);
            } catch (error) {
                console.error(`Error notificando fin a ${userId}:`, error.message);
            }
        }

        setTimeout(async () => {
            await this.evaluarSimulacroAutomatico(simulacro.id);
        }, CONFIG.simulacros.tiempoEvaluacion * 60 * 1000);

        logToFile('SIMULACRO', `Finalizado: ${simulacro.titulo} - ${participantes} participantes`);
        } catch (error) {
            console.error('❌ Error finalizando simulacro:', error.message);
            logToFile('ERROR', `finalizarSimulacroCore: ${error.message}`);
        }
    }

    async evaluarSimulacroAutomatico(simulacroId) {
        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);
        
        if (!simulacro || simulacro.estado !== 'finalizado') return;

        simulacro.participantes.forEach(userId => {
            if (!data.users[userId]) {
                data.users[userId] = { joined: new Date().toISOString(), points: 0 };
            }
            
            data.users[userId].points = (data.users[userId].points || 0) + 
                CONFIG.simulacros.puntosParticipacion + 
                CONFIG.simulacros.puntosCompletacion;
        });

        saveData(data);
        logToFile('SIMULACRO', `Evaluación automática: ${simulacro.titulo}`);
    }

    async evaluarSimulacro(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Especifica el ID.\nEjemplo: !simulacro evaluar 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe simulacro con ID ${simulacroId}`);
            return;
        }

        if (simulacro.estado !== 'finalizado') {
            await this.sendMessage(chatId, `❌ El simulacro debe estar finalizado`);
            return;
        }

        const participantes = simulacro.participantes.length;
        const totalUsuarios = Object.keys(data.users).length;
        const participacionPct = ((participantes / totalUsuarios) * 100).toFixed(1);

        const evaluacion = `
╔═══════════════════════════════════════════════════════════════╗
║              📊 EVALUACIÓN DEL SIMULACRO                      ║
╚═══════════════════════════════════════════════════════════════╝

🆔 *ID:* ${simulacro.id}
📋 *Título:* ${simulacro.titulo}

👥 *PARTICIPACIÓN:*
├─ Participantes: ${participantes}
├─ Total usuarios: ${totalUsuarios}
├─ Porcentaje: ${participacionPct}%
└─ Calificación: ${this.calcularCalificacionParticipacion(participacionPct)}

💰 *PUNTOS OTORGADOS:*
└─ Total distribuido: ${participantes * 150} pts
        `.trim();

        await this.sendMessage(chatId, evaluacion);
    }

    calcularCalificacionParticipacion(pct) {
        if (pct >= 80) return '⭐⭐⭐⭐⭐ EXCELENTE';
        if (pct >= 60) return '⭐⭐⭐⭐ MUY BUENO';
        if (pct >= 40) return '⭐⭐⭐ BUENO';
        if (pct >= 20) return '⭐⭐ REGULAR';
        return '⭐ BAJO';
    }

    async listarSimulacros(chatId) {
        const data = loadData();
        
        if (!data.simulacros || data.simulacros.length === 0) {
            await this.sendMessage(chatId, '📋 No hay simulacros programados.');
            return;
        }

        const programados = data.simulacros.filter(s => s.estado === 'programado');
        const enCurso = data.simulacros.filter(s => s.estado === 'en_curso');
        const finalizados = data.simulacros.filter(s => s.estado === 'finalizado');

        let lista = `
╔═══════════════════════════════════════════════════════════════╗
║              📋 LISTA DE SIMULACROS                           ║
╚═══════════════════════════════════════════════════════════════╝
\n`;

        if (enCurso.length > 0) {
            lista += '🔴 *EN CURSO:*\n';
            enCurso.forEach(s => {
                lista += `├─ [${s.id}] ${s.titulo}\n`;
                lista += `│  └─ Participantes: ${s.participantes.length}\n\n`;
            });
        }

        if (programados.length > 0) {
            lista += '📅 *PROGRAMADOS:*\n';
            programados.forEach(s => {
                const fecha = new Date(s.fechaHora);
                lista += `├─ [${s.id}] ${s.titulo}\n`;
                lista += `│  ├─ Magnitud: ${s.magnitud} | ${s.lugar}\n`;
                lista += `│  └─ ${fecha.toLocaleDateString('es-MX')} ${fecha.toLocaleTimeString('es-MX')}\n\n`;
            });
        }

        if (finalizados.length > 0) {
            lista += '✅ *FINALIZADOS (últimos 3):*\n';
            finalizados.slice(-3).reverse().forEach(s => {
                lista += `├─ [${s.id}] ${s.titulo}\n`;
                lista += `│  └─ ${s.participantes.length} participantes\n\n`;
            });
        }

        await this.sendMessage(chatId, lista.trim());
    }

    async cancelarSimulacro(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Especifica el ID.\nEjemplo: !simulacro cancelar 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe simulacro con ID ${simulacroId}`);
            return;
        }

        if (simulacro.estado === 'finalizado' || simulacro.estado === 'cancelado') {
            await this.sendMessage(chatId, `❌ No se puede cancelar (estado: ${simulacro.estado})`);
            return;
        }

        const simIndex = data.simulacros.findIndex(s => s.id === simulacroId);
        data.simulacros[simIndex].estado = 'cancelado';
        data.simulacros[simIndex].canceladoEn = new Date().toISOString();
        saveData(data);

        await this.sendMessage(chatId, `✅ Simulacro "${simulacro.titulo}" cancelado.`);
        logToFile('SIMULACRO', `Cancelado: ${simulacro.titulo}`);
    }

    async verParticipantes(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Especifica el ID.\nEjemplo: !simulacro participantes 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe simulacro con ID ${simulacroId}`);
            return;
        }

        if (!simulacro.participantes || simulacro.participantes.length === 0) {
            await this.sendMessage(chatId, '📋 Aún no hay participantes registrados.');
            return;
        }

        let mensaje = `
📋 *Simulacro:* ${simulacro.titulo}
👤 *Participantes:* ${simulacro.participantes.length}\n\n`;

        simulacro.participantes.forEach((userId, index) => {
            mensaje += `${index + 1}. ${userId.substring(0, 15)}...\n`;
        });

        await this.sendMessage(chatId, mensaje.trim());
    }

    async generarReporte(chatId, args) {
        const simulacroId = parseInt(args[0]);
        
        if (!simulacroId) {
            await this.sendMessage(chatId, '❌ Especifica el ID.\nEjemplo: !simulacro reporte 1');
            return;
        }

        const data = loadData();
        const simulacro = data.simulacros?.find(s => s.id === simulacroId);

        if (!simulacro) {
            await this.sendMessage(chatId, `❌ No existe simulacro con ID ${simulacroId}`);
            return;
        }

        const participantes = simulacro.participantes.length;
        const totalUsuarios = Object.keys(data.users).length;
        const participacionPct = ((participantes / totalUsuarios) * 100).toFixed(1);

        const reporte = `
╔═══════════════════════════════════════════════════════════════╗
║           📄 REPORTE DETALLADO DE SIMULACRO                   ║
╚═══════════════════════════════════════════════════════════════╝

🆔 *ID:* ${simulacro.id}
📋 *Título:* ${simulacro.titulo}
📊 *Magnitud:* ${simulacro.magnitud} Richter
📍 *Epicentro:* ${simulacro.lugar}
📊 *Estado:* ${simulacro.estado.toUpperCase()}

👥 *PARTICIPACIÓN:*
├─ Participantes: ${participantes}
├─ Total usuarios: ${totalUsuarios}
└─ Porcentaje: ${participacionPct}%

💰 *PUNTOS:*
└─ Total distribuido: ${participantes * 150} pts

*Generado:* ${new Date().toLocaleString('es-MX')}
        `.trim();

        await this.sendMessage(chatId, reporte);
    }

    async statsSimulacros(chatId) {
        const data = loadData();
        
        if (!data.simulacros || data.simulacros.length === 0) {
            await this.sendMessage(chatId, '📊 No hay estadísticas disponibles.');
            return;
        }

        const total = data.simulacros.length;
        const programados = data.simulacros.filter(s => s.estado === 'programado').length;
        const finalizados = data.simulacros.filter(s => s.estado === 'finalizado').length;

        const stats = `
╔═══════════════════════════════════════════════════════════════╗
║         📊 ESTADÍSTICAS DE SIMULACROS                         ║
╚═══════════════════════════════════════════════════════════════╝

📈 *RESUMEN:*
├─ Total: ${total}
├─ Programados: ${programados}
└─ Finalizados: ${finalizados}
        `.trim();

        await this.sendMessage(chatId, stats);
    }

    async verRanking(chatId) {
        const data = loadData();
        
        if (!data.users || Object.keys(data.users).length === 0) {
            await this.sendMessage(chatId, '🏆 No hay datos de ranking.');
            return;
        }

        const ranking = Object.entries(data.users)
            .map(([userId, userData]) => ({
                userId,
                points: userData.points || 0
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);

        let mensaje = `
╔═══════════════════════════════════════════════════════════════╗
║              🏆 RANKING DE PARTICIPACIÓN                      ║
╚═══════════════════════════════════════════════════════════════╝

🥇 *TOP 5 USUARIOS:*\n\n`;

        ranking.forEach((user, index) => {
            const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            mensaje += `${medalla} ${user.userId.substring(0, 20)}...\n`;
            mensaje += `   └─ ${user.points} puntos\n\n`;
        });

        await this.sendMessage(chatId, mensaje.trim());
    }

    async registrarParticipacion(userId) {
        try {
        try {
            const data = loadData();
            
            if (!data.simulacros) return;
            
            // Buscar simulacro en curso
            const simulacroEnCurso = data.simulacros.find(s => s.estado === 'en_curso');
            
            if (!simulacroEnCurso) return;
            
            // Verificar si ya está participando
            if (simulacroEnCurso.participantes.includes(userId)) {
                await this.sendMessage(userId, '✅ Ya estás registrado en este simulacro.');
                return;
            }
            
            // Agregar participante
            const simIndex = data.simulacros.findIndex(s => s.id === simulacroEnCurso.id);
            data.simulacros[simIndex].participantes.push(userId);
            saveData(data);
            
            const confirmacion = `
✅ ═══════════════════════════════════════════════════════════════
           🎉 ¡PARTICIPACIÓN REGISTRADA!
═══════════════════════════════════════════════════════════════

📋 *Simulacro:* ${simulacroEnCurso.titulo}
🆔 *Tu ID:* ${userId.substring(0, 20)}...
👥 *Participantes totales:* ${data.simulacros[simIndex].participantes.length}

💰 *PUNTOS QUE GANARÁS:*
├─ Participación: +${CONFIG.simulacros.puntosParticipacion} pts
└─ Completación: +${CONFIG.simulacros.puntosCompletacion} pts
   *TOTAL: ${CONFIG.simulacros.puntosParticipacion + CONFIG.simulacros.puntosCompletacion} puntos*

🏆 Tus puntos se sumarán al finalizar el simulacro.

📌 *SIGUE LAS INSTRUCCIONES DE SEGURIDAD*
═══════════════════════════════════════════════════════════════
            `.trim();
            
            await this.sendMessage(userId, confirmacion);
            logToFile('SIMULACRO', `Participante registrado: ${userId} en simulacro ${simulacroEnCurso.id}`);
            
        } catch (error) {
            console.error('Error registrando participación:', error.message);
            logToFile('ERROR', `registrarParticipacion: ${error.message}`);
        }
        } catch (fatalError) {
            console.error('💀 ERROR FATAL en registrarParticipacion:', fatalError.message);
            logToFile('FATAL', `registrarParticipacion FATAL: ${fatalError.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //              🔐 SISTEMA ADMINISTRATIVO ULTRA AVANZADO
    // ═══════════════════════════════════════════════════════════════════════

    async cmdOwnerPanel(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const data = loadData();
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const memoryPercent = ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2);

        const panel = `
╔══════════════════════════════════════════════════════════════╗
║                  🔐 PANEL PROPIETARIO                        ║
║                 Sistema de Control Completo                  ║
╚══════════════════════════════════════════════════════════════╝

🖥️ *ESTADO DEL SISTEMA*
├─ Estatus: ${this.isReady ? '✅ En línea' : '❌ Offline'}
├─ Uptime: ${this.formatUptime(uptime)}
├─ Memoria: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB (${memoryPercent}%)
├─ Sesión: ${this.client && this.client.info ? '✅ Activa' : '❌ Inactiva'}
└─ Última verificación: ${new Date().toLocaleString('es-MX')}

📊 *ESTADÍSTICAS*
├─ Total usuarios: ${Object.keys(data.users).length}
├─ Total grupos: ${Object.keys(data.groups).length}
├─ Suscriptores activos: ${getSubscribers().length}
└─ Última alerta: ${data.lastAlert ? new Date(data.lastAlert).toLocaleString('es-MX') : 'Ninguna'}

⚙️ *COMANDOS DISPONIBLES*
├─ !admin-status → Estado ultra detallado
├─ !admin-eval → Ejecutar código JavaScript
├─ !admin-exec → Ejecutar comandos shell
├─ !admin-restart → Reiniciar bot
├─ !admin-backup → Crear copia de seguridad
├─ !admin-restore → Restaurar desde backup
├─ !admin-clean → Limpiar datos innecesarios
├─ !admin-ban [usuario] → Bloquear usuario
├─ !admin-unban [usuario] → Desbloquear usuario
├─ !admin-mute [usuario] → Silenciar usuario
├─ !admin-unmute [usuario] → Activar usuario
├─ !admin-block [usuario] → Bloquear contacto
├─ !admin-unblock [usuario] → Desbloquear contacto
├─ !admin-del [usuario] → Eliminar usuario
├─ !admin-clear-logs → Limpiar logs
├─ !admin-view-logs → Ver logs detallados
├─ !admin-set-alert [texto] → Forzar alerta manual
├─ !admin-maintenance [on/off] → Modo mantenimiento
├─ !admin-debug [on/off] → Modo debug
├─ !admin-config → Ver configuración
├─ !admin-users → Listar todos los usuarios
├─ !admin-groups → Listar todos los grupos
└─ !admin-system → Información completa del sistema

📞 *SOPORTE*
Escribe el comando completo para más información.
`;

        await this.sendMessage(chatId, panel);
        logToFile('OWNER', 'Panel accedido');
    }

    async cmdOwnerStatus(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const data = loadData();
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const memoryPercent = ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2);
        
        // Estadísticas adicionales
        const users = Object.values(data.users);
        const groups = Object.values(data.groups);
        const mutedUsers = users.filter(u => u.muted).length;
        const bannedUsers = users.filter(u => u.banned).length;
        const subscribers = getSubscribers().length;

        const status = `
╔══════════════════════════════════════════════════════════════╗
║            📊 ESTADO ULTRA DETALLADO DEL BOT                ║
╚══════════════════════════════════════════════════════════════╝

🟢 *ESTATUS GENERAL*
├─ Estado: ${this.isReady ? '✅ OPERATIVO' : '❌ INACTIVO'}
├─ Versión: 1.0 Avanzada
├─ Plataforma: ${process.platform.toUpperCase()}
├─ Node.js: ${process.version}
└─ PID: ${process.pid}

⏱️ *TIEMPO DE OPERACIÓN*
├─ Uptime: ${this.formatUptime(uptime)}
├─ Inicio: ${new Date(Date.now() - uptime * 1000).toLocaleString('es-MX')}
├─ Horas: ${(uptime / 3600).toFixed(2)}h
└─ Minutos: ${(uptime / 60).toFixed(0)}m

💾 *MEMORIA*
├─ Heap usado: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB
├─ Heap total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB
├─ Externa: ${(memory.external / 1024 / 1024).toFixed(2)}MB
├─ RSS: ${(memory.rss / 1024 / 1024).toFixed(2)}MB
├─ Porcentaje: ${memoryPercent}%
└─ Disponible: ${((memory.heapTotal - memory.heapUsed) / 1024 / 1024).toFixed(2)}MB

👥 *USUARIOS Y GRUPOS*
├─ Total usuarios: ${Object.keys(data.users).length}
├─ Usuarios activos: ${users.filter(u => !u.muted && !u.banned).length}
├─ Usuarios silenciados: ${mutedUsers}
├─ Usuarios baneados: ${bannedUsers}
├─ Total grupos: ${Object.keys(data.groups).length}
├─ Grupos activos: ${groups.filter(g => !g.muted).length}
└─ Suscriptores totales: ${subscribers}

🔔 *ALERTAS*
├─ Última alerta: ${data.lastAlert ? new Date(data.lastAlert).toLocaleString('es-MX') : 'Ninguna'}
├─ Contenido actual: ${data.lastContent ? data.lastContent.substring(0, 50) + '...' : 'Vacío'}
└─ Archivo: ${fs.existsSync(CONFIG.screenshotFile) ? '✅ Existe' : '❌ No existe'}

📁 *ARCHIVOS*
├─ Base datos: ${fs.existsSync(CONFIG.dataFile) ? `✅ ${(fs.statSync(CONFIG.dataFile).size / 1024).toFixed(2)}KB` : '❌ No existe'}
├─ Logs: ${fs.existsSync(CONFIG.logFile) ? `✅ ${(fs.statSync(CONFIG.logFile).size / 1024).toFixed(2)}KB` : '❌ No existe'}
├─ Sesión: ${fs.existsSync(CONFIG.sessionFolder) ? '✅ Existe' : '❌ No existe'}
└─ Screenshot: ${fs.existsSync(CONFIG.screenshotFile) ? '✅ Existe' : '❌ No existe'}

🌐 *CONEXIÓN*
├─ SASMEX API: ${this.lastSasmexCheck ? '✅ Conectada' : '⚠️ No verificada'}
├─ Última revisión: ${this.lastSasmexCheck ? this.lastSasmexCheck.toLocaleString('es-MX') : 'Ninguna'}
├─ Intervalo: ${CONFIG.checkInterval} segundos
└─ Timeout: ${CONFIG.fetchTimeout}ms

🔧 *CONFIGURACIÓN*
├─ Prefijo: ${CONFIG.prefix}
├─ Admin: ${CONFIG.adminNumber || 'No configurado'}
├─ URL API: ${CONFIG.apiUrl}
└─ Carpeta sesión: ${CONFIG.sessionFolder}
`;

        await this.sendMessage(chatId, status);
        logToFile('OWNER', 'Estado ultra detallado consultado');
    }

    async cmdOwnerEval(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const code = args.join(' ');
        
        if (!code) {
            await this.sendMessage(chatId, '❌ Uso: !admin-eval [código JavaScript]');
            return;
        }

        try {
            const result = await eval(code);
            const output = String(result).substring(0, 1000);
            
            await this.sendMessage(chatId, `✅ *RESULTADO:*\n\`\`\`\n${output}\n\`\`\``);
            logToFile('OWNER', `EVAL ejecutado: ${code.substring(0, 50)}`);
        } catch (error) {
            await this.sendMessage(chatId, `❌ *ERROR:*\n\`\`\`\n${error.message}\n\`\`\``);
            logToFile('OWNER', `EVAL error: ${error.message}`);
        }
    }

    async cmdOwnerExec(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const command = args.join(' ');
        
        if (!command) {
            await this.sendMessage(chatId, '❌ Uso: !admin-exec [comando]');
            return;
        }

        try {
            const { execSync } = require('child_process');
            const result = execSync(command, { encoding: 'utf8' }).toString();
            const output = result.substring(0, 1000);
            
            await this.sendMessage(chatId, `✅ *EJECUTADO:*\n\`\`\`\n${output}\n\`\`\``);
            logToFile('OWNER', `EXEC: ${command}`);
        } catch (error) {
            await this.sendMessage(chatId, `❌ *ERROR:*\n\`\`\`\n${error.message}\n\`\`\``);
            logToFile('OWNER', `EXEC error: ${error.message}`);
        }
    }

    async cmdOwnerRestart(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        await this.sendMessage(chatId, '🔄 Reiniciando bot...');
        logToFile('OWNER', 'Reinicio solicitado');
        
        setTimeout(async () => {
            await this.stop();
            process.exit(0);
        }, 2000);
    }

    async cmdOwnerBackup(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = `${CONFIG.dataFile}.backup.${timestamp}.json`;
            
            if (fs.existsSync(CONFIG.dataFile)) {
                fs.copyFileSync(CONFIG.dataFile, backupFile);
                const size = fs.statSync(backupFile).size;
                
                await this.sendMessage(chatId, `✅ Backup creado:\n• Archivo: data.json.backup.${timestamp}.json\n• Tamaño: ${(size / 1024).toFixed(2)}KB`);
                logToFile('OWNER', `Backup creado: ${backupFile}`);
            } else {
                await this.sendMessage(chatId, '⚠️ No hay datos para respaldar.');
            }
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error creando backup: ${error.message}`);
            logToFile('OWNER', `Backup error: ${error.message}`);
        }
    }

    async cmdOwnerRestore(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const pattern = args[0] || '*';
            const backups = fs.readdirSync(path.dirname(CONFIG.dataFile))
                .filter(f => f.startsWith('data.json.backup') && f.endsWith('.json'));
            
            if (backups.length === 0) {
                await this.sendMessage(chatId, '⚠️ No hay backups disponibles.');
                return;
            }

            let message = '📋 *Backups disponibles:*\n\n';
            backups.slice(-10).forEach((backup, index) => {
                message += `${index + 1}. ${backup}\n`;
            });
            message += '\n_Responde con el número del backup a restaurar._';

            await this.sendMessage(chatId, message);
            logToFile('OWNER', 'Backups listados para restauración');
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerClean(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const data = loadData();
            let cleaned = 0;

            // Limpiar usuarios sin datos válidos
            for (const [id, user] of Object.entries(data.users)) {
                if (!user || !user.subscribed) {
                    delete data.users[id];
                    cleaned++;
                }
            }

            // Limpiar grupos sin datos válidos
            for (const [id, group] of Object.entries(data.groups)) {
                if (!group || !group.subscribed) {
                    delete data.groups[id];
                    cleaned++;
                }
            }

            saveData(data);
            await this.sendMessage(chatId, `✅ Limpieza completada:\n• Registros eliminados: ${cleaned}\n• Usuarios restantes: ${Object.keys(data.users).length}\n• Grupos restantes: ${Object.keys(data.groups).length}`);
            logToFile('OWNER', `Limpieza: ${cleaned} registros eliminados`);
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerBan(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const userId = args[0];
        
        if (!userId) {
            await this.sendMessage(chatId, '❌ Uso: !admin-ban [usuario]');
            return;
        }

        try {
            const data = loadData();
            const isGroup = userId.endsWith('@g.us');
            const collection = isGroup ? data.groups : data.users;

            if (collection[userId]) {
                collection[userId].banned = true;
                collection[userId].banDate = new Date().toISOString();
                saveData(data);
                
                await this.sendMessage(chatId, `✅ ${isGroup ? 'Grupo' : 'Usuario'} baneado: ${userId}`);
                logToFile('OWNER', `Ban: ${userId}`);
            } else {
                await this.sendMessage(chatId, '⚠️ No encontrado en base de datos.');
            }
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerUnban(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const userId = args[0];
        
        if (!userId) {
            await this.sendMessage(chatId, '❌ Uso: !admin-unban [usuario]');
            return;
        }

        try {
            const data = loadData();
            const isGroup = userId.endsWith('@g.us');
            const collection = isGroup ? data.groups : data.users;

            if (collection[userId]) {
                collection[userId].banned = false;
                delete collection[userId].banDate;
                saveData(data);
                
                await this.sendMessage(chatId, `✅ ${isGroup ? 'Grupo' : 'Usuario'} desbaneado: ${userId}`);
                logToFile('OWNER', `Unban: ${userId}`);
            } else {
                await this.sendMessage(chatId, '⚠️ No encontrado en base de datos.');
            }
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerViewLogs(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const lines = parseInt(args[0]) || 50;
            
            if (!fs.existsSync(CONFIG.logFile)) {
                await this.sendMessage(chatId, '📝 No hay logs disponibles.');
                return;
            }

            const fileContent = fs.readFileSync(CONFIG.logFile, 'utf8');
            const logLines = fileContent.split('\n').slice(-lines);
            const content = logLines.join('\n').substring(0, 3000);

            await this.sendMessage(chatId, `📝 *ÚLTIMOS ${lines} LOGS:*\n\`\`\`\n${content}\n\`\`\``);
            logToFile('OWNER', 'Logs consultados');
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerClearLogs(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            if (fs.existsSync(CONFIG.logFile)) {
                const size = fs.statSync(CONFIG.logFile).size;
                fs.writeFileSync(CONFIG.logFile, '');
                
                await this.sendMessage(chatId, `✅ Logs limpios:\n• Tamaño anterior: ${(size / 1024).toFixed(2)}KB\n• Estado: Vacío`);
                logToFile('OWNER', 'Logs borrados');
            }
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerSetAlert(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const alertText = args.join(' ');
        
        if (!alertText) {
            await this.sendMessage(chatId, '❌ Uso: !admin-set-alert [texto]');
            return;
        }

        try {
            const data = loadData();
            data.lastContent = alertText;
            data.lastAlert = new Date().toISOString();
            saveData(data);

            await this.sendMessage(chatId, `✅ Alerta manual establecida:\n\n${alertText}`);
            logToFile('OWNER', `Alerta manual: ${alertText.substring(0, 50)}`);
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerMaintenance(msg, args) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        const mode = args[0]?.toLowerCase();
        
        if (!mode || !['on', 'off'].includes(mode)) {
            await this.sendMessage(chatId, '❌ Uso: !admin-maintenance [on/off]');
            return;
        }

        this.maintenanceMode = mode === 'on';
        
        const status = mode === 'on' ? 
            '🔧 Modo mantenimiento ACTIVADO' : 
            '✅ Modo mantenimiento DESACTIVADO';
        
        await this.sendMessage(chatId, status);
        logToFile('OWNER', `Modo mantenimiento: ${mode}`);
    }

    async cmdOwnerUsers(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const data = loadData();
            const users = Object.entries(data.users);

            let message = `👥 *LISTA DE USUARIOS (${users.length}):*\n\n`;
            
            users.slice(-20).forEach(([id, user], index) => {
                const status = user.banned ? '🚫' : user.muted ? '🔇' : '✅';
                const joined = user.joinDate ? new Date(user.joinDate).toLocaleDateString('es-MX') : 'N/A';
                message += `${index + 1}. ${status} ${id}\n   Severidad: ${user.severityLevel || 'all'} | Unido: ${joined}\n`;
            });

            message += `\n_Mostrando últimos 20 de ${users.length}_`;
            await this.sendMessage(chatId, message);
            logToFile('OWNER', 'Lista de usuarios consultada');
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerGroups(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const data = loadData();
            const groups = Object.entries(data.groups);

            let message = `👥 *LISTA DE GRUPOS (${groups.length}):*\n\n`;
            
            groups.slice(-20).forEach(([id, group], index) => {
                const status = group.muted ? '🔇' : '✅';
                const joined = group.joinDate ? new Date(group.joinDate).toLocaleDateString('es-MX') : 'N/A';
                message += `${index + 1}. ${status} ${id}\n   Severidad: ${group.severityLevel || 'all'} | Unido: ${joined}\n`;
            });

            message += `\n_Mostrando últimos 20 de ${groups.length}_`;
            await this.sendMessage(chatId, message);
            logToFile('OWNER', 'Lista de grupos consultada');
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async cmdOwnerSystem(msg) {
        const chatId = msg.from;
        
        if (!isAdmin(chatId)) {
            await this.sendMessage(chatId, '❌ Acceso denegado.');
            return;
        }

        try {
            const data = loadData();
            const uptime = process.uptime();
            const memory = process.memoryUsage();
            const os = require('os');

            const systemInfo = `
╔══════════════════════════════════════════════════════════════╗
║            🔧 INFORMACIÓN COMPLETA DEL SISTEMA               ║
╚══════════════════════════════════════════════════════════════╝

💻 *HARDWARE*
├─ Plataforma: ${process.platform} ${os.arch()}
├─ CPUs: ${os.cpus().length}
├─ Modelo CPU: ${os.cpus()[0].model}
├─ Frecuencia: ${os.cpus()[0].speed} MHz
├─ Memoria total: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
├─ Memoria libre: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB
└─ Carga promedio: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}

📊 *PROCESO NODE.JS*
├─ PID: ${process.pid}
├─ Versión: ${process.version}
├─ Arquitectura: ${process.arch}
├─ Plataforma: ${process.platform}
├─ CWD: ${process.cwd()}
├─ Uptime: ${this.formatUptime(uptime)}
├─ Heap usado: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB
├─ Heap total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB
├─ External: ${(memory.external / 1024 / 1024).toFixed(2)}MB
├─ RSS: ${(memory.rss / 1024 / 1024).toFixed(2)}MB
└─ Array buffers: ${(memory.arrayBuffers / 1024 / 1024).toFixed(2)}MB

📁 *DIRECTORIO*
├─ Raíz: ${__dirname}
├─ Data: ${CONFIG.dataFile}
├─ Logs: ${CONFIG.logFile}
├─ Sesión: ${CONFIG.sessionFolder}
├─ Screenshot: ${CONFIG.screenshotFile}
└─ Tamaño carpeta: ${(await this.getDirSize(__dirname) / 1024 / 1024).toFixed(2)}MB

🌐 *CONFIGURACIÓN BOT*
├─ Prefijo: ${CONFIG.prefix}
├─ Admin: ${CONFIG.adminNumber || 'No configurado'}
├─ Intervalo check: ${CONFIG.checkInterval}s
├─ Timeout API: ${CONFIG.fetchTimeout}ms
├─ Timeout página: ${CONFIG.pageTimeout}ms
├─ URL API: ${CONFIG.apiUrl}
└─ URL Web: ${CONFIG.webUrl}

📈 *ESTADÍSTICAS BASE DATOS*
├─ Usuarios: ${Object.keys(data.users).length}
├─ Grupos: ${Object.keys(data.groups).length}
├─ Tamaño: ${(fs.statSync(CONFIG.dataFile).size / 1024).toFixed(2)}KB
├─ Última actualización: ${new Date(fs.statSync(CONFIG.dataFile).mtime).toLocaleString('es-MX')}
└─ Última alerta: ${data.lastAlert || 'Ninguna'}
`;

            await this.sendMessage(chatId, systemInfo);
            logToFile('OWNER', 'Información del sistema consultada');
        } catch (error) {
            await this.sendMessage(chatId, `❌ Error: ${error.message}`);
            logToFile('OWNER', `System error: ${error.message}`);
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }

    async getDirSize(dir) {
        let size = 0;
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    size += await this.getDirSize(filePath);
                } else {
                    size += stat.size;
                }
            }
        } catch (e) {
            // Ignorar errores
        }
        return size;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    FUNCIONES DE ENVÍO
    // ═══════════════════════════════════════════════════════════════════════
    
    async sendMessage(chatId, text) {
        try {
            // Validaciones de seguridad ESTRICTAS
            if (!chatId || typeof chatId !== 'string' || chatId.length === 0) {
                console.error('❌ ChatId inválido:', chatId);
                logToFile('ERROR', `ChatId inválido: ${chatId}`);
                return null;
            }

            if (!text || typeof text !== 'string') {
                console.error('❌ Texto del mensaje inválido');
                logToFile('ERROR', 'Texto del mensaje inválido');
                return null;
            }

            if (!this.isReady) {
                console.warn('⚠️ Bot no está listo para enviar');
                logToFile('WARN', 'Intento de envío: Bot no listo');
                return null;
            }

            if (!this.client) {
                console.warn('⚠️ Cliente no existe');
                logToFile('ERROR', 'Intento de envío: Cliente no existe');
                await this.handleCriticalError(new Error('Client not available'));
                return null;
            }

            const chatIdStr = String(chatId).trim();
            const textStr = String(text).trim();

            // Validar formato de chatId
            if (!chatIdStr.includes('@')) {
                console.error('❌ ChatId sin formato válido:', chatIdStr);
                return null;
            }

            // Enviar mensaje con validación
            try {
                const result = await this.client.sendMessage(chatIdStr, textStr);
                
                if (!result) {
                    console.warn('⚠️ Envío retornó nulo para:', chatIdStr);
                    logToFile('WARN', `Envío falló (nulo): ${chatIdStr}`);
                    return null;
                }

                // Log de éxito
                logToFile('MESSAGE', `Enviado a ${chatIdStr}`);
                return result;
                
            } catch (sendError) {
                throw sendError; // Propagar al catch principal
            }
            
        } catch (error) {
            const chatIdStr = String(chatId);
            const errorMsg = String(error.message || 'Error desconocido').toLowerCase();
            
            console.error(`❌ Error enviando a ${chatIdStr}: ${error.message}`);
            logToFile('ERROR', `Envío fallido a ${chatIdStr}: ${error.message}`);
            
            // MANEJO AVANZADO DE ERRORES
            try {
                if (errorMsg.includes('not found') || errorMsg.includes('no longer exists') || errorMsg.includes('does not exist')) {
                    // Chat no existe o fue eliminado
                    console.log(`🗑️ Eliminando suscriptor inexistente: ${chatIdStr}`);
                    const id = String(chatId);
                    const index = this.subscribers.indexOf(id);
                    if (index > -1) {
                        this.subscribers.splice(index, 1);
                    }
                    removeSubscriber(chatId, chatId.includes('@g.us'));
                    logToFile('CLEANUP', `Chat eliminado de lista: ${chatId}`);
                    
                } else if (errorMsg.includes('blocked') || errorMsg.includes('you have been blocked') || errorMsg.includes('block')) {
                    // Usuario bloqueó el bot
                    console.log(`🚫 Usuario ha bloqueado el bot: ${chatIdStr}`);
                    removeSubscriber(chatId, chatId.includes('@g.us'));
                    logToFile('SECURITY', `Usuario bloqueó bot: ${chatId}`);
                    
                } else if (errorMsg.includes('permission') || errorMsg.includes('group') || errorMsg.includes('not a member')) {
                    // Error de permisos en grupo - no eliminar, solo loguear
                    console.log(`⚠️ Problema de permisos en grupo: ${chatIdStr}`);
                    logToFile('WARN', `Permisos insuficientes: ${chatId}`);
                    
                } else if (errorMsg.includes('quota') || errorMsg.includes('rate')) {
                    // Rate limiting de WhatsApp
                    console.warn(`⏱️ Rate limit: esperando...`);
                    logToFile('WARN', `Rate limit alcanzado para: ${chatId}`);
                    await sleep(2000); // Esperar 2 segundos
                    
                } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
                    // Problema de red o timeout
                    console.warn(`🌐 Error de red/timeout para: ${chatIdStr}`);
                    logToFile('NETWORK', `Problema de red: ${chatId}`);
                    this.errorCount++;
                    
                } else {
                    // Error desconocido - registrar para análisis
                    console.error(`❓ Error desconocido para ${chatIdStr}:`, error);
                    logToFile('CRITICAL', `Error desconocido: ${error.message}`);
                    this.handleCriticalError(error);
                }
            } catch (handlerError) {
                console.error('Error en manejador de errores:', handlerError.message);
                logToFile('ERROR', `Error en handler: ${handlerError.message}`);
            }
            
            return null;
        }
    }
    
    async sendImage(chatId, imagePath, caption = '') {
        try {
            // Validaciones ESTRICTAS
            if (!chatId || typeof chatId !== 'string' || chatId.length === 0) {
                console.error('❌ ChatId inválido');
                logToFile('ERROR', 'ChatId inválido para sendImage');
                return null;
            }

            if (!this.isReady) {
                console.warn('⚠️ Bot no está listo para enviar imagen');
                logToFile('WARN', 'Intento sendImage: Bot no listo');
                return null;
            }

            if (!this.client) {
                console.warn('⚠️ Cliente no existe para sendImage');
                logToFile('ERROR', 'Cliente no existe en sendImage');
                return null;
            }
            
            if (!fs.existsSync(imagePath)) {
                console.error(`❌ Imagen no encontrada: ${imagePath}`);
                logToFile('ERROR', `Imagen no encontrada: ${imagePath}`);
                return null;
            }

            const chatIdStr = String(chatId).trim();
            const captionStr = caption ? String(caption).trim() : '';
            
            // Validar que es una imagen real
            try {
                const stats = fs.statSync(imagePath);
                if (stats.size === 0) {
                    console.error(`❌ Imagen vacía: ${imagePath}`);
                    logToFile('ERROR', `Imagen vacía: ${imagePath}`);
                    return null;
                }
            } catch (statError) {
                console.error(`❌ No se puede leer imagen: ${statError.message}`);
                return null;
            }
            
            // Leer imagen y convertir a base64
            let imageBuffer, base64Image;
            try {
                imageBuffer = fs.readFileSync(imagePath);
                base64Image = imageBuffer.toString('base64');
                
                if (!base64Image || base64Image.length === 0) {
                    throw new Error('Base64 conversion failed');
                }
            } catch (bufferError) {
                console.error(`❌ Error leyendo imagen: ${bufferError.message}`);
                logToFile('ERROR', `Error leyendo imagen: ${bufferError.message}`);
                return null;
            }

            // Crear media
            let media;
            try {
                media = new MessageMedia('image/png', base64Image);
            } catch (mediaError) {
                console.error(`❌ Error creando MessageMedia: ${mediaError.message}`);
                logToFile('ERROR', `Error creando MessageMedia: ${mediaError.message}`);
                return null;
            }
            
            // Enviar imagen
            try {
                const result = await this.client.sendMessage(chatIdStr, media, { 
                    caption: captionStr || undefined 
                });
                
                if (!result) {
                    console.warn(`⚠️ Envío de imagen retornó nulo para: ${chatIdStr}`);
                    logToFile('WARN', `Envío imagen falló (nulo): ${chatIdStr}`);
                    return null;
                }

                logToFile('IMAGE', `Imagen enviada a ${chatIdStr}`);
                return result;
                
            } catch (sendError) {
                throw sendError; // Propagar al catch principal
            }
            
        } catch (error) {
            const chatIdStr = String(chatId);
            const errorMsg = String(error.message || 'Error desconocido').toLowerCase();
            
            console.error(`❌ Error enviando imagen a ${chatIdStr}: ${error.message}`);
            logToFile('ERROR', `Error imagen a ${chatIdStr}: ${error.message}`);
            
            // MANEJO AVANZADO
            try {
                if (errorMsg.includes('not found') || errorMsg.includes('no longer exists')) {
                    console.log(`🗑️ Chat no existe, eliminando suscriptor`);
                    removeSubscriber(chatId, chatId.includes('@g.us'));
                    logToFile('CLEANUP', `Chat no existe: ${chatId}`);
                    
                } else if (errorMsg.includes('blocked')) {
                    console.log(`🚫 Usuario bloqueó el bot`);
                    removeSubscriber(chatId, chatId.includes('@g.us'));
                    logToFile('SECURITY', `Usuario bloqueó: ${chatId}`);
                    
                } else if (errorMsg.includes('permission') || errorMsg.includes('group') || errorMsg.includes('not a member')) {
                    // Intenta enviar solo texto si hay problema con imagen en grupo
                    console.log(`⚠️ Problema enviando imagen a grupo, intentando texto...`);
                    logToFile('FALLBACK', `Imagen falló en grupo, intentando texto: ${chatId}`);
                    
                    try {
                        const textMessage = captionStr || '📸 Alerta sísmica detectada';
                        await sleep(500); // Esperar un poco
                        await this.sendMessage(chatIdStr, textMessage);
                    } catch (textError) {
                        console.error(`❌ También falló texto:`, textError.message);
                        logToFile('ERROR', `Fallback texto también falló: ${textError.message}`);
                    }
                    
                } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
                    console.warn(`🌐 Error de red al enviar imagen`);
                    logToFile('NETWORK', `Red error imagen: ${chatId}`);
                    this.errorCount++;
                    
                } else {
                    console.error(`❓ Error desconocido en imagen:`, error);
                    logToFile('CRITICAL', `Error imagen desconocido: ${error.message}`);
                }
            } catch (handlerError) {
                console.error('Error en handler sendImage:', handlerError.message);
            }
            
            return null;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      MONITOREO DE ALERTAS
    // ═══════════════════════════════════════════════════════════════════════
    
    async checkForAlerts(isInitialSync = false) {
        if (this.isChecking || !this.isReady) return;
        
        this.isChecking = true;
        this.lastCheck = new Date();
        console.log(`🔄 [${this.lastCheck.toLocaleTimeString('es-MX')}] ${isInitialSync ? 'Conectando' : 'Verificando'}...`);
        
        try {
            // Intentar obtener contenido de SASMEX con manejo de errores
            let webData;
            try {
                webData = await getWebContent();
            } catch (fetchError) {
                console.error('❌ Error fetching SASMEX:', fetchError.message);
                this.errorCount++;
                logToFile('ERROR', `SASMEX fetch error: ${fetchError.message}`);
                return;
            }
            
            if (!webData || !webData.success) {
                console.log('⚠️ No se pudo conectar:', webData?.error || 'Error desconocido');
                this.errorCount++;
                return;
            }

            // Reset de contador de errores si es exitoso
            if (this.errorCount > 0) {
                this.errorCount = 0;
                console.log('✅ Conexión restaurada');
            }
            
            const currentContent = webData.data?.identifier;
            const lastContent = getLastContent();
            
            if (isInitialSync || this.isFirstRun) {
                setLastContent(currentContent);
                this.isFirstRun = false;
                console.log('✅ Conexión establecida');
                return;
            }
            
            if (currentContent && currentContent !== lastContent) {
                console.log('🚨 ¡NUEVA ALERTA DETECTADA!');
                logToFile('ALERT', `Nueva alerta: ${currentContent}`);
                
                try {
                    const imageResult = await generateAlertImage(webData.data);
                    
                    if (imageResult.success && fs.existsSync(imageResult.imagePath)) {
                        await this.broadcastImage(imageResult.imagePath,
                            '🚨🚨🚨 *ALERTA SÍSMICA SASMEX* 🚨🚨🚨\n\n' +
                            '⚠️ Nueva alerta detectada\n\n' +
                            '📞 Emergencias: *911*\n' +
                            '🏛️ Fuente: SASMEX - CIRES',
                            webData.data.severidad
                        );
                    } else {
                        // Fallback a texto si no hay imagen
                        console.log('⚠️ No se pudo generar imagen, enviando texto...');
                        await this.broadcastMessage(
                            '🚨🚨🚨 *ALERTA SÍSMICA SASMEX* 🚨🚨🚨\n\n' +
                            `📅 ${webData.data.fecha || 'N/A'}\n` +
                            `🌋 ${webData.data.evento || 'N/A'}\n` +
                            `⚠️ ${webData.data.severidad || 'Moderada'}\n\n` +
                            '📞 Emergencias: *911*',
                            webData.data.severidad
                        );
                    }
                } catch (alertError) {
                    console.error('❌ Error procesando alerta:', alertError.message);
                    logToFile('ERROR', `Alert processing error: ${alertError.message}`);
                    // Intentar enviar solo texto como último recurso
                    try {
                        await this.broadcastMessage(
                            '🚨 *ALERTA SÍSMICA DETECTADA*\n\n' +
                            'Se ha detectado una alerta sísmica. Consulta con SASMEX para detalles.',
                            webData.data?.severidad || 'moderada'
                        );
                    } catch (e) {
                        console.error('❌ Error en fallback:', e.message);
                    }
                }
                
                setLastContent(currentContent);
            } else {
                console.log('✅ Sin cambios');
            }
            
        } catch (error) {
            console.error('❌ Error crítico:', error.message);
            this.errorCount++;
            logToFile('ERROR', `Critical error in checkForAlerts: ${error.message}`);
            
            // Llamar a handleCriticalError para activar auto-reparación si es necesario
            if (this.errorCount >= this.maxErrorsBeforeRepair) {
                this.handleCriticalError(error);
            }
        } finally {
            this.isChecking = false;
        }
    }
    
    async broadcastImage(imagePath, caption, alertSeverity = 'moderada') {
        const allSubs = getSubscribers();
        const subs = allSubs.filter(chatId => shouldSendAlert(chatId, alertSeverity));
        
        if (subs.length === 0) {
            console.log('⚠️ No hay suscriptores que cumplan el filtro');
            return;
        }
        
        console.log(`📢 Enviando imagen a ${subs.length} suscriptor(es)...`);
        
        let enviados = 0, fallidos = 0;
        
        for (const chatId of subs) {
            const result = await this.sendImage(chatId, imagePath, caption);
            if (result) enviados++; else fallidos++;
            await sleep(500); // Evitar rate limiting de WhatsApp
        }
        
        console.log(`✅ Enviados: ${enviados} | ❌ Fallidos: ${fallidos}`);
        logToFile('BROADCAST', `Imagen enviada: ${enviados} ok, ${fallidos} fail`);
    }
    
    async broadcastMessage(message, alertSeverity = 'moderada') {
        const allSubs = getSubscribers();
        const subs = allSubs.filter(chatId => shouldSendAlert(chatId, alertSeverity));
        
        if (subs.length === 0) return;
        
        console.log(`📢 Enviando mensaje a ${subs.length} suscriptor(es)...`);
        
        let enviados = 0, fallidos = 0;
        
        for (const chatId of subs) {
            const result = await this.sendMessage(chatId, message);
            if (result) enviados++; else fallidos++;
            await sleep(500);
        }
        
        console.log(`✅ Enviados: ${enviados} | ❌ Fallidos: ${fallidos}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        UTILIDADES
    // ═══════════════════════════════════════════════════════════════════════
    
    startMonitoring() {
        try {
            // Inicializar navegador para imágenes con protección
            safeExecuteAsync(
                async () => await initImageBrowser(),
                null,
                'Error inicializando navegador'
            ).catch(err => {
                console.error('⚠️ Error browser:', err.message);
            });
            
            // Primera verificación con protección
            setTimeout(() => {
                safeExecuteAsync(
                    async () => await this.checkForAlerts(true),
                    null,
                    'Error en verificación inicial'
                );
            }, 5000);
            
            // Verificaciones periódicas con protección
            this.checkIntervalId = setInterval(() => {
                safeExecuteAsync(
                    async () => await this.checkForAlerts(false),
                    null,
                    'Error en verificación periódica'
                );
            }, CONFIG.checkInterval * 1000);
            
            console.log(`
╔════════════════════════════════════════════════════════════════╗
║       🌋 BOT SASMEX WHATSAPP INICIADO 🌋                       ║
╠════════════════════════════════════════════════════════════════╣
║   📱 Plataforma: WhatsApp                                      ║
║   🌐 Web: https://rss.sasmex.net                               ║
║   ⏱️  Intervalo: ${String(CONFIG.checkInterval).padEnd(3)} segundos                              ║
║   👥 Suscriptores: ${String(this.subscribers.length).padEnd(3)}                                    ║
║   📝 Prefijo: ${CONFIG.prefix}                                              ║
╚════════════════════════════════════════════════════════════════╝
            `);
        } catch (error) {
            console.error('❌ Error iniciando monitoreo:', error.message);
            logToFile('ERROR', `startMonitoring: ${error.message}`);
            
            // Reintentar después de 5 segundos
            setTimeout(() => {
                console.log('🔄 Reintentando iniciar monitoreo...');
                this.startMonitoring();
            }, 5000);
        }
    }
    
    getUptime() {
        const diff = Date.now() - this.startTime.getTime();
        const s = Math.floor(diff / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        
        if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
        if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
        if (m > 0) return `${m}m ${s % 60}s`;
        return `${s}s`;
    }
    
    async start() {
        console.log('🚀 Iniciando cliente de WhatsApp...');
        await this.client.initialize();
    }
    
    async stop() {
        console.log('⏹️ Deteniendo bot...');
        
        // Detener auto-reparación
        if (this.repairIntervalId) {
            clearInterval(this.repairIntervalId);
            console.log('✅ Auto-reparación detenida');
        }
        
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            console.log('✅ Monitoreo detenido');
        }
        
        try {
            await this.client.destroy();
            console.log('✅ Cliente destruido');
        } catch (e) {
            console.warn('⚠️ Error destruyendo cliente:', e.message);
        }
        
        try {
            await closeImageBrowser();
            console.log('✅ Navegador cerrado');
        } catch (e) {
            console.warn('⚠️ Error cerrando navegador:', e.message);
        }
        
        console.log('✅ Bot detenido');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                                INICIO
// ═══════════════════════════════════════════════════════════════════════════

console.log(`
═══════════════════════════════════════════════════════════════════
     ____    _    ____  __  __ _______  __
    / ___|  / \\  / ___||  \\/  | ____\\ \\/ /
    \\___ \\ / _ \\ \\___ \\| |\\/| |  _|  \\  / 
     ___) / ___ \\ ___) | |  | | |___ /  \\ 
    |____/_/   \\_\\____/|_|  |_|_____/_/\\_\\
    
      Bot de Alertas Sísmicas - WHATSAPP
              ✅ Versión 1.0
═══════════════════════════════════════════════════════════════════
`);

let bot = null;

// 🛡️ MANEJO DE ERRORES GLOBALES ULTRA ROBUSTO
process.on('uncaughtException', (err) => {
    console.error('❌ ERROR CRÍTICO NO CAPTURADO:', err.message);
    console.error('Stack:', err.stack);
    logToFile('CRITICAL', `Uncaught Exception: ${err.message}\n${err.stack}`);
    
    // NO DETENER EL BOT - Solo registrar
    console.log('🛡️ Bot continúa ejecutándose...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESA RECHAZADA NO MANEJADA:', reason);
    logToFile('CRITICAL', `Unhandled Rejection: ${reason}\nPromise: ${util.inspect(promise)}`);
    
    // NO DETENER EL BOT - Solo registrar
    console.log('🛡️ Bot continúa ejecutándose...');
});

process.on('warning', (warning) => {
    console.warn('⚠️ Advertencia:', warning.name, warning.message);
    logToFile('WARNING', `${warning.name}: ${warning.message}`);
});

process.on('error', (err) => {
    console.error('❌ Error de proceso:', err.message);
    logToFile('ERROR', `Process Error: ${err.message}`);
});

// Manejo de cierre
async function gracefulShutdown(signal) {
    console.log(`\n⏹️ ${signal} recibido...`);
    
    if (bot) {
        await bot.stop().catch(err => {
            console.error('❌ Error deteniendo bot:', err.message);
        });
    } else {
        await closeImageBrowser().catch(err => {
            console.error('❌ Error cerrando navegador:', err.message);
        });
    }
    
    console.log('👋 ¡Adiós!');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 🚀 SISTEMA DE INICIO CON AUTO-RECUPERACIÓN INFINITA
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

async function initBot() {
    try {
        console.log('🤖 Iniciando bot SASMEX...');
        bot = new SasmexWhatsAppBot();
        await bot.start();
        console.log('✅ Bot iniciado exitosamente');
        initAttempts = 0; // Resetear contador
    } catch (error) {
        initAttempts++;
        console.error(`❌ Error iniciando bot (intento ${initAttempts}/${MAX_INIT_ATTEMPTS}):`, error.message);
        logToFile('ERROR', `Init Error (${initAttempts}/${MAX_INIT_ATTEMPTS}): ${error.message}\n${error.stack}`);
        
        if (initAttempts < MAX_INIT_ATTEMPTS) {
            const retryDelay = Math.min(5000 * initAttempts, 30000);
            console.log(`🔄 Reintentando en ${retryDelay/1000} segundos...`);
            setTimeout(() => initBot(), retryDelay);
        } else {
            console.error('💀 Máximo de intentos alcanzado. Reiniciando en 60 segundos...');
            setTimeout(() => {
                initAttempts = 0;
                initBot();
            }, 60000);
        }
    }
}

// Iniciar bot
initBot();

// Monitor de salud cada minuto
setInterval(() => {
    if (bot && !bot.isReady) {
        console.log('⚠️ Bot no está listo. Verificando estado...');
        logToFile('WARNING', 'Bot not ready - monitoring');
    }
}, 60000);