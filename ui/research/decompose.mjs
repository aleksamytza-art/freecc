/**
 * decompose.mjs — turn a research request into an adjustable tree.
 *
 * This is the "visual decomposition" the app is about: every criterion the user
 * stated becomes a node with (a) the question the research must answer, (b) the
 * mechanical gate that decides whether an answer is admissible, and (c) a weight
 * the user can move to trade precision between criteria.
 *
 * Nodes whose criterion cannot be settled by a mechanical check are marked
 * `unverified` ON PURPOSE. They are not hidden and they never silently pass:
 * the runner reports them as gaps, because a claim without a gate is exactly
 * what this project refuses to treat as a result.
 */

export const GATE_KINDS = ['title', 'price', 'area', 'location'];

/**
 * @param {object} request parsed request.json
 * @returns {{root: object, nodes: object[], edges: [string,string][]}}
 */
export function decompose(request) {
  const w = request.weights ?? {};
  const budget = request.budgetEur;

  const nodes = [
    {
      id: 'D1',
      label: 'Budget fit',
      question: `Is the asking price real and at most ${budget.toLocaleString('en-US')} EUR?`,
      gate: 'price',
      adjustable: { key: 'price', min: 0, max: 100, value: w.price ?? 30, unit: 'weight' },
      params: { budgetEur: budget },
      kind: 'mechanical',
    },
    {
      id: 'D2',
      label: 'Usable land area',
      question: `Is the plot at least ${request.minAreaM2} m², and is the size stated on the listing page?`,
      gate: 'area',
      adjustable: { key: 'area', min: 0, max: 100, value: w.area ?? 15, unit: 'weight' },
      params: { minAreaM2: request.minAreaM2 },
      kind: 'mechanical',
    },
    {
      id: 'D3',
      label: 'Access & infrastructure',
      question: 'Does the listing state a road access, utilities or a nearby village?',
      gate: 'location',
      adjustable: { key: 'access', min: 0, max: 100, value: w.access ?? 15, unit: 'weight' },
      kind: 'mechanical',
    },
    {
      id: 'D4',
      label: 'Scenery & setting',
      question: 'Is the setting attractive for glamping (nature, quiet, views)?',
      gate: null,
      adjustable: { key: 'scenery', min: 0, max: 100, value: w.scenery ?? 20, unit: 'weight' },
      kind: 'unverified',
      why: 'No mechanical source: judged from listing prose only. Treated as a ranking signal, never as a passed gate.',
    },
    {
      id: 'D5',
      label: 'Year-round mild climate',
      question: 'Does the location have a mild year-round climate?',
      gate: null,
      adjustable: { key: 'climate', min: 0, max: 100, value: w.climate ?? 20, unit: 'weight' },
      kind: 'unverified',
      why: 'Requires a climate dataset or a cited meteorological source. Not fetched yet, so it can only ever reduce confidence.',
    },
    {
      id: 'D6',
      label: 'Legality for tourist accommodation',
      question: 'Does local law permit a glamping site on this plot?',
      gate: null,
      adjustable: { key: 'legality', min: 0, max: 100, value: 0, unit: 'weight' },
      kind: 'unverified',
      why: 'A legal question: needs the municipal zoning plan or the authority’s statement. No mechanical check is possible here, and pretending otherwise would be the worst thing this app could do.',
    },
  ];

  const edges = nodes.map((n) => [n.id, 'R0']).concat([['R0', 'OUT']]);

  return {
    root: {
      id: 'R0',
      label: request.goal,
      kind: 'root',
      params: {
        budgetEur: budget,
        count: request.count,
        minAreaM2: request.minAreaM2,
        country: request.country,
        queries: request.queries,
      },
    },
    nodes,
    edges,
  };
}

/** Which criteria are mechanically checkable, and which are honest gaps. */
export function criteriaReport(tree) {
  const mechanical = tree.nodes.filter((n) => n.kind === 'mechanical').map((n) => n.label);
  const unverified = tree.nodes.filter((n) => n.kind === 'unverified').map((n) => ({ label: n.label, why: n.why }));
  return { mechanical, unverified };
}
