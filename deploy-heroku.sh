#!/bin/bash

# ============================================
# Script de Despliegue a Heroku
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║        🚀 DESPLIEGUE DE BOT SASMEX A HEROKU          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar si está en Heroku
info "Paso 1: Verificando requisitos..."
echo ""

# Verificar heroku CLI
if ! command -v heroku &> /dev/null; then
    error "Heroku CLI no está instalado"
    echo "Descárgalo desde: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi
success "Heroku CLI instalado"

# Verificar git
if ! command -v git &> /dev/null; then
    error "Git no está instalado"
    exit 1
fi
success "Git instalado"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
    exit 1
fi
success "Node.js instalado"

# Verificar login en Heroku
if ! heroku auth:whoami &> /dev/null; then
    warn "No estás logeado en Heroku"
    info "Abriendo login..."
    heroku login
    if [ $? -ne 0 ]; then
        error "Fallo al hacer login en Heroku"
        exit 1
    fi
fi
success "Autenticado en Heroku"

echo ""
info "Paso 2: Preparando repositorio Git..."
echo ""

# Verificar si git está inicializado
if [ ! -d ".git" ]; then
    warn "Repositorio Git no encontrado, inicializando..."
    git init
    git config user.email "bot@sasmex.local"
    git config user.name "SASMEX Bot"
    success "Repositorio Git inicializado"
else
    success "Repositorio Git existe"
fi

# Verificar cambios pendientes
if [ -z "$(git status --porcelain)" ]; then
    info "No hay cambios pendientes"
else
    info "Hay cambios pendientes, staging..."
    git add .
    git commit -m "Deploy a Heroku - $(date)" || true
fi

echo ""
info "Paso 3: Verificando configuración..."
echo ""

# Leer nombre de la app
if [ -f ".git/config" ]; then
    APP_NAME=$(grep "heroku.com" .git/config | sed 's/.*heroku.com:apps\/\(.*\)\.git.*/\1/' | head -1)
fi

if [ -z "$APP_NAME" ]; then
    echo "¿Nombre de la aplicación en Heroku? (ej: sasmex-bot)"
    read -p "> " APP_NAME
    
    if [ -z "$APP_NAME" ]; then
        error "Nombre de aplicación requerido"
        exit 1
    fi
    
    # Crear aplicación
    info "Creando aplicación Heroku: $APP_NAME..."
    heroku create "$APP_NAME"
    
    if [ $? -ne 0 ]; then
        error "No se pudo crear la aplicación en Heroku"
        exit 1
    fi
    success "Aplicación creada: $APP_NAME"
fi

echo ""
info "Paso 4: Configurando variables de entorno..."
echo ""

# Pedir número de admin
echo "¿Número de administrador? (formato: 5215512345678)"
read -p "> " ADMIN_NUMBER

if [ -z "$ADMIN_NUMBER" ]; then
    error "Número de administrador requerido"
    exit 1
fi

# Establecer variables
heroku config:set ADMIN_NUMBER="$ADMIN_NUMBER" --app="$APP_NAME"
success "ADMIN_NUMBER configurado"

# Mostrar configuración
echo ""
info "Configuración actual:"
heroku config --app="$APP_NAME" | head -5

echo ""
info "Paso 5: Usando Docker para despliegue..."
echo ""

# Cambiar a container stack
warn "Cambiando a Docker stack..."
heroku stack:set container --app="$APP_NAME"
success "Stack actualizado a container"

echo ""
info "Paso 6: Desplegando código..."
echo ""

# Desplegar
git push heroku main

if [ $? -eq 0 ]; then
    success "Código desplegado exitosamente"
else
    warn "Intenta con: git push heroku main"
fi

echo ""
info "Paso 7: Esperando que se inicie el bot..."
sleep 5

echo ""
info "Paso 8: Monitoreando logs iniciales..."
echo ""

heroku logs --lines 20 --app="$APP_NAME"

echo ""
echo "════════════════════════════════════════════════════════"
success "¡DESPLIEGUE COMPLETADO!"
echo "════════════════════════════════════════════════════════"
echo ""

info "URL de la aplicación:"
echo "   https://${APP_NAME}.herokuapp.com"
echo ""

info "Próximos pasos:"
echo "   1. Escanea el QR con WhatsApp (ver logs)"
echo "   2. Envía !menu para ver comandos"
echo "   3. Envía !test para verificar el sistema"
echo ""

info "Monitoreo:"
echo "   Logs en tiempo real:"
echo "   heroku logs --tail --app=$APP_NAME"
echo ""
echo "   Ver solo errores:"
echo "   heroku logs --grep ERROR --tail --app=$APP_NAME"
echo ""

info "Datos útiles:"
echo "   Ver configuración: heroku config --app=$APP_NAME"
echo "   Reiniciar bot:     heroku dyno:restart --app=$APP_NAME"
echo "   Ver procesos:      heroku ps --app=$APP_NAME"
echo ""

warn "Nota: El QR aparecerá en los logs la primera vez"
warn "      Escanéalo rápidamente antes de que expire (30 segundos)"
echo ""
