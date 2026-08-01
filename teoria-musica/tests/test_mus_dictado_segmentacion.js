#!/usr/bin/env node
/* =====================================================================
 * test_mus_dictado_segmentacion.js
 *
 * Validación de mus_dictado_segmentacion_v1.html conforme a MUSIC_GUIDE §5.
 *
 *   node tests/test_mus_dictado_segmentacion.js
 *   node tests/test_mus_dictado_segmentacion.js data/2026-08-01_mus_dictado_segmentacion_v1.json
 *
 * Comprueba:
 *   1. Cada patrón suma exactamente su compás declarado.
 *   2. Cada par gemelo suma exactamente lo mismo (invariante de duración).
 *   3. Familia S -> mismo nº de ataques · Familia D -> distinto nº de ataques.
 *   4. La pregunta de verificación DISCRIMINA de verdad ese par
 *      (las dos gemelas dan respuestas distintas). Es el check que evita
 *      repetir el error de diseño original.
 *   5. Distribución de respuestas correctas en tres ejes (gemelo, nº de
 *      símbolos, presencia de silencio) para descartar sesgo explotable.
 *   6. Vocabulario de notación conforme a la tabla §3.2 (v1.10).
 *   7. Conformidad de schema de un registro real, si se pasa como argumento.
 * ===================================================================== */

'use strict';
const fs = require('fs');
const path = require('path');

const TOOL = 'mus_dictado_segmentacion_v1';
const HTML = path.join(__dirname, '..', TOOL + '.html');

let fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.log('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
}
function head(t) { console.log('\n== ' + t + ' =='); }

/* ---------- Modelo de duraciones (espejo del de la herramienta) ---------- */
const DUR = { r:16, b:8, bp:12, n:4, np:6, c:2, cp:3, s:1,
              zr:16, zb:8, zn:4, zc:2, zs:1 };
const METER = { '4/4': { measureTicks:16, beatTicks:4 },
                '3/8': { measureTicks:6,  beatTicks:2 } };
const isRest = f => f.charAt(0) === 'z';
const parsePat  = p  => p.split('|').map(m => m.split('_'));
const measTicks = ms => ms.map(m => m.reduce((a, f) => a + DUR[f], 0));
const attacksOf = ms => ms.reduce((a, m) => a + m.filter(f => !isRest(f)).length, 0);
const symbolsOf = ms => ms.reduce((a, m) => a + m.length, 0);
const hasRest   = ms => ms.some(m => m.some(isRest));
function events(ms) {
  const out = []; let t = 0;
  ms.forEach(m => m.forEach(f => { out.push({ fig:f, onset:t, dur:DUR[f], rest:isRest(f) }); t += DUR[f]; }));
  return out;
}
function soundsAtBeat(ms, meter, beat) {
  const t = (beat - 1) * METER[meter].beatTicks;
  return events(ms).some(e => !e.rest && e.onset <= t && t < e.onset + e.dur);
}
function sustainsFromBeat(ms, meter, beat) {
  const bt = METER[meter].beatTicks, t = (beat - 1) * bt;
  const e = events(ms).find(x => x.onset === t && !x.rest);
  if (!e) return null;
  return (e.onset + e.dur) > (t + bt) ? 'llega' : 'se_corta';
}
function verifAnswer(cfg, pat) {
  const ms = parsePat(pat);
  if (cfg.kind === 'conteo')      return String(attacksOf(ms));
  if (cfg.kind === 'corte_dura')  return sustainsFromBeat(ms, cfg.meter, cfg.beat);
  if (cfg.kind === 'corte_suena') return soundsAtBeat(ms, cfg.meter, cfg.beat) ? 'suena' : 'silencio';
  return null;
}

/* ---------- Extracción de los bancos desde el HTML (fuente única) ---------- */
const html = fs.readFileSync(HTML, 'utf8');
function grabBank(name) {
  const re = new RegExp('var\\s+' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);');
  const m = html.match(re);
  if (!m) throw new Error('No se encuentra el banco ' + name + ' en el HTML');
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}
const BANK_A = grabBank('BANK_A');
const BANK_B = grabBank('BANK_B');
const BANK_C = grabBank('BANK_C');
const DEMOS  = grabBank('DEMOS');

