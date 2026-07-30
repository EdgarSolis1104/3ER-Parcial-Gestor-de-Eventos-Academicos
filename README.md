# Gestor de Eventos Académicos

Aplicación web para gestionar eventos académicos con sincronización a Google Calendar y exportación a Google Sheets.

## Cómo correrlo localmente
1. Clona este repositorio
2. Copia `config.example.js` como `config.js` y coloca tu Client ID de OAuth
3. Abre `index.html` con la extensión Live Server de VS Code
4. No requiere instalación de dependencias (no hay build tools)

## Stack
HTML, CSS, JavaScript (vanilla) — sin frameworks ni backend.

## Despliegue
La app se despliega automáticamente en GitHub Pages desde la rama `main`.

## Documentación del Proyecto (QA)

En los siguientes enlaces puedes encontrar los documentos base para el aseguramiento de calidad y uso del sistema:

* **Plan de Pruebas y Plantilla de Casos de Prueba**
https://docs.google.com/document/d/1IQW_wL57jYVwP71yvNogxjZ_7QA6GQdW9LFqO2D_aM0/edit?usp=sharing

* **Borrador del Manual de Usuario**
https://docs.google.com/document/d/1U5mmOHD_QJw3-36TGX9YQYdRsfkiBuQEjK4TmqOyqhk/edit?usp=sharing

---

## Restricciones Técnicas Importantes

Por favor, todo el equipo de desarrollo debe tener en cuenta las siguientes restricciones establecidas en el PRD:

1. **Límite de usuarios:** La pantalla de consentimiento de OAuth se usará en modo de prueba, lo que limitará el acceso a un máximo de 100 usuarios.

2. **Seguridad de Credenciales (¡IMPORTANTE!):** Las credenciales de OAuth y las API keys **NO deben subirse a este repositorio público** bajo ninguna circunstancia. Utilicen variables de entorno o GitHub Secrets.

3. **Facturación:** El proyecto no requiere cuenta de facturación de Google Cloud, ya que las APIs de Calendar, Sheets y OAuth operan en la capa gratuita sin necesidad de ingresar tarjeta.