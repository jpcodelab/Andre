# CLAUDE.md — Proyecto André: Biblioteca de Juegos Educativos

> Documento de contexto para Claude Code. Leer antes de cualquier sesión de trabajo.
> Última actualización: 21 de julio de 2026 (rev. 5)

---

## 1. Descripción del proyecto

Biblioteca de recursos educativos interactivos publicada en GitHub Pages,
diseñada específicamente para André, alumno de 5º de Primaria del
CEIP Rosa Luxemburgo (Madrid, Comunidad de Madrid).

- **Repositorio:** https://github.com/jpcodelab/Andre
- **Web pública:** https://jpcodelab.github.io/Andre/
- **Tecnología:** HTML + CSS + JavaScript puro. Sin frameworks. Sin dependencias
  externas salvo Google Fonts.
- **Compatibilidad:** Funciona en móvil, tablet y escritorio. Apto para modo avión
  (sin llamadas a APIs externas en tiempo de juego).

---

## 2. Perfil del alumno — André

| Atributo | Detalle |
|---|---|
| Edad | 10 años |
| Curso | 5º de Primaria (LOMLOE) |
| Centro | CEIP Rosa Luxemburgo, Madrid |
| Contexto lingüístico | Familia lusohablante. En casa se habla portugués |
| Lecturas favoritas | Harry Potter, Percy Jackson, Diario de Greg, Futebolíssimos |
| Matemáticas | Método Singapur (modelos de barras, razonamiento visual) |
| Perfil de aprendizaje | Activo, baja autonomía, responde bien a progreso visible y bloques cortos |
| Motivación | Duolingo por iniciativa propia, narrativas de aventura, universos de ficción |

### Interferencias portugués → castellano (atención especial)
- Tildes (tambem→también, nao→no)
- Preposiciones (en vs. a, de vs. desde)
- Concordancia de género y número
- Falsos amigos (borracha, embarazada, polvo…)
- Grafías influenciadas por el portugués (fazer→hacer)

---

## 3. Principios pedagógicos

### Siempre
- Mostrar el **razonamiento**, no solo la respuesta.
- Estructurar en **pasos cortos y progresivos**.
- Dar **feedback inmediato** tras cada respuesta (correcto/incorrecto + explicación).
- Incluir un **ejemplo resuelto** antes de los ejercicios.
- Adaptar al currículo **LOMLOE · 5º Primaria · Comunidad de Madrid**.

### Nunca
- Dar la respuesta directa sin proceso de razonamiento visible.
- Producir contenido que André pueda copiar sin entender.
- Sobrecargar la pantalla: una habilidad por sección cuando sea posible.

### Matemáticas — Método Singapur
- Priorizar representación visual (modelos de barras).
- Secuencia: concreto → pictórico → abstracto.
- El algoritmo viene después de la comprensión del concepto.

### Lengua castellana
- Reforzar reglas ortográficas con ejemplos de interferencia portugués-castellano.
- Trabajar concordancia, preposiciones y vocabulario en contexto narrativo.

### Inglés · Social Science · Natural Science (CLIL)
- Rocío da las tres asignaturas: English, Social Science y Natural Science.
- Los juegos de inglés incluyen contenido CLIL de las otras dos asignaturas.
- Foco en: past simple, comparatives, reading comprehension, vocabulary.

### Lenguaje Musical
- Especificación completa en `teoria-musica/MUSIC_GUIDE.md` — leer antes de crear o modificar cualquier herramienta de música.
- Las herramientas pertenecen a una de 5 categorías (§1 MUSIC_GUIDE): `teoria` · `mapa` · `dictado` · `audicion` · `util`.
- Los repasos (`teoria`) usan test adaptativo: hasta 3 intentos por tema, feedback inmediato,
  progreso guardado en localStorage, registro de sesión copiable al final (schema JSON §3 MUSIC_GUIDE).
- Los mapas son fichas de una o dos páginas para imprimir — no son juegos interactivos.
- Los dictados rítmicos y las herramientas de discriminación auditiva usan Web Audio API
  (sin ficheros de audio externos) — requieren Chrome/Edge; no funcionan offline ni son imprimibles.
- Secuencia natural de los repasos (§6 MUSIC_GUIDE): N1 → N2 → N3 → Final → Compás → GR1 → GR2 → Dictado S1 → Dictado S2.
- Secuencia de discriminación auditiva (rama independiente, §6 MUSIC_GUIDE):
  Fuerte/Débil (Paso 1) → ¿Con el fuerte o en el hueco? (Paso 2) → Síncopa vs Contratiempo (Paso 3).
- Topics de sesión: vocabulario de dos niveles — topic granular en el JSON + grupo vía `topics_map.json` (§4 MUSIC_GUIDE).

---

## 4. Convenciones de código

### Tecnología
- HTML5 semántico — sin frameworks (no React, no Vue, no Svelte).
- CSS inline o en `<style>` dentro del mismo fichero HTML — no ficheros .css externos.
- JavaScript vanilla en `<script>` dentro del mismo fichero HTML.
- Sin dependencias externas salvo Google Fonts (cargadas vía `<link>`).
- Un recurso = un fichero HTML — cada fichero es autocontenido.
- Subcarpetas por asignatura cuando hay varios ficheros relacionados (ej: `teoria-musica/`).
  Los nombres de carpeta usan guión, nunca espacio (URLs limpias en GitHub Pages).

