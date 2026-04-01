# CLAUDE.md — Proyecto André: Biblioteca de Juegos Educativos

> Documento de contexto para Claude Code. Leer antes de cualquier sesión de trabajo.
> Última actualización: abril 2025

---

## 1. Descripción del proyecto

Biblioteca de juegos educativos interactivos publicada en GitHub Pages,
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

### Inglés (asignaturas CLIL)
- Contenidos alineados con Social Sciences y Natural Sciences en inglés.
- Foco en: past simple, comparatives, reading comprehension, vocabulary.

---

## 4. Estructura de archivos del proyecto

```
Andre/
├── index.html                    # Página de inicio / biblioteca personalizada
├── andre-novela-v4.html          # Novela interactiva (~45 min, 11 desafíos)
│                                 # Universo: Stranger Things
│                                 # Guarda progreso con localStorage
├── andre-stranger-things.html    # Juego de medidas (Stranger Things)
├── starwars-lengua.html          # Juego de lengua castellana (Star Wars)
├── andre-english-upsidedown.html # Juego de inglés (Stranger Things)
├── CLAUDE.md                     # Este fichero — contexto para Claude Code
└── README.md                     # Descripción pública del repositorio
```

---

## 5. Convenciones de código

### Tecnología
- HTML5 semántico — sin frameworks (no React, no Vue, no Svelte).
- CSS inline o en `<style>` dentro del mismo fichero HTML — no ficheros .css externos.
- JavaScript vanilla en `<script>` dentro del mismo fichero HTML.
- Sin dependencias externas salvo Google Fonts (cargadas vía `<link>`).
- Un juego = un fichero HTML — cada juego es autocontenido.

### Persistencia
- Se usa localStorage para guardar progreso entre sesiones (solo en la novela).
- Las claves siguen el patrón: `andre_[nombre-juego]_[dato]`.

### Diseño visual
- Fondo blanco (`#ffffff`).
- Google Fonts: preferentemente Nunito o Poppins.
- Diseño responsive con max-width y unidades relativas. Apto para móvil.
- Sin animaciones pesadas. Sin vídeos. Sin audio (compatible con modo avión).
- Paleta por universo temático:
  - Stranger Things: rojo `#e53935` + negro + tipografía retro
  - Star Wars: amarillo `#FFE81F` + negro + tipografía espacial

### Personajes-tutoras
- **Blanca** — matemáticas y lengua. Tono: cómplice, directa, humor seco.
- **Rocío** — inglés. Tono: animada, positiva, ejemplos visuales.
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

### Mejoras técnicas
- [ ] index.html — mostrar progreso de la novela directamente en la portada
- [ ] Sistema de insignias global entre juegos (localStorage compartido)
- [ ] Modo oscuro opcional (toggle en la portada)
- [ ] README.md — actualizar con capturas de pantalla y descripción por juego

### Mejoras pedagógicas
- [ ] Pistas progresivas (hint 1, hint 2) antes de revelar la respuesta
- [ ] Registro de errores frecuentes por materia para revisión del padre
- [ ] Temporizador opcional por desafío (para simular condiciones de examen)

---

## 7. Flujo de trabajo con Claude Code

Cuando empieces una sesión nueva en este proyecto:

1. Claude Code leerá este fichero automáticamente si está en la raíz.
2. Puedes pedir: "Crea un nuevo juego de [materia] con universo [temático]"
   y Claude Code tendrá todo el contexto necesario.
3. Tras cada sesión: `git add . && git commit -m "descripción" && git push`
   para publicar los cambios en GitHub Pages.

---

Proyecto mantenido por José Pedro — padre de André.
Uso educativo personal. No comercial.
