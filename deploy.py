#!/usr/bin/env python3
"""
Deploy Automático a Heroku
Ejecutar: python3 deploy.py
"""

import os
import subprocess
import sys
import json
from pathlib import Path

class HerokuDeployer:
    def __init__(self):
        self.project_dir = Path(__file__).parent
        self.app_name = "sasmex-bot-2026"
        self.admin_number = ""
        
    def run_command(self, cmd, check=True):
        """Ejecutar comando en terminal"""
        print(f"\n🔧 Ejecutando: {cmd}")
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.project_dir,
                check=check
            )
            if result.stdout:
                print(f"✅ {result.stdout}")
            if result.stderr and check:
                print(f"⚠️  {result.stderr}")
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            print(f"❌ Error: {e}")
            return False, "", str(e)
    
    def print_header(self, text):
        """Imprimir encabezado"""
        print("\n" + "="*60)
        print(f"  {text}")
        print("="*60)
    
    def check_requirements(self):
        """Verificar que Heroku CLI esté instalado"""
        self.print_header("1️⃣ Verificando requisitos")
        
        # Verificar heroku CLI
        success, _, _ = self.run_command("heroku --version", check=False)
        if not success:
            print("❌ Heroku CLI no está instalado")
            print("📥 Descárgalo desde: https://devcenter.heroku.com/articles/heroku-cli")
            return False
        
        print("✅ Heroku CLI instalado")
        
        # Verificar git
        success, _, _ = self.run_command("git --version", check=False)
        if not success:
            print("❌ Git no está instalado")
            return False
        
        print("✅ Git instalado")
        return True
    
    def setup_git(self):
        """Configurar Git"""
        self.print_header("2️⃣ Configurando Git")
        
        # Inicializar Git
        if not (self.project_dir / ".git").exists():
            print("📝 Inicializando repositorio Git...")
            self.run_command("git init")
            self.run_command('git config user.email "bot@sasmex.local"')
            self.run_command('git config user.name "SASMEX Bot"')
        else:
            print("✅ Repositorio Git ya existe")
        
        # Agregar archivos
        print("📦 Agregando archivos...")
        self.run_command("git add .")
        
        # Verificar si hay cambios
        success, stdout, _ = self.run_command("git status --porcelain", check=False)
        if stdout.strip():
            print("💾 Haciendo commit...")
            self.run_command('git commit -m "Deploy a Heroku - SASMEX Bot v1.0"')
        else:
            print("ℹ️  No hay cambios pendientes")
        
        return True
    
    def login_heroku(self):
        """Login en Heroku"""
        self.print_header("3️⃣ Verificando login en Heroku")
        
        # Verificar si está logeado
        success, stdout, _ = self.run_command("heroku auth:whoami", check=False)
        
        if success:
            print(f"✅ Ya estás logeado como: {stdout.strip()}")
            return True
        else:
            print("⚠️  No estás logeado en Heroku")
            print("📌 Abre tu navegador para hacer login:")
            print("   Sigue las instrucciones que aparecerán")
            
            success, _, _ = self.run_command("heroku login", check=False)
            return success
    
    def get_app_name(self):
        """Obtener o crear nombre de app"""
        self.print_header("4️⃣ Configurando nombre de aplicación")
        
        # Verificar si ya existe remote
        success, stdout, _ = self.run_command(
            "git config --get remote.heroku.url",
            check=False
        )
        
        if success and stdout.strip():
            # Extraer nombre de app del URL
            self.app_name = stdout.strip().split("/")[-1].replace(".git", "")
            print(f"✅ App existente encontrada: {self.app_name}")
            return True
        
        # Pedir nombre
        print(f"\nNombre sugerido: {self.app_name}")
        user_input = input("¿Usar este nombre? (s/n): ").strip().lower()
        
        if user_input == "n":
            self.app_name = input("Escribe el nombre de la app: ").strip()
        
        if not self.app_name:
            print("❌ Nombre de app requerido")
            return False
        
        # Crear app en Heroku
        print(f"\n🚀 Creando app en Heroku: {self.app_name}")
        success, _, stderr = self.run_command(
            f"heroku create {self.app_name}",
            check=False
        )
        
        if not success:
            if "already exists" in stderr or "is already taken" in stderr:
                print(f"⚠️  App '{self.app_name}' ya existe")
                print("📌 Conectando a app existente...")
                self.run_command(f"heroku git:remote -a {self.app_name}")
            else:
                print(f"❌ Error creando app: {stderr}")
                return False
        else:
            print(f"✅ App '{self.app_name}' creada")
        
        return True
    
    def get_admin_number(self):
        """Obtener número de administrador"""
        self.print_header("5️⃣ Configurando número de administrador")
        
        print("Formato: 5215512345678 (sin + ni espacios)")
        print("Ej: México: 525512345678, Colombia: 573012345678")
        
        self.admin_number = input("\n¿Tu número de WhatsApp?: ").strip()
        
        if not self.admin_number or not self.admin_number.isdigit():
            print("❌ Número inválido")
            return False
        
        if len(self.admin_number) < 10:
            print("❌ Número muy corto (mínimo 10 dígitos)")
            return False
        
        print(f"✅ Número configurado: {self.admin_number}")
        return True
    
    def set_config_vars(self):
        """Configurar variables de entorno"""
        self.print_header("6️⃣ Configurando variables de entorno")
        
        print(f"⚙️ Configurando ADMIN_NUMBER={self.admin_number}")
        self.run_command(
            f'heroku config:set ADMIN_NUMBER={self.admin_number} -a {self.app_name}'
        )
        
        print("⚙️ Configurando NODE_ENV=production")
        self.run_command(
            f'heroku config:set NODE_ENV=production -a {self.app_name}'
        )
        
        # Mostrar configuración
        print("\n📋 Configuración actual:")
        self.run_command(f"heroku config -a {self.app_name}")
        
        return True
    
    def setup_docker(self):
        """Configurar stack Docker"""
        self.print_header("7️⃣ Configurando Docker")
        
        print("🐳 Cambiando a stack container...")
        success, _, stderr = self.run_command(
            f"heroku stack:set container -a {self.app_name}",
            check=False
        )
        
        if not success and "error" in stderr.lower():
            print(f"⚠️  {stderr}")
        else:
            print("✅ Stack Docker configurado")
        
        return True
    
    def deploy(self):
        """Hacer deploy a Heroku"""
        self.print_header("8️⃣ Desplegando código a Heroku")
        
        print("📤 Enviando código a Heroku...")
        print("   (Esto puede tardar 3-5 minutos)")
        print("   Espera mientras se construye la imagen Docker...")
        
        success, stdout, stderr = self.run_command(
            "git push heroku main",
            check=False
        )
        
        if not success:
            # Intentar con master
            if "no refspec matches" in stderr or "no matching" in stderr:
                print("💡 Intentando con rama 'master'...")
                success, stdout, stderr = self.run_command(
                    "git push heroku master",
                    check=False
                )
        
        if success:
            print("✅ Deploy completado")
            return True
        else:
            print(f"❌ Error en deploy: {stderr}")
            return False
    
    def show_logs(self):
        """Mostrar logs iniciales"""
        self.print_header("9️⃣ Mostrando logs")
        
        print("📊 Últimos 30 logs:")
        self.run_command(f"heroku logs --lines 30 -a {self.app_name}", check=False)
        
        print("\n💡 Para seguir los logs en tiempo real, usa:")
        print(f"   heroku logs --tail -a {self.app_name}")
        
        return True
    
    def final_instructions(self):
        """Mostrar instrucciones finales"""
        self.print_header("🎯 DEPLOY COMPLETADO")
        
        print(f"""
✅ Tu bot está en Heroku
   App: {self.app_name}
   URL: https://{self.app_name}.herokuapp.com

📱 PRÓXIMOS PASOS:

   1. ESCANEAR QR
      • Abre WhatsApp en tu teléfono
      • Busca el código QR en los logs
      • Escanéalo rápidamente (expira en 30 segundos)
      
      Ver QR: heroku logs --tail -a {self.app_name}

   2. PROBAR EL BOT
      Desde WhatsApp envía:
      • !menu   - Ver comandos
      • !test   - Verificar que funciona
      • !start  - Suscribirse

   3. MONITOREAR
      Ver logs: heroku logs --tail -a {self.app_name}
      Reiniciar: heroku dyno:restart -a {self.app_name}

📞 OBTENER NÚMERO DEL BOT
   El número aparecerá cuando se conecte a WhatsApp
   
   Ver en logs: heroku logs --lines 100 -a {self.app_name}

🔗 RECURSOS ÚTILES
   • Dashboard: https://dashboard.heroku.com/apps/{self.app_name}
   • Documentación: https://devcenter.heroku.com/
   • Soporte Heroku: https://help.heroku.com/

""")
    
    def run(self):
        """Ejecutar deploy completo"""
        print("\n" + "="*60)
        print("  🚀 DEPLOYER AUTOMÁTICO - BOT SASMEX")
        print("="*60)
        
        steps = [
            ("Verificar requisitos", self.check_requirements),
            ("Configurar Git", self.setup_git),
            ("Login Heroku", self.login_heroku),
            ("Nombre de app", self.get_app_name),
            ("Número de admin", self.get_admin_number),
            ("Configurar variables", self.set_config_vars),
            ("Setup Docker", self.setup_docker),
            ("Deploy a Heroku", self.deploy),
            ("Mostrar logs", self.show_logs),
        ]
        
        for step_name, step_func in steps:
            print(f"\n▶️ {step_name}...")
            try:
                if not step_func():
                    print(f"❌ Error en: {step_name}")
                    sys.exit(1)
            except KeyboardInterrupt:
                print("\n⚠️ Cancelado por el usuario")
                sys.exit(1)
            except Exception as e:
                print(f"❌ Excepción: {e}")
                sys.exit(1)
        
        self.final_instructions()

if __name__ == "__main__":
    deployer = HerokuDeployer()
    deployer.run()
