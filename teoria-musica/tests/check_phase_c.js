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
      // Mock DOM
      var document = {
        getElementById: function() { return { classList: { add: function(){}, remove: function(){} }, style: {}, innerHTML: '', textContent: '', value: '', querySelectorAll: function(){ return []; }, select: function(){} }; },
        querySelectorAll: function() { return { forEach: function(){} }; },
        createElement: function() { return { className: '', textContent: '', onclick: null, innerHTML: '', insertAdjacentHTML: function(){}, appendChild: function(){} }; }
      };
      var window = { addEventListener: function(){} };
      var localStorage = {
        _data: {},
        getItem: function(k) { return this._data[k] || null; },
        setItem: function(k, v) { this._data[k] = v; },
        removeItem: function(k) { delete this._data[k]; }
      };
      var navigator = { clipboard: null };
      var setInterval = function(){return 1;};
      var clearInterval = function(){};
      var setTimeout = function(){};
      var location = { reload: function(){} };

      ${js}

      // Simulate a completed session
      estado = nuevoEstado();
      estado.temaIdx = TEMAS.length;
      TEMAS.forEach(function(t, i) {
        estado.resultados[i] = { acertado: i % 2 === 0, tries: (i % 3) + 1, expected: 'test', answered: 'test', time_sec: 10 };
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

    // Write to temp file and run
    const tmpFile = path.join(require('os').tmpdir(), 'check_' + file.replace('.html', '.js'));
    fs.writeFileSync(tmpFile, mockCode);
    const { execSync } = require('child_process');
    const output = execSync('node ' + tmpFile, { encoding: 'utf-8' });
    process.stdout.write(output);
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
