#!/usr/bin/env node
/**
 * check_ataque_duracion.js
 * Valida mus_audicion_ataque-duracion_v1.html contra MUSIC_GUIDE.md v1.5
 *
 * Uso:
 *   node teoria-musica/tests/check_ataque_duracion.js
 *   node teoria-musica/tests/check_ataque_duracion.js teoria-musica/data/2026-07-26_mus_audicion_ataque-duracion_v1.json
 *
 * El segundo modo cumple §5: "El script de test valida además un registro de
 * sesión real pasado como argumento".
 *
 * Nombrado check_ (no test_) para seguir la convención real de los tests por
 * herramienta en este repo (check_puente_sincopa_v2.js, check_silencio_sostenido_v1.js,
 * check_dictado_simple-s5.js, check_dictado_melodico-s1.js, check_dictado_3-8.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'mus_audicion_ataque-duracion_v1.html');
const SESSION_FILE = process.argv[2] || null;

const EPS = 1e-9;
let errors = 0, checks = 0;

function fail(m) { errors++; console.log('  FALLO  ' + m); }
function ok(m) { checks++; console.log('  ok     ' + m); }
function assert(c, m) { if (c) { ok(m); } else { fail(m); } }
function near(a, b) { return Math.abs(a - b) < 1e-6; }
function isInt(x) { return Math.abs(x - Math.round(x)) < 1e-6; }

/* ================================================================= */
console.log('\n== 1. Extracción y convenciones (§2, §3) ==');

if (!fs.existsSync(HTML)) { console.log('  FALLO  no existe ' + HTML); process.exit(1); }
const src = fs.readFileSync(HTML, 'utf8');

