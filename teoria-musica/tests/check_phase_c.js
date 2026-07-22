/**
 * Phase C structural validation — checks that all 12 evaluative files
 * have the required feedback infrastructure (§3 MUSIC_GUIDE).
 *
 * Run: node teoria-musica/tests/check_phase_c.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

const EVALUATIVE_FILES = [
  'mus_dictado_simple-s1_v1.html',
  'mus_dictado_simple-s2_v1.html',
  'mus_audicion_fuerte-debil_v1.html',
  'mus_audicion_puente-sincopa_v1.html',
  'mus_audicion_sincopa-contratiempo_v1.html',
  'mus_teoria_nivel1_v1.html',
  'mus_teoria_nivel2_v1.html',
  'mus_teoria_nivel3_v1.html',
  'mus_teoria_repaso-final_v1.html',
  'mus_teoria_compas_v1.html',
  'mus_teoria_gran-repaso1_v1.html',
  'mus_teoria_gran-repaso2_v1.html'
];

const REQUIRED_PATTERNS = [
  { name: 'isoLocal helper', pattern: /function\s+isoLocal\s*\(/ },
  { name: 'buildSessionData', pattern: /function\s+buildSessionData\s*\(/ },
  { name: 'buildDualText', pattern: /function\s+buildDualText\s*\(/ },
  { name: 'finalizarConMood', pattern: /function\s+finalizarConMood\s*\(/ },
  { name: 'copiarRegistro', pattern: /function\s+copiarRegistro\s*\(/ },
  { name: 'mood-section HTML', pattern: /id="mood-section"/ },
  { name: 'registro-final HTML', pattern: /id="registro-final"/ },
  { name: 'andre_music_history append', pattern: /andre_music_history/ },
  { name: '---JSON--- delimiter', pattern: /---JSON---/ },
  { name: 'schema andre-music-log/v1', pattern: /andre-music-log\/v1/ }
];

// For teoria files: check they pass expected/answered to registrar + have demo
const TEORIA_EXTRA = [
  { name: 'topicStartTime tracking', pattern: /topicStartTime/ },
  { name: 'registrar with expected/answered', pattern: /registrar\([^)]*preg\.o\[correcta\]/ },
  { name: 'pantallaDemo section', pattern: /pantallaDemo/ }
];

// Static regression guards: catch the exact bug pattern found in dictado s1/s2
// (time_sec hardcoded to 0, answered set to the generic self-report literal
// instead of André's real answer) so it can't silently come back.
const DICTADO_STATIC_GUARDS = [
  { name: 'no hardcoded time_sec:0', pattern: /time_sec:\s*0\s*[,}]/, shouldMatch: false },
  { name: 'no answered:mark literal', pattern: /answered:\s*mark\s*[,}]/, shouldMatch: false }
];

let allPassed = true;
let totalChecks = 0;
let failedChecks = 0;

EVALUATIVE_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.log(`FAIL: ${file} — file not found`);
    allPassed = false;
    failedChecks++;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const category = file.match(/mus_([^_]+)_/)[1];
  let fileOk = true;

  // Check required patterns
  REQUIRED_PATTERNS.forEach(({ name, pattern }) => {
    totalChecks++;
    if (!pattern.test(content)) {
      console.log(`  FAIL: ${file} — missing ${name}`);
      fileOk = false;
      failedChecks++;
    }
  });

  // Extra checks for teoria files
  if (category === 'teoria') {
    TEORIA_EXTRA.forEach(({ name, pattern }) => {
      totalChecks++;
      if (!pattern.test(content)) {
        console.log(`  FAIL: ${file} — missing ${name}`);
        fileOk = false;
        failedChecks++;
      }
    });
  }

  // Extra checks for dictado files: static guards against the s1/s2 regression
  if (category === 'dictado') {
    DICTADO_STATIC_GUARDS.forEach(({ name, pattern }) => {
      totalChecks++;
      if (pattern.test(content)) {
        console.log(`  FAIL: ${file} — regression: ${name}`);
        fileOk = false;
        failedChecks++;
      }
    });
  }

  // Check that tool name in buildSessionData matches filename
  totalChecks++;
  const toolName = file.replace('.html', '');
  const toolPattern = new RegExp("tool:\\s*['\"]" + toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]");
  if (!toolPattern.test(content)) {
    console.log(`  FAIL: ${file} — tool name mismatch in buildSessionData`);
    fileOk = false;
    failedChecks++;
  }

  // Check category field matches
  totalChecks++;
  const categoryPattern = new RegExp("category:\\s*['\"]" + category + "['\"]");
  if (!categoryPattern.test(content)) {
    console.log(`  FAIL: ${file} — category mismatch (expected '${category}')`);
    fileOk = false;
    failedChecks++;
  }

  if (fileOk) {
    console.log(`  OK: ${file}`);
  } else {
    allPassed = false;
  }
});

// Shared DOM/localStorage mock used by every simulation below.
const DOM_MOCK = `
  var document = {
    getElementById: function() { return { classList: { add: function(){}, remove: function(){}, toggle: function(){} }, style: {}, innerHTML: '', textContent: '', value: '', disabled: false, querySelectorAll: function(){ return []; }, select: function(){}, addEventListener: function(){} }; },
    querySelectorAll: function() { return { forEach: function(){} }; },
    createElement: function() { return { className: '', textContent: '', onclick: null, innerHTML: '', insertAdjacentHTML: function(){}, appendChild: function(){} }; }
  };
  var window = { addEventListener: function(){}, AudioContext: function(){}, webkitAudioContext: function(){} };
  var localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = v; },
    removeItem: function(k) { delete this._data[k]; }
  };
  var navigator = { clipboard: null };
  var setInterval = function(){return 1;};
  var clearInterval = function(){};
  var setTimeout = function(){return 1;};
  var clearTimeout = function(){};
  var location = { reload: function(){} };
  var confirm = function(){ return true; };
`;

// Generic self-report literals that must never leak into \`answered\` for a
// real session — this is exactly the bug found in dictado s1/s2, where
// answered was set to the literal 'bien'/'repasar' mark instead of André's
// actual answer.
const GENERIC_ANSWER_LITERALS = ['bien', 'repasar', 'correcto', 'incorrecto', 'si', 'no', 'ok'];

function runSimulation(file, mockCode) {
  const tmpFile = path.join(require('os').tmpdir(), 'check_' + file.replace('.html', '.js'));
  fs.writeFileSync(tmpFile, mockCode);
  const { execSync } = require('child_process');
  const output = execSync('node ' + tmpFile, { encoding: 'utf-8' });
  process.stdout.write(output);
}

// Simulate buildSessionData output validation for teoria files
// by extracting and running the function with mocked state
console.log('\n--- JSON schema simulation (teoria files) ---');

const TEORIA_FILES = EVALUATIVE_FILES.filter(f => f.includes('teoria'));
TEORIA_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract TEMAS count
  const temasMatch = content.match(/const\s+TEMAS\s*=\s*\[/);
  if (!temasMatch) {
    console.log(`  SKIP: ${file} — cannot find TEMAS`);
    return;
  }

  // Extract JS between <script> and </script>
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.log(`  SKIP: ${file} — cannot extract script`);
    return;
  }

  const js = scriptMatch[1];

  // Mock minimal environment and run buildSessionData
  try {
    const mockCode = `
      ${DOM_MOCK}
      var GENERIC = ${JSON.stringify(GENERIC_ANSWER_LITERALS)};

      ${js}

      // Simulate a completed session with realistic per-item timing/answers
      estado = nuevoEstado();
      estado.temaIdx = TEMAS.length;
      TEMAS.forEach(function(t, i) {
        estado.resultados[i] = { acertado: i % 2 === 0, tries: (i % 3) + 1, expected: 'opcion_correcta_' + i, answered: 'opcion_elegida_' + i, time_sec: 8 + i };
      });

      var sd = buildSessionData(2);

      // Validate
      var errors = [];
      if (sd.schema !== 'andre-music-log/v1') errors.push('bad schema');
      if (sd.category !== 'teoria') errors.push('bad category');
      if (typeof sd.session !== 'object') errors.push('missing session');
      if (typeof sd.score !== 'object') errors.push('missing score');
      if (!Array.isArray(sd.items)) errors.push('items not array');
      if (sd.items.length !== TEMAS.length) errors.push('items count mismatch: ' + sd.items.length + ' vs ' + TEMAS.length);
      if (sd.mood !== 2) errors.push('mood not captured');

      // Verify score consistency
      var itemCorrect = sd.items.filter(function(it) { return it.correct; }).length;
      if (sd.score.correct !== itemCorrect) errors.push('score.correct (' + sd.score.correct + ') !== items correct count (' + itemCorrect + ')');

      // Regression guard: real sessions must carry real per-item timing and answers
      sd.items.forEach(function(it, i) {
        if (!(it.time_sec > 0)) errors.push('item ' + i + ' time_sec not > 0 (got ' + it.time_sec + ')');
        if (GENERIC.indexOf(String(it.answered).toLowerCase()) !== -1) errors.push('item ' + i + ' answered is a generic literal: ' + it.answered);
      });

      // Verify JSON roundtrip
      var jsonStr = JSON.stringify(sd);
      var parsed = JSON.parse(jsonStr);
      if (parsed.schema !== sd.schema) errors.push('JSON roundtrip failed');

      if (errors.length > 0) {
        process.stdout.write('  FAIL: ' + '${file}' + ' — ' + errors.join(', ') + '\\n');
        process.exit(1);
      } else {
        process.stdout.write('  OK: ' + '${file}' + ' (items=' + sd.items.length + ', score=' + sd.score.correct + '/' + sd.score.total + ')\\n');
      }
    `;

    runSimulation(file, mockCode);
    totalChecks++;
  } catch (e) {
    console.log(`  FAIL: ${file} — simulation error: ${e.message.split('\n')[0]}`);
    allPassed = false;
    failedChecks++;
    totalChecks++;
  }
});

// Simulate buildSessionData for dictado files: mock a realistic self-report
// state per item (mark + time_sec + transcrito) directly in localStorage,
// the way the real UI now persists it, and verify the output.
console.log('\n--- JSON schema simulation (dictado files) ---');

const DICTADO_FILES = EVALUATIVE_FILES.filter(f => f.includes('dictado'));
DICTADO_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.log(`  SKIP: ${file} — cannot extract script`);
    return;
  }
  const js = scriptMatch[1];

  try {
    const mockCode = `
      ${DOM_MOCK}
      var GENERIC = ${JSON.stringify(GENERIC_ANSWER_LITERALS)};

      ${js}

      // Simulate a completed session: André transcribed each item's figures
      // and self-graded it, exactly as the real UI now requires before the
      // mark buttons unlock.
      estado = {};
      BLOQUE_1.forEach(function(tokens, i) {
        estado['b1-' + (i+1)] = { mark: (i % 2 === 0) ? 'bien' : 'repasar', time_sec: 8 + i, transcrito: tokens.slice() };
      });
      BLOQUE_2.forEach(function(tokens, i) {
        estado['b2-' + (i+1)] = { mark: (i % 2 === 0) ? 'bien' : 'repasar', time_sec: 8 + i, transcrito: tokens.slice() };
      });
      guardar();
      sessionStart = new Date(Date.now() - 60000);

      var sd = buildSessionData(2);

      var errors = [];
      if (sd.schema !== 'andre-music-log/v1') errors.push('bad schema');
      if (sd.category !== 'dictado') errors.push('bad category');
      var expectedTotal = BLOQUE_1.length + BLOQUE_2.length;
      if (sd.items.length !== expectedTotal) errors.push('items count mismatch: ' + sd.items.length + ' vs ' + expectedTotal);

      sd.items.forEach(function(it, i) {
        if (!(it.time_sec > 0)) errors.push('item ' + i + ' time_sec not > 0 (got ' + it.time_sec + ')');
        if (GENERIC.indexOf(String(it.answered).toLowerCase()) !== -1) errors.push('item ' + i + ' answered is a generic literal: ' + it.answered);
      });

      var jsonStr = JSON.stringify(sd);
      var parsed = JSON.parse(jsonStr);
      if (parsed.schema !== sd.schema) errors.push('JSON roundtrip failed');

      if (errors.length > 0) {
        process.stdout.write('  FAIL: ' + '${file}' + ' — ' + errors.join(', ') + '\\n');
        process.exit(1);
      } else {
        process.stdout.write('  OK: ' + '${file}' + ' (items=' + sd.items.length + ', score=' + sd.score.correct + '/' + sd.score.total + ')\\n');
      }
    `;

    runSimulation(file, mockCode);
    totalChecks++;
  } catch (e) {
    console.log(`  FAIL: ${file} — simulation error: ${e.message.split('\n')[0]}`);
    allPassed = false;
    failedChecks++;
    totalChecks++;
  }
});

// Simulate buildSessionData for audicion files: mock the \`log\` array they
// all push real per-item {chosen, time_sec} entries into during play.
console.log('\n--- JSON schema simulation (audicion files) ---');

const AUDICION_FILES = EVALUATIVE_FILES.filter(f => f.includes('audicion'));
AUDICION_FILES.forEach(file => {
  const filePath = path.join(BASE, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.log(`  SKIP: ${file} — cannot extract script`);
    return;
  }
  const js = scriptMatch[1];

  try {
    const mockCode = `
      ${DOM_MOCK}
      var GENERIC = ${JSON.stringify(GENERIC_ANSWER_LITERALS)};

      ${js}

      // Simulate a completed session by populating \`log\` the way real
      // gameplay does (one push per answered item, with real timing).
      log.length = 0;
      for (var i = 0; i < 5; i++) {
        log.push({
          block: 'sim', item: 'item ' + i, phase: 1, topic: 'topic_' + i,
          expected: 'opcion_correcta_' + i, chosen: 'opcion_elegida_' + i,
          correct: i % 2 === 0, time_sec: 6 + i
        });
      }
      sessionStart = new Date(Date.now() - 60000);

      var sd = buildSessionData(2);

      var errors = [];
      if (sd.schema !== 'andre-music-log/v1') errors.push('bad schema');
      if (sd.category !== 'audicion') errors.push('bad category');
      if (sd.items.length !== 5) errors.push('items count mismatch: ' + sd.items.length + ' vs 5');

      sd.items.forEach(function(it, i) {
        if (!(it.time_sec > 0)) errors.push('item ' + i + ' time_sec not > 0 (got ' + it.time_sec + ')');
        if (GENERIC.indexOf(String(it.answered).toLowerCase()) !== -1) errors.push('item ' + i + ' answered is a generic literal: ' + it.answered);
      });

      var jsonStr = JSON.stringify(sd);
      var parsed = JSON.parse(jsonStr);
      if (parsed.schema !== sd.schema) errors.push('JSON roundtrip failed');

      if (errors.length > 0) {
        process.stdout.write('  FAIL: ' + '${file}' + ' — ' + errors.join(', ') + '\\n');
        process.exit(1);
      } else {
        process.stdout.write('  OK: ' + '${file}' + ' (items=' + sd.items.length + ')\\n');
      }
    `;

    runSimulation(file, mockCode);
    totalChecks++;
  } catch (e) {
    console.log(`  FAIL: ${file} — simulation error: ${e.message.split('\n')[0]}`);
    allPassed = false;
    failedChecks++;
    totalChecks++;
  }
});

console.log('\n============================================================');
if (allPassed && failedChecks === 0) {
  console.log(`RESULTADO GLOBAL: PASA — ${totalChecks} checks, 0 failures`);
} else {
  console.log(`RESULTADO GLOBAL: FALLA — ${failedChecks} failures de ${totalChecks} checks`);
  process.exit(1);
}
