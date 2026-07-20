/**
 * check_dictado_patterns.js
 * Verifica la corrección matemática de los patrones rítmicos en los dictados:
 *   - Cada lista de tokens suma exactamente los tiempos del compás declarado.
 *   - Todos los tokens son válidos (pertenecen a TOKEN_VALUES).
 *
 * Extrae los datos directamente de los ficheros HTML para detectar
 * cualquier regresión si los datos cambian.
 *
 * Run: node teoria-musica/tests/check_dictado_patterns.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

// Valor en tiempos de cada token
const TOKEN_VALUES = {
  negra:    1,
  corcheas: 1,   // dos corcheas = 2 × 0.5 = 1 tiempo
  silencio: 1,   // silencio de negra
  blanca:   2,
};

/**
 * Extrae BLOQUE_N y sus compases declarados de un fichero HTML de dictado.
 * Busca patrones como:
 *   const BLOQUE_1 = [ [...], [...] ]
 * y el compas correspondiente a cada bloque.
 */
function extractDictadoData(content) {
  const bloques = [];

  // Locate each BLOQUE_N = [...]
  const bloqueRe = /const\s+(BLOQUE_\d+)\s*=\s*\[([\s\S]*?)\];/g;
  let m;
  while ((m = bloqueRe.exec(content)) !== null) {
    const blockName = m[1];
    const body = m[2];

    // Extract token arrays from lines like ['negra','corcheas','negra']
    const rowRe = /\[([^\]]+)\]/g;
    const rows = [];
    let rm;
    while ((rm = rowRe.exec(body)) !== null) {
      const tokens = rm[1]
        .split(',')
        .map(t => t.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      rows.push(tokens);
    }

    // Determine compas from EJEMPLO context or bloque label
    // Look for EJEMPLO_N with matching compas: number
    const ejemploIdx = parseInt(blockName.match(/\d+/)[0]);
    const ejemploRe = new RegExp(
      'EJEMPLO_' + ejemploIdx + '\\s*=\\s*\\{[^}]*compas\\s*:\\s*(\\d+)'
    );
    const cm = content.match(ejemploRe);
    const compas = cm ? parseInt(cm[1]) : null;

    bloques.push({ name: blockName, rows, compas });
  }

  return bloques;
}

const DICTADO_FILES = [
  'mus_dictado_simple-s1_v1.html',
  'mus_dictado_simple-s2_v1.html',
];

let failures = 0;
let totalChecks = 0;

for (const file of DICTADO_FILES) {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${file} — not found`);
    continue;
  }

  console.log(`\n--- ${file} ---`);
  const content = fs.readFileSync(filePath, 'utf8');
  const bloques = extractDictadoData(content);

  if (bloques.length === 0) {
    console.log('  WARN: no se encontraron bloques — revisar extractor');
    continue;
  }

  for (const bloque of bloques) {
    if (bloque.compas === null) {
      console.log(`  WARN: ${bloque.name} — no se pudo determinar el compás`);
      continue;
    }

    console.log(`  ${bloque.name} (compás declarado: ${bloque.compas})`);
    for (let i = 0; i < bloque.rows.length; i++) {
      const tokens = bloque.rows[i];
      totalChecks++;

      // Check all tokens are known
      const unknown = tokens.filter(t => !(t in TOKEN_VALUES));
      if (unknown.length > 0) {
        console.log(`    FALLA fila ${i + 1}: tokens desconocidos → ${unknown.join(', ')}`);
        failures++;
        continue;
      }

      // Check sum equals declared compas
      const sum = tokens.reduce((acc, t) => acc + TOKEN_VALUES[t], 0);
      if (sum !== bloque.compas) {
        console.log(`    FALLA fila ${i + 1}: [${tokens.join(', ')}] suma ${sum} ≠ ${bloque.compas}`);
        failures++;
      } else {
        console.log(`    OK fila ${i + 1}: [${tokens.join(', ')}] = ${sum} tiempos`);
      }
    }
  }
}

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log(`RESULTADO GLOBAL: PASA — ${totalChecks} patrones verificados, 0 errores`);
  process.exit(0);
} else {
  console.log(`RESULTADO GLOBAL: FALLA — ${failures} error(es) en ${totalChecks} checks`);
  process.exit(1);
}
