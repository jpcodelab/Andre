# MUSIC_GUIDE.md — Especificación de herramientas de Lenguaje Musical

> Documento vivo. Cualquier herramienta de música nueva o modificada debe cumplir esta guía.
> Referenciado desde CLAUDE.md. Versión: 1.0 · Julio 2026

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
      "time_sec": 12
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
- `time_sec`: segundos desde que la pregunta se mostró hasta la respuesta
  final. Redondeado a entero.
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

## 4. Vocabulario de topics

Valores controlados para el campo `topic`. Ampliar aquí antes de usar valores
nuevos. Formato: minúsculas, guion bajo como separador.

### Compás y pulso
`compas_2` `compas_3` `compas_4` `compas_3-8` `compas_2-8` `compas_6-8`
`compas_simple` `compas_compuesto` `tiempo_fuerte` `tiempo_debil`

### Ritmo
`sincopa` `contratiempo` `ritmo_normal` `puntillo` `negra_puntillo`
`corchea` `tresillo` `figura_valor`

### Tonalidad y grados
`grado_I` … `grado_VII` `grados_tonales` `grados_modales`
`tonalidad_mayor` `tonalidad_menor` `relativas` `mi_m` `re_m`
`orden_sostenidos` `orden_bemoles` `armadura`

### Expresión
`matiz` `matiz_dificil` `articulacion` `tenuto` `acento` `picado`
`tempo` `agogica` `metronomo`

### Intervalos y alturas
`intervalo` `semitono` `clave_sol` `clave_fa`

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
