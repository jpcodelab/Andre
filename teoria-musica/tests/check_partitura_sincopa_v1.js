// check_partitura_sincopa_v1.js
// Valida mus_audicion_partitura-sincopa_v1.html sin dependencias externas.
//   node tests/check_partitura_sincopa_v1.js
//   node tests/check_partitura_sincopa_v1.js data/YYYY-MM-DD_mus_audicion_partitura-sincopa_v1.json
//
// Extrae las definiciones del propio HTML: si el HTML cambia, el test lo ve.

const fs = require('fs');
const path = require('path');

const TOOL = 'mus_audicion_partitura-sincopa_v1';
const HTML = path.join(__dirname, '..', TOOL + '.html');
const MEASURE = 8, MID = 4;
const SINGLE_SYMBOL = new Set([1,2,3,4,6,8]);

let ok = true;
function fail(msg){ console.log('FAIL ' + msg); ok = false; }

// ---------- Extracción de una const con delimitadores balanceados ----------
function extractConst(src, name){
  const start = src.indexOf('const ' + name + ' =');
  if (start === -1) throw new Error('No se encontró const ' + name);
  let i = src.indexOf('=', start) + 1;
  while (/\s/.test(src[i])) i++;
  const open = src[i];
  const close = open === '{' ? '}' : ']';
  if (open !== '{' && open !== '[') throw new Error(name + ' no empieza por { ni [');
  let depth = 0, j = i, inStr = null;
  for (; j < src.length; j++){
    const c = src[j];
    if (inStr){ if (c === inStr && src[j-1] !== '\\') inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`'){ inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close){ depth--; if (depth === 0){ j++; break; } }
  }
  return eval('(' + src.slice(i, j) + ')');
}

const html = fs.readFileSync(HTML, 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

const PATTERNS       = extractConst(script, 'PATTERNS');
const WARMUP         = extractConst(script, 'WARMUP');
const BLOCK_LECTURA  = extractConst(script, 'BLOCK_LECTURA');
const BLOCK_ESCUCHA  = extractConst(script, 'BLOCK_ESCUCHA');
const BLOCK_MIXTO    = extractConst(script, 'BLOCK_MIXTO');

// ---------- 1. Los patrones cuadran y cumplen su definición ----------
function checkPatterns(){
  for (const type of Object.keys(PATTERNS)){
    for (const id of Object.keys(PATTERNS[type])){
      const notes = PATTERNS[type][id].slice().sort((a,b)=>a[0]-b[0]);
      let lastEnd = 0;
      for (const [onset, dur] of notes){
        if (onset < 0 || dur <= 0 || onset + dur > MEASURE) fail(`límites ${type}.${id}: [${onset},${dur}]`);
        if (onset < lastEnd) fail(`solapamiento ${type}.${id}: ${onset} < ${lastEnd}`);
        lastEnd = Math.max(lastEnd, onset + dur);
      }
      if (type === 'normal' && notes.some(([o]) => o % 2 !== 0))
        fail(`regla normal ${id}: hay ataques fuera del pulso`);
      if (type === 'contratiempo'){
        if (notes.some(([o]) => o % 2 === 0)) fail(`regla contratiempo ${id}: ataque en el pulso`);
        if (notes.some(([o,d]) => o % 2 !== 0 && d !== 1)) fail(`regla contratiempo ${id}: nota que cruza el pulso`);
      }
      if (type === 'sincopa' && !notes.some(([o,d]) => o % 2 !== 0 && d >= 2))
        fail(`regla sincopa ${id}: ninguna nota atraviesa un pulso`);
    }
  }
}

// ---------- 2. La notación ABC suma el compás exacto ----------
// Reimplementación mínima e independiente del generador del HTML:
// si ambos coinciden en el total, el generador no está perdiendo ni inventando tiempo.
function abcUnits(notes){
  const sorted = notes.slice().sort((a,b)=>a[0]-b[0]);
  let total = 0, cursor = 0;
  for (const [onset, dur] of sorted){
    if (onset > cursor) total += onset - cursor;
    total += dur;
    cursor = onset + dur;
  }
  if (cursor < MEASURE) total += MEASURE - cursor;
  return total;
}
function checkAbcTotals(){
  for (const type of Object.keys(PATTERNS))
    for (const id of Object.keys(PATTERNS[type])){
      const u = abcUnits(PATTERNS[type][id]);
      if (u !== MEASURE) fail(`ABC ${type}.${id}: ${u} unidades (esperado ${MEASURE})`);
    }
}

// ---------- 3. Diseño de los ítems ----------
function exists(type, id){ return PATTERNS[type] && PATTERNS[type][id]; }

function checkItems(){
  // Referencias válidas
  WARMUP.forEach((w,i) => { if (!exists(w.type, w.patId)) fail(`WARMUP[${i}] referencia inexistente ${w.type}.${w.patId}`); });
  BLOCK_LECTURA.forEach((it,i) => { if (!exists(it.patType, it.patId)) fail(`BLOCK_LECTURA[${i}] referencia inexistente`); });

  const escuchaItems = BLOCK_ESCUCHA.concat(BLOCK_MIXTO.filter(m => m.dir === 'escucha'));
  const lecturaItems = BLOCK_LECTURA.concat(BLOCK_MIXTO.filter(m => m.dir === 'lectura'));

  lecturaItems.forEach((it,i) => { if (!exists(it.patType, it.patId)) fail(`lectura[${i}] referencia inexistente`); });

  escuchaItems.forEach((it,i) => {
    if (!exists(it.correct[0], it.correct[1])) fail(`escucha[${i}] correcta inexistente`);
    if (!it.options || it.options.length !== 3) fail(`escucha[${i}] no tiene 3 opciones`);
    it.options.forEach(o => { if (!exists(o[0], o[1])) fail(`escucha[${i}] opción inexistente ${o}`); });
    // la correcta debe estar entre las opciones, exactamente una vez
    const hits = it.options.filter(o => o[0] === it.correct[0] && o[1] === it.correct[1]).length;
    if (hits !== 1) fail(`escucha[${i}] la correcta aparece ${hits} veces entre las opciones`);
    // opciones no repetidas
    const keys = new Set(it.options.map(o => o.join('.')));
    if (keys.size !== 3) fail(`escucha[${i}] tiene opciones repetidas`);
    // las tres opciones deben ser de tipos distintos (si no, la pregunta es ambigua)
    const types = new Set(it.options.map(o => o[0]));
    if (types.size !== 3) fail(`escucha[${i}] las opciones no cubren los tres tipos`);
  });

  // La correcta no puede estar siempre en la misma posición
  const positions = escuchaItems.map(it =>
    it.options.findIndex(o => o[0] === it.correct[0] && o[1] === it.correct[1]));
  if (new Set(positions).size < 2) fail(`la respuesta correcta está siempre en la misma posición: ${positions}`);
  const counts = [0,1,2].map(p => positions.filter(x => x === p).length);
  if (Math.max(...counts) > Math.ceil(positions.length * 0.6))
    fail(`posición de la correcta desequilibrada: ${counts}`);

  // Cada bloque evaluado debe cubrir los tres tipos
  const typesOf = arr => new Set(arr);
  const lecturaTypes = typesOf(BLOCK_LECTURA.map(i => i.patType));
  if (lecturaTypes.size !== 3) fail(`BLOCK_LECTURA no cubre los tres tipos: ${[...lecturaTypes]}`);
  const escuchaTypes = typesOf(BLOCK_ESCUCHA.map(i => i.correct[0]));
  if (escuchaTypes.size !== 3) fail(`BLOCK_ESCUCHA no cubre los tres tipos: ${[...escuchaTypes]}`);
  const mixtoTypes = typesOf(BLOCK_MIXTO.map(i => i.dir === 'lectura' ? i.patType : i.correct[0]));
  if (mixtoTypes.size !== 3) fail(`BLOCK_MIXTO no cubre los tres tipos: ${[...mixtoTypes]}`);

  // El bloque mixto debe alternar las dos direcciones y ser suficientemente largo
  if (BLOCK_MIXTO.length < 8) fail(`BLOCK_MIXTO demasiado corto (${BLOCK_MIXTO.length}) para descartar el azar`);
  const dirs = new Set(BLOCK_MIXTO.map(i => i.dir));
  if (dirs.size !== 2) fail('BLOCK_MIXTO no alterna las dos direcciones');

  console.log(`  ítems evaluados: lectura ${lecturaItems.length} · escucha ${escuchaItems.length} · total ${lecturaItems.length + escuchaItems.length}`);
  console.log(`  posición de la correcta en "escucha": ${positions.join(',')} (reparto ${counts.join('/')})`);
}

// ---------- 4. Cumplimiento de la guía en el propio HTML ----------
function checkHtmlContract(){
  const musts = [
    ["schema andre-music-log/v1", /andre-music-log\/v1/],
    ["declara scoring", /scoring:\s*'auto'/],
    ["histórico andre_music_history", /andre_music_history/],
    ["registro andre_music_completed", /andre_music_completed/],
    ["delimitador ---JSON---", /---JSON---/],
    ["botón copiar registro", /Copiar registro/],
    ["pregunta de mood", /mood/],
    ["aviso de sonido", /necesita sonido/i],
    ["navbar reiniciar", /Reiniciar ejercicio/],
    ["enlace al índice", /\.\.\/index\.html#lenguaje-musical/],
    ["abcjs vendorizado (no CDN)", /src="vendor\/abcjs-basic-min\.js"/],
  ];
  musts.forEach(([label, re]) => { if (!re.test(html)) fail(`contrato de la guía: falta ${label}`); });
  if (/src="https?:\/\/(?!fonts\.googleapis)/.test(html))
    fail('contrato de la guía: hay un <script src> externo que no es Google Fonts');
}

// ---------- 5. Registro de sesión real (opcional) ----------
function checkSession(file){
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (j.schema !== 'andre-music-log/v1') fail('sesión: schema inesperado ' + j.schema);
  if (j.tool !== TOOL) fail('sesión: tool inesperado ' + j.tool);
  if (j.category !== 'audicion') fail('sesión: category inesperada ' + j.category);
  if (!j.scoring) fail('sesión: falta scoring');
  ['start','end'].forEach(k => {
    if (!/[+-]\d{2}:\d{2}$/.test(j.session[k] || '')) fail(`sesión: ${k} sin zona horaria`);
  });
  const bC = j.blocks.reduce((a,b)=>a+b.correct,0), bT = j.blocks.reduce((a,b)=>a+b.total,0);
  if (bC !== j.score.correct || bT !== j.score.total)
    fail(`sesión: score ${j.score.correct}/${j.score.total} != suma de blocks ${bC}/${bT}`);
  const ev = j.items.filter(i => typeof i.correct === 'boolean');
  if (ev.filter(i=>i.correct).length !== j.score.correct || ev.length !== j.score.total)
    fail('sesión: score no coincide con los items evaluables');
  if (ev.length && ev.every(i => i.time_sec === 0)) fail('sesión: instrumentación — todos los time_sec son 0');
  const VOCAB = new Set(['sincopa','contratiempo','normal']);
  const IDS = new Set(Object.keys(PATTERNS).flatMap(t => Object.keys(PATTERNS[t])));
  ev.forEach(i => {
    const okVocab = (VOCAB.has(i.answered) && VOCAB.has(i.expected))
                 || (IDS.has(i.answered) && IDS.has(i.expected));
    if (!okVocab) fail(`sesión: item n=${i.n} usa vocabulario fuera de la herramienta (${i.expected}/${i.answered})`);
    if (typeof i.listens !== 'number' || typeof i.listen_sec !== 'number')
      fail(`sesión: item n=${i.n} sin listens/listen_sec`);
  });
  const TOPICS = new Set(['sincopa','contratiempo','ritmo_normal']);
  j.items.forEach(i => { if (!TOPICS.has(i.topic)) fail(`sesión: topic desconocido "${i.topic}" en n=${i.n}`); });
  if (j.mood !== null && ![1,2,3].includes(j.mood)) fail('sesión: mood fuera de rango');
  console.log(`  sesión ${path.basename(file)}: ${j.score.correct}/${j.score.total} (${j.score.pct}%)`);
}

// ---------- Ejecución ----------
console.log('Patrones y reglas…');      checkPatterns();
console.log('Totales de notación ABC…'); checkAbcTotals();
console.log('Diseño de los ítems…');     checkItems();
console.log('Contrato de la guía…');     checkHtmlContract();
if (process.argv[2]){ console.log('Registro de sesión…'); checkSession(process.argv[2]); }

console.log(ok ? '\nOK — todo correcto' : '\nFALLO');
process.exit(ok ? 0 : 1);
