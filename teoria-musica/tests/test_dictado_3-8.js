/* eslint-disable no-console */
/**
 * test_dictado_3-8.js
 *
 * Valida mus_dictado_3-8_v1.html en tres niveles:
 *   1. Aritmética de los patrones rítmicos (cada compás suma 3 corcheas).
 *   2. Integridad del banco de ítems (opciones, topics, bloques, notación).
 *   3. Contrato de instrumentación (los dos defectos de la sesión anterior:
 *      time_sec siempre 0 y answered genérico).
 *
 * Además puede validar un registro de sesión real:
 *   node test_dictado_3-8.js ../data/2026-07-25_mus_dictado_3-8_v1.json
 *
 * Uso normal:
 *   node teoria-musica/tests/test_dictado_3-8.js
 */

const fs = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '..', 'mus_dictado_3-8_v1.html');
const MAP = path.resolve(__dirname, '..', 'topics_map.json');

const VALUES = { 'N.': 3, 'N': 2, 'C': 1, 's': 1 };
const BEATS_PER_BAR = 3;
const KNOWN_BLOCKS = ['calibracion', 'identificar', 'construir', 'dictado2'];

let failures = 0;
let checks = 0;

function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

/* ---------------------------------------------------------------- */
/* Carga del banco de ítems desde el HTML                            */
/* ---------------------------------------------------------------- */
const src = fs.readFileSync(HTML, 'utf8');

function extractArray(name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start < 0) throw new Error('No se encuentra el array ' + name);
  let i = src.indexOf('[', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '[') depth++;
    else if (src[j] === ']') { depth--; if (depth === 0) { return src.slice(i, j + 1); } }
  }
  throw new Error('Array ' + name + ' sin cerrar');
}

// eslint-disable-next-line no-eval
const ITEMS = eval(extractArray('ITEMS'));

/* ---------------------------------------------------------------- */
/* 1. Aritmética de los patrones                                     */
/* ---------------------------------------------------------------- */
section('1. Verificación matemática de los patrones');

function barsOf(pattern) { return pattern.split('|'); }

function sumBar(bar) {
  return bar.split('-').reduce((a, t) => {
    if (!(t in VALUES)) { throw new Error('Figura desconocida: "' + t + '"'); }
    return a + VALUES[t];
  }, 0);
}

const allPatterns = new Set();
ITEMS.forEach(it => {
  allPatterns.add(it.pattern);
  (it.options || []).forEach(o => allPatterns.add(o));
});

allPatterns.forEach(p => {
  barsOf(p).forEach((bar, k) => {
    const s = sumBar(bar);
    ok(s === BEATS_PER_BAR,
      `patrón "${p}" compás ${k + 1} suma ${s}, esperado ${BEATS_PER_BAR}`);
  });
});
console.log(`  ${allPatterns.size} patrones distintos verificados.`);

/* ---------------------------------------------------------------- */
/* 2. Integridad del banco de ítems                                  */
/* ---------------------------------------------------------------- */
section('2. Integridad del banco de ítems');

ok(ITEMS.length === 12, `se esperaban 12 ítems, hay ${ITEMS.length}`);

const byBlock = {};
ITEMS.forEach((it, i) => {
  const tag = `ítem ${i + 1} (${it.block})`;
  ok(KNOWN_BLOCKS.includes(it.block), `${tag}: bloque desconocido "${it.block}"`);
  ok(typeof it.topic === 'string' && it.topic.length > 0, `${tag}: falta topic`);
  ok(['warmup', 'choice', 'build'].includes(it.kind), `${tag}: kind inválido "${it.kind}"`);
  ok(typeof it.title === 'string' && it.title.length > 0, `${tag}: falta title`);
  ok(typeof it.text === 'string' && it.text.length > 0, `${tag}: falta text`);

  if (it.kind === 'choice') {
    ok(Array.isArray(it.options) && it.options.length === 3, `${tag}: se esperan 3 opciones`);
    ok(it.options.includes(it.pattern), `${tag}: la respuesta correcta no está entre las opciones`);
    ok(new Set(it.options).size === it.options.length, `${tag}: opciones duplicadas`);
  }
  if (it.kind === 'build') {
    ok(barsOf(it.pattern).length === it.slots,
      `${tag}: slots=${it.slots} no coincide con ${barsOf(it.pattern).length} compases`);
  }
  byBlock[it.block] = (byBlock[it.block] || 0) + 1;
});

