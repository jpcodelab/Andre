/**
 * check_topics_map.js
 * Verifica la integridad de topics_map.json (§4 MUSIC_GUIDE):
 *   (a) Todo id de topic usado en los 12 ficheros evaluativos existe en el mapa.
 *   (b) Todo valor del mapa es un grupo válido (lista en _valid_groups).
 *   (c) No hay entradas huérfanas en el mapa (entradas no usadas en ningún fichero).
 *
 * Run: node teoria-musica/tests/check_topics_map.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE     = path.join(__dirname, '..');
const MAP_FILE = path.join(BASE, 'topics_map.json');

const EVALUATIVE_FILES = [
  'mus_teoria_nivel1_v1.html',
  'mus_teoria_nivel2_v1.html',
  'mus_teoria_nivel3_v1.html',
  'mus_teoria_repaso-final_v1.html',
  'mus_teoria_compas_v1.html',
  'mus_teoria_gran-repaso1_v1.html',
  'mus_teoria_gran-repaso2_v1.html',
  'mus_dictado_simple-s1_v1.html',
  'mus_dictado_simple-s2_v1.html',
  'mus_dictado_3-8_v1.html',
  'mus_audicion_fuerte-debil_v1.html',
  'mus_audicion_puente-sincopa_v1.html',
  'mus_audicion_puente-sincopa_v2.html',
  'mus_audicion_sincopa-contratiempo_v1.html',
  'mus_teoria_armadura-refuerzo_v1.html',
  'mus_audicion_silencio-sostenido_v1.html',
];

// ---------------------------------------------------------------------------
// Load map
// ---------------------------------------------------------------------------
if (!fs.existsSync(MAP_FILE)) {
  console.error('FAIL: topics_map.json no encontrado en ' + MAP_FILE);
  process.exit(1);
}

const mapRaw = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const VALID_GROUPS = new Set(mapRaw._valid_groups || []);
// Dynamic topics: built at runtime (e.g. 'compas_' + beats). They cannot be
// found by static analysis but are declared in _dynamic_topics for traceability.
const DYNAMIC_TOPICS = new Set(mapRaw._dynamic_topics || []);
// Strip metadata keys (underscore-prefixed)
const topicMap = {};
for (const [k, v] of Object.entries(mapRaw)) {
  if (!k.startsWith('_')) topicMap[k] = v;
}

// ---------------------------------------------------------------------------
// Collect all topic IDs used in the evaluative files
// ---------------------------------------------------------------------------

// Strategy A: topics used in TEMAS arrays (teoria files)  → match id: 'xxx'
// Strategy B: topics used at runtime (dictado/audicion)    → match topic: 'xxx' or topic: literal strings

const usedIds = new Set();

/**
 * Extract all static topic values from a file's source.
 *
 * Teoria files: use  id: 'value'  within the TEMAS array (these are topic ids).
 * Dictado/audicion files: use  topic: 'value'  (static string assignments only).
 *
 * Block ids (tap, point, classify, fase_1…) appear under the key "block", not
 * "topic", so they are never collected here.
 */
function extractTopicIds(content) {
  const ids = new Set();
  let m;

  const temasIdx = content.indexOf('TEMAS');
  if (temasIdx >= 0) {
    // Teoria file: collect  id: 'value'  within TEMAS array only
    const slice = content.slice(temasIdx);
    const idRe = /\bid\s*:\s*['"]([^'"]+)['"]/g;
    while ((m = idRe.exec(slice)) !== null) ids.add(m[1]);
  }

  // All files: collect static  topic: 'value'  patterns
  const topicRe = /\btopic\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = topicRe.exec(content)) !== null) ids.add(m[1]);

  // fuerte-debil uses  topic: 'compas_' + beats  (dynamic construction)
  // The partial string 'compas_' appears as a false positive — remove it.
  // The concrete values compas_2/3/4 are in the map as forward-declared entries.
  ids.delete('compas_');

  return ids;
}

for (const file of EVALUATIVE_FILES) {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.warn('WARN: fichero no encontrado — ' + file);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const id of extractTopicIds(content)) usedIds.add(id);
}

// Pre-seed dynamic topics so they are not reported as orphans.
// These are constructed at runtime (e.g. 'compas_' + beats) and cannot
// be found by static analysis, but are declared in _dynamic_topics.
for (const id of DYNAMIC_TOPICS) usedIds.add(id);

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

let failures = 0;

// (a) Every used id must exist in the map
console.log('\n--- (a) Topics usados → deben estar en el mapa ---');
const usedSorted = [...usedIds].sort();
let aMissing = 0;
for (const id of usedSorted) {
  if (!(id in topicMap)) {
    console.log('  FALTA en mapa: ' + id);
    aMissing++;
    failures++;
  }
}
if (aMissing === 0) {
  console.log('  OK — todos los ' + usedIds.size + ' topics usados están en el mapa');
} else {
  console.log('  FALLA — ' + aMissing + ' topics sin mapear');
}

// (b) Every value in the map must be a valid group
console.log('\n--- (b) Valores del mapa → deben ser grupos válidos ---');
let bBad = 0;
for (const [k, v] of Object.entries(topicMap)) {
  if (!VALID_GROUPS.has(v)) {
    console.log('  GRUPO INVÁLIDO: ' + k + ' → "' + v + '"');
    bBad++;
    failures++;
  }
}
if (bBad === 0) {
  console.log('  OK — todos los ' + Object.keys(topicMap).length + ' entries del mapa tienen grupos válidos');
  console.log('  Grupos usados: ' + [...new Set(Object.values(topicMap))].sort().join(', '));
} else {
  console.log('  FALLA — ' + bBad + ' entries con grupo inválido');
}

// (c) No orphan entries in the map (entries not used in any file or in _dynamic_topics)
console.log('\n--- (c) Entries del mapa → ninguna huérfana ---');
let cOrphan = 0;
const mapKeys = Object.keys(topicMap).sort();
for (const k of mapKeys) {
  if (!usedIds.has(k)) {
    console.log('  FALLA — HUÉRFANA: ' + k + ' (grupo: ' + topicMap[k] + ') — añadir a _dynamic_topics o eliminar del mapa');
    cOrphan++;
    failures++;
  }
}
if (cOrphan === 0) {
  console.log('  OK — no hay entradas huérfanas (' + DYNAMIC_TOPICS.size + ' topic(s) dinámico(s) declarado(s) en _dynamic_topics)');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log('RESULTADO GLOBAL: PASA — topics_map.json íntegro');
  console.log('  Topics en uso: ' + usedIds.size + '  |  Entradas en mapa: ' + Object.keys(topicMap).length + '  |  Grupos válidos: ' + VALID_GROUPS.size);
  process.exit(0);
} else {
  console.log('RESULTADO GLOBAL: FALLA — ' + failures + ' error(es) encontrado(s)');
  process.exit(1);
}
