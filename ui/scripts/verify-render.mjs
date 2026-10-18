/**
 * Render verification for the FREECC UI.
 *
 *   node scripts/verify-render.mjs            check boot + snapshot
 *   node scripts/verify-render.mjs --update   rewrite the snapshot (do this only
 *                                             when you *intend* to change the UI)
 *
 * Three kinds of assertion:
 *   1. BOOT INVARIANTS — the app actually rendered content in a real browser:
 *      cloud nodes, issue rows, gates, ledger, prompts, provider roster, grades.
 *   2. PORT PRESENT — the capabilities ported from free-research-llm are really
 *      on screen (providers grid, role routing, grade table, computed verdict),
 *      so a silent revert of the port fails the build instead of passing it.
 *   3. SNAPSHOT — the rendered <body> matches tests/snapshots/rendered-body.txt.
 *      This replaces the old byte-equivalence test against the single-file
 *      original, which was only meaningful while the split was behaviour-neutral.
 *      reference/freecc-ui.original.html is still kept and still rendered, so the
 *      provenance claim stays checkable.
 *
 * Exits non-zero on failure. If no Chromium-family browser is found it prints
 * SKIP and exits 0, so the suite still runs on machines without one.
 */
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const UI_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ORIGINAL = join(UI_ROOT, 'reference', 'freecc-ui.original.html');
const BUILT = join(UI_ROOT, 'index.html');
const SNAPSHOT = join(UI_ROOT, 'tests', 'snapshots', 'fingerprint.json');
const UPDATE = process.argv.includes('--update');

/* Tabs render lazily, so a plain dump of index.html only contains the cloud view.
   This visits every view before the DOM is serialized, which is what makes the
   table/badge assertions and the snapshot meaningful. */
const VISIT_ALL = `<script>
(function(){ ['build','cloud','issues','indexes','evidence','prompts','report','providers','grades','research']
  .forEach(function(t){ try{ gotoTab(t); }catch(e){} });
  try{ gotoTab('cloud'); }catch(e){} })();
</script>`;

const failures = [];

