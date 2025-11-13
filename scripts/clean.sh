#!/bin/bash

# Script para limpiar caché y resolver problemas de "too many open files"

echo "🧹 Limpiando caché de Expo..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .expo-shared

echo "🔄 Reiniciando Watchman (si está instalado)..."
watchman shutdown-server 2>/dev/null || echo "Watchman no está instalado"

echo "✅ Limpieza completada. Ahora ejecuta: npm start"

