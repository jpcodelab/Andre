# MUSIC_GUIDE.md — Especificación de herramientas de Lenguaje Musical

> Documento vivo. Cualquier herramienta de música nueva o modificada debe cumplir esta guía.
> Referenciado desde CLAUDE.md. Versión: 1.2 · Julio 2026

---

## 1. Taxonomía de categorías

Toda herramienta de música pertenece a exactamente una categoría:

| Código | Categoría | Propósito | Audio | Evaluativa |
|---|---|---|---|---|
| `teoria` | Repasos teóricos | Test adaptativo de preguntas de teoría | No | Sí |
| `mapa` | Mapas imprimibles | Ficha estática de repaso (1-2 páginas A4) | No | No |
| `dictado` | Dictados rítmicos | Escuchar y transcribir/identificar figuras rítmicas | Sí | Sí |
| `audicion` | Discriminación auditiva | Escuchar y clasificar fenómenos musicales | Sí | Sí |
| `util` | Utilidades | Herramientas de apoyo (metrónomos, afinadores…) | Sí | No |

Distinción clave `dictado` vs `audicion`: el dictado exige reconstruir el ritmo
(qué figuras suenan); la audición exige clasificar (qué fenómeno es). Son
destrezas distintas y su feedback se diagnostica por separado.

En `index.html`, cada categoría es un `.subgroup-hdr` dentro de la sección
Lenguaje Musical, en este orden: Mapas · Repasos teóricos · Dictados ·
Discriminación auditiva · Utilidades.

---

## 2. Convención de nombres

### Ficheros

```
mus_[categoria]_[tema]_v[N].html
```

- `categoria`: código de la tabla anterior.
- `tema`: descriptor corto en minúsculas, palabras separadas por guion (`-`).
- `v[N]`: versión entera, empieza en v1. Cambios de contenido → nueva versión;
  correcciones de bugs → misma versión.

Ejemplos:
- `mus_audicion_fuerte-debil_v1.html`
- `mus_teoria_nivel3_v1.html`
- `mus_dictado_simple-s2_v1.html`
- `mus_util_metronomo-71-73-74_v1.html`

### Claves localStorage

Derivación mecánica del nombre del fichero:

```
andre_mus_[categoria]_[tema]_v[N]      → estado/progreso de la herramienta
andre_music_history                     → histórico global de sesiones (array de JSON, append)
```

### Migración de claves legacy

Al renombrar un fichero existente, incluir al inicio del `<script>` un bloque
de migración que lea la clave antigua si existe, la copie a la nueva y borre
la antigua. Documentar la clave antigua en un comentario.

---

## 3. Esquema de feedback estructurado

### 3.1 Pantalla final — formato dual

Toda herramienta evaluativa (`teoria`, `dictado`, `audicion`) termina con:

1. **Resumen humano** para André: resultado por bloque, en texto claro.
2. **Textarea copiable** con este contenido exacto:

```
[Nombre herramienta] · [fecha local dd/mm/aaaa hh:mm]
Resultado: X de Y (Z%)
Bloques: [bloque1 a/b · bloque2 c/d · …]
---JSON---
{ …objeto JSON del schema 3.2… }
```

Las 3 líneas humanas permiten lectura rápida sin parsear. El delimitador
`---JSON---` es fijo y literal: cualquier parser corta ahí.

### 3.2 Schema JSON — `andre-music-log/v1`

```json
{
  "schema": "andre-music-log/v1",
  "tool": "mus_audicion_fuerte-debil_v1",
  "category": "audicion",
  "session": {
    "start": "2026-07-19T12:05:33+02:00",
    "end": "2026-07-19T12:24:10+02:00",
    "duration_sec": 1117
  },
  "score": { "correct": 14, "total": 19, "pct": 73.7 },
  "blocks": [
    { "id": "tap", "label": "Atrapar el fuerte", "correct": 2, "total": 5 }
  ],
  "items": [
    {
      "n": 1,
      "block": "tap",
      "topic": "compas_2",
      "expected": "tiempo_1",
      "answered": "tiempo_2",
      "correct": false,
      "attempts": 1,
      "time_sec": 12,
      "listens": 2,
      "listen_sec": 7
    }
  ],
  "mood": 2
}
```

Reglas:
- `schema`: literal versionado. Cambios incompatibles → `/v2`.
- Timestamps en ISO 8601 **con zona horaria** (usar `new Date().toISOString()`
  no basta: capturar offset local; helper estándar en §3.4).
- `pct` redondeado a 1 decimal.
- `blocks` solo si la herramienta tiene bloques; si no, array vacío.
- `items`: una entrada por pregunta, siempre. `expected` y `answered` usan
  valores del vocabulario de topics cuando aplique, o texto corto.
