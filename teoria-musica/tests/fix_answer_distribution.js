/**
 * fix_answer_distribution.js
 * Reordena las opciones de cada pregunta en los ficheros HTML de teoría
 * para lograr una distribución equilibrada de la clave `c`.
 *
 * Estrategia determinista: para la pregunta i (0-based, global en el fichero),
 * la nueva posición de la respuesta correcta es:
 *   newC = (originalC + 3 * i) % numOptions
 * donde 3 es un primo que garantiza recorrer todas las posiciones.
 * El resto de opciones se mantiene en su orden relativo, solo se inserta
 * la correcta en la nueva posición.
 *
 * Uso: node teoria-musica/tests/fix_answer_distribution.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILES = [
  'teoria-musica/examen_musica_andre.html',
  'teoria-musica/examen_musica_andre_nivel2.html',
  'teoria-musica/examen_musica_andre_nivel3.html',
  'teoria-musica/repaso_final_musica_andre.html',
  'teoria-musica/repaso2_compas_musica_andre.html',
  'teoria-musica/repaso_completo_musica_andre.html',
  'teoria-musica/repaso_completo2_musica_andre.html',
];

const PRIME = 3;

/**
 * Reescribe el HTML reordenando opciones en cada pregunta.
 * Localiza patrones: o:["a","b","c","d"], c:N
 * y los sustituye por el array reordenado con c: actualizado.
 */
function fixFile(html, fileName) {
  let questionIndex = 0;
  let changeCount = 0;

  // Regex para cada entrada de pregunta: captura el array o:[...] y c:N
  // Soporta tanto comillas simples como dobles, y posibles caracteres escapados.
  // Pattern: o:[...], c:N  — donde [...] contiene strings entre comillas (dobles)
  const qRegex = /\bo\s*:\s*(\[[\s\S]*?\])\s*,\s*c\s*:\s*([0-3])/g;

  const result = html.replace(qRegex, (match, optionsStr, cStr) => {
    const originalC = parseInt(cStr, 10);

    // Parse the options array — handle Unicode escapes and special chars
    let options;
    try {
      options = JSON.parse(optionsStr);
    } catch (e) {
      // If JSON.parse fails, try eval (safe since it's our own file)
      try {
        options = eval(optionsStr); // eslint-disable-line no-eval
      } catch (e2) {
        console.warn(`  [WARN] No se pudo parsear opciones en pregunta ${questionIndex}: ${optionsStr.slice(0, 60)}`);
        questionIndex++;
        return match; // leave unchanged
      }
    }

    const numOptions = options.length;
    const correctOption = options[originalC];
    const newC = (originalC + PRIME * questionIndex) % numOptions;

    // Build new options array: keep relative order of wrong options, insert correct at newC
    const wrongOptions = [];
    for (let i = 0; i < numOptions; i++) {
      if (i !== originalC) wrongOptions.push(options[i]);
    }
    const newOptions = [...wrongOptions];
    newOptions.splice(newC, 0, correctOption);

    // Verify correctness
    if (newOptions[newC] !== correctOption) {
      console.error(`  [ERROR] Verificación fallida en pregunta ${questionIndex}`);
      questionIndex++;
      return match;
    }

    if (newC !== originalC) changeCount++;
    questionIndex++;

    // Rebuild the match string preserving original formatting style
    // Re-serialize options as JSON (with Unicode kept as-is since we read utf8)
    const newOptionsStr = JSON.stringify(newOptions);
    return `o:${newOptionsStr}, c:${newC}`;
  });

  console.log(`  Preguntas procesadas: ${questionIndex}, posición cambiada: ${changeCount}`);
  return result;
}

for (const relPath of FILES) {
  const absPath = path.resolve(process.cwd(), relPath);
  const fileName = path.basename(relPath);

  if (!fs.existsSync(absPath)) {
    console.log(`[SKIP] ${fileName} — no encontrado`);
    continue;
  }

  console.log(`\nProcesando: ${fileName}`);
  const original = fs.readFileSync(absPath, 'utf8');
  const fixed = fixFile(original, fileName);

  if (fixed === original) {
    console.log(`  Sin cambios.`);
  } else {
    fs.writeFileSync(absPath, fixed, 'utf8');
    console.log(`  Fichero actualizado.`);
  }
}

console.log('\nListo. Ejecuta check_answer_distribution.js para verificar.');
