// teoria-musica/tests/check_puente_sincopa_v2.js
// Verifica los patrones rítmicos de mus_audicion_puente-sincopa_v2.html
// Compás de 2/4: 2 tiempos (negras) = 4 corcheas (slots 0-3).
// Slots fuertes (tiempos, con campanita): 0 y 2. Slots débiles ("y"): 1 y 3.
// Ejecutar: node teoria-musica/tests/check_puente_sincopa_v2.js

const TOTAL_SLOTS = 4;
const STRONG_SLOTS = [0, 2];

const PATTERNS = {
  normal:       { attacks: [{ start: 0, dur: 2 }, { start: 2, dur: 2 }] },
  contratiempo: { attacks: [{ start: 1, dur: 1 }, { start: 3, dur: 1 }] },
  sincopa:      { attacks: [{ start: 0, dur: 1 }, { start: 1, dur: 2 }, { start: 3, dur: 1 }] }
};

let failures = 0;
function fail(msg) { console.error("FALLO: " + msg); failures++; }

function occupancy(name, attacks) {
  const occ = new Array(TOTAL_SLOTS).fill(false);
  attacks.forEach(a => {
    if (a.dur < 1) fail(`${name}: duración inválida (${a.dur})`);
    for (let i = a.start; i < a.start + a.dur; i++) {
      if (i < 0 || i >= TOTAL_SLOTS) { fail(`${name}: ataque fuera del compás (start=${a.start} dur=${a.dur})`); return; }
      if (occ[i]) fail(`${name}: solape de ataques en el slot ${i}`);
      occ[i] = true;
    }
  });
  return occ;
}

// ---- 1. Verificación matemática: cada patrón suma exactamente el compás ----
Object.entries(PATTERNS).forEach(([name, def]) => {
  const totalDur = def.attacks.reduce((s, a) => s + a.dur, 0);
  const occ = occupancy(name, def.attacks);
  const rests = occ.filter(x => !x).length;
  if (totalDur + rests !== TOTAL_SLOTS) {
    fail(`${name}: duraciones (${totalDur}) + silencios (${rests}) = ${totalDur + rests}, se esperaba ${TOTAL_SLOTS}`);
  }
});

// ---- 2. normal: ataque en CADA tiempo, y cada nota dura el tiempo entero ----
{
  const atk = PATTERNS.normal.attacks;
  STRONG_SLOTS.forEach(s => {
    if (!atk.some(a => a.start === s)) fail(`normal: falta ataque en el tiempo (slot ${s})`);
  });
  atk.forEach(a => {
    if (!STRONG_SLOTS.includes(a.start)) fail(`normal: ataque en slot débil (${a.start})`);
    if (a.dur !== 2) fail(`normal: la nota del slot ${a.start} dura ${a.dur} corcheas, se espera 2 (negra completa)`);
  });
}

// ---- 3. contratiempo: tiempos en silencio, notas solo en los "y" ----
{
  const occ = occupancy('contratiempo', PATTERNS.contratiempo.attacks);
  STRONG_SLOTS.forEach(s => {
    if (occ[s]) fail(`contratiempo: hay sonido en el tiempo (slot ${s}); debe estar en silencio`);
  });
  PATTERNS.contratiempo.attacks.forEach(a => {
    if (STRONG_SLOTS.includes(a.start)) fail(`contratiempo: ataque en el tiempo (slot ${a.start})`);
  });
}

// ---- 4. sincopa: nota que empieza en "y" y atraviesa un tiempo sin ataque nuevo ----
{
  const atk = PATTERNS.sincopa.attacks;
  const syncopated = atk.filter(a => {
    if (STRONG_SLOTS.includes(a.start)) return false;       // debe empezar en parte débil
    const end = a.start + a.dur;                             // slot final exclusivo
    const crossed = STRONG_SLOTS.filter(s => s > a.start && s < end);
    if (crossed.length === 0) return false;                  // debe atravesar un tiempo
    return crossed.every(s => !atk.some(o => o.start === s)); // sin ataque nuevo en ese tiempo
  });
  if (syncopated.length === 0) {
    fail('sincopa: ningún ataque cumple la definición (empezar en "y" y atravesar un tiempo sin nuevo ataque)');
  }
}

// ---- 5. Los tres patrones deben ser distinguibles entre sí ----
{
  const sig = name => JSON.stringify(PATTERNS[name].attacks);
  const names = Object.keys(PATTERNS);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (sig(names[i]) === sig(names[j])) fail(`${names[i]} y ${names[j]} son idénticos`);
    }
  }
}

if (failures === 0) {
  console.log('OK: normal, contratiempo y sincopa cumplen su definición y suman ' + TOTAL_SLOTS + ' corcheas (2/4).');
  process.exit(0);
} else {
  console.error(failures + ' fallo(s).');
  process.exit(1);
}