- `attempts`: nº de intentos hasta acertar o agotar (los repasos adaptativos
  ya permiten hasta 3).
- `time_sec`: segundos **de razonamiento**, no de reloj. Se mide desde que la
  interfaz de respuesta queda habilitada (es decir, tras la primera
  reproducción completa, no al pintar la pregunta) hasta el clic en
  "Comprobar", **descontando** el tiempo de las reproducciones posteriores.
  Redondeado a entero. Un `time_sec` de 0 en todos los ítems es un fallo de
  instrumentación, no un dato.
- `listens`: número de veces que se reprodujo el estímulo en ese ítem.
  Obligatorio en `dictado` y `audicion`; opcional en `teoria`.
- `listen_sec`: segundos totales de reproducción en ese ítem, redondeado a
  entero. Separar escucha de razonamiento evita confundir "lento" con
  "dudoso": son diagnósticos distintos y piden material distinto.
- `answered`: la respuesta **real** del alumno, expresada en el vocabulario de
  la herramienta (mismo formato que `expected`), nunca un genérico del tipo
  `"bien"` / `"mal"` / `"ok"`. En preguntas de opción múltiple se registra el
  contenido de la opción elegida, no su índice ni su posición.
- `correct` puede ser `null` en ítems de bloques de calentamiento o
  calibración (no evaluados). El `score` agrega **únicamente** los ítems con
  `correct` booleano; `blocks` con `total: 0` se omiten del array. El ítem se
  registra igualmente: saber si André hizo la calibración es un dato.
- `mood`: autoevaluación de André al final, entero 1-3
  (1 = difícil/frustrante, 2 = normal, 3 = fácil/divertido). Pregunta única:
  "¿Cómo te has sentido?" con 3 botones (emoji + texto). Opcional responder:
  si se salta, `mood: null`.

### 3.3 Persistencia del histórico

Al terminar la sesión, además de mostrar el textarea:

```js
const hist = JSON.parse(localStorage.getItem('andre_music_history') || '[]');
hist.push(sessionJson);
localStorage.setItem('andre_music_history', JSON.stringify(hist));
```

Envolver en try/catch: si localStorage falla, la sesión sigue siendo copiable
a mano.

### 3.4 Helper de timestamp con zona horaria

Incluir este helper en todas las herramientas evaluativas:

```js
function isoLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
}
```

---

## 4. Vocabulario de topics — modelo de dos niveles

### 4.1 Modelo

Los topics funcionan con dos niveles de granularidad:

| Nivel | Dónde vive | Propósito |
|---|---|---|
| **topic granular** | campo `topic` de cada ítem en el JSON de sesión | Identifica exactamente qué subconcepto se evaluó |
| **topic_group** | `topics_map.json` (fichero de mapeo externo) | Agrupación para análisis y diagnóstico entre sesiones |

Los ids granulares **no cambian** en los ficheros evaluativos. El mapeo
`granular → group` se mantiene en `teoria-musica/topics_map.json`.

Para obtener el grupo de un topic al analizar un registro:
```js
const map = JSON.parse(fs.readFileSync('teoria-musica/topics_map.json', 'utf8'));
const group = map[item.topic]; // undefined si el topic no está en el mapa
```

### 4.2 Grupos válidos

| Grupo | Descripción |
|---|---|
| `compas_pulso` | Clasificación de compases, tiempos fuertes/débiles |
| `ritmo` | Figuras, silencios, puntillo, tresillo, síncopa, contratiempo |
| `tonalidad_grados` | Armaduras, tonalidades mayor/menor, relativas |
| `grados` | Grados de la escala, función tonal/modal |
| `expresion` | Matices, articulación, tempo, agógica, metrónomo |
| `intervalos_alturas` | Intervalos, semitonos, claves |
| `lectura_notas` | Lectura de notas en el pentagrama |
| `alteraciones` | Sostenidos, bemoles, becuadros |
| `enarmonia` | Enarmonía y semitonos enarmónicos |
| `anacrusa` | Anacrusa |
| `repeticion` | Signos de repetición, barras, Da Capo, al Segno |
| `unidad_tiempo` | Unidad de tiempo en compases simples y compuestos |
| `compas_9-8` | Compás de 9/8 |
| `compas_12-8` | Compás de 12/8 |
| `compas_6-8` | Compás de 6/8 |

Antes de usar un topic granular nuevo en un fichero evaluativo:
1. Decidir a qué grupo pertenece.
2. Añadir la entrada en `topics_map.json`.
3. Si el grupo no existe, añadirlo a `_valid_groups` en el mapa **y** a esta tabla.
4. Verificar con `node teoria-musica/tests/check_topics_map.js`.

### 4.3 Topics granulares en uso

