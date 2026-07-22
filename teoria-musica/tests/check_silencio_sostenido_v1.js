// teoria-musica/tests/check_silencio_sostenido_v1.js
// Verifica los patrones de mus_audicion_silencio-sostenido_v1.html
// Compás de 2/4: 2 tiempos (negras) = 4 corcheas (slots 0-3). Tiempos: slots 0 y 2.
// Ejecutar: node teoria-musica/tests/check_silencio_sostenido_v1.js

const TOTAL_SLOTS = 4;
const STRONG_SLOTS = [0, 2];

const PATTERNS = {
  larga:          { attacks: [{ start: 0, dur: 4 }] },
  corta_silencio: { attacks: [{ start: 0, dur: 2 }] },
  silencio_corta: { attacks: [{ start: 2, dur: 2 }] }
};

let failures = 0;
function fail(m) { console.error("FALLO: " + m); failures++; }

function occ(name, attacks) {
  const o = new Array(TOTAL_SLOTS).fill(false);
  attacks.forEach(a => {
    if (a.dur < 1) fail(`${name}: duración inválida`);
    for (let i = a.start; i < a.start + a.dur; i++) {
      if (i < 0 || i >= TOTAL_SLOTS) { fail(`${name}: fuera del compás`); return; }
      if (o[i]) fail(`${name}: solape en slot ${i}`);
      o[i] = true;
    }
  });
  return o;
}

// 1. Cada patrón suma exactamente el compás (sonido + silencios = 4)
Object.entries(PATTERNS).forEach(([name, def]) => {
  const dur = def.attacks.reduce((s, a) => s + a.dur, 0);
  const rests = occ(name, def.attacks).filter(x => !x).length;
  if (dur + rests !== TOTAL_SLOTS) fail(`${name}: ${dur}+${rests} ≠ ${TOTAL_SLOTS}`);
});

// 2. larga: una sola nota que ocupa AMBOS tiempos (suena en slot 0 y en slot 2)
{
  const o = occ('larga', PATTERNS.larga.attacks);
  if (PATTERNS.larga.attacks.length !== 1) fail('larga: debe ser 1 sola nota');
  STRONG_SLOTS.forEach(s => { if (!o[s]) fail(`larga: no suena en el tiempo (slot ${s})`); });
  if (PATTERNS.larga.attacks[0].dur !== 4) fail('larga: debe durar los 2 tiempos (dur 4)');
}

// 3. corta_silencio: suena el tiempo 1, silencio en el tiempo 2
{
  const o = occ('corta_silencio', PATTERNS.corta_silencio.attacks);
  if (!o[0]) fail('corta_silencio: debe sonar en el tiempo 1');
  if (o[2]) fail('corta_silencio: el tiempo 2 debe estar en silencio');
}

// 4. silencio_corta: silencio en el tiempo 1, suena el tiempo 2
{
  const o = occ('silencio_corta', PATTERNS.silencio_corta.attacks);
  if (o[0]) fail('silencio_corta: el tiempo 1 debe estar en silencio');
  if (!o[2]) fail('silencio_corta: debe sonar en el tiempo 2');
}

// 5. Distinguibilidad: los tres deben diferir en el sonido del tiempo 2 respecto a larga
//    (larga suena sostenida en 2; corta_silencio calla en 2; silencio_corta ataca nuevo en 2)
{
  const sig = n => JSON.stringify(PATTERNS[n].attacks);
  const names = Object.keys(PATTERNS);
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      if (sig(names[i]) === sig(names[j])) fail(`${names[i]} y ${names[j]} idénticos`);
}

if (failures === 0) {
  console.log('OK: larga, corta_silencio y silencio_corta cumplen su definición y suman ' + TOTAL_SLOTS + ' corcheas (2/4).');
  process.exit(0);
} else { console.error(failures + ' fallo(s).'); process.exit(1); }
