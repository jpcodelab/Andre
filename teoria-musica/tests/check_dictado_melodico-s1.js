/**
 * check_dictado_melodico-s1.js
 * Verifica mus_dictado_melodico-s1_v1.html:
 *   1. Integridad del banco de notas (NOTES) y de preguntas (Q).
 *   2. La respuesta correcta de cada pregunta está entre sus opciones,
 *      calculada con el mismo criterio que usa la propia herramienta.
 *   3. Cobertura en teoria-musica/topics_map.json (grupo melodia_oido).
 *   4. Schema, scoring y elementos comunes obligatorios (MUSIC_GUIDE §3, §5).
 *
 * Run: node teoria-musica/tests/check_dictado_melodico-s1.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '..', 'mus_dictado_melodico-s1_v1.html');
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
/* Carga del banco de notas y preguntas desde el HTML                */
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
const NOTES = eval('(' + extractConst('NOTES') + ')');
// eslint-disable-next-line no-eval
const BLOCKS = eval('(' + extractConst('BLOCKS') + ')');
// eslint-disable-next-line no-eval
const Q = eval(extractConst('Q'));

function names(keys) { return keys.map(k => NOTES[k].name).join(' → '); }
function correctAnswer(q) { return q.target.length > 1 ? names(q.target) : NOTES[q.target[0]].name; }

const EXPECTED_TOPIC_BY_BLOCK = { A: 'nota_vecina', B: 'nota_escala', C: 'fragmento_2notas' };
const EXPECTED_TOPICS = new Set(Object.values(EXPECTED_TOPIC_BY_BLOCK));

/* ---------------------------------------------------------------- */
/* 1. Integridad del banco de notas y preguntas                      */
/* ---------------------------------------------------------------- */
section('1. Integridad del banco de notas y preguntas');

ok(Q.length === 10, `se esperaban 10 preguntas, hay ${Q.length}`);

Q.forEach((q, i) => {
  const tag = `pregunta ${i + 1}`;
  ok(['A', 'B', 'C'].includes(q.block), `${tag}: bloque desconocido "${q.block}"`);
  ok(!!BLOCKS[q.block], `${tag}: bloque "${q.block}" sin etiqueta en BLOCKS`);
  ok(q.topic === EXPECTED_TOPIC_BY_BLOCK[q.block],
    `${tag}: topic "${q.topic}" no corresponde al bloque ${q.block} (se esperaba "${EXPECTED_TOPIC_BY_BLOCK[q.block]}")`);

  ok(Array.isArray(q.anchor) && q.anchor.length > 0, `${tag}: falta anchor`);
  q.anchor.forEach(k => ok(k in NOTES, `${tag}: nota de anchor desconocida "${k}"`));

  ok(Array.isArray(q.target) && q.target.length > 0, `${tag}: falta target`);
  q.target.forEach(k => ok(k in NOTES, `${tag}: nota de target desconocida "${k}"`));

  ok(Array.isArray(q.options) && q.options.length >= 2, `${tag}: se esperan al menos 2 opciones`);
  const correct = correctAnswer(q);
  ok(q.options.includes(correct), `${tag}: la respuesta correcta "${correct}" no está entre las opciones [${q.options.join(', ')}]`);

  const uniq = new Set(q.options);
  ok(uniq.size === q.options.length, `${tag}: opciones duplicadas [${q.options.join(', ')}]`);

  ok(typeof q.explain === 'string' && q.explain.length > 0, `${tag}: falta explain`);
});

// Cada bloque tiene al menos una pregunta
const byBlock = {};
Q.forEach(q => { byBlock[q.block] = (byBlock[q.block] || 0) + 1; });
['A', 'B', 'C'].forEach(b => ok((byBlock[b] || 0) > 0, `bloque ${b}: no tiene preguntas`));

// Todos los topics del vocabulario esperado están en uso
const usedTopics = new Set(Q.map(q => q.topic));
EXPECTED_TOPICS.forEach(t => ok(usedTopics.has(t), `topic "${t}" esperado pero no usado en ninguna pregunta`));

console.log(`  ${Q.length} preguntas verificadas.`);

/* ---------------------------------------------------------------- */
/* 2. Notas dentro de la escala de Do Mayor (vocabulario NOTES)      */
/* ---------------------------------------------------------------- */
section('2. Notas dentro del vocabulario de la escala');

const EXPECTED_NOTES = ['Do4', 'Re4', 'Mi4', 'Fa4', 'Sol4', 'La4', 'Si4', 'Do5'];
ok(EXPECTED_NOTES.every(k => k in NOTES), 'faltan notas de la escala de Do Mayor en NOTES');
ok(Object.keys(NOTES).length === EXPECTED_NOTES.length, `NOTES tiene ${Object.keys(NOTES).length} notas, se esperaban ${EXPECTED_NOTES.length}`);

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
      ok(map[t] === 'melodia_oido', `topic "${t}" mapea a "${map[t]}", se esperaba "melodia_oido"`);
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
// tool/category pueden ir como literal directo o como referencia a una
// constante (const TOOL='...' ... tool:TOOL), patrón usado en esta serie.
const toolOk = /tool:\s*'mus_dictado_melodico-s1_v1'/.test(src) ||
  (/\bTOOL\s*=\s*'mus_dictado_melodico-s1_v1'/.test(src) && /tool:\s*TOOL\b/.test(src));
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
console.log('OK — mus_dictado_melodico-s1_v1 conforme.');