Los topics granulares reales provienen de dos fuentes:
- **Teoria** (`mus_teoria_*`): campo `id` dentro del array `TEMAS`.
- **Dictado / Audición** (`mus_dictado_*`, `mus_audicion_*`): campo `topic`
  en los ítems construidos en tiempo de ejecución.

Algunos topics se construyen dinámicamente (p. ej. `'compas_' + beats` en
fuerte-débil). Estos se declaran explícitamente en `topics_map.json` aunque
el análisis estático no los detecte como usados.

La lista completa y su mapeo a grupos se encuentra en `topics_map.json`.
El script `tests/check_topics_map.js` verifica la integridad del mapa.

---

## 5. Checklist de calidad

### Común a todas las herramientas
- [ ] HTML autocontenido: sin frameworks, sin dependencias externas salvo Google Fonts (Lora).
- [ ] Fondo blanco, texto negro, responsive (max-width, unidades relativas).
- [ ] JS extraído pasa `node --check` sin errores.
- [ ] Nombre de fichero y clave localStorage siguen la convención §2.
- [ ] Si usa audio: advertencia visible "necesita sonido" en la pantalla inicial.

### Evaluativas (`teoria`, `dictado`, `audicion`)
- [ ] Ejemplo o demo antes de la primera pregunta evaluada.
- [ ] Feedback inmediato tras cada respuesta con explicación del porqué.
- [ ] Pantalla final con formato dual §3.1 y JSON que pasa `JSON.parse`.
- [ ] Pregunta de mood al final.
- [ ] Histórico append en `andre_music_history`.
- [ ] Cada pregunta tiene exactamente una respuesta correcta.
- [ ] La respuesta correcta no es deducible por longitud, posición u orden fijo.
- [ ] `time_sec` medido según §3.2 y verificado ≠ 0 en el test.
- [ ] `answered` en el vocabulario de la herramienta, verificado en el test.

### Con patrones rítmicos (`dictado`, `audicion`)
- [ ] **Verificación matemática**: cada patrón suma exactamente el compás declarado.
- [ ] Cada patrón cumple la definición de su tipo:
  contratiempo → notas solo en partes débiles, pulsos fuertes en silencio;
  síncopa → nota empieza en parte débil y atraviesa un pulso;
  normal → notas coinciden con pulsos.
- [ ] Script de validación de patrones incluido en `teoria-musica/tests/`
  (un `.js` por herramienta, ejecutable con node).
- [ ] Tolerancias de timing (si hay interacción en tiempo real) documentadas
  en comentario junto a la constante.
- [ ] El script de test valida además un registro de sesión real pasado como
      argumento (`node tests/test_x.js data/YYYY-MM-DD_x.json`).

### Imprimibles (`mapa`)
- [ ] Media query `@media print` con resultado correcto en A4.
- [ ] Sin elementos interactivos imprescindibles para el contenido.

---

## 6. Secuencias pedagógicas recomendadas

Documentadas para el index (orden de tarjetas) y para retomar el trabajo:

**Repasos teóricos:** Nivel 1 → Nivel 2 → Nivel 3 → Final → Compás →
Gran Repaso 1 → Gran Repaso 2.

**Ritmo (rama auditiva):**
Dictado S1 → Dictado S2 →
Fuerte/Débil (paso 1) → Puente síncopa (paso 2) → Síncopa vs Contratiempo (paso 3).

Regla general: no avanzar de paso sin registro de sesión revisado por el padre.
El ciclo es: André completa → padre pega registro → se diagnostica → siguiente
material a medida.

---

## 7. Roadmap de integración del feedback

Fases incrementales sobre el mismo schema. Ninguna rompe la anterior:

1. **Actual**: registro copiable pegado manualmente en la conversación con Claude.
2. **Exportación**: botón "Exportar histórico completo" en el index que vuelca
   `andre_music_history` como fichero JSON descargable.
3. **Repositorio como datos**: carpeta `teoria-musica/data/` con los JSON de
   sesión commiteados; histórico consultable con git.
4. **Diagnóstico automático**: llamada a la API de Claude con el histórico
   para generar diagnóstico y propuesta de siguiente sesión. Requiere decidir
   dónde vive la llamada (script local vs. Artifact con API) — pendiente.

---

## 8. Reglas heredadas que siguen vigentes

- NO generar documentos Word para música. Todo es HTML.
- Ficheros de audio: solo Web Audio API, nunca ficheros externos.
- Herramientas con audio: requieren Chrome/Edge, no funcionan offline —
  indicarlo en su tarjeta del index.
- Todos los conteos de pulsos en los ejercicios deben verificarse
  matemáticamente antes de la entrega.
- El feedback de sesión es el mecanismo de coordinación entre sesiones:
  sin registro no hay diseño de la sesión siguiente.
