# Factorial Gastos - React Native App

Una aplicación móvil desarrollada con React Native y Expo para gestionar y visualizar tus gastos mensuales.

## Características

- 📊 Visualización de gastos mensuales
- 💰 Seguimiento del saldo restante del mes
- 📱 Notificaciones push
- 🎨 Interfaz moderna y fácil de usar
- 📅 Selector de mes/año
- 🔄 Pull to refresh

## Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- Cuenta de Expo (para publicar en App Store)

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura la URL de la API en `app.json`:
```json
"extra": {
  "apiUrl": "http://localhost:3000",
  "monthlyBudget": 1000
}
```

Para producción, usa EAS Secrets o variables de entorno.

## Desarrollo

Inicia el servidor de desarrollo:
```bash
npm start
```

Luego escanea el código QR con la app Expo Go en tu dispositivo móvil, o presiona:
- `i` para iOS Simulator
- `a` para Android Emulator

## Construcción para App Store

### iOS

1. Instala EAS CLI:
```bash
npm install -g eas-cli
```

2. Inicia sesión en Expo:
```bash
eas login
```

3. Configura el proyecto:
```bash
eas build:configure
```

4. Construye para iOS:
```bash
eas build --platform ios
```

5. Una vez completada la construcción, envía a App Store:
```bash
eas submit --platform ios
```

### Android

1. Construye para Android:
```bash
eas build --platform android
```

2. Envía a Google Play Store:
```bash
eas submit --platform android
```

## Configuración de Notificaciones

La app está configurada para enviar notificaciones diarias a las 20:00. Las notificaciones requieren permisos del usuario.

## Estructura del Proyecto

```
├── App.tsx                 # Componente principal
├── src/
│   ├── components/         # Componentes reutilizables
│   │   ├── BalanceCard.tsx
│   │   ├── ExpenseItem.tsx
│   │   ├── ExpensesList.tsx
│   │   └── MonthSelector.tsx
│   ├── services/           # Servicios (API, notificaciones)
│   │   ├── api.ts
│   │   └── notifications.ts
│   ├── types/              # Definiciones de tipos TypeScript
│   │   └── index.ts
│   └── config/             # Configuración
│       └── env.ts
└── app.json                # Configuración de Expo
```

## Variables de Entorno

Para producción, configura las siguientes variables usando EAS Secrets:

- `API_URL`: URL de tu API backend
- `MONTHLY_BUDGET`: Presupuesto mensual por defecto

## Licencia

MIT

