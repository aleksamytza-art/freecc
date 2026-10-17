/**
 * Render verification: proves the refactored build renders identically to the
 * untouched original attachment, using a real headless browser.
 *
 *   node scripts/verify-render.mjs
 *
 * Two kinds of assertion:
 *   1. EQUIVALENCE — the rendered <body> of index.html equals the rendered
 *      <body> of reference/freecc-ui.original.html after removing the parts we
 *      deliberately changed (the <link> stylesheet and the script tags).
 *      This is the proof that splitting the single file changed no behaviour.
 *   2. INVARIANTS — the boot render actually produced content: cloud nodes,
 *      issue rows, 18 gates, 19 ledger rows, 9 prompt accordions, footer counts.
 *
 * Exits non-zero if anything fails. If no Chromium-family browser is found it
 * prints SKIP and exits 0, so the suite still runs on machines without one.
 */
import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const UI_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ORIGINAL = join(UI_ROOT, 'reference', 'freecc-ui.original.html');
const BUILT = join(UI_ROOT, 'index.html');

const KEYS = {
  skipped: false,
  failures: [],
  notes: [],
};

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

/** Render a local file with headless Chromium and return the serialized DOM. */
function dumpDom(browser, file, { budget = 6000 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const profile = join(tmpdir(), `freecc-uidump-${process.pid}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(profile, { recursive: true });
    const domFile = join(profile, 'dom.html');
    const errFile = join(profile, 'err.log');

    // stdout goes straight to a file descriptor, not a pipe: this keeps the
    // harness working in environments that forbid capturing stdio via pipes.
    const domFd = openSync(domFile, 'w');
    const errFd = openSync(errFile, 'w');
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--virtual-time-budget=${budget}`,
      '--dump-dom',
      pathToFileURL(file).href,
    ];

    let child;
    try {
      child = spawn(browser, args, { stdio: ['ignore', domFd, errFd] });
    } catch (err) {
      closeSync(domFd);
      closeSync(errFd);
      return reject(err);
    }

    const timer = setTimeout(() => child.kill(), budget + 25000);
    child.on('error', (err) => {
      clearTimeout(timer);
      closeSync(domFd);
      closeSync(errFd);
      reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer);
      closeSync(domFd);
      closeSync(errFd);
      let dom = '';
      try {
        dom = readFileSync(domFile, 'utf8');
      } catch {
        dom = '';
      }
      let err = '';
      try {
        err = readFileSync(errFile, 'utf8');
      } catch {
        /* ignore */
      }
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      if (!dom || !/<body/i.test(dom)) {
        return reject(new Error(`no DOM produced by browser${err ? `:\n${err.slice(0, 600)}` : ''}`));
      }
      resolvePromise(dom);
    });
  });
}

/** Comparable form of the rendered body: drop what we intentionally changed. */
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
  const re = new RegExp(`<table[^>]*id="${id}"[^>]*>([\\s\\S]*?)</table>`, 'i');
  const m = html.match(re);
  if (!m) return -1;
  return count(m[1], '<tr');
}

function textOf(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) return '';
  const slice = html.slice(at, at + 600);
  const content = slice.slice(slice.indexOf('>') + 1);
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function check(label, condition, detail) {
  const ok = Boolean(condition);
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) KEYS.failures.push(label);
  return ok;
}

function diffSummary(a, b) {
  if (a === b) return 'identical';
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  const from = Math.max(0, i - 90);
  return [
    `first difference at char ${i} of ${a.length}/${b.length}`,
    `  original: …${a.slice(from, i + 120)}…`,
    `  built   : …${b.slice(from, i + 120)}…`,
  ].join('\n');
}

const browser = findBrowser();
if (!browser) {
  console.log('SKIP  no Chromium-family browser found (set CHROME_PATH to enable render verification)');
  process.exit(0);
}

console.log(`browser: ${browser}\n`);

let originalDom;
let builtDom;
try {
  [originalDom, builtDom] = await Promise.all([dumpDom(browser, ORIGINAL), dumpDom(browser, BUILT)]);
} catch (err) {
  console.error(`\nFAIL  render step could not run: ${err.message}`);
  process.exit(1);
}

console.log('1 · equivalence with the untouched original');
const a = normalizedBody(originalDom);
const b = normalizedBody(builtDom);
const same = a === b;
console.log(`${same ? '  PASS' : '  FAIL'}  rendered body matches original`);
if (!same) {
  KEYS.failures.push('rendered body matches original');
  console.log(diffSummary(a, b));
}

console.log('\n2 · boot invariants (built app)');
const nodes = count(builtDom, 'class="node');
const issueRows = tableRows(builtDom, 'issueTable');
const gateRows = tableRows(builtDom, 'gateTable');
const evRows = tableRows(builtDom, 'evTable');
const promptCards = count(builtDom, 'class="acc"');
const idxCards = count(builtDom, 'class="card"');
const footer = textOf(builtDom, 'footCounts');
const coverage = textOf(builtDom, 'chipCov');

check('dependency cloud rendered nodes', nodes >= 20, `${nodes} node groups`);
check('issue table populated', issueRows >= 20, `${issueRows} rows incl. header`);
check('gate report has 18 gates', gateRows === 19, `${gateRows} rows incl. header`);
check('evidence ledger has 19 entries', evRows === 20, `${evRows} rows incl. header`);
check('prompt library has 9 prompts', promptCards >= 9, `${promptCards} accordions`);
check('index grid rendered', idxCards >= 9, `${idxCards} cards`);
check('footer reports resolution counts', /resolved/.test(footer), footer.slice(0, 110));
check('header reports evidence coverage', /\d+%/.test(coverage), coverage.slice(0, 30));

console.log('\n3 · original still renders on its own (sanity)');
const origNodes = count(originalDom, 'class="node');
check('original reference renders nodes', origNodes >= 20, `${origNodes} node groups`);

if (KEYS.failures.length) {
  console.error(`\nRESULT: FAIL — ${KEYS.failures.length} check(s) failed: ${KEYS.failures.join(', ')}`);
  process.exit(1);
}
console.log('\nRESULT: PASS — refactored build is render-identical to the original attachment.');
