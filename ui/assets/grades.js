/* =============================================================================
   Mechanical grading — ported from free-research-llm
   (https://github.com/bezgolovyponch/free-research-llm, MIT, commit d5ca596)
   src/research/verify.mjs.

   The source repo grades every research answer on four levels:
       verified / supported / weak / unsupported
   and the grade comes from mechanical checks, never from the model's own
   confidence. Its decisive rule:

       critical check fails  -> unsupported
       any check fails       -> weak
       2+ independent sources OR one data source -> verified
       otherwise             -> supported

   That maps cleanly onto FREECC's issue tree, where a node already carries a
   ledger citation list (ev), gate ids (g), index ids (ix) and an open-question
   marker (oq). So the same rubric can grade every node of the plan itself:

     critical: cites evidence, and every cited E#/G#/I# exists in the registers
     normal:   evidence spans 2+ independent domains, no open question, >=1 gate

   Deliberate adaptation, stated so it is not mistaken for a port bug: upstream
   applies the 2+ domain rule only when an answer claims "high" confidence. Here
   it applies to every issue, because a plan that rests on a single vendor page
   has not been corroborated at all. That is why most of the shipped baseline
   grades "weak" — its citations cluster on npmjs.com and arxiv.org.

   Nothing here trusts a node's own status. A node marked "resolved" in the UI
   is still graded unsupported if it has no evidence behind it — which is the
   same trap the source repo calls "the model's own confidence".
   ============================================================================= */

const GRADES = ["verified", "supported", "weak", "unsupported"];

const GRADE_STYLE = {
  verified: { colour: "var(--gr)", label: "verified", hint: "2+ independent domains and a gate" },
  supported: { colour: "var(--cy)", label: "supported", hint: "cited, but thin: one domain or no gate" },
  weak: { colour: "var(--am)", label: "weak", hint: "at least one mechanical check failed" },
  unsupported: { colour: "var(--rd)", label: "unsupported", hint: "a critical check failed: no evidence to stand on" },
};

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function gradeCheck(id, label, passed, detail, critical) {
  return { id: id, label: label, passed: !!passed, detail: detail, critical: !!critical };
}

/* Resolve a node's cited E# ids to their ledger rows. */
function citedEvidence(node, evidence) {
  const byId = {};
  evidence.forEach(function (e) { byId[e.id] = e; });
  return (node.ev || []).map(function (id) { return byId[id]; }).filter(Boolean);
}

function checksForNode(node, registers) {
  const evidence = registers.EVIDENCE || [];
  const gates = registers.GATES || [];
  const indexes = registers.INDEXES || [];
  const evIds = {};
  evidence.forEach(function (e) { evIds[e.id] = true; });
  const gateIds = {};
  gates.forEach(function (g) { gateIds[g.id] = true; });
  const idxIds = {};
  indexes.forEach(function (i) { idxIds[i.id] = true; });

  const cited = node.ev || [];
  const unknownEv = cited.filter(function (id) { return !evIds[id]; });
  const unknownGate = (node.g || []).filter(function (id) { return !gateIds[id]; });
  const unknownIdx = (node.ix || []).filter(function (id) { return !idxIds[id]; });

  const citedRows = citedEvidence(node, evidence);
  const domains = {};
  citedRows.forEach(function (e) {
    const d = domainOf(e.u);
    if (d) domains[d] = true;
  });
  const domainList = Object.keys(domains);

  return [
    gradeCheck("evidence", "Cites at least one ledger entry (E#)", cited.length > 0,
      cited.length ? cited.length + " citation(s): " + cited.join(", ") : "no evidence cited — this is an evidence gap", true),
    gradeCheck("ledger-ids", "Every cited E# exists in the ledger", unknownEv.length === 0,
      unknownEv.length ? "unknown evidence id(s): " + unknownEv.join(", ") : "all citations resolve", true),
    gradeCheck("gate-ids", "Every cited G# exists in the gate report", unknownGate.length === 0,
      unknownGate.length ? "unknown gate id(s): " + unknownGate.join(", ") : (node.g || []).length + " gate(s) resolve", true),
    gradeCheck("index-ids", "Every cited I# exists in the index register", unknownIdx.length === 0,
      unknownIdx.length ? "unknown index id(s): " + unknownIdx.join(", ") : (node.ix || []).length + " index(es) resolve", true),
    gradeCheck("independent-domains", "Evidence spans 2+ independent domains", domainList.length >= 2,
      domainList.length ? domainList.length + " independent domain(s): " + domainList.join(", ") : "no resolvable URL behind the citations"),
    gradeCheck("no-open-question", "No blocking open question", !node.oq,
      node.oq ? String(node.oq) : "no open question"),
    gradeCheck("gate-coverage", "At least one mechanical gate covers this issue", (node.g || []).length >= 1,
      (node.g || []).length ? (node.g || []).length + " gate(s)" : "no gate — nothing can witness it"),
  ];
}

