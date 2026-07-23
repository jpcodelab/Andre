/**
 * check_dictado_simple-s5.js
 * Verifica mus_dictado_simple-s5_v1.html:
 *   1. Verificación matemática: cada patrón (correct y distractores) suma
 *      exactamente los pulsos del compás declarado (MUSIC_GUIDE §5).
 *   2. Integridad del banco de preguntas: bloques, compases, topics, opciones.
 *   3. Cobertura en teoria-musica/topics_map.json.
 *   4. Schema, scoring y elementos comunes obligatorios (MUSIC_GUIDE §3, §5).
 *
 * Run: node teoria-musica/tests/check_dictado_simple-s5.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '..', 'mus_dictado_simple-s5_v1.html');
const MAP = path.resolve(__dirname, '..', 'topics_map.json');

let failures = 0;
let checks = 0;
function ok(cond, msg) { checks++; if (!cond) { failures++; console.error('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

if (!fs.existsSync(HTML)) {
  console.error('FAIL: no se encuentra ' + HTML);
  process.exit(1);
}
const src = fs.readFileSync(HTML, 'utf8');

/* ---------------------------------------------------------------- */
/* Carga del banco de preguntas desde el HTML                        */
/* ---------------------------------------------------------------- */
function extractConst(name) {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*');
  const m = re.exec(src);
  if (!m) throw new Error('No se encuentra la constante ' + name);
  const i = m.index + m[0].length;
  const openChar = src[i];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === openChar) depth++;
    else if (src[j] === closeChar) { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error('Constante ' + name + ' sin cerrar');
}

// eslint-disable-next-line no-eval
const DUR = eval('(' + extractConst('DUR') + ')');
// eslint-disable-next-line no-eval
const BLOCKS = eval('(' + extractConst('BLOCKS') + ')');
// eslint-disable-next-line no-eval
const Q = eval(extractConst('Q'));

function sum(tokens) {
  return tokens.reduce((acc, t) => {
    if (!(t in DUR)) throw new Error('Token desconocido: "' + t + '"');
    return acc + DUR[t];
  }, 0);
}
function key(tokens) { return tokens.join('|'); }

const EXPECTED_METER = {
  A: { beats: 2, meter: '2/4' },
  B: { beats: 3, meter: '3/4' },
  C: { beats: 4, meter: '4/4' },
};
const EXPECTED_TOPICS = new Set(['puntillo_negra', 'corcheas', 'semicorcheas', 'silencios', 'blanca']);

/* ---------------------------------------------------------------- */
/* 1. Verificación matemática de los patrones                        */
/* ---------------------------------------------------------------- */
section('1. Verificación matemática de los patrones');

Q.forEach((q, i) => {
  const tag = `pregunta ${i + 1} (${q.topic})`;
  ok(sum(q.correct) === q.beats,
    `${tag}: correct [${q.correct.join(',')}] suma ${sum(q.correct)}, esperado ${q.beats}`);
  q.opts.forEach((o, k) => {
    ok(sum(o) === q.beats,
      `${tag}: opción ${k + 1} [${o.join(',')}] suma ${sum(o)}, esperado ${q.beats}`);
  });
});
console.log(`  ${Q.length} preguntas verificadas.`);

/* ---------------------------------------------------------------- */
/* 2. Integridad del banco de preguntas                               */
/* ---------------------------------------------------------------- */
section('2. Integridad del banco de preguntas');

ok(Q.length === 8, `se esperaban 8 preguntas, hay ${Q.length}`);

