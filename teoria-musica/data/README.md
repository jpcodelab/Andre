# teoria-musica/data/ — notas para el análisis longitudinal

## Anomalías

- **2026-07-21 10:00:49 · `mus_dictado_simple-s1_v1` · 8/9 (88,9%) — sesión
  fantasma. NO archivada.** Firma de código anterior a `f3f225e` (`time_sec:0`,
  `answered` literal `'bien'`/`'repasar'`, `start==end`, `duration_sec:0`).
  Origen: estado residual en `localStorage` de una partida previa al arreglo
  del 20/07 18:24, cerrada al reabrir la herramienta el 21/07 y pulsar el
  emoji de humor. No representa rendimiento — no usar para ningún análisis.
  La sesión real de ese día (10:01:01–10:10:15, 7/9, 77,8%) sí está archivada
  en `2026-07-21_mus_dictado_simple-s1_v1.json` y empieza justo después
  (10:01:01) de que la fantasma cerrara (10:00:49).

- **Endurecimiento de `mus_dictado_simple-s2_v1` — sigue BLOQUEADO.** La
  única sesión archivada (`2026-07-20_mus_dictado_simple-s2_v1.json`) es
  anterior a `f3f225e` y no contiene transcripciones reales
  (`answered:"bien"` en los 9 ítems, `time_sec:0`), por lo que no sirve para
  verificar nada sobre el rendimiento real de André en esta herramienta. Sin
  una sesión posterior al arreglo, no hay base para endurecer `s2` de la
  misma forma que `s1` (bloqueo de suma de tiempos / `self_guarded`).

## Corte de comparabilidad en `time_sec` — 23/07/2026

Antes de esta fecha, las 4 herramientas de `audicion` (`mus_audicion_fuerte-debil_v1`,
`mus_audicion_puente-sincopa_v2`, `mus_audicion_silencio-sostenido_v1`,
`mus_audicion_sincopa-contratiempo_v1`) medían `time_sec` como **reloj desde que se
pinta la pregunta**, no como "segundos de razonamiento" (MUSIC_GUIDE §3.2: desde que la
interfaz de respuesta se habilita, tras la primera reproducción completa, hasta el clic
en Comprobar, descontando re-escuchas posteriores).

El 23/07/2026 se corrigió la instrumentación en las 4 herramientas (auditoría de
conformidad contra MUSIC_GUIDE v1.5, §4 de la sesión de esa fecha). A partir de esa
corrección, `time_sec` en los registros de estas 4 herramientas mide razonamiento real,
no reloj total.

**Implicación**: los `time_sec` de los registros `2026-07-23_mus_audicion_*.json`
(anteriores a la corrección) **no son comparables** con los de sesiones posteriores de
las mismas herramientas — los primeros incluyen el tiempo de la primera escucha (y,
en el caso de las herramientas sin límite de repetición, pueden incluir escuchas
adicionales antes de responder), los segundos no. No usar estos 4 registros para
calcular tendencias de velocidad de respuesta junto con registros posteriores.

El resto de campos (`score`, `blocks`, `mood`, `attempts`, `correct`) no se ven
afectados y siguen siendo comparables.

`listens` y `listen_sec` tampoco existen en estos 4 registros del 23/07/2026 (mismo
hallazgo de conformidad, corregido a partir de esa fecha) — ausentes, no cero.

## Deuda de instrumentación

Detectada el 31/07/2026. No corregida — se documenta para que no se pierda al
analizar registros futuros.

- **`mus_audicion_fuerte-debil_v1`** — `time_sec = 0` en 12 de 14 ítems de los
  bloques `point` y `classify`; en `tap` mide bien (4–16 s). Incumple §3.2.
  Causa probable: el cronómetro arranca al terminar la reproducción y André
  responde antes de que acabe el estímulo. No se corrige: la herramienta está
  saturada (100% en tres pasadas) y sale de rotación.
- **`mus_audicion_fuerte-debil_v1`** — ítem con `tap_misses: 2` registrado
  como `correct: true`. Tolerancia implícita sin documentar. §5 exige
  documentarla junto a la constante. Detectado ya el 23/07/2026, sigue abierto.
- **`mus_audicion_ataque-duracion_v1`** — `listen_sec` es siempre
  `listens × 7`, es decir un valor derivado, no medido. No aporta señal
  independiente sobre `listens`. §3.2 pide segundos reales de reproducción.

### Consolidado de `check_conformance.js` tras el lote de copyLog — 31/07/2026

- **`listens`/`listen_sec` ausentes por completo**: `mus_dictado_simple-s1_v1`,
  `mus_dictado_simple-s2_v1`. `simple-s1` tiene sesión archivada del
  21/07/2026 (`2026-07-21_mus_dictado_simple-s1_v1.json`) con ese hueco.
  `simple-s2` también, en `2026-07-20_mus_dictado_simple-s2_v1.json`.