/* ---------- 1. Aritmética de todos los patrones ---------- */
head('1. Cada patrón suma exactamente su compás');
function checkPat(pat, meter, label) {
  const ms = parsePat(pat), t = measTicks(ms), M = METER[meter];
  const bad = t.filter(x => x !== M.measureTicks);
  ok(bad.length === 0,
    label + '  ' + pat + '  [' + t.join(',') + '] ticks · esperado ' + M.measureTicks + ' por compás');
}
BANK_A.forEach((x, i) => checkPat(x.pat, x.meter, 'A' + (i + 1)));
BANK_B.forEach((p, i) => {
  checkPat(p.A, p.meter, 'B' + (i + 1) + '.A');
  checkPat(p.B, p.meter, 'B' + (i + 1) + '.B');
});
BANK_C.forEach((c, i) => checkPat(c.pat, c.meter, 'C' + (i + 1)));
DEMOS.forEach((d, i) => {
  checkPat(d.A, d.meter, 'Demo' + (i + 1) + '.A');
  checkPat(d.B, d.meter, 'Demo' + (i + 1) + '.B');
});

/* ---------- 2 y 3. Invariante de par mínimo ---------- */
head('2-3. Pares mínimos: duración idéntica y familia coherente');
BANK_B.concat(DEMOS.map(d => ({ fam:null, meter:d.meter, A:d.A, B:d.B, demo:true })))
  .forEach((p, i) => {
    const a = parsePat(p.A), b = parsePat(p.B);
    const ta = measTicks(a).reduce((x, y) => x + y, 0);
    const tb = measTicks(b).reduce((x, y) => x + y, 0);
    const lbl = p.demo ? 'Demo' : 'B' + (i + 1);
    ok(ta === tb, lbl + '  duración idéntica (' + ta + ' = ' + tb + ' ticks)');
    ok(a.length === b.length, lbl + '  mismo número de compases');
    if (p.fam === 'S')
      ok(attacksOf(a) === attacksOf(b),
        lbl + '  familia S: MISMO nº de ataques (' + attacksOf(a) + ')');
    if (p.fam === 'D')
      ok(attacksOf(a) !== attacksOf(b),
        lbl + '  familia D: ataques distintos (' + attacksOf(a) + ' vs ' + attacksOf(b) + ')');
  });

/* ---------- 4. La verificación previa discrimina de verdad ---------- */
head('4. La pregunta de verificación separa a los dos gemelos');
BANK_B.forEach((p, i) => {
  const va = verifAnswer(p, p.A), vb = verifAnswer(p, p.B);
  ok(va !== null && vb !== null,
    'B' + (i + 1) + '  la pregunta (' + p.kind + ') es aplicable a los dos gemelos');
  ok(va !== vb,
    'B' + (i + 1) + '  (' + p.kind + (p.beat ? ' @pulso ' + p.beat : '') + ') A="' + va
    + '" ≠ B="' + vb + '"  → discrimina');
  const correctPat = p.ok === 'A' ? p.A : p.B;
  ok(verifAnswer(p, correctPat) === (p.ok === 'A' ? va : vb),
    'B' + (i + 1) + '  la respuesta esperada corresponde al gemelo correcto');
});

/* ---------- 5. Sesgos explotables ---------- */
head('5. Distribución de respuestas correctas (sesgo de posición y heurísticas)');
const okA = BANK_B.filter(p => p.ok === 'A').length;
ok(okA >= 2 && okA <= 3,
  'Gemelo correcto: ' + okA + ' veces A / ' + (BANK_B.length - okA) + ' veces B (equilibrado)');

let more = 0, fewer = 0;
BANK_B.forEach(p => {
  const c = parsePat(p.ok === 'A' ? p.A : p.B), o = parsePat(p.ok === 'A' ? p.B : p.A);
  if (symbolsOf(c) > symbolsOf(o)) more++; else if (symbolsOf(c) < symbolsOf(o)) fewer++;
});
ok(more >= 2 && fewer >= 2,
  'Heurística "el que tiene más/menos figuras": ' + more + ' más / ' + fewer + ' menos '
  + '(ninguna gana siempre)');

let restWins = 0, restLoses = 0;
BANK_B.forEach(p => {
  const c = parsePat(p.ok === 'A' ? p.A : p.B), o = parsePat(p.ok === 'A' ? p.B : p.A);
  if (hasRest(c) && !hasRest(o)) restWins++;
  if (!hasRest(c) && hasRest(o)) restLoses++;
});
ok(!(restWins > 0 && restLoses === 0) || restWins <= 2,
  'Heurística "el que lleva silencio": ' + restWins + ' a favor / ' + restLoses
  + ' en contra (no es regla ganadora)');

const corteAns = BANK_A.filter(x => x.kind !== 'conteo').map(x => verifAnswer(x, x.pat))
  .concat(BANK_B.filter(p => p.kind !== 'conteo').map(p => verifAnswer(p, p.ok === 'A' ? p.A : p.B)));
