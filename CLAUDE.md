# CLAUDE.md — Proyecto André: Biblioteca de Juegos Educativos

> Documento de contexto para Claude Code. Leer antes de cualquier sesión de trabajo.
> Última actualización: julio 2026 (rev. 3)

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
- Teoría musical de 5º de Primaria (LOMLOE).
- Los repasos usan test adaptativo: hasta 3 intentos por tema, feedback inmediato,
  progreso guardado en localStorage, registro de sesión copiable al final.
- Los mapas son fichas de una o dos páginas para imprimir — no son juegos interactivos.
- Los dictados rítmicos y las herramientas de discriminación auditiva usan Web Audio API
  (sin ficheros de audio externos) — requieren Chrome/Edge; no funcionan offline ni son imprimibles.
- Secuencia natural de los repasos: Nivel 1 → Nivel 2 → Nivel 3 → Final → Compás → Gran Repaso 1 → Gran Repaso 2 → Dictado S1 → Dictado S2.
- Secuencia de discriminación auditiva (nueva rama, independiente de los repasos teóricos):
  Fuerte/Débil (Paso 1) → ¿Con el fuerte o en el hueco? (Paso 2) → Síncopa vs Contratiempo (Paso 3).

---

## 4. Estructura de archivos del proyecto

```
Andre/
├── index.html                         # Biblioteca: portal con nav por secciones
│                                      # Secciones: Juegos · Lenguaje Musical
│                                      # Para añadir sección: nuevo id= + entrada en <nav.subject-nav>
├── andre-novela-v4.html               # Novela interactiva (~45 min, 11 desafíos)
│                                      # Universo: Stranger Things · localStorage
├── andre-stranger-things.html         # Juego de medidas (Stranger Things)
├── starwars-lengua.html               # Juego de lengua castellana (Star Wars)
├── andre-english-upsidedown.html      # Juego de inglés (Stranger Things)
├── provincias_espana_v4.html          # Juego de geografía — 50 provincias, 5 modos
│
├── teoria-musica/                     # Lenguaje Musical 5º Primaria
│   ├── mapa_repaso_grados_tonalidades.html   # Mapa imprimible: grados y tonalidades
│   ├── mapa_repaso_compas.html               # Mapa imprimible: el compás
│   ├── mapa_repaso_resto.html                # Mapa imprimible: teoría general
│   ├── examen_musica_andre.html              # Repaso nivel 1 · 26 temas
│   ├── examen_musica_andre_nivel2.html       # Repaso nivel 2 · 23 temas · partituras SVG
│   ├── examen_musica_andre_nivel3.html       # Repaso nivel 3 · 19 temas
│   ├── repaso_final_musica_andre.html        # Repaso final · 26 temas
│   ├── repaso2_compas_musica_andre.html      # Repaso compás · 22 temas
│   ├── repaso_completo_musica_andre.html     # Gran repaso 1 · 40 temas
│   ├── repaso_completo2_musica_andre.html    # Gran repaso 2 · 40 temas (por unidad)
│   ├── dictado_ritmico_andre.html            # Dictado rítmico S1 · 4/4 y 3/4 · Web Audio API
│   ├── dictado_ritmico_andre_s2.html         # Dictado rítmico S2 · foco corchea por posición
│   ├── andre_fuerte_debil_v1.html            # Discriminación auditiva · Paso 1 · Tiempos fuertes/débiles
│   ├── andre_puente_sincopa_v1.html          # Discriminación auditiva · Paso 2 · Ritmo normal/contratiempo/síncopa
│   └── andre_sincopa_contratiempo_v1.html    # Discriminación auditiva · Paso 3 · Síncopa vs contratiempo · 12 preguntas
│
├── CLAUDE.md                          # Este fichero — contexto para Claude Code
└── README.md                          # Descripción pública del repositorio
```

---

## 5. Convenciones de código

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
- Para añadir un color nuevo: definir `.card-accent.X`, `.badge-X` y `.card-cta.X`.
- La barra `<nav class="subject-nav">` es sticky (z-index:100); enlaza secciones por `id`; añadir entrada al agregar sección nueva.
- Un IntersectionObserver en `<script>` marca con `.active` el enlace de nav de la sección visible. Estilos: `.subject-nav a[href="#juegos"].active` (rojo) y `.subject-nav a[href="#musica"].active` (naranja).
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

---

## 6. Próximas mejoras sugeridas

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

## 7. Flujo de trabajo con Claude Code

Cuando empieces una sesión nueva en este proyecto:

1. Claude Code leerá este fichero automáticamente si está en la raíz.
2. Puedes pedir: "Crea un nuevo juego de [materia] con universo [temático]"
   o "Añade los ficheros de [asignatura] a la biblioteca" y Claude Code
   tendrá todo el contexto necesario.
3. Para añadir una nueva sección al index.html:
   - Crear carpeta `nombre-asignatura/` (sin espacios)
   - Añadir entrada en `<nav class="subject-nav">` con `href="#id-seccion"`
   - Añadir bloque `<div class="section-hdr" id="id-seccion">` + grid de tarjetas
   - Definir color `.X` en CSS si es una categoría nueva
4. Tras cada sesión: `git add . && git commit -m "descripción" && git push`
   para publicar los cambios en GitHub Pages.

---

Proyecto mantenido por José Pedro — padre de André.
Uso educativo personal. No comercial.