### Persistencia
- Se usa localStorage para guardar progreso entre sesiones.
- La novela usa claves `andre_[nombre-juego]_[dato]`.
- Los repasos de música guardan progreso y registro de sesión por fichero.

### Diseño visual — index.html
- Fondo crema `#fafaf8`, tarjetas blancas, tipografía serif roja (Special Elite).
- Cada categoría temática tiene su color de acento definido en CSS:
  - `.nov` — púrpura/rojo (Novela)
  - `.st`  — rojo (Stranger Things)
  - `.sw`  — teal (Star Wars)
  - `.en`  — azul (English)
  - `.geo` — verde `#2e7d32` (Geografía)
  - `.mus` — naranja `#e65100` (Lenguaje Musical)
- La barra `<nav class="subject-nav">` es sticky (z-index:100) y enlaza secciones por `id`.
  El scroll-highlight lo gestiona un IntersectionObserver — ver skill `add-section`
  para los pasos exactos al añadir una sección.
- Los sub-encabezados `.subgroup-hdr` separan tipos o asignaturas dentro de una sección.
- La sección "Los Juegos" usa subgrupos por asignatura: Matemáticas · Lengua · Inglés/SS/NS · Geografía · Novela.

### Diseño visual — juegos individuales
- Fondo blanco (`#ffffff`).
- Google Fonts: preferentemente Nunito o Poppins.
- Diseño responsive con max-width y unidades relativas. Apto para móvil.
- Sin animaciones pesadas. Sin vídeos. Sin audio (compatible con modo avión).
- Paleta por universo temático:
  - Stranger Things: rojo `#e53935` + negro + tipografía retro
  - Star Wars: amarillo `#FFE81F` + negro + tipografía espacial

### Personajes-tutoras
- **Blanca** — matemáticas y lengua. Tono: cómplice, directa, humor seco.
- **Rocío** — inglés, Social Science y Natural Science. Tono: animada, positiva, ejemplos visuales.
- Se representan con emoji o avatar simple (sin imágenes externas).

### Estructura de un juego típico
1. Pantalla de inicio con título, universo temático y botón "Empezar".
2. Desafíos secuenciales numerados con barra de progreso visible.
3. Feedback inmediato tras cada respuesta.
4. Pantalla de cierre con puntuación y mensaje de Blanca o Rocío.

### Organización de carpetas
- Raíz: `index.html` (portada) + juegos de una sola asignatura.
- Subcarpeta por asignatura con ≥2 ficheros: `teoria-musica/`.
- `teoria-musica/` incluye además `MUSIC_GUIDE.md`, `topics_map.json`, `tests/`, `data/`.
- Nombres de carpeta con guión, nunca espacio.

### Mapeo juego → asignatura (los nombres no son autoexplicativos)
| Fichero | Asignatura | Universo |
|---|---|---|
| `andre-novela-v4` | transversal (11 desafíos, ~45 min) | Stranger Things |
| `andre-stranger-things` | matemáticas — medidas | Stranger Things |
| `starwars-lengua` | lengua castellana | Star Wars |
| `andre-english-upsidedown` | inglés | Stranger Things |
| `provincias_espana_v4` | geografía — 50 provincias, 5 modos | — |

### Scripts de `teoria-musica/tests/`
- `check_topics_map.js` — integridad de `topics_map.json` (§4 MUSIC_GUIDE)
- `check_phase_c.js` — infraestructura de feedback (§3 MUSIC_GUIDE)
- `check_answer_distribution.js` — la correcta no es deducible por posición
- `check_dictado_patterns.js` / `check_audicion_patterns.js` — suma de pulsos por compás

---

## 5. Próximas mejoras sugeridas

### Contenido nuevo
- [ ] Juego de fracciones con método Singapur (modelos de barras interactivos)
- [ ] Juego de ortografía: interferencias portugués-castellano
- [ ] Juego de inglés: past simple irregular verbs (universo Harry Potter)
- [ ] Ampliación de la novela: capítulo 2, más desafíos de matemáticas
- [ ] Añadir sección "Natural Sciences" o "Matemáticas" al index.html con su carpeta propia

### Mejoras técnicas
- [ ] index.html — mostrar progreso de la novela directamente en la portada
- [ ] Sistema de insignias global entre juegos (localStorage compartido)
- [ ] Modo oscuro opcional (toggle en la portada)

### Mejoras pedagógicas
- [ ] Pistas progresivas (hint 1, hint 2) antes de revelar la respuesta
- [ ] Registro de errores frecuentes por materia para revisión del padre
- [ ] Temporizador opcional por desafío (para simular condiciones de examen)

---

## 6. Flujo de trabajo con Claude Code

Cuando empieces una sesión nueva en este proyecto:

1. Claude Code leerá este fichero automáticamente si está en la raíz.
2. Puedes pedir: "Crea un nuevo juego de [materia] con universo [temático]"
   o "Añade los ficheros de [asignatura] a la biblioteca" y Claude Code
   tendrá todo el contexto necesario.
3. Para añadir una nueva sección al index.html, usa el skill `add-section`.
4. Tras cada sesión: `git add . && git commit -m "descripción" && git push`
   para publicar los cambios en GitHub Pages.

---

Proyecto mantenido por José Pedro — padre de André.
Uso educativo personal. No comercial.
