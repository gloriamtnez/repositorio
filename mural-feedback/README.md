# Mural de feedback — Liderazgo y empoderamiento

Aplicación web estática para recoger un máximo de tres palabras por participante y mostrarlas en un mural floral. Las palabras más repetidas aparecen con mayor tamaño.

## Probar en local

Sirve esta carpeta con cualquier servidor estático. Sin Firebase, la aplicación entra en modo demostración y comparte respuestas únicamente entre pestañas del mismo navegador mediante `localStorage`.

## Conectar Firebase

1. Crea un proyecto en Firebase y registra una aplicación web.
2. Activa **Authentication > Sign-in method > Anonymous**.
3. Crea una base de datos Cloud Firestore.
4. Copia los valores públicos de configuración en `firebase-config.js`.
5. Publica las reglas incluidas en `firestore.rules`.

No incluyas claves de servidor, cuentas de servicio ni secretos en este repositorio. La configuración del SDK web no sustituye a las reglas de seguridad.

## Integrar los logos originales

Crea la carpeta `assets` y coloca, sin rediseñarlos:

- `assets/logo-principal.svg`: logotipo de cabecera.
- `assets/flor-borde-amarillo.svg`: flor que estructura el mural.
- `assets/logo-secundario.svg`: firma opcional del pie.

Si la flor original todavía no está disponible, se muestra una flor vectorial amarilla de reserva. Al añadir `flor-borde-amarillo.svg`, la aplicación sustituye automáticamente esa reserva.

## Publicar en GitHub Pages

Puedes colocar estos archivos en la raíz de un repositorio o en una carpeta `/docs`. En GitHub, abre **Settings > Pages**, selecciona la rama y la carpeta de publicación. La URL del mural proyectado puede compartirse añadiendo `?view=mural`.

## Crear otra sesión

Cambia `window.MURAL_SESSION_ID` en `firebase-config.js`. Cada valor genera un mural independiente dentro del mismo proyecto de Firebase.
