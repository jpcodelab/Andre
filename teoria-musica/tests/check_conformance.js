/* eslint-disable no-console */
/**
 * check_conformance.js
 *
 * Auditoría transversal de conformidad contra el checklist §5 de
 * MUSIC_GUIDE.md (común + evaluativas), por INSPECCIÓN ESTÁTICA del
 * código fuente de cada mus_*.html.
 *
 * NO valida la matemática de patrones rítmicos ni bancos de ítems — eso
 * ya lo cubren los checks dedicados por herramienta (check_dictado_*.js,
 * check_audicion_*.js, etc.). Este script existe porque un check por
 * herramienta puede reportar "OK" sobre aspectos que nunca comprobó
 * (motivo: check_dictado_simple-s5.js reporta 145/145 sobre una
 * herramienta que incumple tres puntos del checklist §5).
 *
 * Salida: tabla Fichero | Check | Estado | Motivo, con OK / DEFECTO /
 * ADVERTENCIA. Es un informe de estado, no un gate: termina con exit 0
 * pase lo que pase, incluso con DEFECTOs — hoy varias herramientas
 * legítimamente en uso fallarían.
 *
 * ADVERTENCIA sobre las heurísticas: varios checks (time_sec, answered)
 * localizan patrones de código por proximidad textual, no por parseo
 * real. Son pistas para revisión humana, no un veredicto infalible —
 * cuando el script no está seguro, lo dice explícitamente en el motivo
 * en vez de fallar en silencio a "OK".
 *
 * Uso: node teoria-musica/tests/check_conformance.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const files = fs.readdirSync(ROOT)
  .filter(f => /^mus_.*\.html$/.test(f))
  .sort();

const CATEGORIES = ['teoria', 'mapa', 'dictado', 'audicion', 'util'];
const EVALUATIVE = ['teoria', 'dictado', 'audicion'];
const AUDIO_CATEGORIES = ['dictado', 'audicion', 'util'];
const AUDIO_EVALUATIVE = ['dictado', 'audicion'];

const rows = []; // {file, check, status, motivo}
function report(file, check, status, motivo) {
  rows.push({ file, check, status, motivo });
}

/* ------------------------------------------------------------------ */
/* Helpers de extracción                                              */
/* ------------------------------------------------------------------ */

// Deduce la categoría a partir del nombre de fichero: mus_[categoria]_...
function categoryFromName(file) {
  const parts = file.split('_');
  return parts.length > 1 ? parts[1] : null;
}

// Extrae el contenido de <script>...</script> (evita falsos positivos
// de llaves de CSS en <style>).
function scriptSrc(fullSrc) {
  const chunks = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(fullSrc))) chunks.push(m[1]);
  return chunks.join('\n');
}

// Localiza el objeto literal que envuelve la posición dada: escanea hacia
// atrás buscando la '{' de profundidad 0 (la apertura del objeto que
// contiene esa posición), y luego hacia delante con balanceo consciente
// de strings/backticks para encontrar su '}' de cierre.
function findEnclosingObject(src, pos) {
  let depth = 0, i = pos;
  for (; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') { if (depth === 0) break; depth--; }
  }
  if (i < 0) return null;
  const start = i;
  let d = 0, inStr = null, j = start;
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (c === '\\') { j++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
  }
  return { start, end: j, block: src.slice(start, j + 1) };
}

