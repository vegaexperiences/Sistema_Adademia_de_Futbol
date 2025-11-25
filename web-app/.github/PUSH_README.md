# 🔐 Autenticación para Push a GitHub

El repositorio pertenece a la cuenta `vegaexperiences`, pero Git está configurado con la cuenta `javidavo05`.

## ✅ Solución Rápida

**Opción más simple:** Usa un Personal Access Token de la cuenta `vegaexperiences`

### Pasos:

1. **Obtén un Personal Access Token:**
   - Ve a: https://github.com/settings/tokens (inicia sesión con la cuenta `vegaexperiences`)
   - Click en "Generate new token (classic)"
   - Nombre: "Sistema Futbol"
   - Scope: Marca `repo`
   - Click "Generate token"
   - **COPIA EL TOKEN** (empieza con `ghp_...`)

2. **Haz push con el token:**
   ```bash
   cd "/Users/javiervallejo/Documents/Websites/Sistema de control de Futbol/web-app"
   
   # Usa el token como password cuando te lo pida:
   git push origin dev
   
   # O directamente con el token en la URL:
   git push https://TU_TOKEN_AQUI@github.com/vegaexperiences/Sistema_Adademia_de_Futbol.git dev
   ```

## 📝 Estado Actual

- ✅ Todos los cambios están commiteados localmente
- ✅ Commit: `67c11e9 feat: Migración de Resend a Brevo y mejoras de seguridad`
- ⏳ Solo falta hacer push (requiere autenticación)

## 🔄 Alternativa: GitHub CLI

Si prefieres usar GitHub CLI:

```bash
# Instalar GitHub CLI (si no lo tienes)
brew install gh

# Autenticarse con la cuenta correcta
gh auth login

# Selecciona "vegaexperiences" cuando te lo pida
# Luego simplemente:
git push origin dev
```

---

**Nota:** Una vez que hagas el primer push con credenciales válidas, Git guardará las credenciales (gracias a `credential.helper=store`) y no tendrás que ingresarlas de nuevo.