/**
 * Grade one node. Returns { grade, score, checks, failures, escalate }.
 * `escalate` mirrors the source repo's needsEscalation(): weak or unsupported
 * work is what buys the next rung of the ladder.
 */
function gradeNode(node, registers) {
  const checks = checksForNode(node, registers);
  const criticalFail = checks.some(function (c) { return c.critical && !c.passed; });
  const anyFail = checks.some(function (c) { return !c.passed; });
  const independent = checks.find(function (c) { return c.id === "independent-domains"; });
  const gated = checks.find(function (c) { return c.id === "gate-coverage"; });

  let grade;
  if (criticalFail) grade = "unsupported";
  else if (anyFail) grade = "weak";
  else if (independent && independent.passed && gated && gated.passed) grade = "verified";
  else grade = "supported";

  const passed = checks.filter(function (c) { return c.passed; }).length;
  return {
    grade: grade,
    score: Math.round((100 * passed) / checks.length),
    checks: checks,
    failures: checks.filter(function (c) { return !c.passed; }).map(function (c) { return c.detail; }),
    escalate: grade === "weak" || grade === "unsupported",
  };
}

function gradeAll(nodes, registers) {
  const out = {};
  nodes.forEach(function (n) { out[n.id] = gradeNode(n, registers); });
  return out;
}

function gradeCounts(grades) {
  const counts = { verified: 0, supported: 0, weak: 0, unsupported: 0 };
  Object.keys(grades).forEach(function (id) { counts[grades[id].grade] += 1; });
  return counts;
}

/**
 * Roll the grades up into a memo-style verdict, mirroring the source repo's
 * GO / GO-IF / NO-GO memo, but computed from the graded critical path only.
 */
function rollupVerdict(pathIds, grades) {
  let unsupported = 0;
  let weak = 0;
  pathIds.forEach(function (id) {
    const g = grades[id];
    if (!g) return;
    if (g.grade === "unsupported") unsupported += 1;
    else if (g.grade === "weak") weak += 1;
  });
  if (unsupported) {
    return {
      verdict: "NO-GO",
      colour: "var(--rd)",
      detail: unsupported + " critical-path issue(s) have no evidence behind them. Resolve those before spending on anything downstream.",
    };
  }
  if (weak) {
    return {
      verdict: "GO-IF",
      colour: "var(--am)",
      detail: weak + " critical-path issue(s) are weak. The plan can proceed, but those are the ones that flip the outcome.",
    };
  }
  return {
    verdict: "GO",
    colour: "var(--gr)",
    detail: "Every issue on the critical path is at least supported, with gates in place to witness it.",
  };
}

/* Documentation for the checks table: what each check means and what fails it.
   Kept beside the implementation so the UI can never describe a rule that the
   code does not actually apply. */
const CHECK_DOC = [
  { id: "evidence", label: "Cites at least one ledger entry (E#)", critical: true,
    why: "the issue has no evidence behind it at all — an evidence gap" },
  { id: "ledger-ids", label: "Every cited E# exists in the ledger", critical: true,
    why: "a citation points at a ledger entry that does not exist" },
  { id: "gate-ids", label: "Every cited G# exists in the gate report", critical: true,
    why: "a cited gate was never run" },
  { id: "index-ids", label: "Every cited I# exists in the index register", critical: true,
    why: "a cited index is not instrumented" },
  { id: "independent-domains", label: "Evidence spans 2+ independent domains", critical: false,
    why: "every citation traces back to one host, so nothing is corroborated" },
  { id: "no-open-question", label: "No blocking open question", critical: false,
    why: "an open question (OQ) is still unresolved" },
  { id: "gate-coverage", label: "At least one mechanical gate covers this issue", critical: false,
    why: "no gate can witness the issue, so it can never be called done" },
];