Q.forEach((q, i) => {
  const tag = `pregunta ${i + 1}`;
  ok(['A', 'B', 'C'].includes(q.block), `${tag}: bloque desconocido "${q.block}"`);
  ok(!!BLOCKS[q.block], `${tag}: bloque "${q.block}" sin etiqueta en BLOCKS`);

  const exp = EXPECTED_METER[q.block];
  if (exp) {
    ok(q.beats === exp.beats, `${tag}: beats=${q.beats}, se esperaba ${exp.beats} para el bloque ${q.block}`);
    ok(q.meter === exp.meter, `${tag}: meter="${q.meter}", se esperaba "${exp.meter}"`);
  }

  ok(typeof q.topic === 'string' && q.topic.length > 0, `${tag}: falta topic`);
  ok(EXPECTED_TOPICS.has(q.topic), `${tag}: topic "${q.topic}" fuera del vocabulario esperado`);

  ok(Array.isArray(q.opts) && q.opts.length >= 2, `${tag}: se esperan al menos 2 opciones`);
  ok(q.opts.some(o => key(o) === key(q.correct)), `${tag}: la respuesta correcta no está entre las opciones`);

  const keys = q.opts.map(key);
  ok(new Set(keys).size === keys.length, `${tag}: opciones duplicadas`);

  ok(typeof q.hint === 'string' && q.hint.length > 0, `${tag}: falta hint`);
});

// Cada bloque tiene al menos una pregunta
const byBlock = {};
Q.forEach(q => { byBlock[q.block] = (byBlock[q.block] || 0) + 1; });
['A', 'B', 'C'].forEach(b => ok((byBlock[b] || 0) > 0, `bloque ${b}: no tiene preguntas`));

// Todos los topics del vocabulario esperado (los 9 nuevos de dictado) están en uso
const usedTopics = new Set(Q.map(q => q.topic));
EXPECTED_TOPICS.forEach(t => ok(usedTopics.has(t), `topic "${t}" esperado pero no usado en ninguna pregunta`));

/* ---------------------------------------------------------------- */
/* 3. Cobertura en topics_map.json                                    */
/* ---------------------------------------------------------------- */
section('3. Cobertura en topics_map.json');

if (fs.existsSync(MAP)) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const groups = map._valid_groups || [];
  usedTopics.forEach(t => {
    ok(Object.prototype.hasOwnProperty.call(map, t), `topic "${t}" no está en topics_map.json`);
    if (map[t]) {
      ok(map[t] === 'ritmo', `topic "${t}" mapea a "${map[t]}", se esperaba "ritmo"`);
      ok(groups.includes(map[t]), `grupo "${map[t]}" de "${t}" no está en _valid_groups`);
    }
  });
  console.log(`  ${usedTopics.size} topics granulares comprobados.`);
} else {
  console.log('  topics_map.json no encontrado en ' + MAP + ' — omitido.');
}

/* ---------------------------------------------------------------- */
/* 4. Schema, scoring y elementos comunes obligatorios                */
/* ---------------------------------------------------------------- */
section('4. Schema, scoring y elementos comunes');

ok(/schema:\s*'andre-music-log\/v1'/.test(src), 'schema incorrecto o ausente');
// tool/category pueden ir como literal directo ('mus_dictado_simple-s5_v1')
// o como referencia a una constante (const TOOL='mus_dictado_simple-s5_v1' ... tool:TOOL),
// patrón ya usado en otras herramientas de esta serie.
const toolOk = /tool:\s*'mus_dictado_simple-s5_v1'/.test(src) ||
  (/\bTOOL\s*=\s*'mus_dictado_simple-s5_v1'/.test(src) && /tool:\s*TOOL\b/.test(src));
ok(toolOk, 'tool incorrecto o ausente');
const catOk = /category:\s*'dictado'/.test(src) ||
  (/\bCAT\s*=\s*'dictado'/.test(src) && /category:\s*CAT\b/.test(src));
ok(catOk, 'category incorrecta o ausente');
ok(/scoring:\s*'auto'/.test(src), 'scoring incorrecto o ausente (se esperaba "auto")');
ok(/function isoLocal\(/.test(src), 'falta el helper isoLocal');
ok(/andre_music_history/.test(src), 'no persiste en andre_music_history');
ok(/mood:\s*state\.mood/.test(src), 'no registra mood');
ok(/class="warn"/.test(src) && /sonido/i.test(src), 'falta el aviso de "requiere sonido" en la pantalla inicial');
ok(/class="navbar"/.test(src) && /Volver al índice/.test(src), 'falta la barra de navegación con enlace al índice');

/* ---------------------------------------------------------------- */
section(`\n${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) {
  console.error(`${failures} FALLO(S).`);
  process.exit(1);
}
console.log('OK — mus_dictado_simple-s5_v1 conforme.');
