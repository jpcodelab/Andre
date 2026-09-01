#!/usr/bin/env node
/* =====================================================================
 * headless_mus_dictado_segmentacion.js
 *
 * Recorre el flujo completo de mus_dictado_segmentacion_v1.html en jsdom:
 * demo -> bloque A -> bloque B (dos pasos) -> bloque C (conteo, paleta,
 * autochequeo) -> mood -> pantalla final, y valida el registro emitido.
 *
 *   npm i jsdom && node tests/headless_mus_dictado_segmentacion.js
 *
 * Escribe el registro simulado en tests/fixtures/ para poder pasárselo
 * después a test_mus_dictado_segmentacion.js.
 * ===================================================================== */

'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const TOOL = 'mus_dictado_segmentacion_v1';
const HTML = path.join(__dirname, '..', TOOL + '.html');

let fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.log('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
}
function head(t) { console.log('\n== ' + t + ' =='); }

/* ---------- Entorno: Web Audio y temporizadores simulados ---------- */
function stubAudio(win) {
  function Param() { return { value:0, setValueAtTime(){}, linearRampToValueAtTime(){} }; }
  win.AudioContext = function () {
    return {
      state: 'running', currentTime: 0, destination: {},
      resume() {},
      createOscillator() {
        return { type:'', frequency:Param(), connect(){}, start(){}, stop(){} };
      },
      createGain() { return { gain: Param(), connect(){} }; }
    };
  };
  win.webkitAudioContext = win.AudioContext;
}

const dom = new JSDOM(fs.readFileSync(HTML, 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://jpcodelab.github.io/Andre/teoria-musica/' + TOOL + '.html',
  beforeParse: stubAudio
});
const win = dom.window, doc = win.document;
win.scrollTo = function () {};
win.document.execCommand = () => true;

const $ = id => doc.getElementById(id);
const visible = id => !$(id).classList.contains('hide');

/** Ejecuta los setTimeout pendientes: simula que el audio ha terminado. */
function flush() {
  // jsdom usa timers reales; se avanza con un bucle síncrono sobre los callbacks
  // registrados por doPlay, que se dispara con setTimeout(fn, secs*1000).
  const pend = TIMERS.splice(0, TIMERS.length);
  pend.forEach(fn => fn());
}
const TIMERS = [];
const realSetTimeout = win.setTimeout;
win.setTimeout = function (fn, ms) {
  if (ms > 100) { TIMERS.push(fn); return 0; }   // reproducción de audio
  return realSetTimeout(fn, ms);
};

/* ---------- Tabla de nombres (misma que la herramienta) ---------- */
const FIGNAME = { r:'redonda', b:'blanca', bp:'blanca con puntillo', n:'negra',
  np:'negra con puntillo', c:'corchea', cp:'corchea con puntillo', s:'semicorchea',
  zr:'silencio de redonda', zb:'silencio de blanca', zn:'silencio de negra',
  zc:'silencio de corchea', zs:'silencio de semicorchea' };

/* ---------- Modelo espejo para calcular las respuestas correctas ---------- */
const SEG = win.__SEG__;
ok(!!SEG, 'La herramienta expone window.__SEG__ para la suite');
const { parsePat, attacksOf, METER, SEQ } = SEG;

head('1. Arranque');
ok(visible('scr-intro'), 'Arranca en la pantalla de intro');
ok(doc.querySelector('.warn').textContent.indexOf('sonido') >= 0,
  'Aviso visible de "necesita sonido" (§5)');
$('btn-start').click();
ok(visible('scr-demo'), 'El botón Empezar lleva a la demo');
ok($('demo-figA').innerHTML.indexOf('<svg') >= 0, 'La demo dibuja figuras en SVG');
ok($('demo-stripA').innerHTML.indexOf('<svg') >= 0, 'La demo dibuja la tira de pulsos');
$('demo-next').click();
ok(visible('scr-demo'), 'Hay una segunda demo');
$('demo-next').click();
ok(visible('scr-item'), 'Tras las demos empieza el bloque A');

head('2. Cronometraje y contadores (§3.2, §3.7)');
ok(!visible('it-q'), 'La respuesta está deshabilitada antes de escuchar');
$('it-play').click(); flush();
ok(visible('it-q'), 'La interfaz de respuesta aparece al terminar la primera reproducción');
$('it-play').click(); flush();
ok($('it-listens').textContent.indexOf('2') >= 0, 'Las re-escuchas previas suman a listens');

