# Instrucciones para hacer Push a GitHub

## Opción 1: Usar Personal Access Token (Recomendado)

1. **Crear un Personal Access Token en GitHub:**
   - Ve a: https://github.com/settings/tokens
   - Click en "Generate new token (classic)"
   - Nombra el token (ej: "Sistema Futbol")
   - Selecciona el scope `repo`
   - Click en "Generate token"
   - **Copia el token** (solo se muestra una vez)

2. **Hacer push con el token:**
   ```bash
   cd "/Users/javiervallejo/Documents/Websites/Sistema de control de Futbol/web-app"
   git push https://TU_TOKEN@github.com/vegaexperiences/Sistema_Adademia_de_Futbol.git dev
   ```
   
   Reemplaza `TU_TOKEN` con el token que obtuviste.

## Opción 2: Usar GitHub CLI

1. **Instalar GitHub CLI:**
   ```bash
   brew install gh
   ```

2. **Autenticarse:**
   ```bash
   gh auth login
   ```
   Selecciona la cuenta `vegaexperiences` cuando te lo solicite.

3. **Hacer push:**
   ```bash
   git push origin dev
   ```

## Opción 3: Configurar Credenciales para este Repositorio

1. **Configurar Git credential helper:**
   ```bash
   git config credential.helper store
   ```

2. **Intentar push (te pedirá credenciales):**
   ```bash
   git push origin dev
   ```
   
   Usuario: `vegaexperiences`
   Password: Tu Personal Access Token

## Opción 4: Usar SSH (Si tienes SSH key configurada)

1. **Cambiar remote a SSH:**
   ```bash
   git remote set-url origin git@github.com:vegaexperiences/Sistema_Adademia_de_Futbol.git
   ```

2. **Hacer push:**
   ```bash
   git push origin dev
   ```

## Verificar Estado Actual

El commit ya está hecho localmente:
```
67c11e9 feat: Migración de Resend a Brevo y mejoras de seguridad
```

Solo necesitas autenticarte para hacer el push.

