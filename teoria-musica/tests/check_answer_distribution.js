/**
 * check_answer_distribution.js
 * Verifica que la distribución de respuestas correctas (clave `c`) en los
 * ficheros HTML de teoría musical no supere el 40% en ninguna posición.
 *
 * Uso: node teoria-musica/tests/check_answer_distribution.js
 *      (o desde cualquier directorio — las rutas se resuelven contra la
 *       ubicación del propio script, no contra process.cwd())
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Directorio de las herramientas: el padre de tests/ (independiente del cwd).
const TOOLS_DIR = path.resolve(__dirname, '..');

const FILES = [
  'mus_teoria_nivel1_v1.html',
  'mus_teoria_nivel2_v1.html',
  'mus_teoria_nivel3_v1.html',
  'mus_teoria_repaso-final_v1.html',
  'mus_teoria_compas_v1.html',
  'mus_teoria_gran-repaso1_v1.html',
  'mus_teoria_gran-repaso2_v1.html',
];

const MAX_PCT = 40; // umbral máximo permitido por posición

/**
 * Extrae todos los valores de la clave `c` del HTML.
 * Busca patrones como: c:0  c:1  c:2  c:3  (con o sin espacios)
 */
function extractCValues(html) {
  // Primero localizar el bloque const TEMAS = [ ... ]
  const temasMatch = html.match(/const\s+TEMAS\s*=\s*\[/);
  if (!temasMatch) {
    return null;
  }
  const startIdx = temasMatch.index;

  // Extraer desde ahí hasta el final del script para limitar el scope
  const relevantSection = html.slice(startIdx);

  // Extraer valores c: N (entero 0-3)
  const cRegex = /\bc\s*:\s*([0-3])\b/g;
  const values = [];
  let m;
  while ((m = cRegex.exec(relevantSection)) !== null) {
    values.push(parseInt(m[1], 10));
  }
  return values;
}

let anyFailed = false;

for (const fileName of FILES) {
  const absPath = path.join(TOOLS_DIR, fileName);

  if (!fs.existsSync(absPath)) {
    // Un fichero ausente es un FALLO, no un skip: así un problema de ruta
    // nunca se disfraza de PASA (falso verde).
    console.log(`\n[FALLA] ${fileName} — fichero no encontrado en ${absPath}`);
    anyFailed = true;
    continue;
  }

  const html = fs.readFileSync(absPath, 'utf8');
  const cValues = extractCValues(html);

  if (!cValues || cValues.length === 0) {
    console.log(`\n[ERROR] ${fileName} — no se encontraron valores c:`);
    continue;
  }

  const total = cValues.length;
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const v of cValues) {
    if (v in counts) counts[v]++;
  }

  const pcts = {};
  let dominantPos = 0;
  let dominantPct = 0;
  for (let i = 0; i <= 3; i++) {
    pcts[i] = (counts[i] / total * 100);
    if (pcts[i] > dominantPct) {
      dominantPct = pcts[i];
      dominantPos = i;
    }
  }

  const fileFailed = dominantPct > MAX_PCT;
  if (fileFailed) anyFailed = true;

  const status = fileFailed ? 'FALLA' : 'PASA';

  console.log(`\n--- ${fileName} ---`);
  console.log(`  Total preguntas : ${total}`);
  console.log(`  Distribución    : pos0=${counts[0]} (${pcts[0].toFixed(1)}%) | pos1=${counts[1]} (${pcts[1].toFixed(1)}%) | pos2=${counts[2]} (${pcts[2].toFixed(1)}%) | pos3=${counts[3]} (${pcts[3].toFixed(1)}%)`);
  console.log(`  Posición dominante: ${dominantPos} (${dominantPct.toFixed(1)}%)`);
  console.log(`  Resultado: ${status}`);
}

console.log('\n' + '='.repeat(60));
if (anyFailed) {
  console.log('RESULTADO GLOBAL: FALLA — algún fichero supera el 40% en una posición');
  process.exit(1);
} else {
  console.log('RESULTADO GLOBAL: PASA — todos los ficheros dentro del umbral del 40%');
  process.exit(0);
}
