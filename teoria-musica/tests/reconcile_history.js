/* eslint-disable no-console */
/**
 * reconcile_history.js
 *
 * Cruza un histórico exportado de `andre_music_history` (localStorage,
 * MUSIC_GUIDE.md §3.3) contra los JSON de sesión commiteados en
 * teoria-musica/data/, para detectar huecos en cualquiera de los dos
 * sentidos:
 *
 *   1. Sesiones que están en el histórico pero NO tienen fichero en
 *      data/ (nunca se archivaron).
 *   2. Ficheros en data/ que NO aparecen en el histórico (p.ej.
 *      recuperados manualmente de una conversación, como
 *      2026-07-26_mus_dictado_3-8_v1.json — diagnosticado el 26/07 pero
 *      archivado el 31/07 sin haber pasado nunca por
 *      andre_music_history).
 *
 * Emparejamiento: clave primaria = tool + '|' + session.start (el
 * timestamp ISO local exacto de isoLocal(), MUSIC_GUIDE §3.4, es
 * prácticamente un id de sesión). Si una entrada del histórico no
 * encuentra coincidencia exacta, se intenta un emparejamiento aproximado
 * por tool + fecha-del-día (para señalar "casi coincide, revisar a
 * mano" en vez de darla directamente por perdida — típicamente por
 * pequeñas diferencias de formato entre el volcado real y lo esperado).
 *
 * Entrada esperada: un fichero JSON que sea
 *   - un array de objetos de sesión (andre-music-log/v1), tal cual sale
 *     de `JSON.parse(localStorage.getItem('andre_music_history'))`, o
 *   - un objeto envoltorio con esa misma array en `.history` o en
 *     `.andre_music_history`.
 *
 * Uso:
 *   node teoria-musica/tests/reconcile_history.js <export_historico.json>
 *
 * NO se ejecuta como parte de esta sesión: no hay todavía ningún volcado
 * real de andre_music_history (§7 fase 2, botón de exportar, aún no
 * existe en index.html). Este script queda listo para cuando exista ese
 * volcado — por ejemplo desde el portátil de André.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  fail('falta el argumento: node reconcile_history.js <export_historico.json>');
}

const exportPath = path.resolve(arg);
if (!fs.existsSync(exportPath)) fail('no existe el fichero: ' + exportPath);

let raw;
try {
  raw = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
} catch (e) {
  fail('el fichero de histórico no es JSON válido: ' + e.message);
}

const history = Array.isArray(raw) ? raw
  : Array.isArray(raw.history) ? raw.history
    : Array.isArray(raw.andre_music_history) ? raw.andre_music_history
      : null;

if (!history) {
  fail('no se reconoce la forma del histórico — se esperaba un array, o un objeto con .history / .andre_music_history como array');
}

/* ------------------------------------------------------------------ */
/* Carga de teoria-musica/data/                                       */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(DATA_DIR)) fail('no existe ' + DATA_DIR);

const dataFiles = fs.readdirSync(DATA_DIR).filter(f => /\.json$/.test(f));

const dataSessions = []; // {file, tool, start, end, dayFromFilename}
dataFiles.forEach(file => {
  const full = path.join(DATA_DIR, file);
  let s;
  try {
    const txt = fs.readFileSync(full, 'utf8');
    const body = txt.includes('---JSON---') ? txt.split('---JSON---')[1] : txt;
    s = JSON.parse(body);
  } catch (e) {
    console.error(`AVISO: ${file} no es JSON válido (${e.message}) — se omite del cruce.`);
    return;
  }
  const dayMatch = /^(\d{4}-\d{2}-\d{2})_/.exec(file);
  dataSessions.push({
    file,
    tool: s.tool,
    start: s.session && s.session.start,
    end: s.session && s.session.end,
    dayFromFilename: dayMatch ? dayMatch[1] : null,
  });
});

/* ------------------------------------------------------------------ */
/* Emparejamiento                                                      */
/* ------------------------------------------------------------------ */