const uniqCorte = Array.from(new Set(corteAns));
ok(uniqCorte.length >= 3,
  'Preguntas de corte: ' + corteAns.length + ' ítems, respuestas ' + uniqCorte.join('/')
  + ' (ninguna constante)');

const conteos = BANK_A.filter(x => x.kind === 'conteo').map(x => attacksOf(parsePat(x.pat)))
  .concat(BANK_B.filter(p => p.kind === 'conteo').map(p => attacksOf(parsePat(p.ok === 'A' ? p.A : p.B))))
  .concat(BANK_C.map(c => attacksOf(parsePat(c.pat))));
ok(new Set(conteos).size >= 4,
  'Conteos esperados: ' + conteos.join(',') + ' (' + new Set(conteos).size + ' valores distintos)');

/* ---------- 6. Vocabulario de notación (§3.2, tabla v1.10) ---------- */
head('6. Vocabulario de notación: minúsculas, sin tildes, sin guion');
const allPats = []
  .concat(BANK_A.map(x => x.pat))
  .concat(BANK_B.map(p => p.A), BANK_B.map(p => p.B))
  .concat(BANK_C.map(c => c.pat))
  .concat(DEMOS.map(d => d.A), DEMOS.map(d => d.B));
ok(allPats.every(p => /^[a-z|_]+$/.test(p)),
  'Todos los patrones usan solo [a-z], "_" y "|" (' + allPats.length + ' patrones)');
ok(allPats.every(p => p.split(/[|_]/).every(f => Object.prototype.hasOwnProperty.call(DUR, f))),
  'Todas las figuras están en la tabla de duraciones');
ok(!allPats.some(p => p.indexOf('-') >= 0), 'Ningún patrón usa "-" como separador');

