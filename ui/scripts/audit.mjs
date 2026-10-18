#!/usr/bin/env node
/**
 * audit.mjs — the measuring instrument behind QUALITY.md.
 *
 *   node scripts/audit.mjs           # human-readable scorecard
 *   node scripts/audit.mjs --json    # machine-readable (this is what the loop reads)
 *
 * It does four things:
 *   1. sizes        — bytes served, so "improvement" that bloats the page is visible
 *   2. tests        — runs both node:test suites and reports pass/fail
 *   3. browser      — renders index.html in headless Chrome with an injected probe that
 *                     captures uncaught errors, console.error, external requests and real
 *                     Navigation-Timing numbers, then parses the DOM for a11y heuristics
 *   4. responsive   — renders again at 375x667 and reports horizontal overflow
 *
 * Everything here is measured, not asserted. A failing check is reported, never thrown.
 */
import { spawn } from 'node:child_process';
import {
  closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const UI_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const JSON_OUT = process.argv.includes('--json');
const BROWSER = findBrowser();

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const win = process.env.ProgramFiles || 'C:\\Program Files';
  const win86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  for (const c of [
    join(win86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(win, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(win86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(win, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]) if (c && existsSync(c)) return c;
  return null;
}

/* ---------------------------------------------------------------- 1. sizes */
const ASSETS = ['index.html', 'assets/styles.css', 'assets/data.js', 'assets/providers.js', 'assets/grades.js', 'assets/app.js'];
const sizes = {};
for (const a of ASSETS) sizes[a] = statSync(join(UI_ROOT, a)).size;
sizes.total = Object.values(sizes).reduce((a, b) => a + b, 0);

/* ---------------------------------------------------------------- 2. tests */
const TESTS = ['tests/data.test.mjs', 'tests/grades.test.mjs', 'tests/research.test.mjs'];

function runTests() {
  return Promise.all(TESTS.map((file) => new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [file], { cwd: UI_ROOT });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      const pass = Number((out.match(/^ℹ pass (\d+)$/m) || [])[1] || 0);
      const fail = Number((out.match(/^ℹ fail (\d+)$/m) || [])[1] || 0);
      resolvePromise({ file, pass, fail, code, tail: (err || out).slice(-400) });
    });
  })));
}

/* -------------------------------------------------------------- 3. browser */
const PROBE = `<script>
(function(){
  var d={errors:[],external:[]};
  window.addEventListener('error',function(e){d.errors.push(String(e.message).slice(0,160));});
  window.addEventListener('unhandledrejection',function(e){d.errors.push('rejection: '+String(e.reason).slice(0,160));});
  var ce=console.error; console.error=function(){d.errors.push(Array.prototype.join.call(arguments,' ').slice(0,160)); ce.apply(console,arguments);};
  try{
    new PerformanceObserver(function(l){l.getEntries().forEach(function(e){
      if(/^https?:/i.test(e.name)) d.external.push(e.name);
    });}).observe({type:'resource',buffered:true});
  }catch(e){}
  setTimeout(function(){
    try{
      var n=(performance.getEntriesByType('navigation')||[])[0];
      d.bootMs = n?Math.round(n.domContentLoadedEventEnd):null;
      d.loadMs = n?Math.round(n.loadEventEnd):null;
      d.responseEnd = n?Math.round(n.responseEnd):null;
      /* App cost, not browser cost: DOMContentLoaded also contains Chrome's cold
         start. Subtracting responseEnd isolates parse+script evaluation, which is
         the part this app controls. Both numbers are reported. */
      d.bootCostMs = n?Math.round(n.domContentLoadedEventEnd - n.responseEnd):null;
      d.scrollWidth = document.documentElement.scrollWidth;
      d.innerWidth = window.innerWidth;
      d.appJsMs = (window.__bootJsMs===undefined?null:window.__bootJsMs);
      d.domNodesBoot = document.getElementsByTagName('*').length;
      /* Self-diagnosing overflow: name the elements that stick out, so a failed
         responsive check says what to fix instead of just that it failed. */
      if (d.scrollWidth > d.innerWidth + 1) {
        var over = [];
        Array.prototype.forEach.call(document.querySelectorAll('*'), function (el) {
          var r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > window.innerWidth + 1) {
            var cls = '';
            try { cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || ''); } catch (e) { cls = ''; }
            over.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
              (cls ? '.' + String(cls).split(' ').slice(0, 2).join('.') : '') +
              ' w=' + Math.round(r.width));
          }
        });
        d.overflowing = over.slice(0, 6);
      }
      /* Touch every view so the dumped DOM holds the whole UI (the Grades tab is
         rendered lazily), and read the grade summary from there. */
      ['build','cloud','issues','indexes','evidence','prompts','report','providers','grades']
        .forEach(function(t){ try{ gotoTab(t); }catch(e){} });
      var gs=document.getElementById('gradeSummary');
      d.gradesText = gs?gs.textContent.replace(/\\s+/g,' ').trim():'';
      var vt=document.getElementById('verdictCard');
      d.verdictText = vt?vt.textContent.replace(/\\s+/g,' ').trim().slice(0,160):'';
      try{ gotoTab('cloud'); }catch(e){}
      d.domNodesFull = document.getElementsByTagName('*').length;
    }catch(e){ d.errors.push('probe: '+e.message); }
    var pre=document.createElement('pre');
    pre.id='__auditProbe'; pre.textContent=JSON.stringify(d);
    document.body.appendChild(pre);
  },1200);
})();
</script>`;

