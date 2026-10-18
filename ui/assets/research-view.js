/* =============================================================================
   research-view.js — renders the research run and lets the user re-rank it.
   Reads window.RESEARCH (written by research/run.mjs).

   The weights here re-score the SAME gated candidates; they do not re-crawl.
   That split is deliberate: adjusting preferences must be instant and honest,
   while fetching new pages is a separate, deliberate action.
   ============================================================================= */

(function () {
  'use strict';

  var R = window.RESEARCH || null;
  var state = { weights: {}, selected: null };

  /* Same formulas as research/score.mjs. A test asserts the two agree, so this
     copy cannot drift silently. */
  function priceFit(price, budget) {
    if (!isFinite(price) || price <= 0) return 0;
    return Math.max(0, Math.min(1, 1 - price / budget));
  }
  function areaFit(area, floor) {
    if (!isFinite(area) || area <= 0) return 0;
    return Math.max(0, Math.min(1, area / (floor * 3)));
  }
  function accessFit(sig) { return Math.min(1, ((sig && sig.access ? sig.access.length : 0)) / 4); }
  function sceneryFit(sig) { return Math.min(1, ((sig && sig.scenery ? sig.scenery.length : 0)) / 5); }
  var MEASURABLE = ['price', 'area', 'access'];
  var UNVERIFIED = ['scenery', 'climate', 'legality'];

  function scoreCandidate(c, weights) {
    var values = { price: priceFit(c.priceEur, R.request.budgetEur), area: areaFit(c.areaM2, R.request.minAreaM2), access: accessFit(c.signals), scenery: sceneryFit(c.signals) };
    var weighted = 0, supported = 0, declared = 0, parts = [];
    Object.keys(weights).forEach(function (k) {
      var w = Number(weights[k]) || 0;
      declared += w;
      if (UNVERIFIED.indexOf(k) >= 0) { parts.push({ key: k, weight: w, counted: false }); return; }
      var v = values[k] || 0;
      supported += w; weighted += w * v;
      parts.push({ key: k, weight: w, value: Math.round(v * 100) / 100, counted: true });
    });
    return {
      score: supported > 0 ? Math.round((100 * weighted) / supported) : 0,
      parts: parts,
      coverage: { supportedWeight: supported, declaredWeight: declared, percent: declared > 0 ? Math.round((100 * supported) / declared) : 0 }
    };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ranked() {
    return R.candidates.map(function (c) {
      var s = scoreCandidate(c, state.weights);
      return Object.assign({}, c, { liveScore: s.score, liveParts: s.parts, liveCoverage: s.coverage });
    }).sort(function (a, b) {
      if (b.liveScore !== a.liveScore) return b.liveScore - a.liveScore;
      return (a.priceEur || 0) - (b.priceEur || 0);
    });
  }

  function badgeClass(ok) { return ok === true ? 'g-verified' : ok === false ? 'g-unsupported' : 'g-weak'; }
  function badgeText(ok) { return ok === true ? 'PASS' : ok === false ? 'FAIL' : 'UNVERIFIED'; }

  function renderHead() {
    var el = document.getElementById('rsLead');
    if (!R) {
      el.innerHTML = '<b style="color:var(--am)">No research run yet.</b> The view reads <span class="mono">data/research-latest.js</span>. Produce one with:<br><span class="mono">node research/run.mjs --count 10 --budget 20000</span>';
      return false;
    }
    el.innerHTML = esc(R.request.goal) +
      ' <span class="small muted">· budget €' + R.request.budgetEur + ' · target ' + R.request.count + ' plots · min ' + R.request.minAreaM2 + ' m² · source: ' + esc(R.source.label) + ' · ' + esc(R.generatedAt) + '</span>';
    return true;
  }

  function renderStats(rows) {
    var admissible = rows.filter(function (c) { return c.gates && c.gates.admissible; }).length;
    var unverified = rows.reduce(function (n, c) { return n + (c.gates ? c.gates.unverified : 0); }, 0);
    var failed = rows.reduce(function (n, c) { return n + (c.gates ? c.gates.failed : 0); }, 0);
    document.getElementById('rsCount').textContent = rows.length + ' plots · ' + admissible + ' fully admissible';
    document.getElementById('rsStats').innerHTML =
      '<span class="sumchip"><span class="n">' + rows.length + '</span>returned</span>' +
      '<span class="sumchip"><span class="n" style="color:var(--gr)">' + admissible + '</span>admissible</span>' +
      '<span class="sumchip"><span class="n" style="color:var(--am)">' + failed + '</span>failed checks</span>' +
      '<span class="sumchip"><span class="n" style="color:var(--vi)">' + unverified + '</span>unverified gaps</span>' +
      '<span class="sumchip"><span class="n">' + R.stats.rowsSeen + '</span>rows scanned</span>';
  }

  function renderTree() {
    document.getElementById('rsTree').innerHTML = R.tree.nodes.map(function (n) {
      var isMech = n.kind === 'mechanical';
      return '<div style="margin-bottom:12px">' +
        '<div class="row" style="gap:8px;flex-wrap:nowrap;align-items:baseline">' +
          '<span class="mono small" style="color:var(--dim)">' + esc(n.id) + '</span>' +
          '<b class="small">' + esc(n.label) + '</b>' +
          (isMech ? '<span class="badge-g g-verified">gate</span>' : '<span class="badge-g g-weak">unverified</span>') +
        '</div>' +
        '<div class="small muted" style="margin:3px 0 5px">' + esc(n.question) + '</div>' +
        '<div class="row" style="gap:10px;flex-wrap:nowrap">' +
          '<input type="range" min="0" max="60" value="' + n.adjustable.value + '" data-weight="' + esc(n.adjustable.key) + '" aria-label="Weight for ' + esc(n.label) + '" style="flex:1">' +
          '<span class="small mono" style="width:52px;text-align:right" id="wv-' + esc(n.adjustable.key) + '">' + n.adjustable.value + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('rsTree').querySelectorAll('input[data-weight]').forEach(function (input) {
      input.addEventListener('input', function () {
        var key = input.getAttribute('data-weight');
        state.weights[key] = Number(input.value);
        var label = document.getElementById('wv-' + key);
        if (label) label.textContent = input.value;
        renderTable();
        renderStats(ranked());
      });
    });
  }

  function renderGaps() {
    document.getElementById('rsGaps').innerHTML =
      R.criteria.unverified.map(function (u) {
        return '<p class="small" style="margin:0 0 8px"><b style="color:var(--am)">' + esc(u.label) + '</b><br><span class="muted">' + esc(u.why) + '</span></p>';
      }).join('') +
      '<p class="small muted" style="margin-top:10px">These weights are shown but excluded from the score. The app will not turn a criterion it cannot check into a number — that is the whole point.</p>';
  }

  function renderTable() {
    var rows = ranked();
    var h = '<tr><th>#</th><th>price</th><th>m²</th><th>location</th><th>score</th><th>gates</th><th>listing</th></tr>';
    rows.forEach(function (c, i) {
      var g = c.gates;
      var gates = g ? ('<span class="badge-g ' + (g.admissible ? 'g-verified' : 'g-unsupported') + '">' + (g.admissible ? 'admissible' : 'blocked') + '</span> <span class="small muted">' + g.passed + '✓ ' + g.failed + '✗ ' + g.unverified + '?</span>') : '<span class="badge-g g-unsupported">fetch failed</span>';
      h += '<tr data-idx="' + i + '" style="cursor:pointer">' +
        '<td class="mono">' + (i + 1) + '</td>' +
        '<td><b>' + (c.priceEur ? '€' + c.priceEur.toLocaleString('en-US') : '?') + '</b></td>' +
        '<td>' + (c.areaM2 ? c.areaM2.toLocaleString('en-US') : '<span class="muted">?</span>') + '</td>' +
        '<td>' + esc(c.location) + '</td>' +
        '<td><span class="gscore">' + c.liveScore + '</span></td>' +
        '<td>' + gates + '</td>' +
        '<td><a href="' + esc(c.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(c.title.slice(0, 44)) + '</a></td>' +
      '</tr>';
    });
    var t = document.getElementById('rsTable');
    t.innerHTML = h;
    t.querySelectorAll('tr[data-idx]').forEach(function (tr) {
      tr.addEventListener('click', function () { showDetail(rows[Number(tr.getAttribute('data-idx'))]); });
    });
  }

  function showDetail(c) {
    if (!c) return;
    var checks = (c.gates ? c.gates.checks : []).map(function (chk) {
      return '<div class="chk"><span class="' + (chk.ok === true ? 'ok' : chk.ok === false ? 'no' : '') + '">' + (chk.ok === true ? '✓' : chk.ok === false ? '✗' : '?') + '</span>' +
        '<span class="small"><b>' + esc(chk.label) + '</b>' + (chk.critical ? '<span class="crit">critical</span>' : '') +
        '<br><span class="muted">' + esc(chk.detail) + '</span>' +
        (chk.evidence ? '<br><span class="mono" style="font-size:11px;color:var(--cy)">…' + esc(chk.evidence) + '…</span>' : '') +
        '</span></div>';
    }).join('');
    var parts = (c.liveParts || []).map(function (p) {
      return '<span class="pill">' + esc(p.key) + ' w' + p.weight + (p.counted ? ' → ' + p.value : ' (excluded)') + '</span>';
    }).join('');
    document.getElementById('rsDetail').innerHTML =
      '<div class="card"><h3 style="margin-top:0">' + esc(c.title) + '</h3>' +
      '<p class="small"><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.url) + '</a></p>' +
      '<p class="small muted">score ' + c.liveScore + ' · your weights cover ' + c.liveCoverage.percent + '% of the declared weight · ' + parts + '</p>' +
      '<h3>The gates, each checked against this page</h3>' + checks +
      '<p class="small muted" style="margin-top:8px">Every PASS above means the cited page itself contains the value, and the excerpt is shown. No gate here was decided by a model.</p>' +
      '</div>';
  }

  window.renderResearch = function () {
    if (!renderHead()) return;
    R.tree.nodes.forEach(function (n) { if (state.weights[n.adjustable.key] === undefined) state.weights[n.adjustable.key] = n.adjustable.value; });
    renderTree();
    renderGaps();
    var rows = ranked();
    renderStats(rows);
    renderTable();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.renderResearch(); });
  else window.renderResearch();

  /* Exposed so tests/research.test.mjs can prove this copy agrees with
     research/score.mjs. Without that check the two would drift silently and the
     number on screen would stop meaning what the runner computed. */
  window.__researchScore = scoreCandidate;
})();
