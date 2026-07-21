---
name: add-section
description: Add a new subject section to index.html (nav entry, section header, card grid, accent color, active-state wiring). Use when the user asks to add a new section or category to the portal.
---

Para añadir una nueva sección al `index.html`:

1. Crear carpeta `nombre-asignatura/` (sin espacios) si hay ≥2 ficheros de esa asignatura.
2. Añadir entrada `<a href="#id-seccion">...</a>` en `<nav class="subject-nav">`.
3. Añadir bloque `<div class="section-hdr" id="id-seccion">` + grid de tarjetas.
4. Si es categoría nueva, definir en el `<style>`: `.card-accent.X`, `.badge-X` y `.card-cta.X`
   (seguir el patrón de las categorías existentes: `st`, `sw`, `en`, `geo`, `nov`, `mus`, `dit`).
5. Añadir la regla de estado activo del nav: `.subject-nav a[href="#id-seccion"].active { background: COLOR; }`.
6. Registrar el nuevo `id` en el objeto `idToHref` dentro del `<script>` al final del fichero
   (bloque `IntersectionObserver` — sin esto, el nav no se resalta al hacer scroll hasta la sección nueva).
