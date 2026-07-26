/**
 * check_scoring.js
 * Verifica que toda herramienta evaluativa declara "scoring" (self / self_guarded /
 * auto) en el objeto de sesión que construye, y que los registros ya guardados en
 * teoria-musica/data/ también lo llevan (MUSIC_GUIDE §3.6).
 *
 * Run: node teoria-musica/tests/check_scoring.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE, 'data');

const VALID_SCORING = new Set(['self', 'self_guarded', 'auto']);

// mus_mapa_* son fichas para imprimir (MUSIC_GUIDE §1): no son evaluativas,
// no llevan "scoring" y no deben entrar en este chequeo. Cualquier otra
// mus_*.html nueva entra por defecto — sacarla de aquí es una decisión
// consciente, no un olvido (ver incidente sincopa-contratiempo_v2 / 26/07/2026).
const NON_EVALUATIVE = new Set([
  'mus_mapa_compas_v1.html',
  'mus_mapa_grados-tonalidades_v1.html',
  'mus_mapa_resto-temario_v1.html'
]);

const EVALUATIVE_FILES = fs.readdirSync(BASE)
  .filter(f => f.startsWith('mus_') && f.endsWith('.html'))
  .filter(f => !NON_EVALUATIVE.has(f))
  .sort();

let failures = 0;

console.log('--- (a) scoring declarado en cada herramienta evaluativa ---');
EVALUATIVE_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const m = content.match(/scoring\s*:\s*['"]([^'"]+)['"]/);
  if (!m) {
    console.log(`  FAIL: ${file} — no declara "scoring"`);
    failures++;
  } else if (!VALID_SCORING.has(m[1])) {
    console.log(`  FAIL: ${file} — scoring inválido: "${m[1]}"`);
    failures++;
  } else {
    console.log(`  OK: ${file} — scoring: "${m[1]}"`);
  }
});

console.log('\n--- (b) scoring en los registros de teoria-musica/data/ ---');
if (!fs.existsSync(DATA_DIR)) {
  console.log('  SKIP: no existe teoria-musica/data/');
} else {
  const dataFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  dataFiles.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    let record;
    try {
      record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.log(`  FAIL: ${file} — JSON inválido: ${e.message}`);
      failures++;
      return;
    }
    if (!record.scoring) {
      console.log(`  FAIL: ${file} — no declara "scoring"`);
      failures++;
    } else if (!VALID_SCORING.has(record.scoring)) {
      console.log(`  FAIL: ${file} — scoring inválido: "${record.scoring}"`);
      failures++;
    } else {
      console.log(`  OK: ${file} — scoring: "${record.scoring}"`);
    }
  });
}

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log('RESULTADO GLOBAL: PASA — todas las herramientas y registros declaran scoring válido');
  process.exit(0);
} else {
  console.log(`RESULTADO GLOBAL: FALLA — ${failures} error(es) encontrado(s)`);
  process.exit(1);
}