/* ---------- Recorrido completo ---------- */
head('3. Recorrido de los 22 ítems');
let guard = 0;
const WRONG_AT = 6;        // un ítem se falla a propósito, para probar el feedback de error
const CHANGE_AT = 19;      // en un ítem de C se usa "Quiero cambiarlo" (attempts = 2)
const SLOW_AT   = 2;       // se retrasa la respuesta 1,2 s: prueba que time_sec se mide de verdad      // en un ítem de C se usa "Quiero cambiarlo" (attempts = 2)
let step = 0;

while (visible('scr-item') && guard++ < 200) {
  const idx = step;
  const spec = SEQ[idx];
  if (!spec) break;

  if (!visible('it-q') && !visible('it-compose')) { $('it-play').click(); flush(); }
  if (idx === SLOW_AT) { const t = Date.now(); while (Date.now() - t < 1200) {} }

  if (spec.type === 'write') {
    ok(visible('it-compose'), 'Ítem ' + (idx + 1) + ': aparece la paleta de figuras');
    const target = parsePat(spec.pat);
    const pal = $('it-pal').children;
    const byFig = {};   // se pulsa cada figura por el aria-label de su SVG
    for (let i = 0; i < pal.length; i++) {
      const al = pal[i].querySelector('svg').getAttribute('aria-label');
      byFig[al] = pal[i];
    }
    const NAMEOF = FIGNAME;
    const wrong = (idx === WRONG_AT);
    const seqFigs = [];
    target.forEach(m => m.forEach(f => seqFigs.push(f)));
    if (wrong) {
      // fusión deliberada que conserva la duración: dos negras -> una blanca
      // (si no es posible en este patrón, se transcribe bien)
      const i2 = seqFigs.indexOf('n');
      if (i2 >= 0 && seqFigs[i2 + 1] === 'n') seqFigs.splice(i2, 2, 'b');
    }
    seqFigs.forEach(f => { if (byFig[NAMEOF[f]]) byFig[NAMEOF[f]].click(); });
    ok(!$('it-submit').classList.contains('hide'),
      'Ítem ' + (idx + 1) + ': "Comprobar" solo aparece con la duración completa');
    $('it-submit').click();
    ok(visible('it-check'), 'Ítem ' + (idx + 1) + ': se muestra el autochequeo antes de corregir');
    if (idx === CHANGE_AT) {
      $('it-change').click();
      ok(visible('it-compose'), 'Ítem ' + (idx + 1) + ': "Quiero cambiarlo" devuelve a la paleta');
      $('it-submit').click();
      $('it-keep').click();
    } else {
      $('it-keep').click();
    }
  } else if (spec.type === 'pair') {
    const cards = $('it-opts').children;
    ok(cards.length === 2, 'Ítem ' + (idx + 1) + ': se ofrecen exactamente 2 gemelos');
    // La herramienta NO expone el patrón en el DOM (no se filtra la respuesta):
    // se identifica el gemelo correcto re-renderizando su notación y comparando.
    // (jsdom re-serializa el SVG, así que se comparan los aria-label, no el HTML)
    const want = [];
    parsePat(spec.expected).forEach(m => m.forEach(f => want.push(FIGNAME[f])));
    let goodIdx = -1;
    for (let i = 0; i < cards.length; i++) {
      const got = Array.prototype.map.call(
        cards[i].querySelectorAll('.rowfig svg'), e => e.getAttribute('aria-label'));
      if (got.join('|') === want.join('|')) goodIdx = i;
    }
    ok(goodIdx >= 0, 'Ítem ' + (idx + 1) + ': uno de los dos gemelos es el correcto');
    const useIdx = (idx === WRONG_AT) ? (1 - goodIdx) : goodIdx;
    cards[useIdx].click();
    $('it-submit').click();
  } else {
    const btns = $('it-opts').children;
    const exp = spec.expected;
    let hit = null;
    for (let i = 0; i < btns.length; i++) {
      const v = btns[i].textContent.trim();
      if (v === exp || (exp === 'llega' && /Llega/.test(v)) || (exp === 'se_corta' && /corta/.test(v))
          || (exp === 'suena' && /Suena/.test(v)) || (exp === 'silencio' && /silencio/.test(v)))
        hit = btns[i];
    }
    ok(!!hit, 'Ítem ' + (idx + 1) + ': existe una opción que corresponde a "' + exp + '"');
    (idx === WRONG_AT && btns.length > 1 ? (hit === btns[0] ? btns[1] : btns[0]) : hit).click();
    $('it-submit').click();
  }

  ok(visible('it-fb'), 'Ítem ' + (idx + 1) + ': hay feedback inmediato (§5)');
  $('it-next').click();
  step++;
}