ok(byBlock.calibracion === 2, `calibración: se esperaban 2 ítems, hay ${byBlock.calibracion}`);
ok(byBlock.identificar === 4, `identificar: se esperaban 4 ítems, hay ${byBlock.identificar}`);
ok(byBlock.construir === 4, `construir: se esperaban 4 ítems, hay ${byBlock.construir}`);
ok(byBlock.dictado2 === 2, `dictado2: se esperaban 2 ítems, hay ${byBlock.dictado2}`);

// La respuesta correcta no debe ser deducible por posición fija en las opciones
const choicePos = ITEMS.filter(i => i.kind === 'choice')
  .map(i => i.options.indexOf(i.pattern));
ok(new Set(choicePos).size > 1,
  'la correcta ocupa siempre la misma posición en el array de opciones');
ok(/function shuffle\(/.test(src) && /shuffle\(it\.options/.test(src),
  'las opciones no se barajan en tiempo de ejecución');

// El bloque 3 debe reproducirse sin acento (retirada del bastón)
ITEMS.filter(i => i.block === 'dictado2').forEach((it, i) => {
  ok(it.accent === false, `dictado2 ítem ${i + 1}: debe reproducirse sin acento`);
});
ITEMS.filter(i => i.block !== 'dictado2').forEach((it, i) => {
  ok(it.accent === true, `ítem ${i + 1} fuera de dictado2: debe llevar acento en el tiempo 1`);
});

/* ---------------------------------------------------------------- */
/* 3. Contrato de instrumentación                                    */
/* ---------------------------------------------------------------- */
section('3. Contrato de instrumentación (defectos de la sesión anterior)');

// time_sec debe derivarse de cur.t0, fijado al habilitar la respuesta,
// descontando el tiempo de escuchas posteriores.
ok(/cur\.t0 = Date\.now\(\);\s*\n\s*enableAnswer\(\);/.test(src),
  't0 no se fija en el instante en que se habilita la respuesta');
ok(/time_sec:\s*timeSec/.test(src), 'time_sec no se escribe desde la variable calculada');
ok(/cur\.extraListenMs/.test(src), 'el tiempo de escuchas posteriores no se descuenta');
ok(!/time_sec:\s*0\b/.test(src), 'time_sec aparece cableado a 0 en el código');

// answered debe registrar la respuesta real, nunca un literal genérico.
ok(/answered:\s*answered/.test(src), 'answered no se escribe desde la respuesta real');
ok(!/answered\s*=\s*['"]bien['"]/.test(src), 'answered cableado al literal "bien"');
ok(!/answered\s*=\s*['"](ok|correcto|mal)['"]/.test(src), 'answered cableado a un literal genérico');

// listens / listen_sec presentes
ok(/listens:\s*cur\.listens/.test(src), 'falta el registro de listens');
ok(/listen_sec:\s*Math\.round\(cur\.listenMs/.test(src), 'falta el registro de listen_sec');

// Schema y campos obligatorios
ok(/schema: 'andre-music-log\/v1'/.test(src), 'schema incorrecto o ausente');
ok(/tool: 'mus_dictado_3-8_v1'/.test(src), 'tool incorrecto o ausente');
ok(/category: 'dictado'/.test(src), 'category incorrecta o ausente');
ok(/function isoLocal\(/.test(src), 'falta el helper isoLocal');
ok(/andre_music_history/.test(src), 'no persiste en andre_music_history');
ok(/mood: mood/.test(src), 'no registra mood');

// El score solo debe agregar ítems con correct booleano (los warmup son null)
ok(/typeof r\.correct === 'boolean'/.test(src),
  'el score no filtra los ítems de calentamiento (correct: null)');

/* ---------------------------------------------------------------- */
/* 4. topics_map.json                                                */
/* ---------------------------------------------------------------- */
section('4. Cobertura en topics_map.json');

if (fs.existsSync(MAP)) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const groups = map._valid_groups || [];
  const usedTopics = [...new Set(ITEMS.map(i => i.topic))];
  usedTopics.forEach(t => {
    ok(Object.prototype.hasOwnProperty.call(map, t), `topic "${t}" no está en topics_map.json`);
    if (map[t]) ok(groups.includes(map[t]), `grupo "${map[t]}" de "${t}" no está en _valid_groups`);
  });
  console.log(`  ${usedTopics.length} topics granulares comprobados.`);
} else {
  console.log('  topics_map.json no encontrado en ' + MAP + ' — omitido.');
}

/* ---------------------------------------------------------------- */
/* 5. Validación opcional de un registro de sesión real              */
/* ---------------------------------------------------------------- */
const arg = process.argv[2];
if (arg) {
  section('5. Validación del registro de sesión ' + arg);
  const raw = fs.readFileSync(path.resolve(arg), 'utf8');
  const body = raw.includes('---JSON---') ? raw.split('---JSON---')[1] : raw;
  let s;
  try { s = JSON.parse(body); } catch (e) { ok(false, 'JSON no parseable: ' + e.message); s = null; }

  if (s) {
    ok(s.schema === 'andre-music-log/v1', 'schema incorrecto');
    ok(s.tool === 'mus_dictado_3-8_v1', 'tool incorrecto');
    ok(/[+-]\d{2}:\d{2}$/.test(s.session.start), 'session.start sin zona horaria');
    ok(/[+-]\d{2}:\d{2}$/.test(s.session.end), 'session.end sin zona horaria');
    ok(Array.isArray(s.items) && s.items.length > 0, 'items vacío');

    const scored = s.items.filter(i => typeof i.correct === 'boolean');
    ok(s.score.total === scored.length,
      `score.total=${s.score.total} pero hay ${scored.length} ítems puntuados`);
    ok(s.score.correct === scored.filter(i => i.correct).length, 'score.correct no cuadra con items');

    // Defecto 1: time_sec real
    ok(s.items.every(i => typeof i.time_sec === 'number'), 'algún time_sec no es numérico');
    ok(s.items.some(i => i.time_sec > 0), 'TODOS los time_sec son 0 — instrumentación rota');
    const zeros = s.items.filter(i => i.time_sec === 0).length;
    if (zeros > 0) console.log(`  AVISO: ${zeros} ítem(s) con time_sec = 0 (posible, pero revisar).`);

    // Defecto 2: answered real
    const VOCAB = /^(N\.|N|C|s)(-(N\.|N|C|s))*(\|(N\.|N|C|s)(-(N\.|N|C|s))*)*$/;
    s.items.forEach(i => {
      if (i.block === 'calibracion') {
        ok(i.answered === 'realizado', `ítem ${i.n}: warmup con answered inesperado "${i.answered}"`);
        ok(i.correct === null, `ítem ${i.n}: warmup debería tener correct: null`);
      } else {
        ok(VOCAB.test(String(i.answered)),
          `ítem ${i.n}: answered "${i.answered}" fuera del vocabulario de figuras`);
        ok(VOCAB.test(String(i.expected)),
          `ítem ${i.n}: expected "${i.expected}" fuera del vocabulario de figuras`);
        ok(i.correct === (i.answered === i.expected),
          `ítem ${i.n}: correct no coincide con answered vs expected`);
        barsOf(String(i.answered)).forEach(b => {
          ok(sumBar(b) === BEATS_PER_BAR, `ítem ${i.n}: answered con compás que no suma 3`);
        });
      }
      ok(typeof i.listens === 'number', `ítem ${i.n}: falta listens`);
      ok(typeof i.listen_sec === 'number', `ítem ${i.n}: falta listen_sec`);
    });

    ok(s.mood === null || [1, 2, 3].includes(s.mood), 'mood fuera de rango');
  }
}

/* ---------------------------------------------------------------- */
section(`\n${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) { console.error(`${failures} FALLO(S).`); process.exit(1); }
console.log('OK — mus_dictado_3-8_v1 conforme.');