const m = src.match(/<script id="items-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.log('  FALLO  no se encuentra <script id="items-data">'); process.exit(1); }

let DATA;
try { DATA = JSON.parse(m[1]); ok('items-data parsea como JSON'); }
catch (e) { console.log('  FALLO  items-data no parsea: ' + e.message); process.exit(1); }

const TOOL = DATA.tool;
const BEATS = DATA.compas[0];

assert(TOOL === 'mus_audicion_ataque-duracion_v1', 'tool = ' + TOOL);
assert(/^mus_(teoria|mapa|dictado|audicion|util)_[a-z0-9-]+_v\d+$/.test(TOOL),
  '§2 nombre conforme al patrón mus_[categoria]_[tema]_v[N]');
assert(DATA.category === 'audicion', '§1 category = audicion');
assert(['auto', 'self', 'self_guarded'].indexOf(DATA.scoring) !== -1,
  '§3.6 scoring declarado y válido (' + DATA.scoring + ')');
assert(DATA.scoring === 'auto', '§3.6 scoring = auto (corrección algorítmica real)');
assert(BEATS === 4, 'compás de ' + BEATS + ' pulsos');

/* claves y helpers exigidos */
const req = [
  [/LS_KEY\s*=\s*'andre_'\s*\+\s*TOOL|andre_mus_audicion_ataque-duracion_v1/,
   '§2 clave localStorage derivada mecánicamente del nombre de fichero'],
  [/andre_music_history/, '§3.3 append a andre_music_history'],
  [/andre_music_completed/, '§3.5 escribe andre_music_completed'],
  [/times:\s*\(prev/, '§3.5 contador times incremental desde el valor anterior'],
  [/function isoLocal/, '§3.4 helper isoLocal'],
  [/---JSON---/, '§3.1 delimitador ---JSON---'],
  [/schema:\s*'andre-music-log\/v1'/, '§3.2 schema andre-music-log/v1'],
  [/Copiar registro/, '§3.1 botón "Copiar registro"'],
  [/document\.execCommand\('copy'\)/, '§3.1 copia vía execCommand (file://)'],
  [/navigator\.clipboard/, '§3.1 fallback navigator.clipboard (https)'],
  [/class="navbar"/, '§5 barra de navegación'],
  [/Reiniciar ejercicio/, '§5 botón Reiniciar ejercicio'],
  [/\.\.\/index\.html#lenguaje-musical/, '§5 enlace al índice'],
  [/confirm\(/, '§5 reinicio con confirmación'],
  [/removeItem\(LS_KEY\)/, '§5 el reinicio borra SOLO la clave propia'],
  [/listens:/, '§3.2 campo listens'],
  [/listen_sec:/, '§3.2 campo listen_sec'],
  [/reviewing/, '§3.7 flag de modo repaso'],
  [/necesita sonido|Necesitas sonido/i, '§5 advertencia de audio en pantalla inicial']
];
req.forEach(r => assert(r[0].test(src), r[1]));

/* el reinicio NO puede tocar el histórico (§3.5 regla dura) */
assert(!/removeItem\(\s*HIST_KEY|removeItem\(\s*'andre_music_history'/.test(src),
  '§3.5 regla dura: andre_music_history no se borra desde la herramienta');

/* sin dependencias externas salvo Google Fonts */
const ext = (src.match(/https?:\/\/[^"' )]+/g) || [])
  .filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u))
  .filter(u => !/^https?:\/\/www\.w3\.org/.test(u));
assert(ext.length === 0, '§5 sin dependencias externas salvo Google Fonts'
  + (ext.length ? ' — encontradas: ' + ext.join(', ') : ''));

/* ================================================================= */
console.log('\n== 2. Verificación matemática del compás (§5) ==');

function measureSum(pattern) {
  const evs = pattern.slice().sort((a, b) => a.s - b.s);
  let cursor = 0, total = 0;
  for (const ev of evs) {
    if (ev.s < cursor - EPS) { return { total: NaN, why: 'solapamiento en s=' + ev.s }; }
    total += (ev.s - cursor) + ev.d;
    cursor = ev.s + ev.d;
  }
  return { total: total + (BEATS - cursor), why: null };
}

function allPatterns() {
  const out = [];
  for (const b of DATA.blocks) {
    (b.demos || []).forEach((d, i) => out.push({
      id: b.id + '.demo' + (i + 1), block: b, pat: d.pattern,
      expected: d.answer, target: d.target
    }));
    (b.items || []).forEach(it => out.push({
      id: b.id + '.item' + it.n, block: b, pat: it.pattern,
      expected: it.expected, target: it.target, topic: it.topic
    }));
  }
  return out;
}

const ALL = allPatterns();
for (const p of ALL) {
  const r = measureSum(p.pat);
  if (r.why) { fail(p.id + ': ' + r.why); }
  else { assert(near(r.total, BEATS), p.id + ': suma ' + r.total + ' = ' + BEATS); }
}

/* ================================================================= */
console.log('\n== 3. Coherencia patrón <-> respuesta esperada ==');

function soundingAt(pattern, beat) {
  return pattern.some(ev => ev.s <= beat + EPS && (ev.s + ev.d) > beat + 1e-6);
}

for (const p of ALL.filter(x => x.block.id === 'b1')) {
  const want = p.expected === 'un_golpe' ? 1 : 2;
  assert(p.pat.length === want, p.id + ': ' + p.pat.length + ' ataque(s) -> "' + p.expected + '"');
}

for (const p of ALL.filter(x => x.block.id === 'b2')) {
  assert(typeof p.target === 'number' && p.target >= 1 && p.target <= BEATS,
    p.id + ': target válido (' + p.target + ')');
  const beat = p.target - 1;
  const sounds = soundingAt(p.pat, beat);
  assert(sounds === (p.expected === 'sigue_sonando'),
    p.id + ': pulso ' + p.target + ' ' + (sounds ? 'suena' : 'en silencio') + ' -> "' + p.expected + '"');
  assert(!p.pat.some(ev => near(ev.s, beat)),
    p.id + ': sin reataque en el pulso objetivo (mediría reataque, no prolongación)');
}

for (const p of ALL.filter(x => x.block.id === 'b3')) {
  assert(p.pat.length === 1, p.id + ': un solo ataque');
  assert(isInt(p.pat[0].s) === (p.expected === 'en_pulso'),
    p.id + ': ataque en s=' + p.pat[0].s + ' -> "' + p.expected + '"');
}

console.log('\n== 4. Definiciones normal / contratiempo / síncopa (§5) ==');

function crossesAPulse(ev) {
  if (isInt(ev.s)) { return false; }
  const next = Math.ceil(ev.s - 1e-6);
  return next < BEATS && (ev.s + ev.d) > next + 1e-6;
}

for (const p of ALL.filter(x => x.block.id === 'b4')) {
  const starts = p.pat.map(e => e.s);
  const allOn = starts.every(isInt);
  const allOff = starts.every(s => !isInt(s));
  let silent = 0;
  for (let i = 0; i < BEATS; i++) { if (!soundingAt(p.pat, i)) { silent++; } }
  const allSilent = silent === BEATS;
  const crossing = p.pat.some(crossesAPulse);

  if (p.expected === 'normal') {
    assert(allOn, p.id + ' [normal]: notas coinciden con pulsos');
    assert(!crossing, p.id + ' [normal]: sin nota que cruce un pulso desde parte débil');
  } else if (p.expected === 'contratiempo') {
    assert(allOff, p.id + ' [contratiempo]: notas solo en partes débiles');
    assert(allSilent, p.id + ' [contratiempo]: los ' + BEATS + ' pulsos en silencio');
    assert(!crossing, p.id + ' [contratiempo]: ninguna nota atraviesa un pulso');
  } else if (p.expected === 'sincopa') {
    assert(crossing, p.id + ' [síncopa]: nota empieza en parte débil y atraviesa un pulso');
    assert(!allSilent, p.id + ' [síncopa]: no todos los pulsos en silencio (sería contratiempo)');
  } else {
    fail(p.id + ': categoría desconocida "' + p.expected + '"');
  }
}

/* ================================================================= */
console.log('\n== 5. Checklist de evaluativas (§5) ==');

for (const b of DATA.blocks) {
  assert((b.demos || []).length >= 1, b.id + ': demo antes de la primera pregunta evaluada');
  const vocab = b.options.map(o => o.value);
  vocab.forEach(v => assert(/^[a-z0-9_]+$/.test(v),
    b.id + ': valor de vocabulario "' + v + '" en minúsculas sin tildes'));
  b.items.forEach(it => {
    assert(vocab.indexOf(it.expected) !== -1,
      b.id + '.item' + it.n + ': expected "' + it.expected + '" en el vocabulario del bloque');
    assert(typeof it.explain === 'string' && it.explain.length > 20,
      b.id + '.item' + it.n + ': feedback con explicación del porqué');
  });
  const counts = {};
  b.items.forEach(it => { counts[it.expected] = (counts[it.expected] || 0) + 1; });
  assert(Object.keys(counts).length >= 2,
    b.id + ': al menos 2 respuestas distintas ' + JSON.stringify(counts));
  const maxShare = Math.max.apply(null, Object.values(counts)) / b.items.length;
  assert(maxShare <= 0.6 + EPS,
    b.id + ': ninguna respuesta supera el 60% (max ' + Math.round(maxShare * 100) + '%)');
}

/* topics mapeados (§4.2) */
const MAPFILE = path.join(__dirname, '..', 'topics_map.json');
if (fs.existsSync(MAPFILE)) {
  const map = JSON.parse(fs.readFileSync(MAPFILE, 'utf8'));
  const topics = new Set();
  DATA.blocks.forEach(b => b.items.forEach(it => topics.add(it.topic)));
  topics.forEach(t => assert(Object.prototype.hasOwnProperty.call(map, t),
    '§4.2 topic "' + t + '" mapeado en topics_map.json'));
} else {
  console.log('  aviso  topics_map.json no encontrado — §4.2 no verificada');
}

/* ================================================================= */
console.log('\n== 6. Registro de sesión real (§5) ==');

if (!SESSION_FILE) {
  console.log('  aviso  sin fichero de sesión. Tras la primera sesión de André, ejecutar:');
  console.log('         node ' + path.relative(process.cwd(), __filename)
    + ' teoria-musica/data/YYYY-MM-DD_' + TOOL + '.json');
} else {
  const s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  const vocab = new Set();
  DATA.blocks.forEach(b => b.options.forEach(o => vocab.add(o.value)));
  const expectedTotal = DATA.blocks.reduce((a, b) => a + b.items.length, 0);
  const tzRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

  assert(s.schema === 'andre-music-log/v1', '§3.2 schema correcto');
  assert(s.tool === TOOL, '§3.2 tool coincide');
  assert(s.category === 'audicion', '§3.2 category correcta');
  assert(['auto', 'self', 'self_guarded'].indexOf(s.scoring) !== -1, '§3.6 scoring presente');
  assert(tzRe.test(s.session.start) && tzRe.test(s.session.end),
    '§3.2 timestamps ISO 8601 con offset de zona horaria');
  assert(s.items.length === expectedTotal,
    '§3.2 ' + s.items.length + ' ítems registrados (esperados ' + expectedTotal + ')');

  const scored = s.items.filter(i => typeof i.correct === 'boolean');
  const nOk = scored.filter(i => i.correct).length;
  assert(s.score.correct === nOk && s.score.total === scored.length,
    '§3.2 score coherente con items (' + nOk + '/' + scored.length + ')');
  assert(near(s.score.pct, Math.round(nOk / scored.length * 1000) / 10),
    '§3.2 pct redondeado a 1 decimal y coherente');
  assert(s.blocks.every(b => b.total > 0), '§3.2 sin bloques con total 0');
  assert(s.blocks.reduce((a, b) => a + b.total, 0) === scored.length,
    '§3.2 los bloques suman el total puntuado');
  assert(s.mood === null || [1, 2, 3].indexOf(s.mood) !== -1, '§3.2 mood válido');

  let badVocab = 0, zeroTime = 0, noListens = 0, badListen = 0;
  s.items.forEach(i => {
    if (!vocab.has(i.answered) || !vocab.has(i.expected)) { badVocab++; }
    if (i.time_sec === 0) { zeroTime++; }
    if (typeof i.listens !== 'number' || i.listens < 1) { noListens++; }
    if (typeof i.listen_sec !== 'number' || i.listen_sec < i.listens) { badListen++; }
  });
  assert(badVocab === 0, '§3.2 expected/answered en el vocabulario en los ' + s.items.length + ' ítems');
  assert(noListens === 0, '§3.2 listens presente y >= 1 en todos los ítems');
  assert(badListen === 0, '§3.2 listen_sec presente y coherente con listens');
  assert(zeroTime < s.items.length,
    '§3.2 time_sec no es 0 en todos los ítems (0 global = fallo de instrumentación)');

  /* señal diagnóstica, no un fallo */
  const heavy = s.items.filter(i => i.listens >= 3);
  if (heavy.length) {
    console.log('  nota   ' + heavy.length + ' ítem(s) con 3+ escuchas: '
      + heavy.map(i => 'n' + i.n + ' (' + i.topic + ', ' + (i.correct ? 'acierto' : 'fallo') + ')').join(', '));
  }
}

/* ================================================================= */
console.log('\n== 7. Limitación conocida (documentada en §6) ==');
console.log('  nota   Síncopa y contratiempo solo a nivel de subdivisión (corchea).');
console.log('         La síncopa a nivel de pulso (negra-blanca-negra) queda fuera:');
console.log('         empieza EN un pulso y rompería la regla de decisión del bloque 4.');
console.log('         Pendiente de paso posterior en la secuencia §6.');

console.log('\n== Resumen ==');
console.log('  comprobaciones OK: ' + checks);
console.log('  fallos:            ' + errors);
process.exit(errors === 0 ? 0 : 1);
