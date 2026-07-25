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

const EVALUATIVE_FILES = [
  'mus_teoria_nivel1_v1.html',
  'mus_teoria_nivel2_v1.html',
  'mus_teoria_nivel3_v1.html',
  'mus_teoria_repaso-final_v1.html',
  'mus_teoria_compas_v1.html',
  'mus_teoria_gran-repaso1_v1.html',
  'mus_teoria_gran-repaso2_v1.html',
  'mus_teoria_armadura-refuerzo_v1.html',
  'mus_dictado_simple-s1_v1.html',
  'mus_dictado_simple-s2_v1.html',
  'mus_dictado_3-8_v1.html',
  'mus_audicion_fuerte-debil_v1.html',
  'mus_audicion_puente-sincopa_v2.html',
  'mus_audicion_sincopa-contratiempo_v1.html',
  'mus_audicion_sincopa-contratiempo_v2.html',
  'mus_audicion_partitura-sincopa_v1.html',
  'mus_audicion_silencio-sostenido_v1.html',
  'mus_teoria_armaduras_v1.html',
  'mus_dictado_simple-s5_v1.html',
  'mus_dictado_melodico-s1_v1.html'
];

let failures = 0;

console.log('--- (a) scoring declarado en cada herramienta evaluativa ---');
EVALUATIVE_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  FAIL: ${file} — fichero no encontrado`);
    failures++;
    return;
  }
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