- **`check_scoring.js` — `2026-07-20_mus_dictado_simple-s2_v1.json` ya no falla
  (corregido 31/07/2026)**: la sesión es del 20/07/2026, anterior a que el
  campo `scoring` se añadiera al schema (22/07/2026, commit `444412f`). Se le
  ha añadido `scoring:"self"` + `_migration_note` retroactivos, mismo
  tratamiento que ya llevaba `2026-07-21_mus_dictado_simple-s1_v1.json` — se
  unifica el criterio: todo registro archivado sin `scoring` por ser anterior
  al schema recibe el valor retroactivo que corresponda a la mecánica real de
  la herramienta en esa fecha (determinable por commit), documentado en
  `_migration_note`, sin tocar `score`/`items`/`session`. `check_scoring.js`
  pasa limpio y puede usarse como gate.
- **`listens`/`listen_sec` mal nombrados como `replays`**:
  `mus_dictado_melodico-s1_v1`, `mus_dictado_simple-s5_v1` (excepción de
  notación §3.2 aparte — este es el defecto de nombre de campo, no de
  vocabulario). Ambos con sesión archivada (31/07/2026).
- **Navbar incompleta**: los 3 `mus_mapa_*` (`compas`, `grados-tonalidades`,
  `resto-temario`) — no son evaluativos y no llevan `.navbar` de vuelta al
  índice ni reinicio.
- **Implementación de referencia de `time_sec` conforme a §3.2**:
  `mus_dictado_3-8_v1.html` — `cur.t0` se difiere hasta el `.then()` de la
  primera reproducción completa y se descuenta `cur.extraListenMs` de las
  re-escuchas posteriores. Usarla como patrón al instrumentar herramientas
  nuevas.

## Inventario del repositorio — reconciliado 31/07/2026

Cruce de los 24 `.html` de `teoria-musica/` contra las tarjetas de `index.html`,
los JSON de `data/` y los scripts de `tests/`.

**Herramientas en el repo sin tarjeta en el índice** (invisibles para André):
- `mus_audicion_sincopa-contratiempo_v1` — superada por v2 en la secuencia
  pedagógica (§6 MUSIC_GUIDE), pero el fichero sigue en el repo sin ningún
  enlace en `index.html`. Conserva un registro de sesión en `data/`
  (23/07/2026) de cuando aún estaba en uso.

**Tarjetas del índice que apuntan a un fichero inexistente**: ninguna — los 23
`data-tool`/`href` de la sección "Escuela de Música" coinciden 1:1 con
ficheros existentes.

**Herramientas evaluativas sin ningún JSON en `data/` (nunca estrenadas)**:
9 de 21.
- Repasos teóricos, 8 de 9 sin registro: `nivel1`, `nivel3`, `armaduras`,
  `armadura-refuerzo`, `compas`, `repaso-final`, `gran-repaso1`,
  `gran-repaso2` (solo `nivel2` tiene registro).
- Dictados, 1 de 5 sin registro: `melodico-s1` es el único dictado que
  André no ha jugado todavía. Los otros 4 sí tienen sesión archivada:
  `simple-s1` (21/07/2026), `simple-s2` (20/07/2026, 100% — archivada el
  31/07/2026 desde el export reconciliado, ver
  `2026-07-20_mus_dictado_simple-s2_v1.json`), `3-8` (archivado el
  31/07/2026 desde una sesión recuperada de conversación, ver
  `2026-07-26_mus_dictado_3-8_v1.json`) y `simple-s5` (archivado el
  31/07/2026, ver `2026-07-31_mus_dictado_simple-s5_v1.json`).
- Auditivas: las 7 tienen al menos un registro.

**Nota de método**: la ausencia de fichero en `data/` NO implica que la
herramienta no se haya usado — solo implica que esa sesión aún no se ha
reconciliado y archivado desde `andre_music_history`. La fuente de verdad
sobre si André ha jugado una herramienta es `andre_music_history` (el
export completo), no el contenido de `data/`. El caso de `simple-s2` es
el ejemplo: constaba aquí como "sin estrenar" hasta el 31/07/2026 pese a
tener una sesión jugada y reconciliada el 20/07/2026 — el inventario de
`data/` simplemente no se había puesto al día.

**Herramientas evaluativas sin script de check en `tests/`**: 10 de 21 sin
ninguna cobertura.
- Los 9 repasos teóricos (no existe ningún `check_teoria_*.js`).
- `mus_audicion_fuerte-debil_v1` (sin check dedicado; `check_audicion_patterns.js`
  no la cubre — solo `sincopa-contratiempo_v1`).

Cobertura parcial a tener en cuenta (verifican solo la matemática de los
patrones rítmicos, no el checklist completo §5 como los demás `check_*.js`
dedicados): `mus_dictado_simple-s1_v1` y `mus_dictado_simple-s2_v1`
(`check_dictado_patterns.js`), `mus_audicion_sincopa-contratiempo_v1`
(`check_audicion_patterns.js`).
