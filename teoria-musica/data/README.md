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