/* A trivial page measured with the same probe, so the harness/browser floor can
   be subtracted from the app's boot cost. Without it, "DOMContentLoaded" mostly
   measures Chrome's cold start and unrelated changes look like regressions. */
const CONTROL_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>control</title></head><body><p>control</p></body></html>';

function dumpDom(file, { width = 1600, height = 1000, budget = 6000 } = {}) {  return new Promise((resolvePromise, reject) => {
    const profile = join(tmpdir(), `freecc-audit-${process.pid}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(profile, { recursive: true });
    const domFile = join(profile, 'dom.html');
    const errFile = join(profile, 'err.log');
    const domFd = openSync(domFile, 'w');
    const errFd = openSync(errFile, 'w');
    const started = Date.now();
    const child = spawn(BROWSER, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-extensions',
      '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
      `--virtual-time-budget=${budget}`, '--dump-dom', pathToFileURL(file).href,
    ], { stdio: ['ignore', domFd, errFd] });
    const timer = setTimeout(() => child.kill(), budget + 25000);
    child.on('error', (e) => { clearTimeout(timer); closeSync(domFd); closeSync(errFd); reject(e); });
    child.on('close', () => {
      clearTimeout(timer); closeSync(domFd); closeSync(errFd);
      let dom = '';
      try { dom = readFileSync(domFile, 'utf8'); } catch { /* ignore */ }
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
      if (!dom) return reject(new Error('no DOM produced'));
      resolvePromise({ dom, wallMs: Date.now() - started });
    });
  });
}

function parseProbe(dom) {
  const m = dom.match(/<pre id="__auditProbe">([\s\S]*?)<\/pre>/);
  if (!m) return { errors: ['probe did not run'], external: [] };
  const json = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  try { return JSON.parse(json); } catch (e) { return { errors: ['probe JSON unreadable: ' + e.message], external: [] }; }
}

function a11y(dom, css) {
  const checks = [];
  const add = (id, label, pass, detail) => checks.push({ id, label, pass: !!pass, detail });

  add('html-lang', '<html lang> is set', /<html[^>]+lang="/i.test(dom));

  const h1s = (dom.match(/<h1[\s>]/gi) || []).length;
  add('single-h1', 'Exactly one <h1>', h1s === 1, `${h1s} found`);

  const buttons = [...dom.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const nameless = buttons.filter(([, attrs, inner]) => {
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').trim();
    return !text && !/aria-label="[^"]+"/i.test(attrs);
  });
  add('button-names', 'Every button has an accessible name', nameless.length === 0, `${buttons.length} buttons, ${nameless.length} unnamed`);

  const inputs = [...dom.matchAll(/<input\b([^>]*)>/gi)].map((m) => m[1]);
  const labelledFor = new Set([...dom.matchAll(/<label\b[^>]*for="([^"]+)"/gi)].map((m) => m[1]));
  const unlabelled = inputs.filter((attrs) => {
    if (/aria-label="[^"]+"/i.test(attrs) || /aria-labelledby=/i.test(attrs)) return false;
    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
    return !(id && labelledFor.has(id));
  });
  add('input-labels', 'Every input has a label or aria-label', unlabelled.length === 0, `${inputs.length} inputs, ${unlabelled.length} unlabelled`);

  const ids = [...dom.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  add('unique-ids', 'No duplicate element ids', dupes.length === 0, dupes.length ? [...new Set(dupes)].slice(0, 4).join(', ') : `${ids.length} ids`);

  add('tablist-role', 'Nav exposes role="tablist"', /id="nav"[^>]*role="tablist"/i.test(dom) || /role="tablist"[^>]*id="nav"/i.test(dom));
  const tabBtns = [...dom.matchAll(/<button\b[^>]*data-t="[^"]+"[^>]*>/gi)].map((m) => m[0]);
  const tabsOk = tabBtns.length > 0 && tabBtns.every((t) => /role="tab"/i.test(t) && /aria-selected=/i.test(t));
  add('tab-roles', 'Each tab button has role="tab" and aria-selected', tabsOk, `${tabBtns.length} tabs`);
  add('tabpanels', 'Tab sections expose role="tabpanel"', (dom.match(/role="tabpanel"/gi) || []).length >= 7);
  add('aria-controls', 'Tabs point at their panel with aria-controls', (dom.match(/aria-controls="/gi) || []).length >= 7);

  add('live-region', 'Toast is an aria-live region', /id="toast"[^>]*aria-live=/i.test(dom) || /aria-live="[^"]*"[^>]*id="toast"/i.test(dom));

  const svgOk = /id="cloud"[^>]*aria-hidden="true"/i.test(dom) || /id="cloud"[^>]*role="img"[^>]*aria-label=/i.test(dom);
  add('svg-semantics', 'The cloud SVG is labelled or hidden', svgOk);

  add('focus-visible', 'CSS defines :focus-visible', /:focus-visible/.test(css));
  add('reduced-motion', 'CSS honours prefers-reduced-motion', /prefers-reduced-motion/.test(css));
  add('skip-link', 'A skip link exists', /class="skip"/i.test(dom) || /href="#main"/i.test(dom));

  const failed = checks.filter((c) => !c.pass);
  return { checks, pass: checks.length - failed.length, fail: failed.length };
}

/* ------------------------------------------------------------------- 4. run */
const testResults = await runTests();

let browser = { available: false };
if (BROWSER) {
  // instrumented copy, so the probe runs inside the real page
  const probeHtml = readFileSync(join(UI_ROOT, 'index.html'), 'utf8').replace('</body>', PROBE + '\n</body>');
  const probePath = join(UI_ROOT, '_audit.html');
  const controlPath = join(UI_ROOT, '_audit_control.html');
  writeFileSync(probePath, probeHtml, 'utf8');
  writeFileSync(controlPath, CONTROL_HTML.replace('</body>', PROBE + '\n</body>'), 'utf8');
  try {
    const desktop = await dumpDom(probePath);
    const mobile = await dumpDom(probePath, { width: 375, height: 667 });
    const control = await dumpDom(controlPath);
    const pr = parseProbe(desktop.dom);
    const pm = parseProbe(mobile.dom);
    const pc = parseProbe(control.dom);
    const css = readFileSync(join(UI_ROOT, 'assets', 'styles.css'), 'utf8');
    // Subtract the harness floor: what a trivial page costs in this same browser.
    const floor = pc.bootCostMs || 0;
    browser = {
      available: true,
      bootMs: pr.bootMs,
      bootCostMs: pr.bootCostMs,
      appJsMs: pr.appJsMs,
      controlBootCostMs: floor,
      appCostMs: pr.bootCostMs === null ? null : Math.max(0, pr.bootCostMs - floor),
      responseEnd: pr.responseEnd,
      loadMs: pr.loadMs,
      domNodesBoot: pr.domNodesBoot,
      domNodesFull: pr.domNodesFull,
      wallMs: desktop.wallMs,
      consoleErrors: pr.errors || [],
      externalRequests: pr.external || [],
      a11y: a11y(desktop.dom, css),
      grades: parseGrades(pr.gradesText || ''),
      verdict: pr.verdictText || '',
      responsive: {
        width: pm.innerWidth,
        scrollWidth: pm.scrollWidth,
        overflow: (pm.scrollWidth || 0) > (pm.innerWidth || 0) + 1,
        offenders: pm.overflowing || [],
      },
    };
  } finally {
    try { rmSync(probePath, { force: true }); } catch { /* ignore */ }
    try { rmSync(controlPath, { force: true }); } catch { /* ignore */ }
  }
} else {
  browser = { available: false, reason: 'no Chromium-family browser found' };
}

function parseGrades(text) {
  const pick = (label) => {
    const m = text.match(new RegExp(`(\\d+)\\s*${label}`, 'i'));
    return m ? Number(m[1]) : null;
  };
  return { verified: pick('verified'), supported: pick('supported'), weak: pick('weak'), unsupported: pick('unsupported'), graded: pick('issues graded') };
}

const totalPass = testResults.reduce((a, r) => a + r.pass, 0);
const totalFail = testResults.reduce((a, r) => a + r.fail, 0);

const report = {
  timestamp: new Date().toISOString(),
  sizes,
  tests: { suites: testResults, pass: totalPass, fail: totalFail },
  browser,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(totalFail === 0 ? 0 : 1);
}

/* --------------------------------------------------------- human scorecard */
const g = (n, unit = '') => (n === null || n === undefined ? '?' : `${n}${unit}`);
const line = (label, value, target) => console.log(`  ${label.padEnd(42)} ${String(value).padEnd(18)} ${target}`);

console.log('\nFREECC UI — audit\n' + '='.repeat(84));
console.log('\nSizes');
line('total payload', `${(sizes.total / 1024).toFixed(1)} KB`, 'target < 130 KB');
for (const a of ASSETS) line(`  ${a}`, `${(sizes[a] / 1024).toFixed(1)} KB`, '');

console.log('\nTests');
line('invariants passing', `${totalPass} passing, ${totalFail} failing`, 'target: 0 failing');
for (const s of testResults) line(`  ${s.file}`, `${s.pass} pass / ${s.fail} fail`, '');

if (!browser.available) {
  console.log(`\nBrowser: UNAVAILABLE (${browser.reason})`);
} else {
  console.log('\nBoot');
  line('app JS boot (our code)', g(browser.appJsMs, ' ms'), 'target < 150 ms');
  line('app cost (app - control page)', g(browser.appCostMs, ' ms'), 'includes browser paint');
  line('  app DOMContentLoaded-responseEnd', g(browser.bootCostMs, ' ms'), '');
  line('  control page floor', g(browser.controlBootCostMs, ' ms'), 'browser overhead');
  line('DOMContentLoaded (raw)', g(browser.bootMs, ' ms'), '');
  line('DOM nodes at boot / after all views', `${g(browser.domNodesBoot)} / ${g(browser.domNodesFull)}`, 'lazy rendering');
  line('load event', g(browser.loadMs, ' ms'), '');
  line('console errors', browser.consoleErrors.length, 'target: 0');
  if (browser.consoleErrors.length) browser.consoleErrors.slice(0, 3).forEach((e) => console.log(`      ! ${e}`));
  line('external requests', browser.externalRequests.length, 'target: 0');
  if (browser.externalRequests.length) browser.externalRequests.slice(0, 3).forEach((e) => console.log(`      ! ${e}`));

  console.log('\nAccessibility (automated heuristics)');
  line('checks passing', `${browser.a11y.pass} / ${browser.a11y.checks.length}`, 'target: all');
  for (const c of browser.a11y.checks) {
    if (!c.pass) console.log(`      FAIL  ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
  }

  console.log('\nResponsive (375x667)');
  line('scrollWidth vs innerWidth', `${browser.responsive.scrollWidth} / ${browser.responsive.width}`, browser.responsive.overflow ? 'OVERFLOW' : 'no overflow');
  if (browser.responsive.overflow && browser.responsive.offenders.length) {
    console.log('      widest offenders:');
    browser.responsive.offenders.forEach((o) => console.log(`        ${o}`));
  }

  console.log('\nGrades (integrity)');
  const gr = browser.grades;
  line('distribution', `verified ${g(gr.verified)} · supported ${g(gr.supported)} · weak ${g(gr.weak)} · unsupported ${g(gr.unsupported)}`, 'must match the rubric, never inflated');
  line('issues graded', g(gr.graded), '');
}

console.log('\n' + '='.repeat(84));


/* --strict turns the scorecard into a gate: the targets fully under the app's
   control fail the build. Boot timing is reported but not gated, because headless
   wall-clock varies by more than the number itself in CI. */
if (process.argv.includes('--strict')) {
  const gate = [];
  if (totalFail > 0) gate.push(totalFail + ' failing invariants');
  if (sizes.total > 130 * 1024) gate.push('payload ' + (sizes.total / 1024).toFixed(1) + ' KB > 130 KB');
  if (browser.available) {
    if (browser.a11y.fail > 0) gate.push(browser.a11y.fail + ' a11y checks failing');
    if (browser.consoleErrors.length) gate.push(browser.consoleErrors.length + ' console errors');
    if (browser.externalRequests.length) gate.push(browser.externalRequests.length + ' external requests');
    if (browser.responsive.overflow) gate.push('horizontal overflow on a narrow viewport');
  } else {
    gate.push('browser unavailable, so a11y/perf/responsive were not measured');
  }
  if (gate.length) {
    console.log('STRICT: FAIL - ' + gate.join('; '));
    process.exit(1);
  }
  console.log('STRICT: PASS - every gated target met.');
}