function findBrowser() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const win = process.env.ProgramFiles || 'C:\\Program Files';
  const win86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    join(win86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(win, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(win86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(win, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  return null;
}

function dumpDom(browser, file, { budget = 7000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const profile = join(tmpdir(), `freecc-uidump-${process.pid}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(profile, { recursive: true });
    const domFile = join(profile, 'dom.html');
    const errFile = join(profile, 'err.log');
    const domFd = openSync(domFile, 'w');
    const errFd = openSync(errFile, 'w');
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-extensions',
      '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, `--virtual-time-budget=${budget}`, '--dump-dom',
      pathToFileURL(file).href,
    ];
    let child;
    try {
      child = spawn(browser, args, { stdio: ['ignore', domFd, errFd] });
    } catch (err) {
      closeSync(domFd); closeSync(errFd);
      return reject(err);
    }
    const timer = setTimeout(() => child.kill(), budget + 25000);
    child.on('error', (err) => {
      clearTimeout(timer); closeSync(domFd); closeSync(errFd); reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer); closeSync(domFd); closeSync(errFd);
      let dom = '';
      let err = '';
      try { dom = readFileSync(domFile, 'utf8'); } catch { dom = ''; }
      try { err = readFileSync(errFile, 'utf8'); } catch { /* ignore */ }
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
      if (!dom || !/<body/i.test(dom)) {
        return reject(new Error(`no DOM produced by browser${err ? `:\n${err.slice(0, 600)}` : ''}`));
      }
      resolvePromise(dom);
    });
  });
}

function normalizedBody(html) {
  const start = html.search(/<body\b/i);
  const end = html.search(/<\/body>/i);
  let body = start >= 0 ? html.slice(start, end < 0 ? undefined : end) : html;
  body = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<!--(?!\[)[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  return body;
}

function count(haystack, needle) {
  let n = 0;
  let i = 0;
  for (;;) {
    const at = haystack.indexOf(needle, i);
    if (at === -1) return n;
    n += 1;
    i = at + needle.length;
  }
}

function tableRows(html, id) {
  const m = html.match(new RegExp(`<table[^>]*id="${id}"[^>]*>([\\s\\S]*?)</table>`, 'i'));
  if (!m) return -1;
  return count(m[1], '<tr');
}

function textOf(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) return '';
  const slice = html.slice(at, at + 900);
  return slice.slice(slice.indexOf('>') + 1).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

/**
 * A browser-version-stable fingerprint: structural counts plus the rendered
 * text. Serialized SVG geometry and attribute order differ between Chrome
 * builds, which would make a raw-DOM snapshot fail on CI for no real reason;
 * the text and the counts do not.
 */
function fingerprintOf(html, counts) {
  const text = normalizedBody(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return { counts: counts, text: text };
}

function check(label, condition, detail) {
  const ok = Boolean(condition);
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(label);
  return ok;
}

const browser = findBrowser();
if (!browser) {
  console.log('SKIP  no Chromium-family browser found (set CHROME_PATH to enable render verification)');
  process.exit(0);
}
console.log(`browser: ${browser}\n`);

let builtDom;
let originalDom;
const instrumented = join(UI_ROOT, '_verify.html');
try {
  writeFileSync(instrumented, readFileSync(BUILT, 'utf8').replace('</body>', VISIT_ALL + '\n</body>'), 'utf8');
  builtDom = await dumpDom(browser, instrumented);
  originalDom = await dumpDom(browser, ORIGINAL);
} catch (err) {
  console.error(`\nFAIL  render step could not run: ${err.message}`);
  process.exit(1);
} finally {
  try { rmSync(instrumented, { force: true }); } catch { /* ignore */ }
}

console.log('1 · boot invariants');
const nodes = count(builtDom, 'class="node');
const issueRows = tableRows(builtDom, 'issueTable');
const gateRows = tableRows(builtDom, 'gateTable');
const evRows = tableRows(builtDom, 'evTable');
const promptCards = count(builtDom, 'class="acc"');
const footer = textOf(builtDom, 'footCounts');

check('dependency cloud rendered', nodes >= 20, `${nodes} node groups`);
check('issue table populated', issueRows >= 20, `${issueRows} rows incl. header`);
check('gate report has 18 gates', gateRows === 19, `${gateRows} rows incl. header`);
check('evidence ledger has 19 entries', evRows === 20, `${evRows} rows incl. header`);
check('prompt library has 9 prompts', promptCards >= 9, `${promptCards} accordions`);
check('footer reports resolution counts', /resolved/.test(footer), footer.slice(0, 80));

console.log('\n2 · ported capabilities present');
check('providers tab exists', builtDom.includes('id="tab-providers"'));
check('grades tab exists', builtDom.includes('id="tab-grades"'));
const provCards = count(builtDom, 'class="prov"');
check('provider roster rendered', provCards >= 10, `${provCards} provider cards`);
const routeRows = tableRows(builtDom, 'routeTable');
check('role routing rendered (deep/fast/reviewer)', routeRows === 4, `${routeRows} rows incl. header`);
const searchRows = tableRows(builtDom, 'searchTable');
check('search backends rendered', searchRows >= 9, `${searchRows} rows incl. header`);
const gradeRows = tableRows(builtDom, 'gradeTable');
check('every issue graded', gradeRows === nodes + 1, `${gradeRows} rows for ${nodes} nodes + header`);
const checkRows = tableRows(builtDom, 'checksTable');
check('check rubric rendered', checkRows === 8, `${checkRows} rows incl. header`);
const verdict = textOf(builtDom, 'verdictCard');
check('memo verdict computed', /GO/.test(verdict), verdict.slice(0, 70));

/* Every grade must be *styleable*; which of them actually occur depends on the
   data, so assert the CSS contract rather than demanding all four in the DOM. */
const css = readFileSync(join(UI_ROOT, 'assets', 'styles.css'), 'utf8');
for (const grade of ['verified', 'supported', 'weak', 'unsupported']) {
  check(`stylesheet defines .g-${grade}`, css.includes(`.g-${grade}`));
}
const present = ['verified', 'supported', 'weak', 'unsupported'].filter((g) => builtDom.includes(`class="badge-g g-${g}`));
check('grade badges rendered', present.length >= 2, `present: ${present.join(', ') || 'none'}`);
const distribution = textOf(builtDom, 'gradeSummary');
console.log(`        distribution: ${distribution.slice(0, 120)}`);

console.log('\n3 · snapshot (text + structure fingerprint)');
const counts = {
  nodes: nodes,
  issueRows: issueRows,
  gateRows: gateRows,
  evRows: evRows,
  promptCards: promptCards,
  providerCards: provCards,
  routeRows: routeRows,
  searchRows: searchRows,
  gradeRows: gradeRows,
  checkRows: checkRows,
};
const fp = fingerprintOf(builtDom, counts);
if (UPDATE) {
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify(fp, null, 2) + '\n', 'utf8');
  console.log(`  UPDATED snapshot (${fp.text.length} chars of text) -> ${SNAPSHOT.replace(UI_ROOT, 'ui')}`);
} else if (!existsSync(SNAPSHOT)) {
  check('snapshot exists', false, 'run with --update to create it');
} else {
  const expected = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const countsMatch = JSON.stringify(expected.counts) === JSON.stringify(fp.counts);
  const textMatch = expected.text === fp.text;
  check('structural counts match snapshot', countsMatch,
    countsMatch ? Object.entries(fp.counts).map(([k, v]) => `${k}=${v}`).join(' ') : 'counts differ');
  check('rendered text matches snapshot', textMatch,
    textMatch ? `${fp.text.length} chars` : 'text differs');
  if (!textMatch) {
    const a = expected.text;
    const b = fp.text;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    const from = Math.max(0, i - 80);
    console.log(`        first difference at char ${i} of ${a.length}/${b.length}`);
    console.log(`        snapshot: …${a.slice(from, i + 110)}…`);
    console.log(`        rendered: …${b.slice(from, i + 110)}…`);
  }
}

console.log('\n4 · provenance of the original attachment');
const originalNodes = count(originalDom, 'class="node');
check('original single-file version still renders', originalNodes >= 20, `${originalNodes} node groups`);
const originalBody = normalizedBody(originalDom);
const builtBody = normalizedBody(builtDom);
check('ported build differs from the original (the port is really applied)', originalBody !== builtBody,
  originalBody === builtBody ? 'IDENTICAL — the port appears to be missing' : 'differs, as intended');

if (failures.length) {
  console.error(`\nRESULT: FAIL — ${failures.length} check(s): ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nRESULT: PASS — boot, ported capabilities and snapshot all verified.');