// Extrae los objetos literal que parecen registros de ítem de sesión:
// se ancla en cada ocurrencia de "answered:" (campo obligatorio en todo
// ítem, §3.2) y toma el objeto que lo envuelve, sea cual sea la forma en
// que se construye (.push({...}), "return {...}", asignación...).
// Confirma que también contiene "correct:" antes de aceptarlo.
function extractItemPushes(src) {
  const out = [];
  const seen = new Set();
  const re = /\banswered\s*:/g;
  let m;
  while ((m = re.exec(src))) {
    const obj = findEnclosingObject(src, m.index);
    if (!obj || seen.has(obj.start)) continue;
    if (/\bcorrect\s*:/.test(obj.block)) {
      seen.add(obj.start);
      out.push(obj);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Checks individuales                                                */
/* ------------------------------------------------------------------ */

function checkCategoria(file, src, catFromName) {
  if (!CATEGORIES.includes(catFromName)) {
    report(file, 'categoria', 'DEFECTO', `nombre de fichero no empieza con una categoría válida (${CATEGORIES.join('/')})`);
    return;
  }
  if (!EVALUATIVE.includes(catFromName)) {
    report(file, 'categoria', 'OK', `"${catFromName}" (no evaluativa, sin JSON de sesión que contrastar)`);
    return;
  }
  const literal = new RegExp(`category:\\s*['"]${catFromName}['"]`).test(src);
  const viaVar = new RegExp(`\\bCAT\\s*=\\s*['"]${catFromName}['"]`).test(src) && /category:\s*CAT\b/.test(src);
  // Patrón DATA.category: el valor viene de un objeto (p.ej. JSON.parse de
  // un <script type="application/json"> embebido) referenciado como
  // category: DATA.category — se acepta si ese mismo fichero contiene el
  // literal "category": "X" que alimenta a DATA en tiempo de ejecución.
  const viaData = /category:\s*[\w$]+\.category\b/.test(src) &&
    new RegExp(`["']category["']\\s*:\\s*["']${catFromName}["']`).test(src);
  if (literal || viaVar || viaData) {
    report(file, 'categoria', 'OK', `emite category:'${catFromName}', coherente con el nombre de fichero`);
  } else {
    const emitted = (src.match(/category:\s*['"](\w+)['"]/) || [])[1]
      || (/\bCAT\s*=\s*['"](\w+)['"]/.exec(src) || [])[1];
    report(file, 'categoria', 'DEFECTO',
      emitted ? `nombre de fichero implica "${catFromName}" pero el JSON emite category:'${emitted}'`
        : `nombre de fichero implica "${catFromName}" pero no se encuentra el campo category en el JSON`);
  }
}

function checkScoring(file, src, catFromName) {
  if (!EVALUATIVE.includes(catFromName)) return; // solo evaluativas
  const m = /scoring:\s*['"](\w+)['"]/.exec(src);
  if (!m) { report(file, 'scoring', 'DEFECTO', 'no declara "scoring" en el JSON de sesión'); return; }
  if (!['auto', 'self', 'self_guarded'].includes(m[1])) {
    report(file, 'scoring', 'DEFECTO', `scoring:'${m[1]}' no es un valor válido (auto/self/self_guarded)`);
    return;
  }
  report(file, 'scoring', 'OK', `scoring:'${m[1]}'`);
}

function checkListens(file, src, catFromName) {
  if (!AUDIO_EVALUATIVE.includes(catFromName)) return; // solo dictado/audicion
  const pushes = extractItemPushes(src);
  if (pushes.length === 0) {
    report(file, 'listens/listen_sec', 'ADVERTENCIA', 'no se localizó ningún registro de ítem (.push({...}) con expected/correct) — revisar manualmente');
    return;
  }
  // Admite tanto forma explícita (listens: x) como shorthand ES6 ({listens, ...}).
  const hasListens = pushes.some(p => /\blistens\s*(:|[,}])/.test(p.block));
  const hasListenSec = pushes.some(p => /\blisten_sec\s*(:|[,}])/.test(p.block));
  const hasReplaysSynonym = pushes.some(p => /\breplays\s*(:|[,}])/.test(p.block) && !/\blistens\s*(:|[,}])/.test(p.block));
  if (hasListens && hasListenSec) {
    report(file, 'listens/listen_sec', 'OK', 'presentes en los registros de ítem');
  } else if (hasReplaysSynonym) {
    report(file, 'listens/listen_sec', 'DEFECTO', 'usa "replays" en vez de listens/listen_sec — sinónimo mal nombrado, incumple vocabulario §3.2 (no ausencia, error de nombre)');
  } else {
    const missing = [!hasListens && 'listens', !hasListenSec && 'listen_sec'].filter(Boolean).join(' y ');
    report(file, 'listens/listen_sec', 'DEFECTO', `falta(n) ${missing} en el/los registro(s) de ítem`);
  }
}

// Heurística de localización del arranque de cronómetro: busca
// asignaciones "<var> = Date.now()" y decide si están "diferidas" (dentro
// de un callback disparado tras la reproducción: setTimeout/then/onended/
// addEventListener/function callback) o si son una sentencia directa en
// el flujo síncrono de pintado de la pregunta.
//
// La comprobación de "diferido" camina hacia fuera por las llaves que
// envuelven la asignación (en vez de mirar una ventana fija de caracteres
// hacia atrás): un tamaño fijo corta a mitad de token cuando el cuerpo del
// callback tiene comentarios o líneas intermedias antes de la asignación
// (detectado el 31/07/2026 en mus_dictado_3-8_v1.html: la ventana de 400
// caracteres cortaba la palabra "function" a 412 caracteres del ".then(",
// dando un falso positivo de "no diferido" sobre un cronómetro correcto).
function findEnclosingBraceOpen(src, pos) {
  let depth = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

function checkTimeSec(file, src, catFromName) {
  if (!AUDIO_EVALUATIVE.includes(catFromName)) {
    report(file, 'time_sec', '—', 'sin audio, no aplica la regla §3.2 de arranque tras reproducción');
    return;
  }
  const assignRe = /([\w.]+(?:\[[\w'".]+\])?)\s*=\s*Date\.now\(\)/g;
  const ignoreVar = /^(pStart|dur|now|d|end|start|t1)$/i;
  const candidates = [];
  let m;
  while ((m = assignRe.exec(src))) {
    const varName = m[1];
    const lastSeg = varName.split(/[.[]/).pop().replace(/['"\]]/g, '');
    if (ignoreVar.test(lastSeg)) continue;
    candidates.push({ varName, index: m.index });
  }
  if (candidates.length === 0) {
    report(file, 'time_sec', 'ADVERTENCIA', 'no se localiza ninguna asignación "= Date.now()" candidata a inicio de cronómetro — revisar manualmente');
    return;
  }
  const gatedTokenRe = /setTimeout\(|addEventListener\(|\.onended\s*=|\.then\(|=>\s*\{|function\s*\w*\s*\([^)]*\)\s*\{/;
  const evaluated = candidates.map(c => {
    // Camina hacia fuera por cada llave envolvente (if/callback/…) hasta
    // encontrar una cuyo token inmediatamente anterior sea un disparador
    // diferido, o hasta llegar al nivel superior del script (no diferido).
    let gated = false;
    let searchFrom = c.index;
    for (let guard = 0; guard < 20; guard++) {
      const openIdx = findEnclosingBraceOpen(src, searchFrom);
      if (openIdx < 0) break;
      const windowBefore = src.slice(Math.max(0, openIdx - 80), openIdx + 1);
      if (gatedTokenRe.test(windowBefore)) { gated = true; break; }
      searchFrom = openIdx;
    }
    const line = src.slice(0, c.index).split('\n').length;
    return { ...c, gated, line };
  });
  const ungated = evaluated.filter(e => !e.gated);
  if (ungated.length > 0) {
    const r = ungated[0];
    report(file, 'time_sec', 'ADVERTENCIA',
      `"${r.varName} = Date.now()" (línea ${r.line}) no aparece diferido tras una reproducción — parece fijarse al pintar la pregunta, revisar contra §3.2`);
  } else {
    const r = evaluated[0];
    report(file, 'time_sec', 'OK', `"${r.varName} = Date.now()" (línea ${r.line}) aparece dentro de un callback diferido — consistente con §3.2`);
  }
}

// Heurística de vocabulario de `answered`: para cada registro de ítem,
// si el valor es un literal de cadena se comprueba directamente; si es
// una expresión/identificador, se busca si pasa por una función
// normalizadora conocida o si hay evidencia cercana (arrays de opciones
// con mayúscula/tilde/flecha) de que no se ha normalizado.
function checkAnswered(file, src, catFromName) {
  if (!EVALUATIVE.includes(catFromName)) return;
  const pushes = extractItemPushes(src);
  if (pushes.length === 0) {
    report(file, 'answered', 'ADVERTENCIA', 'no se localizó ningún registro de ítem — revisar manualmente');
    return;
  }
  const badChars = /[A-ZÁÉÍÓÚÑ→]| (?=\S)/; // mayúscula, tilde, flecha, o espacio interno
  const normalizerRe = /toLowerCase\(|vocabToken\(|normTok\(|slug\(|toKey\(/;
  let flagged = null;
  let sample = null;
  for (const p of pushes) {
    const am = /\banswered\s*:\s*([^,}]+)/.exec(p.block);
    if (!am) continue;
    const expr = am[1].trim();
    sample = sample || expr;
    const strLit = /^(['"`])(.*)\1$/.exec(expr);
    if (strLit) {
      if (badChars.test(strLit[2])) { flagged = `literal "${expr}"`; break; }
      continue;
    }
    if (normalizerRe.test(expr)) continue; // pasa por normalizador conocido
    // Evidencia indirecta: arrays de opciones con vocabulario crudo cerca
    // (antes del push, dentro de una ventana razonable del mismo fichero)
    const before = src.slice(Math.max(0, p.index - 1500), p.index);
    const rawOptionsRe = /options\s*:\s*\[([^\]]*)\]|opts\s*=\s*\[([^\]]*)\]/g;
    let om, hasRawVocab = false, rawSample = null;
    while ((om = rawOptionsRe.exec(before))) {
      const listTxt = om[1] || om[2] || '';
      if (badChars.test(listTxt)) { hasRawVocab = true; rawSample = listTxt.slice(0, 60); }
    }
    if (hasRawVocab) {
      flagged = `"answered: ${expr}" sin normalizador visible; opciones cercanas con vocabulario crudo [${rawSample}...]`;
      break;
    }
  }
  if (flagged) {
    report(file, 'answered', 'ADVERTENCIA', `posible vocabulario de interfaz sin normalizar — ${flagged}`);
  } else {
    report(file, 'answered', 'OK', `expresión de "answered" (ej. "${sample}") sin evidencia de vocabulario crudo cercano`);
  }
}

function checkCopyButton(file, src, catFromName) {
  if (!EVALUATIVE.includes(catFromName)) return;
  const hasExecCommand = /execCommand\(\s*['"]copy['"]\s*\)/.test(src);
  const hasClipboard = /navigator\.clipboard\.writeText/.test(src);
  if (hasExecCommand) {
    report(file, 'copiar-registro', 'OK', hasClipboard ? 'execCommand("copy") con fallback a navigator.clipboard' : 'execCommand("copy") como mecanismo');
  } else if (hasClipboard) {
    report(file, 'copiar-registro', 'DEFECTO', 'solo navigator.clipboard.writeText, sin execCommand("copy") — falla en file://');
  } else {
    report(file, 'copiar-registro', 'DEFECTO', 'no se encuentra ni execCommand("copy") ni navigator.clipboard.writeText');
  }
}

function checkCompleted(file, src, catFromName) {
  if (!EVALUATIVE.includes(catFromName)) return;
  if (/andre_music_completed/.test(src)) {
    report(file, 'andre_music_completed', 'OK', 'escribe en el registro de completado');
  } else {
    report(file, 'andre_music_completed', 'DEFECTO', 'no escribe andre_music_completed — index.html no marcará la tarjeta');
  }
}

function checkNavbar(file, src) {
  const hasNavbarClass = /class="navbar"/.test(src);
  const hasReiniciar = /Reiniciar ejercicio/.test(src);
  const hasVolver = /Volver al índice/.test(src);
  const hasHref = /\.\.\/index\.html#lenguaje-musical/.test(src);
  if (hasNavbarClass && hasReiniciar && hasVolver && hasHref) {
    report(file, 'navbar', 'OK', 'reiniciar + volver al índice presentes');
  } else {
    const missing = [
      !hasNavbarClass && 'class="navbar"',
      !hasReiniciar && 'botón "Reiniciar ejercicio"',
      !hasVolver && 'enlace "Volver al índice"',
      !hasHref && 'href a ../index.html#lenguaje-musical',
    ].filter(Boolean).join(', ');
    report(file, 'navbar', 'DEFECTO', `falta: ${missing}`);
  }
}

/* ------------------------------------------------------------------ */
/* Ejecución                                                          */
/* ------------------------------------------------------------------ */

files.forEach(file => {
  const fullSrc = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const src = scriptSrc(fullSrc);
  const cat = categoryFromName(file);

  checkCategoria(file, src, cat);
  checkScoring(file, src, cat);
  checkListens(file, src, cat);
  checkTimeSec(file, src, cat);
  checkAnswered(file, src, cat);
  checkCopyButton(file, src, cat);
  checkCompleted(file, src, cat);
  // navbar vive en el <body>, fuera de <script> — se comprueba contra el
  // HTML completo, no contra el JS extraído.
  checkNavbar(file, fullSrc);
});

/* ------------------------------------------------------------------ */
/* Salida en tabla                                                    */
/* ------------------------------------------------------------------ */

const col1 = Math.max(...rows.map(r => r.file.length), 'Fichero'.length);
const col2 = Math.max(...rows.map(r => r.check.length), 'Check'.length);
const col3 = Math.max(...rows.map(r => r.status.length), 'Estado'.length);

function pad(s, n) { return s + ' '.repeat(Math.max(0, n - s.length)); }

console.log(pad('Fichero', col1) + '  ' + pad('Check', col2) + '  ' + pad('Estado', col3) + '  Motivo');
console.log('-'.repeat(col1) + '  ' + '-'.repeat(col2) + '  ' + '-'.repeat(col3) + '  ' + '-'.repeat(40));
let lastFile = null;
rows.forEach(r => {
  const fileCol = r.file === lastFile ? '' : r.file;
  lastFile = r.file;
  console.log(pad(fileCol, col1) + '  ' + pad(r.check, col2) + '  ' + pad(r.status, col3) + '  ' + r.motivo);
});

const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
console.log('\n' + `Total: ${rows.length} comprobaciones sobre ${files.length} ficheros — ` +
  `OK: ${counts.OK || 0} · DEFECTO: ${counts.DEFECTO || 0} · ADVERTENCIA: ${counts.ADVERTENCIA || 0} · —: ${counts['—'] || 0}`);
console.log('\nInforme de estado, no gate — exit 0 independientemente de los resultados.');
process.exit(0);