function dayOf(isoLocal) {
  return typeof isoLocal === 'string' ? isoLocal.slice(0, 10) : null;
}
function exactKey(tool, start) { return tool + '|' + start; }
function dayKey(tool, day) { return tool + '|' + day; }

const dataByExactKey = new Map();
const dataByDayKey = new Map(); // day-key -> [entries] (puede haber >1 el mismo día)
dataSessions.forEach(d => {
  if (d.tool && d.start) dataByExactKey.set(exactKey(d.tool, d.start), d);
  const day = dayOf(d.start) || d.dayFromFilename;
  if (d.tool && day) {
    const k = dayKey(d.tool, day);
    if (!dataByDayKey.has(k)) dataByDayKey.set(k, []);
    dataByDayKey.get(k).push(d);
  }
});

const historyByExactKey = new Map();
history.forEach((h, i) => {
  if (h && h.tool && h.session && h.session.start) {
    historyByExactKey.set(exactKey(h.tool, h.session.start), h);
  } else {
    console.error(`AVISO: entrada ${i} del histórico sin tool/session.start — se omite del cruce.`);
  }
});

/* 1. Histórico -> sin fichero en data/ */
const missingFiles = [];
history.forEach((h, i) => {
  if (!h || !h.tool || !h.session || !h.session.start) return;
  const ek = exactKey(h.tool, h.session.start);
  if (dataByExactKey.has(ek)) return; // coincidencia exacta, resuelto

  const day = dayOf(h.session.start);
  const near = dayKey(h.tool, day);
  const approx = dataByDayKey.get(near) || [];
  missingFiles.push({
    index: i, tool: h.tool, start: h.session.start,
    scoreTxt: h.score ? `${h.score.correct}/${h.score.total} (${h.score.pct}%)` : '—',
    approxCandidates: approx.map(a => a.file),
  });
});

/* 2. data/ -> sin entrada en histórico */
const missingHistory = [];
dataSessions.forEach(d => {
  if (!d.tool || !d.start) {
    missingHistory.push({ file: d.file, tool: d.tool, start: d.start, reason: 'sin tool/session.start en el JSON' });
    return;
  }
  const ek = exactKey(d.tool, d.start);
  if (!historyByExactKey.has(ek)) {
    missingHistory.push({ file: d.file, tool: d.tool, start: d.start, reason: 'sin coincidencia exacta tool+session.start en el histórico' });
  }
});

/* ------------------------------------------------------------------ */
/* Informe                                                             */
/* ------------------------------------------------------------------ */

console.log(`Histórico: ${history.length} sesión(es). data/: ${dataSessions.length} fichero(s) JSON.\n`);

console.log('=== 1. En el histórico, SIN fichero en data/ (no archivadas) ===');
if (missingFiles.length === 0) {
  console.log('  Ninguna — todas las sesiones del histórico tienen fichero en data/.');
} else {
  missingFiles.forEach(m => {
    const hint = m.approxCandidates.length
      ? ` — posible candidato el mismo día: ${m.approxCandidates.join(', ')} (revisar a mano, no es coincidencia exacta)`
      : '';
    console.log(`  [${m.index}] ${m.tool} · ${m.start} · resultado ${m.scoreTxt}${hint}`);
  });
}

console.log('\n=== 2. En data/, SIN entrada en el histórico (archivadas por fuera) ===');
if (missingHistory.length === 0) {
  console.log('  Ninguna — todos los ficheros de data/ tienen su sesión en el histórico.');
} else {
  missingHistory.forEach(m => {
    console.log(`  ${m.file} · tool=${m.tool || '?'} · start=${m.start || '?'} · ${m.reason}`);
  });
}

console.log(`\nResumen: ${missingFiles.length} hueco(s) histórico→data/, ${missingHistory.length} hueco(s) data/→histórico.`);
console.log('Informe de estado — no es un gate, exit 0 independientemente del resultado.');
process.exit(0);
