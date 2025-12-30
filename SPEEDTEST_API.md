# Especificación del Endpoint de Speedtest

## Endpoint GET

**URL:** `GET /speedtest/stats`

**Autenticación:** Requerida (Bearer Token)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Respuesta Exitosa (200 OK)

El endpoint debe devolver un objeto JSON con la siguiente estructura:

```json
{
  "latest": {
    "id": "string",
    "downloadSpeed": 100.5,
    "uploadSpeed": 50.2,
    "ping": 15.3,
    "timestamp": "2024-01-15T10:30:00Z",
    "server": "Servidor Madrid",
    "location": "Madrid, España"
  },
  "average": {
    "downloadSpeed": 95.8,
    "uploadSpeed": 48.5,
    "ping": 18.2
  },
  "history": [
    {
      "id": "string",
      "downloadSpeed": 100.5,
      "uploadSpeed": 50.2,
      "ping": 15.3,
      "timestamp": "2024-01-15T10:30:00Z",
      "server": "Servidor Madrid",
      "location": "Madrid, España"
    },
    {
      "id": "string",
      "downloadSpeed": 98.3,
      "uploadSpeed": 49.1,
      "ping": 16.7,
      "timestamp": "2024-01-14T09:15:00Z",
      "server": "Servidor Madrid",
      "location": "Madrid, España"
    }
  ],
  "totalTests": 25
}
```

## Campos Requeridos

### Objeto Principal
- `latest` (opcional): Objeto con la última prueba realizada
- `average` (opcional): Objeto con promedios calculados
- `history` (opcional): Array con historial de pruebas (ordenado por fecha, más reciente primero)
- `totalTests` (opcional): Número total de pruebas realizadas

### Objeto SpeedtestResult
- `id` (requerido): Identificador único de la prueba
- `downloadSpeed` (requerido): Velocidad de descarga en **Mbps** (número decimal)
- `uploadSpeed` (requerido): Velocidad de subida en **Mbps** (número decimal)
- `ping` (requerido): Latencia en **milisegundos** (número decimal)
- `timestamp` (requerido): Fecha y hora en formato ISO 8601 (ej: "2024-01-15T10:30:00Z")
- `server` (opcional): Nombre del servidor utilizado
- `location` (opcional): Ubicación del servidor

### Objeto Average
- `downloadSpeed` (requerido): Promedio de velocidad de descarga en **Mbps**
- `uploadSpeed` (requerido): Promedio de velocidad de subida en **Mbps**
- `ping` (requerido): Promedio de latencia en **milisegundos**

## Notas Importantes

1. **Unidades:**
   - Velocidades: **Mbps** (Megabits por segundo)
   - Ping: **ms** (milisegundos)

2. **Formato de Fecha:**
   - Debe ser ISO 8601: `YYYY-MM-DDTHH:mm:ssZ` o `YYYY-MM-DDTHH:mm:ss.sssZ`
   - Ejemplo: `"2024-01-15T10:30:00Z"`

3. **Campos Opcionales:**
   - Si no hay datos, se puede devolver un objeto vacío `{}` o con los campos opcionales omitidos
   - La app manejará correctamente la ausencia de datos

4. **Historial:**
   - El array `history` debe estar ordenado por fecha (más reciente primero)
   - Se recomienda limitar a los últimos 10-20 resultados para evitar respuestas muy grandes

## Ejemplo de Respuesta Mínima

Si no hay datos disponibles, se puede devolver:

```json
{}
```

O con algunos campos:

```json
{
  "latest": {
    "id": "1",
    "downloadSpeed": 100.5,
    "uploadSpeed": 50.2,
    "ping": 15.3,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Manejo de Errores

- **401 Unauthorized**: Token inválido o expirado
- **500 Internal Server Error**: Error del servidor

La app manejará estos errores y mostrará un estado vacío si no hay datos disponibles.

