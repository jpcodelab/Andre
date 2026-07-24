// Test de validación para mus_audicion_sincopa-contratiempo_v2
// Uso:
//   node check_sincopa_contratiempo_v2.js                 -> valida solo los patrones
//   node check_sincopa_contratiempo_v2.js data/2026-XX.json -> valida también un registro de sesión real

const fs = require('fs');

const PATTERNS = {
  sincopa: {
    S1: [[0,1],[1,2],[4,1],[5,2]],
    S2: [[1,2],[3,1],[6,2]],
    S3: [[3,2],[6,1]],
    S4: [[0,2],[3,2],[6,1],[7,1]],
    S5: [[1,2],[4,2],[7,1]],
  },
  contratiempo: {
    C1: [[1,1],[3,1],[5,1],[7,1]],
    C2: [[1,1],[3,1],[7,1]],
    C3: [[3,1],[5,1],[7,1]],
    C4: [[1,1],[5,1],[7,1]],
    C5: [[1,1],[3,1],[5,1]],
  },
  normal: {
    N1: [[0,2],[2,2],[4,2],[6,2]],
    N2: [[0,4],[4,4]],
    N3: [[0,2],[2,2],[4,4]],
    N4: [[0,4],[4,2],[6,2]],
    N5: [[0,2],[4,2],[6,2]],
  }
};
const MEASURE_UNITS = 8; // 4/4 simple, unidad = corchea

function validatePatterns(){
  let ok = true;
  for (const type of Object.keys(PATTERNS)){
    for (const id of Object.keys(PATTERNS[type])){
      const notes = PATTERNS[type][id].slice().sort((a,b)=>a[0]-b[0]);
      let lastEnd = 0;
      for (const [onset, dur] of notes){
        if (onset < 0 || dur <= 0 || onset + dur > MEASURE_UNITS){
          console.log(`FAIL bounds ${type}.${id}: [${onset},${dur}]`); ok = false;
        }
        if (onset < lastEnd){
          console.log(`FAIL overlap ${type}.${id}: onset ${onset} < lastEnd ${lastEnd}`); ok = false;
        }
        lastEnd = Math.max(lastEnd, onset + dur);
      }
      if (type === 'normal'){
        const bad = notes.filter(([o]) => o % 2 !== 0);
        if (bad.length){ console.log(`FAIL regla normal ${id}: onsets impares`, bad); ok = false; }
      }
      if (type === 'contratiempo'){
        const badOnset = notes.filter(([o]) => o % 2 === 0);
        const badDur = notes.filter(([o,d]) => o % 2 !== 0 && d !== 1);
        if (badOnset.length || badDur.length){ console.log(`FAIL regla contratiempo ${id}`, badOnset, badDur); ok = false; }
      }
      if (type === 'sincopa'){
        const crossing = notes.filter(([o,d]) => o % 2 !== 0 && d >= 2);
        if (crossing.length === 0){ console.log(`FAIL regla sincopa ${id}: sin nota que cruce el pulso`); ok = false; }
      }
    }
  }
  console.log(ok ? 'PATRONES: OK' : 'PATRONES: FALLO');
  return ok;
}

function validateSession(path){
  let ok = true;
  const raw = fs.readFileSync(path, 'utf8');
  let j;
  try { j = JSON.parse(raw); } catch(e){ console.log('FAIL: JSON no parseable', e.message); return false; }

  if (j.schema !== 'andre-music-log/v1'){ console.log('FAIL: schema inesperado', j.schema); ok = false; }
  if (j.tool !== 'mus_audicion_sincopa-contratiempo_v2'){ console.log('FAIL: tool inesperado', j.tool); ok = false; }
  if (j.category !== 'audicion'){ console.log('FAIL: category inesperada', j.category); ok = false; }
  if (!j.scoring){ console.log('FAIL: falta scoring'); ok = false; }
  if (!/^[+-]\d{2}:\d{2}$/.test((j.session.start||'').slice(-6))){ console.log('FAIL: session.start sin timezone'); ok = false; }
  if (!/^[+-]\d{2}:\d{2}$/.test((j.session.end||'').slice(-6))){ console.log('FAIL: session.end sin timezone'); ok = false; }

  // score vs blocks
  const blockSumCorrect = (j.blocks||[]).reduce((a,b)=>a+b.correct,0);
  const blockSumTotal = (j.blocks||[]).reduce((a,b)=>a+b.total,0);
  if (blockSumCorrect !== j.score.correct || blockSumTotal !== j.score.total){
    console.log('FAIL: score no coincide con la suma de blocks', j.score, {blockSumCorrect, blockSumTotal}); ok = false;
  }
  // blocks vs items
  const evaluable = (j.items||[]).filter(it => typeof it.correct === 'boolean');
  const evalCorrect = evaluable.filter(it => it.correct).length;
  if (evalCorrect !== j.score.correct || evaluable.length !== j.score.total){
    console.log('FAIL: score no coincide con items evaluables', {evalCorrect, evalTotal: evaluable.length}, j.score); ok = false;
  }
  // time_sec no todo cero
  const allZero = evaluable.length > 0 && evaluable.every(it => it.time_sec === 0);
  if (allZero){ console.log('FAIL: instrumentación — todos los time_sec son 0'); ok = false; }
  // listens/listen_sec presentes en items evaluables (obligatorio en audicion)
  evaluable.forEach(it => {
    if (typeof it.listens !== 'number' || typeof it.listen_sec !== 'number'){
      console.log(`FAIL: item n=${it.n} sin listens/listen_sec`); ok = false;
    }
    if (it.answered === 'bien' || it.answered === 'mal' || it.answered === 'ok'){
      console.log(`FAIL: item n=${it.n} usa respuesta genérica en vez del vocabulario real`); ok = false;
    }
  });
  // mood
  if (j.mood !== null && ![1,2,3].includes(j.mood)){ console.log('FAIL: mood fuera de rango', j.mood); ok = false; }

  console.log(ok ? 'SESIÓN: OK' : 'SESIÓN: FALLO');
  return ok;
}

const patternsOk = validatePatterns();
let sessionOk = true;
if (process.argv[2]){
  sessionOk = validateSession(process.argv[2]);
}
process.exit((patternsOk && sessionOk) ? 0 : 1);
