# teoria-musica/data/ — notas para el análisis longitudinal

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
10 de 21.
- Repasos teóricos, 8 de 9 sin registro: `nivel1`, `nivel3`, `armaduras`,
  `armadura-refuerzo`, `compas`, `repaso-final`, `gran-repaso1`,
  `gran-repaso2` (solo `nivel2` tiene registro).
- Dictados, 2 de 5 sin registro: `simple-s2`, `melodico-s1`
  (`simple-s1`, `3-8` y `simple-s5` tienen registro; `3-8` archivado el
  31/07/2026 desde una sesión recuperada de conversación, ver
  `2026-07-26_mus_dictado_3-8_v1.json`; `simple-s5` archivado el 31/07/2026,
  ver `2026-07-31_mus_dictado_simple-s5_v1.json`).
- Auditivas: las 7 tienen al menos un registro.

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
