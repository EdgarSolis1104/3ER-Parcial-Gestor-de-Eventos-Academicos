# Documentación: Integración con Google Calendar API

## Scope de OAuth necesario

```
https://www.googleapis.com/auth/calendar.events
```

Este scope permite **leer, crear, editar y eliminar eventos** de los calendarios
del usuario. No da acceso a cambiar la configuración general del calendario
(eso requeriría el scope más amplio `https://www.googleapis.com/auth/calendar`,
que **no** es necesario para este proyecto).

**Coordinación con Auth:** el módulo de Auth debe incluir este scope al armar
la URL de autorización de OAuth, junto con los scopes que ya use (login,
perfil, etc.), para que el `access_token` que genere sirva también para
Calendar.

## Endpoints usados

Base: `https://www.googleapis.com/calendar/v3/calendars/primary/events`

(`primary` = el calendario principal del usuario autenticado)

| Acción           | Método | URL                                  |
|-------------------|--------|---------------------------------------|
| Listar eventos    | GET    | `/events`                             |
| Crear evento      | POST   | `/events`                             |
| Editar evento     | PATCH  | `/events/{eventId}`                   |
| Eliminar evento   | DELETE | `/events/{eventId}`                   |

Todas las peticiones llevan el header:
```
Authorization: Bearer {access_token}
```

## Pruebas realizadas

- ✅ **Listar eventos (GET):** probado en el OAuth Playground de Google
  (equivalente directo a `fetch()`, misma petición HTTP). Respuesta `200 OK`.
- ✅ **Crear evento (POST):** se creó un evento de prueba real
  ("Evento de prueba") en un Google Calendar real. Respuesta `200 OK` con
  `"status": "confirmed"`.
- ✅ Código en JS con `fetch()` armado en `calendarApi.js`, sin backend
  intermedio: el token se manda directo desde el navegador en el header
  `Authorization`.

## Cuotas y limitaciones

- **Límite general del proyecto:** 1,000,000 solicitudes/día (configurable
  en Google Cloud Console, sección de cuotas de la API).
- **Límite por usuario:** ~500 solicitudes por cada 100 segundos, por
  usuario individual.
- Para el alcance de este proyecto escolar, estos límites no representan
  un riesgo real.
- El `access_token` obtenido vía OAuth **expira en 1 hora** (`expires_in: 3599`
  segundos). Para sesiones más largas se necesita usar el `refresh_token`
  para pedir un token nuevo sin que el usuario vuelva a iniciar sesión.

## Conclusión

Ambos criterios de aceptación del issue quedan cumplidos:

1. Se listó y creó un evento de prueba en un Google Calendar real usando
   `fetch()` (probado vía Playground, mismo comportamiento que en el
   navegador) con el token de acceso.
2. Queda documentado el scope de OAuth necesario para coordinarlo con el
   módulo de Auth.