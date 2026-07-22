# Guía de configuración para Render + Supabase

## 1. Variables obligatorias

En Render, agrega estas variables de entorno al servicio web:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_BASE_DOMAIN=tu-dominio.com
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset
```

Importante:
- Todas las variables expuestas al cliente deben empezar con `VITE_`.
- `VITE_BASE_DOMAIN` se usa para detectar subdominios y resolver el tenant correcto.

## 2. Reglas de desplegar en Render

- Build Command: `npm run build`
- Publish Directory: `dist`
- SPA fallback: la app ya incluye el archivo `_redirects` con `/* /index.html 200` para evitar 404 al recargar rutas.

## 3. Verificación tras deploy

1. Abre la app en el dominio asignado por Render.
2. Confirma que la consola del navegador no muestre errores de variables faltantes.
3. Si cambias `VITE_*`, ejecuta un redeploy manual para evitar caché stale.

## 4. Seguridad

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son variables de cliente y se exponen en el bundle.
- No guardes secretos de administración en el frontend.
- Mantén la política de acceso de Supabase en RLS.

## 5. Referencias útiles

- Vite env vars: https://vite.dev/guide/env-and-mode
- Render environment variables: https://render.com/docs/environment-variables
- Supabase auth / API keys: https://supabase.com/dashboard/project/_/settings/api