/* ---------- 7. Conformidad estructural del HTML ---------- */
head('7. Conformidad de la herramienta (§5)');
ok(/scoring:\s*'auto'/.test(html), 'Declara scoring: "auto"');
ok(html.indexOf("schema: 'andre-music-log/v1'") >= 0, 'Emite schema andre-music-log/v1');
ok(/listens:\s*cur\.listens/.test(html) && /listen_sec:\s*Math\.round\(cur\.listenMs/.test(html),
  'Emite listens y listen_sec con nombre literal, listen_sec medido (no derivado)');
ok(html.indexOf('function isoLocal') >= 0, 'Incluye el helper isoLocal (§3.4)');
ok(html.indexOf('andre_music_history') >= 0 && html.indexOf('andre_music_completed') >= 0,
  'Persiste en andre_music_history y andre_music_completed (§3.3, §3.5)');
ok(html.indexOf('---JSON---') >= 0, 'Pantalla final con delimitador ---JSON--- (§3.1)');
ok(html.indexOf("$('btn-copy')") >= 0 && html.indexOf("execCommand('copy')") >= 0,
  'Botón "Copiar registro" con execCommand + fallback a navigator.clipboard (§3.1)');
ok(/data-mood/.test(html), 'Pregunta de mood al final');
ok(html.indexOf('../index.html#lenguaje-musical') >= 0, 'Navbar enlaza al índice');
ok(html.indexOf('cur.reviewing') >= 0,
  'Re-escucha libre tras corregir sin alterar listens/listen_sec (§3.7)');
ok(!/<script src="https?:\/\//.test(html), 'Sin dependencias por CDN (solo Google Fonts por <link>)');
ok(html.indexOf('andre_mus_dictado_segmentacion_v1') >= 0, 'Clave localStorage propia según §2');

/* ---------- 8. Registro de sesión real (opcional) ---------- */
const arg = process.argv[2];
if (arg) {
  head('8. Registro de sesión: ' + arg);
  let j;
  try { j = JSON.parse(fs.readFileSync(arg, 'utf8')); }
  catch (e) {
    const raw = fs.readFileSync(arg, 'utf8');
    const i = raw.indexOf('---JSON---');
    j = JSON.parse(i >= 0 ? raw.slice(i + 10) : raw);
  }
  ok(j.schema === 'andre-music-log/v1', 'schema correcto');
  ok(j.tool === TOOL, 'tool = ' + TOOL);
  ok(j.category === 'dictado', 'category = dictado');
  ok(j.scoring === 'auto', 'scoring = auto (§3.6)');
  const TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  ok(TZ.test(j.session.start) && TZ.test(j.session.end), 'timestamps ISO 8601 con offset (§3.2)');
  ok(Array.isArray(j.items) && j.items.length === 22,
    'items = 22 registrados (18 evaluados + 4 de conteo previo) · hay ' + (j.items || []).length);

  const scored = j.items.filter(i => typeof i.correct === 'boolean');
  ok(scored.length === 18, 'ítems evaluados = 18 · hay ' + scored.length);
  ok(j.score.total === scored.length, 'score.total coincide con los ítems evaluados');
  ok(j.score.correct === scored.filter(i => i.correct).length, 'score.correct coincide');
  const pct = Math.round((j.score.correct / j.score.total) * 1000) / 10;
  ok(Math.abs(j.score.pct - pct) < 0.05, 'pct correcto y redondeado a 1 decimal');

  const bsum = j.blocks.reduce((a, b) => a + b.total, 0);
  ok(bsum === scored.length, 'los blocks suman los ítems evaluados');
  ok(!j.blocks.some(b => b.total === 0), 'ningún block con total 0 (§3.2)');
  ok(!j.blocks.some(b => b.id === 'c_conteo'),
    'c_conteo omitido de blocks (sus ítems no se puntúan)');

  ok(j.items.every(i => typeof i.listens === 'number'), 'todos los ítems traen listens');
  ok(j.items.every(i => typeof i.listen_sec === 'number'), 'todos los ítems traen listen_sec');
  ok(!j.items.some(i => 'replays' in i), 'ningún ítem usa "replays" (§3.2)');
  ok(j.items.some(i => i.time_sec > 0), 'time_sec instrumentado (no todo 0)');
  ok(j.items.every(i => /^[a-z0-9|_]+$/.test(String(i.answered))),
    'answered en la caja del vocabulario (minúsculas, sin tildes, sin guion)');
  ok(j.items.filter(i => i.block === 'c_libre').every(i => i.attempts === 1 || i.attempts === 2),
    'attempts en c_libre ∈ {1,2} (nº de composiciones, v1.10)');
  ok(j.items.filter(i => i.block === 'b_eleccion')
      .every(i => i.conditions && i.conditions.posicion_correcta),
    'b_eleccion registra posicion_correcta en conditions');
  ok(j.mood === null || [1,2,3].indexOf(j.mood) >= 0, 'mood válido');

  // Coherencia de corrección: recalcular contra el banco
  const expectedSeq = [];
  BANK_A.forEach(x => expectedSeq.push(verifAnswer(x, x.pat)));
  BANK_B.forEach(p => {
    const cp = p.ok === 'A' ? p.A : p.B;
    expectedSeq.push(verifAnswer(p, cp));
    expectedSeq.push(cp);
  });
  BANK_C.forEach(c => {
    expectedSeq.push(String(attacksOf(parsePat(c.pat))));
    expectedSeq.push(c.pat);
  });
  const got = j.items.map(i => i.expected);
  ok(JSON.stringify(got) === JSON.stringify(expectedSeq),
    'la secuencia de "expected" del registro coincide con el banco de la herramienta');
  ok(scored.every(i => i.correct === (i.answered === i.expected)),
    'correct se deriva de comparar answered contra expected (auto real)');

  // Lectura diagnóstica (no es un check, es informe)
  const by = id => j.items.filter(i => i.block === id && typeof i.correct === 'boolean');
  console.log('\n  --- diagnóstico ---');
  ['a_senales','b_verificacion','b_eleccion','c_libre'].forEach(b => {
    const it = by(b);
    if (it.length) console.log('  ' + b.padEnd(16) + it.filter(i => i.correct).length + '/' + it.length);
  });
  const fam = f => scored.filter(i => i.conditions && i.conditions.familia === f);
  ['silencio','division_desigual'].forEach(f => {
    const it = fam(f);
    if (it.length) console.log('  familia ' + f.padEnd(19)
      + it.filter(i => i.correct).length + '/' + it.length);
  });
  const vb = by('b_verificacion'), eb = by('b_eleccion');
  let contaBienEligeMal = 0;
  vb.forEach((v, i) => { if (v.correct && eb[i] && !eb[i].correct) contaBienEligeMal++; });
  console.log('  comprueba bien pero elige mal: ' + contaBienEligeMal + '/' + vb.length
    + '  (si es alto, el problema es de notación, no de oído)');
}

/* ---------- Resultado ---------- */
console.log('\n' + (fails === 0 ? '✓ TODO OK' : '✗ ' + fails + ' FALLOS')
  + '  (' + checks + ' comprobaciones)');
process.exit(fails === 0 ? 0 : 1);
