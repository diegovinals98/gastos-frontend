# Solución de Problemas

## Error: EMFILE: too many open files

Este error ocurre cuando el sistema alcanza el límite de archivos que puede monitorear. Aquí hay varias soluciones:

### Solución 1: Instalar Watchman (Recomendado)

Watchman es una herramienta de Facebook que mejora el monitoreo de archivos:

```bash
# Si tienes Homebrew:
brew install watchman

# O descarga desde:
# https://facebook.github.io/watchman/docs/install
```

Después de instalar Watchman, reinicia el servidor:
```bash
npm run clean
npm start
```

### Solución 2: Aumentar el límite del sistema (macOS)

Agrega esto a tu `~/.zshrc` o `~/.bash_profile`:

```bash
# Aumentar límite de archivos abiertos
ulimit -n 4096
```

Luego reinicia la terminal o ejecuta:
```bash
source ~/.zshrc
```

### Solución 3: Limpiar caché y usar modo poll

Si Watchman no está disponible, puedes usar el modo polling de Metro:

1. Limpia la caché:
```bash
npm run clean
```

2. Inicia con polling (más lento pero más estable):
```bash
EXPO_NO_METRO_LAZY=1 npx expo start --clear
```

### Solución 4: Reducir archivos monitoreados

El archivo `.watchmanconfig` ya está configurado para ignorar directorios innecesarios. Asegúrate de que `node_modules` esté en `.gitignore`.

### Solución 5: Usar Expo Go en lugar de desarrollo local

Si el problema persiste, puedes usar Expo Go directamente sin el bundler local:
```bash
npx expo start --tunnel
```

## Otros problemas comunes

### Error de conexión con la API

Si estás probando en un dispositivo físico, asegúrate de:
1. Usar la IP de tu computadora en lugar de `localhost`
2. Que el dispositivo y la computadora estén en la misma red WiFi
3. Que el firewall no esté bloqueando el puerto 3000

### Notificaciones no funcionan

1. Verifica que hayas dado permisos en la configuración del dispositivo
2. En iOS, las notificaciones solo funcionan en dispositivos físicos (no en simulador)
3. Revisa los logs de la consola para ver errores

