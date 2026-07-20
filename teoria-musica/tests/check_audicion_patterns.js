/**
 * check_audicion_patterns.js
 * Verifica la corrección musical de los patrones rítmicos en los ficheros de
 * discriminación auditiva (puente-síncopa y síncopa vs contratiempo).
 *
 * Grid: 8 corcheas por compás (4/4). Posiciones fuertes (pulsos): 0, 2, 4, 6.
 * Posiciones débiles (huecos): 1, 3, 5, 7.
 *
 * Reglas por tipo (§5 MUSIC_GUIDE):
 *   normal       → todas las notas empiezan en posición FUERTE (par)
 *   contratiempo → todas las notas empiezan en posición DÉBIL (impar), dur = 1
 *                  (la nota calla antes de que llegue el siguiente pulso)
 *   sincopa      → todas las notas empiezan en posición DÉBIL (impar),
 *                  al menos una nota tiene dur ≥ 2 (atraviesa un pulso)
 *
 * Checks adicionales:
 *   - Todas las notas caben en 8 slots: start ≥ 0, start + dur ≤ 8
 *   - No hay notas solapadas (ordenadas: end_i ≤ start_{i+1})
 *   - El tipo de cada patrón está en VALID_TYPES
 *
 * Run: node teoria-musica/tests/check_audicion_patterns.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const SLOTS = 8;  // eighth notes per 4/4 measure
const STRONG = new Set([0, 2, 4, 6]);  // strong beat positions
const VALID_TYPES = new Set(['normal', 'contratiempo', 'sincopa']);

const AUDICION_FILES = [
  'mus_audicion_puente-sincopa_v1.html',
  'mus_audicion_sincopa-contratiempo_v1.html',
];

/**
 * Extract all pattern pools from an audicion HTML file.
 * Matches JS object arrays of the form:
 *   { type: 'xxx', notes: [{start:N,dur:N}, ...] }
 *
 * Returns an array of {pool, items} where pool is the variable name.
 */
function extractPatterns(content) {
  // Find all pattern-like object literals: { type: '...', notes: [...] }
  const itemRe = /\{\s*type\s*:\s*'([^']+)'\s*,\s*notes\s*:\s*(\[[^\]]+\])\s*\}/g;
  const results = [];
  let m;
  while ((m = itemRe.exec(content)) !== null) {
    const type = m[1];
    // Parse notes array: [{start:N,dur:N},...]
    const notesStr = m[2];
    const noteRe = /\{start\s*:\s*(\d+)\s*,\s*dur\s*:\s*(\d+)\s*\}/g;
    const notes = [];
    let nm;
    while ((nm = noteRe.exec(notesStr)) !== null) {
      notes.push({ start: parseInt(nm[1]), dur: parseInt(nm[2]) });
    }
    if (notes.length > 0) results.push({ type, notes });
  }
  return results;
}

/**
 * Validate a single pattern.
 * Returns an array of error strings (empty = valid).
 */
function validatePattern(item) {
  const { type, notes } = item;
  const errors = [];

  if (!VALID_TYPES.has(type)) {
    errors.push(`tipo desconocido: '${type}'`);
    return errors;
  }

  if (notes.length === 0) {
    errors.push('pattern vacío (sin notas)');
    return errors;
  }

  // Sort notes by start for overlap check
  const sorted = notes.slice().sort((a, b) => a.start - b.start);

  // (1) All notes fit within 8 slots
  for (const n of sorted) {
    if (n.start < 0 || n.start + n.dur > SLOTS) {
      errors.push(`nota [start:${n.start}, dur:${n.dur}] sale del compás (0–${SLOTS})`);
    }
  }

  // (2) No overlapping notes
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a.start + a.dur > b.start) {
      errors.push(`notas solapadas: [start:${a.start},dur:${a.dur}] y [start:${b.start},dur:${b.dur}]`);
    }
  }

  // (3) Type-specific rules
  if (type === 'normal') {
    // All starts must be on strong beats (even positions)
    const badStarts = notes.filter(n => !STRONG.has(n.start));
    if (badStarts.length > 0) {
      errors.push(
        `normal: nota(s) empiezan en posición débil → start=[${badStarts.map(n => n.start).join(',')}]`
      );
    }
  } else if (type === 'contratiempo') {
    // All starts must be on weak beats (odd), dur must be 1
    const badStarts = notes.filter(n => STRONG.has(n.start));
    if (badStarts.length > 0) {
      errors.push(
        `contratiempo: nota(s) empiezan en pulso fuerte → start=[${badStarts.map(n => n.start).join(',')}]`
      );
    }
    const badDur = notes.filter(n => n.dur !== 1);
    if (badDur.length > 0) {
      errors.push(
        `contratiempo: nota(s) con dur≠1 → ${badDur.map(n => `[start:${n.start},dur:${n.dur}]`).join(', ')} (cruzaría un pulso → sería síncopa)`
      );
    }
  } else if (type === 'sincopa') {
    // All starts must be on weak beats (odd)
    const badStarts = notes.filter(n => STRONG.has(n.start));
    if (badStarts.length > 0) {
      errors.push(
        `sincopa: nota(s) empiezan en pulso fuerte → start=[${badStarts.map(n => n.start).join(',')}]`
      );
    }
    // At least one note must have dur ≥ 2 (crosses a strong beat)
    const hasLong = notes.some(n => n.dur >= 2);
    if (!hasLong) {
      errors.push('sincopa: ninguna nota tiene dur≥2 (ninguna atraviesa un pulso → sería contratiempo)');
    }
  }

  return errors;
}

let failures = 0;
let totalChecks = 0;

for (const file of AUDICION_FILES) {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${file} — not found`);
    continue;
  }

  console.log(`\n--- ${file} ---`);
  const content = fs.readFileSync(filePath, 'utf8');
  const patterns = extractPatterns(content);

  if (patterns.length === 0) {
    console.log('  WARN: no se encontraron patrones — revisar extractor');
    continue;
  }

  console.log(`  ${patterns.length} patrones encontrados`);
  for (let i = 0; i < patterns.length; i++) {
    const item = patterns[i];
    totalChecks++;
    const label = `  [${i + 1}] type:'${item.type}' notes:[${item.notes.map(n => `{s:${n.start},d:${n.dur}}`).join(',')}]`;
    const errors = validatePattern(item);
    if (errors.length > 0) {
      console.log(`${label}`);
      errors.forEach(e => console.log(`    FALLA: ${e}`));
      failures++;
    } else {
      console.log(`${label}  ✓`);
    }
  }
}

console.log('\n' + '='.repeat(60));
if (failures === 0) {
  console.log(`RESULTADO GLOBAL: PASA — ${totalChecks} patrones verificados, 0 errores`);
  process.exit(0);
} else {
  console.log(`RESULTADO GLOBAL: FALLA — ${failures} patrón(es) inválido(s) de ${totalChecks}`);
  process.exit(1);
}