head('4. Cierre');
ok(visible('scr-mood'), 'Tras el último ítem se pregunta el mood');
doc.querySelector('[data-mood="2"]').click();
ok(visible('scr-end'), 'Se muestra la pantalla final');

const raw = $('end-log').value;
ok(raw.indexOf('---JSON---') > 0, 'El registro lleva el delimitador ---JSON--- (§3.1)');
const lines = raw.split('---JSON---')[0].trim().split('\n');
ok(lines.length === 3, 'El resumen humano son 3 líneas (§3.1) · hay ' + lines.length);
ok(/^Resultado: \d+ de \d+ \(\d+(\.\d)?%\)$/.test(lines[1]), 'Línea de resultado con el formato §3.1');

let j = null;
try { j = JSON.parse(raw.split('---JSON---')[1]); } catch (e) {}
ok(!!j, 'El bloque JSON pasa JSON.parse');

head('5. Conformidad del registro emitido');
ok(j.schema === 'andre-music-log/v1', 'schema');
ok(j.tool === TOOL && j.category === 'dictado', 'tool y category');
ok(j.scoring === 'auto', 'scoring = auto (§3.6)');
ok(/[+-]\d{2}:\d{2}$/.test(j.session.start), 'timestamp con offset de zona horaria (§3.2)');
ok(j.items.length === 22, 'se registran los 22 ítems · ' + j.items.length);
const scored = j.items.filter(i => typeof i.correct === 'boolean');
ok(scored.length === 18, '18 ítems evaluados · ' + scored.length);
ok(j.items.filter(i => i.correct === null).length === 4,
  '4 ítems de conteo previo con correct: null (§3.2)');
ok(j.score.total === 18 && j.score.correct === scored.filter(i => i.correct).length,
  'score coherente con los ítems');
ok(j.blocks.reduce((a, b) => a + b.total, 0) === 18, 'los blocks suman 18');
ok(!j.blocks.some(b => b.id === 'c_conteo'), 'c_conteo no aparece en blocks (total 0)');
ok(j.items.every(i => 'listens' in i && 'listen_sec' in i),
  'listens y listen_sec presentes en todos los ítems');
ok(!j.items.some(i => 'replays' in i), 'ningún "replays" (§3.2)');
ok(j.items.every(i => i.answered !== null && /^[a-z0-9|_]+$/.test(String(i.answered))),
  'answered siempre en la caja del vocabulario');
ok(j.items.every(i => i.expected !== null), 'expected siempre presente');
ok(j.items.some(i => i.block === 'c_libre' && i.attempts === 2),
  '"Quiero cambiarlo" se refleja como attempts = 2');
ok(j.items.filter(i => i.block === 'b_eleccion')
    .every(i => ['A','B'].indexOf(i.conditions.posicion_correcta) >= 0),
  'b_eleccion registra posicion_correcta');
ok(j.items.filter(i => i.conditions)
    .every(i => !i.conditions.familia
      || ['silencio','division_desigual','hibrida'].indexOf(i.conditions.familia) >= 0),
  'conditions.familia con vocabulario cerrado (v1.1: + hibrida, ítem C3)');
ok(j.items.some(i => i.time_sec > 0),
  'time_sec instrumentado: el ítem con respuesta retrasada mide '
  + j.items[SLOW_AT].time_sec + ' s (§3.2)');
ok(j.items.every(i => i.time_sec >= 0), 'ningún time_sec negativo');
ok(j.mood === 2, 'mood capturado');
ok(scored.some(i => !i.correct), 'el recorrido incluye al menos un fallo (feedback de error probado)');

head('6. Persistencia (§3.3, §3.5)');
const hist = JSON.parse(win.localStorage.getItem('andre_music_history') || '[]');
ok(hist.length === 1 && hist[0].tool === TOOL, 'append en andre_music_history');
const comp = JSON.parse(win.localStorage.getItem('andre_music_completed') || '{}');
ok(comp[TOOL] && comp[TOOL].times === 1, 'andre_music_completed con times = 1');
ok(comp[TOOL].date === j.session.end, 'completed.date = session.end en formato isoLocal');

/* ---------- Volcado del registro simulado ---------- */
const outDir = path.join(__dirname, 'fixtures');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'sesion_simulada_' + TOOL + '.json');
fs.writeFileSync(out, JSON.stringify(j, null, 2));
console.log('\n  registro simulado -> ' + path.relative(process.cwd(), out));

console.log('\n' + (fails === 0 ? '✓ TODO OK' : '✗ ' + fails + ' FALLOS')
  + '  (' + checks + ' comprobaciones)');
process.exit(fails === 0 ? 0 : 1);
