# Guía de Configuración

## Configuración Inicial

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar la URL de la API:**

Edita `app.json` y actualiza la sección `extra`:
```json
"extra": {
  "apiUrl": "http://TU_IP_LOCAL:3000",
  "monthlyBudget": 1000
}
```

**Importante:** Si estás probando en un dispositivo físico, reemplaza `localhost` con la IP de tu computadora en la misma red WiFi.

Para encontrar tu IP:
- **macOS/Linux:** `ifconfig | grep "inet "`
- **Windows:** `ipconfig`

Ejemplo: `http://192.168.1.100:3000`

3. **Para producción:**

Usa EAS Secrets para configurar variables de entorno:
```bash
eas secret:create --scope project --name API_URL --value https://tu-api.com
eas secret:create --scope project --name MONTHLY_BUDGET --value 1000
```

Luego actualiza `src/config/env.ts` para leer de EAS Secrets si es necesario.

## Assets Requeridos

Antes de publicar, necesitas agregar los siguientes archivos en la carpeta `assets/`:

- `icon.png` (1024x1024px)
- `splash.png` (1284x2778px)
- `adaptive-icon.png` (1024x1024px)
- `favicon.png` (48x48px)

Ver `assets/README.md` para más detalles.

## Pruebas Locales

1. Asegúrate de que tu servidor backend esté corriendo en `http://localhost:3000`
2. Inicia Expo:
```bash
npm start
```
3. Escanea el QR con Expo Go o presiona `i` para iOS / `a` para Android

## Publicación en App Store

1. **Configura EAS:**
```bash
npm install -g eas-cli
eas login
eas build:configure
```

2. **Actualiza el projectId en app.json:**
Después de `eas build:configure`, se generará un projectId. Actualízalo en `app.json`.

3. **Construye para iOS:**
```bash
eas build --platform ios
```

4. **Envía a App Store:**
```bash
eas submit --platform ios
```

## Notas sobre Notificaciones

- Las notificaciones requieren permisos del usuario
- Se programa una notificación diaria a las 20:00
- Para notificaciones push en producción, necesitarás configurar Expo Push Notification service

