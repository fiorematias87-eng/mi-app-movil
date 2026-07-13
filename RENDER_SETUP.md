# Guía de Configuración para Render

## 📋 Pasos para desplegar en Render con Firebase

### 1. Obtener las claves de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** → **General**
4. Desplázate hacia abajo hasta **Tus apps**
5. Haz clic en tu app web para ver la configuración
6. Copia estos valores:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (opcional, encontrado en Google Analytics si está habilitado)

### 2. Configurar variables de entorno en Render

1. Ve a tu servicio en [Render Dashboard](https://dashboard.render.com)
2. Ve a la pestaña **Environment**
3. Haz clic en **Add Environment Variable**
4. Agrega cada variable con el prefijo `VITE_`:

```
VITE_FIREBASE_API_KEY = (valor de apiKey)
VITE_FIREBASE_AUTH_DOMAIN = (valor de authDomain)
VITE_FIREBASE_PROJECT_ID = (valor de projectId)
VITE_FIREBASE_STORAGE_BUCKET = (valor de storageBucket)
VITE_FIREBASE_MESSAGING_SENDER_ID = (valor de messagingSenderId)
VITE_FIREBASE_APP_ID = (valor de appId)
VITE_FIREBASE_MEASUREMENT_ID = (valor de measurementId)
VITE_CLOUDINARY_CLOUD_NAME = (tu cloud name)
VITE_CLOUDINARY_UPLOAD_PRESET = (tu upload preset)
```

⚠️ **IMPORTANTE**: Las variables **DEBEN** empezar con `VITE_` para que Vite las exporte al cliente.

### 3. Verificar que funciona

Después de hacer deploy:
1. Abre la consola del navegador (F12)
2. Deberías ver un mensaje verde: `✅ Inicializando Firebase con projectId: tu_project_id`
3. Si ves `🔴 ERROR: Faltan variables de entorno...`, revisa que todas las variables estén configuradas

### 4. Solucionar problemas comunes

#### "No se conecta a Firebase"
- [ ] Verifica que **todas** las variables comiencen con `VITE_`
- [ ] Confirma que los valores sean exactamente iguales a los de Firebase Console (sin espacios extra)
- [ ] Después de agregar variables, haz **redeploy** (no solo rebuild)

#### "Error 403 cuando subo imágenes"
- [ ] Verifica que Cloudinary tenga habilitada la política de carga sin autenticación
- [ ] Confirma `VITE_CLOUDINARY_UPLOAD_PRESET` sea correcto

#### "Las variables cambiaron pero la app usa las viejas"
- [ ] Render cachea las variables. Haz clic en el botón **Manual Deploy** o **Clear Cache & Redeploy**

### 5. Configuración local (opcional)

Para probar localmente con las mismas variables:
1. Crea un archivo `.env.local` en la raíz del proyecto
2. Copia el contenido de `.env.example` y reemplaza los valores
3. **NO** compritas `.env.local` en Git

```bash
cp .env.example .env.local
# Edita .env.local con tus valores
```

### 6. Verificación de seguridad

- ✅ Las variables de cliente (`VITE_*`) se exponen en el bundle. Es seguro.
- ✅ Firebase tiene reglas de seguridad que controlan el acceso a datos.
- ⚠️ **NO** guardes secretos sensibles (admin keys) como variables de cliente.

## 🔗 Referencias útiles

- [Documentación de Vite - Variables de Entorno](https://vitejs.dev/guide/env-and-mode)
- [Documentación de Render - Environment Variables](https://render.com/docs/environment-variables)
- [Firebase Console](https://console.firebase.google.com)
- [Configuración de Cloudinary](https://cloudinary.com/console)
