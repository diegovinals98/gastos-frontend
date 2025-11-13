# Factorial Gastos - Web App

Aplicación web para gestionar y visualizar gastos mensuales con presupuesto.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Build para Producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

### Preview del Build

```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
web-app/
├── src/
│   ├── components/          # Componentes React
│   │   ├── BalanceCard.tsx  # Card de balance y estadísticas
│   │   ├── ExpensesList.tsx # Lista de gastos
│   │   ├── ExpenseItem.tsx  # Item individual de gasto
│   │   └── MonthSelector.tsx # Selector de mes
│   ├── services/            # Servicios API
│   │   └── api.ts          # Funciones para llamadas API
│   ├── config/             # Configuración
│   │   └── env.ts          # Variables de entorno
│   ├── types/               # TypeScript types
│   │   └── index.ts        # Interfaces y tipos
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── package.json
├── vite.config.ts          # Configuración de Vite
└── tsconfig.json           # Configuración TypeScript
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=https://gastos-rs.sofiaydiego.net
```

Para desarrollo local:
```env
VITE_API_URL=http://localhost:3000
```

## 📱 Funcionalidades

- ✅ Visualización de gastos por mes
- ✅ Navegación entre meses (prev/next)
- ✅ Card de balance con saldo restante
- ✅ Estadísticas: gastado, presupuesto, % usado
- ✅ Barra de progreso visual con colores
- ✅ Lista de gastos con detalles
- ✅ Loading states y skeletons
- ✅ Botón de refresh manual
- ✅ Diseño responsive

## 🎨 Características

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilos**: CSS Modules
- **Formato de Fechas**: date-fns
- **Diseño**: Responsive, mobile-first

## 📡 API Endpoints

- `GET /gastos?month={month}&year={year}` - Obtener gastos del mes

## 🆚 Diferencias con la App Móvil

- ❌ Sin notificaciones push (solo web)
- ❌ Sin registro de tokens
- ✅ Mismo diseño y funcionalidad
- ✅ Misma lógica de negocio
- ✅ Mismos componentes (adaptados a web)

## 📝 Notas

- El presupuesto mensual está configurado en `src/config/env.ts` (200€ por defecto)
- Los meses futuros están bloqueados
- La app se adapta automáticamente a diferentes tamaños de pantalla

