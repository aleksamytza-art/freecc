"use strict";
/* FREECC UI — engine + rendering + interaction.
   Requires ./data.js (loaded first) for the ledger, gates, indexes,
   prompts and the FREECC engine subtree. */

function baselineProject(){
  const nodes=[
   N("L0",4,"Company expansion -> qualified leads -> paid bookings (D = OQ-1)","Root output. Destinations referenced as 'provided' but not supplied -> parameterized (OQ-1). Binding constraint: production-engine throughput at $0 marginal cost.",{w:10,p:"P0",ix:["I9"],oq:"OQ-1: destination set D not provided"}),
   N("L0.1",3,"Expand reachable inventory per destination","Pages/flows per destination produced by the ladder: /plan -> /implement, harness-verified.",{ev:["E2","E3"],p:"P3",w:7,ix:["I2"]}),
   N("L0.2",3,"Qualify leads","Scoring/enrichment/routing pipelines built+maintained under harness verification.",{ev:["E2"],p:"P3",w:7,ix:["I9"]}),
   N("L0.3",3,"Convert to paid bookings","Funnels + payment integration; money-path = AGENTS.md high-effort-area -> ladder starts high.",{ev:["E2","E3"],p:"P3",w:9,ix:["I9","I1"]}),
   N("L0.4",3,"Hold unit cost ~ $0 while scaling","Quota pooling + cascade + budget ledger keep marginal model cost at zero for routine work.",{ev:["E11","E13","E17"],p:"P8",w:8,ix:["I1","I8"]})
  ].concat(ENGINE_NODES.map(n=>Object.assign({},n)));
  const edges=ENGINE_EDGES.concat([
   ["L1","L0.1"],["L1","L0.2"],["L1","L0.3"],["L1","L0.4"],
   ["C5","L0.4"],
   ["L0.1","L0"],["L0.2","L0"],["L0.3","L0"],["L0.4","L0"]
  ]);
  return {name:"FREECC baseline (ISSUE-TREE.md)",seed:"freecc-baseline",nodes:nodes,edges:edges};
}

/* ---------- deterministic generator: P0 methodology encoded ---------- */

/* ---------- engine: detection, generation, ordering, layout ---------- */
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function detectDomains(text){
  const t=text.toLowerCase(); const out=[];
  for(const d of LEX){ if(d.kw.some(k=>t.indexOf(k)>=0)) out.push(d); }
  return out;
}
function generateProject(desc,inputs,domainKeys){
  const seed=hash(desc+"|"+inputs);
  const rng=mulberry(seed);
  const doms=LEX.filter(d=>domainKeys.indexOf(d.k)>=0);
  const activeDoms=doms.length?doms:[{k:"generic",title:"Delivery Pipeline (generic)",l0:"Described output is produced and maintained",subs:GENERIC_SUBS}];
  const nodes=[
   N("L0",0,truncate(desc,72)||"Desired output",desc,{w:10,p:"P0",ix:["I9"],oq:/destination/i.test(desc)?"OQ-1: destination set D still parameterized — provide the list":"OQ-auto: define the executable check for the L0 business metric (P0 step 6) — an outcome without an instrument is a wish"}),
  ];
  const edges=[];
  const eng=ENGINE_NODES.map(n=>Object.assign({},n));
  nodes.push.apply(nodes,eng);
  edges.push.apply(edges,ENGINE_EDGES.map(e=>[e[0],e[1]]));
  activeDoms.forEach((dm,di)=>{
    const l0id="L0."+(di+1);
    nodes.push(N(l0id,0,dm.l0,"Outcome child for domain '"+dm.title+"'. Produced by the engine (L1) through component "+dm.k.toUpperCase()+".",{ev:["E2","E3"],sim:true,w:6+Math.floor(rng()*3),p:"P3",ix:["I2"]}));
    edges.push(["L1",l0id]);
    edges.push([l0id,"L0"]);
    const cid=dm.k.slice(0,2).toUpperCase()+"X";
    nodes.push(N(cid+"-C",0,dm.title,"Domain component. Depends on the FREECC engine (L1); its sub-issues are the build plan for this domain.",{ev:["E2","E8"],sim:true,w:6,p:"P3",vars:"domain data, destination set, provider accounts",roles:"operator, implementer, harness"}));
    edges.push(["L1",cid+"-C"]);
    edges.push([cid+"-C",l0id]);
    dm.subs.forEach(s=>{
      nodes.push(N(s.id,0,s.t,s.d,{ev:s.ev,p:s.p,w:s.w,oq:s.oq||null,sim:!s.oq&&s.ev.length>0,ix:[INDEXES[Math.floor(rng()*INDEXES.length)].id]}));
      edges.push([s.id,cid+"-C"]);
    });
  });
  // budget/deadline become explicit L1-adjacent economy notes
  return {name:"Generated: "+truncate(desc,40),seed:"gen-"+seed,nodes:nodes,edges:edges};
}
function truncate(s,n){ s=(s||"").replace(/\s+/g," ").trim(); return s.length>n?s.slice(0,n-1)+"…":s; }

/* ---------- derived graph math ---------- */
let PROJECT=null, byId={}, PRIO={}, SEL=null, CRIT=null, VIEW=null, elemRefs={node:{},edge:[]};
function loadProject(p){
  PROJECT=p; byId={}; p.nodes.forEach(n=>byId[n.id]=n);
  computeCols(); computePriority(); layoutProject();
  CRIT=null;
  renderAll();
}
function prereqs(id){ return PROJECT.edges.filter(e=>e[1]===id).map(e=>e[0]); }
function dependents(id){ return PROJECT.edges.filter(e=>e[0]===id).map(e=>e[1]); }
function transitiveDependents(id){
  const seen=new Set(); const st=[id];
  while(st.length){ const c=st.pop(); for(const d of dependents(c)) if(!seen.has(d)&&d!==id){seen.add(d);st.push(d);} }
  return seen;
}
function computeCols(){
  // col = 1 + max(col of prereqs); memoized, cycle-safe
  const memo={};
  function col(id,stack){
    if(memo[id]!==undefined) return memo[id];
    if(stack.indexOf(id)>=0) return 0;
    stack.push(id);
    const ps=prereqs(id);
    const c=ps.length?1+Math.max.apply(null,ps.map(p=>col(p,stack))):0;
    stack.pop(); memo[id]=c; return c;
  }
  PROJECT.nodes.forEach(n=>{ n.col=col(n.id,[]); });
  PROJECT.maxCol=Math.max.apply(null,PROJECT.nodes.map(n=>n.col));
}
function computePriority(){
  PRIO={}; let mx=1;
  for(const n of PROJECT.nodes){
    const td=transitiveDependents(n.id);
    let s=n.w*5; td.forEach(id=>{ s+=(byId[id]?byId[id].w:1); });
    PRIO[n.id]=s; if(s>mx)mx=s;
  }
  PROJECT.maxPrio=mx;
}
function childrenOf(id){ return prereqs(id).map(x=>byId[x]).filter(Boolean).sort((a,b)=>PRIO[b.id]-PRIO[a.id]); }
function isActionable(n){ return prereqs(n.id).every(p=>byId[p]&&byId[p].st==="resolved"); }
function effStatus(n){ return n.st==="resolved"?"resolved":(n.st==="working"?"working":(isActionable(n)?"open":"locked")); }

/* ---------- layout: hierarchical force (deterministic, seeded) ---------- */
function layoutProject(){
  const rng=mulberry(hash(PROJECT.seed));
  const COLW=300,PADX=140,H=1000;
  const byCol={};
  PROJECT.nodes.forEach(n=>{ (byCol[n.col]=byCol[n.col]||[]).push(n); });
  Object.keys(byCol).forEach(c=>{
    const list=byCol[c];
    list.forEach((n,i)=>{ n.x=PADX+(+c)*COLW+(rng()*30-15); n.y=70+(i+0.5)*(H-140)/list.length+(rng()*40-20); });
  });
  for(let it=0;it<260;it++){
    for(let i=0;i<PROJECT.nodes.length;i++){
      const a=PROJECT.nodes[i];
      for(let j=i+1;j<PROJECT.nodes.length;j++){
        const b=PROJECT.nodes[j];
        let dx=a.x-b.x, dy=a.y-b.y; let d2=dx*dx+dy*dy; if(d2<1) {d2=1; dy=(rng()-.5)*2;}
        if(d2<140*140){ const d=Math.sqrt(d2); const f=(140-d)/d*0.16; a.x+=dx*f*0.2; a.y+=dy*f; b.x-=dx*f*0.2; b.y-=dy*f; }
      }
      const tx=PADX+a.col*COLW; a.x+=(tx-a.x)*0.25;
    }
    PROJECT.edges.forEach(e=>{
      const a=byId[e[0]],b=byId[e[1]]; if(!a||!b)return;
      const dy=(b.y-a.y)*0.012; a.y+=dy; b.y-=dy;
    });
    PROJECT.nodes.forEach(n=>{ n.y=Math.max(40,Math.min(H-40,n.y)); });
  }
  VIEW={x:0,y:0,w:PADX*2+PROJECT.maxCol*COLW+120,h:H};
}

/* ---------- SVG rendering ---------- */
const svgNS="http://www.w3.org/2000/svg";
function el(tag,attrs,parent){ const e=document.createElementNS(svgNS,tag); for(const k in attrs)e.setAttribute(k,attrs[k]); if(parent)parent.appendChild(e); return e; }
const STCOL={resolved:"#4ade80",open:"#f5a623",locked:"#5b6a82",working:"#60a5fa"};
function renderCloud(){
  const svg=document.getElementById("cloud");
  svg.innerHTML="";
  const defs=el("defs",{},svg);
  ["#5b6a82","#4ade80","#39d2c0","#a78bfa"].forEach((c,i)=>{
    const m=el("marker",{id:"ar"+i,markerWidth:8,markerHeight:8,refX:7,refY:4,orient:"auto"},defs);
    el("path",{d:"M0,0 L8,4 L0,8 z",fill:c},m);
  });
  const gEdges=el("g",{},svg), gNodes=el("g",{},svg);
  elemRefs={node:{},edge:[]};
  PROJECT.edges.forEach(e=>{
    const a=byId[e[0]],b=byId[e[1]]; if(!a||!b)return;
    const ok=a.st==="resolved";
    const path=el("path",{class:"edge",stroke:ok?"#2f6e52":"#2a3548","marker-end":"url(#"+(ok?1:0)+")"},gEdges);
    elemRefs.edge.push({path:path,a:a,b:b});
  });
  PROJECT.nodes.forEach(n=>{
    const g=el("g",{class:"node",transform:"translate("+n.x+","+n.y+")"},gNodes);
    const r=9+15*Math.sqrt(PRIO[n.id]/PROJECT.maxPrio);
    n.r=r;
    const st=effStatus(n);
    const gap=(!n.ev.length)||n.oq;
    el("circle",{r:r,fill:"#0b0e14",stroke:STCOL[st],"stroke-width":n.id===SEL?3.5:2,opacity:st==="locked"?0.55:1},g);
    el("circle",{r:r-4,fill:STCOL[st],opacity:st==="locked"?0.25:0.85},g);
    if(gap){ el("circle",{r:r+4,fill:"none",stroke:"#f87171","stroke-width":1,"stroke-dasharray":"3 3",opacity:.9},g); }
    if(n.g&&n.g.length){ el("circle",{r:3,cx:r*0.75,cy:-r*0.75,fill:"#39d2c0"},g); }
    const t1=el("text",{class:"nid",y:r+14,"text-anchor":"middle"},g); t1.textContent=n.id;
    const t2=el("text",{y:r+27,"text-anchor":"middle",fill:"#8494ab","font-size":"10"},g); t2.textContent=truncate(n.t,26);
    g.addEventListener("pointerdown",ev=>startDragNode(ev,n));
    g.addEventListener("click",ev=>{ ev.stopPropagation(); selectNode(n.id); });
    elemRefs.node[n.id]=g;
  });
  positionEdges();
  applyView();
}
function positionEdges(){
  elemRefs.edge.forEach(rec=>{
    const a=rec.a,b=rec.b;
    const dx=Math.max(40,(b.x-a.x)/2);
    const rr=(b.r||12)+4;
    rec.path.setAttribute("d","M"+a.x+","+a.y+" C"+(a.x+dx)+","+a.y+" "+(b.x-dx)+","+b.y+" "+(b.x-(b.x>a.x?rr:-rr))+","+b.y);
  });
}
function applyView(){
  const svg=document.getElementById("cloud");
  svg.setAttribute("viewBox",VIEW.x+" "+VIEW.y+" "+VIEW.w+" "+VIEW.h);
}
function svgPoint(evt){
  const svg=document.getElementById("cloud");
  const pt=svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
let drag=null,pan=null;
function startDragNode(evt,n){
  evt.preventDefault(); evt.stopPropagation();
  const p=svgPoint(evt); drag={n:n,ox:n.x-p.x,oy:n.y-p.y};
}
document.addEventListener("pointermove",evt=>{
  if(drag){ const p=svgPoint(evt); drag.n.x=p.x+drag.ox; drag.n.y=p.y+drag.oy;
    elemRefs.node[drag.n.id].setAttribute("transform","translate("+drag.n.x+","+drag.n.y+")"); positionEdges(); }
  else if(pan){ const p=svgPoint(evt); VIEW.x=pan.vx-(p.x-pan.sx); VIEW.y=pan.vy-(p.y-pan.sy); applyView(); }
});
document.addEventListener("pointerup",()=>{ drag=null; pan=null; });
(function(){
  const svg=document.getElementById("cloud");
  svg.addEventListener("pointerdown",evt=>{ if(evt.target===svg||evt.target.tagName==="path"&&evt.target.classList.contains("edge")){ const p=svgPoint(evt); pan={sx:p.x,sy:p.y,vx:VIEW.x,vy:VIEW.y}; } });
  svg.addEventListener("wheel",evt=>{
    evt.preventDefault();
    const f=evt.deltaY>0?1.12:0.89;
    const p=svgPoint(evt);
    const nw=Math.max(400,Math.min(6000,VIEW.w*f));
    const k=nw/VIEW.w;
    VIEW.x=p.x-(p.x-VIEW.x)*k; VIEW.y=p.y-(p.y-VIEW.y)*k;
    VIEW.w=nw; VIEW.h=VIEW.h*k;
    applyView();
  },{passive:false});
  svg.addEventListener("click",()=>{ SEL=null; renderCloud(); renderPanel(); });
})();

/* ---------- selection, panel, critical chain ---------- */
function criticalChain(id){
  const path=[id]; let cur=id;
  for(let guard=0;guard<20;guard++){
    const ds=dependents(cur).map(d=>byId[d]).filter(Boolean).sort((a,b)=>PRIO[b.id]-PRIO[a.id]);
    if(!ds.length)break; cur=ds[0].id; path.push(cur);
  }
  return path;
}
function selectNode(id){
  SEL=id;
  renderCloud();
  if(CRIT){ highlightCritical(); }
  renderPanel();
}
function highlightCritical(){
  const set=new Set(CRIT);
  PROJECT.nodes.forEach(n=>{ const g=elemRefs.node[n.id]; if(g)g.style.opacity=set.has(n.id)?1:0.18; });
  elemRefs.edge.forEach(r=>{ r.path.style.opacity=(set.has(r.a.id)&&set.has(r.b.id))?1:0.07; if(set.has(r.a.id)&&set.has(r.b.id))r.path.setAttribute("stroke","#a78bfa"); });
}
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function renderPanel(){
  const side=document.getElementById("side");
  if(!SEL){ side.innerHTML=panelHome(); return; }
  const n=byId[SEL]; if(!n){SEL=null;side.innerHTML=panelHome();return;}
  const st=effStatus(n);
  const badge={resolved:'<span class="badge b-res">RESOLVED</span>',open:'<span class="badge b-open">OPEN · actionable</span>',locked:'<span class="badge b-lock">LOCKED</span>',working:'<span class="badge b-work">WORKING</span>'}[st];
  const gap=(!n.ev.length)||n.oq;
  const kids=childrenOf(n.id);
  const deps=dependents(n.id);
  const pr=prereqs(n.id);
  const prioPct=Math.round(100*PRIO[n.id]/PROJECT.maxPrio);
  let html='<h2><span class="mono">'+esc(n.id)+'</span> '+esc(n.t)+'</h2>';
  const gr=gradeOf(n);
  html+='<div class="row" style="margin:6px 0">'+badge+(gap?'<span class="badge b-gap">EVIDENCE GAP</span>':'')+(n.sim&&n.st!=="resolved"?'<span class="badge b-sim">sim-gate available</span>':'')+'<span class="badge-g g-'+gr.grade+'">'+gr.grade+' · '+gr.score+'%</span></div>';
  html+='<div class="kv"><b>Why it matters (resolution priority)</b><div class="small muted">'+prioPct+'% of max unlock power — resolving it frees '+transitiveDependents(n.id).size+' downstream issue(s)</div><div class="bar"><i style="width:'+prioPct+'%"></i></div></div>';
  html+='<div class="kv"><b>Statement</b><p>'+esc(n.d)+'</p></div>';
  if(n.vars)html+='<div class="kv"><b>Variables</b><p class="small">'+esc(n.vars)+'</p></div>';
  if(n.roles)html+='<div class="kv"><b>Roles</b><p class="small">'+esc(n.roles)+'</p></div>';
  if(n.ev&&n.ev.length)html+='<div class="kv"><b>Methods → evidence</b><div>'+n.ev.map(e=>'<span class="pill" onclick="showEvidence(\''+e+'\')">'+e+'</span>').join("")+'</div></div>';
  if(n.g&&n.g.length)html+='<div class="kv"><b>Mechanical gates</b><div>'+n.g.map(g=>{const gg=GATES.find(x=>x.id===g);return '<span class="pill g" onclick="gotoReport(\''+g+'\')">'+g+(gg&&gg.s==="PASS"?" ✓":" ⏳")+'</span>';}).join("")+'</div></div>';
  if(n.ix&&n.ix.length)html+='<div class="kv"><b>Spectral indexes</b><div>'+n.ix.map(i=>'<span class="pill i" onclick="gotoTab(\'indexes\')">'+i+'</span>').join("")+'</div></div>';
  html+='<div class="kv"><b>Recommended prompt</b><div><span class="pill p" onclick="gotoPrompt(\''+n.p+'\')">'+n.p+' · '+esc((PROMPTS.find(p=>p.id===n.p)||{n:""}).n)+'</span></div></div>';
  if(n.oq)html+='<div class="kv"><b>Open question (honesty ledger)</b><p class="small" style="color:var(--rd)">'+esc(n.oq)+'</p></div>';
  html+='<div class="kv"><b>Mechanical checks — '+gr.score+'% passed</b>'+
    gr.checks.map(c=>'<div class="chk"><span class="'+(c.passed?'ok':'no')+'">'+(c.passed?'✓':'✗')+'</span><span class="small">'+esc(c.label)+(c.critical?'<span class="crit">critical</span>':'')+'<br><span class="muted">'+esc(c.detail)+'</span></span></div>').join("")+
    (gr.escalate?'<p class="small" style="color:var(--am);margin-top:7px">Weak or unsupported work is exactly what buys the next rung — escalate with P7 before spending more.</p>':'')+
    '</div>';
  // dependency chain
  html+='<div class="kv"><b>Dependency chain</b><p class="small muted">blocked by: '+(pr.length?pr.map(p=>'<span class="pill" onclick="selectNode(\''+p+'\')">'+esc(p)+'</span>').join(""):'<i>nothing — atomic</i>')+'<br>unlocks: '+(deps.length?deps.map(d=>'<span class="pill" onclick="selectNode(\''+d+'\')">'+esc(d)+'</span>').join(""):'<i>terminal output</i>')+'</p></div>';
  // action buttons
  html+='<div class="row" style="margin:10px 0">';
  if(st!=="resolved"){
    const gateIds=(n.g||[]).filter(g=>{const gg=GATES.find(x=>x.id===g);return gg&&gg.s==="PASS";});
    if(gateIds.length) html+='<button class="btn" onclick="resolveByGate(\''+n.id+'\')">✓ resolve by gate '+gateIds[0]+'</button>';
    else if(n.sim) html+='<button class="btn ghost" onclick="runSimGate(\''+n.id+'\')">▶ run SIMULATED gate (labeled)</button>';
    else html+='<button class="btn dim" disabled title="no green gate and no evidence — see truth rules 1+2">blocked: no gate / evidence</button>';
  } else html+='<button class="btn dim" onclick="unresolve(\''+n.id+'\')">↺ reopen</button>';
  html+='<button class="btn dim" onclick="CRIT=criticalChain(\''+n.id+'\');highlightCritical();toast(\'critical chain highlighted: '+esc(criticalChain(n.id).join(' → '))+'\')">⇢ critical chain</button>';
  html+='</div>';
  if(st==="locked") html+='<p class="small" style="color:var(--dim)">Locked: resolve '+pr.filter(p=>byId[p].st!=="resolved").map(p=>'<b class="mono">'+esc(p)+'</b>').join(", ")+' first (dependency discipline).</p>';
  // sub-issues sorted by importance
  html+='<h3>Sub-issues ('+kids.length+') — sorted by importance of resolving</h3>';
  if(!kids.length)html+='<p class="small muted">Atomic issue — no decomposition below.</p>';
  kids.forEach(k=>{
    const pct=Math.round(100*PRIO[k.id]/PROJECT.maxPrio);
    const kst=effStatus(k);
    html+='<button class="sub" onclick="selectNode(\''+k.id+'\')"><span class="t"><span><span class="dot" style="background:'+STCOL[kst]+'"></span><b class="mono">'+esc(k.id)+'</b> · '+esc(truncate(k.t,40))+'</span><span class="small muted">'+pct+'%</span></span><span class="bar"><i style="width:'+pct+'%"></i></span></button>';
  });
  side.innerHTML=html;
}
function panelHome(){
  const total=PROJECT.nodes.length;
  const res=PROJECT.nodes.filter(n=>n.st==="resolved").length;
  const gaps=PROJECT.nodes.filter(n=>!n.ev.length||n.oq).length;
  return '<h2>'+esc(PROJECT.name)+'</h2>'+
   '<p class="small muted">'+total+' issues · '+res+' resolved · '+gaps+' with evidence gaps · '+PROJECT.edges.length+' dependency edges. Click any node: sub-issues appear below it, sorted by resolution priority (unlock power). Arrows: prerequisite → dependent — resolution flows left → right toward the output.</p>'+
   '<h3>How to work this tree</h3><p class="small">1 · Start from the highest-priority <i>actionable</i> atomic issue (left column, amber).<br>2 · Open its recommended prompt (P#), fill the context pointers, run it in your harness.<br>3 · Resolve only via its green gate (G#) — or the labeled simulation for generated nodes.<br>4 · Evidence-gap nodes (red dashed ring) must go through P0 steps 1–2 first: verify existence, add a ledger entry, define a gate. The UI refuses to resolve them — truth rules 1+2, enforced in code.<br>5 · When a component turns green, its dependent unlocks; when L1 turns green, the L0.x outcomes become actionable.</p>'+
   '<h3>Seven rules of truth</h3>'+TRUTH_RULES.map(r=>'<p class="small" style="margin:3px 0">'+esc(r)+'</p>').join("")+
   '<h3>Budget split</h3><p class="small">per-call: cascade $0-first + hard budget stop (G13) · per-task: ladder class bought by red verdicts (G06) · per-day: quota pool with failover (G09/G10).</p>';
}

/* ---------- resolution mechanics (truth rules in code) ---------- */
function resolveByGate(id){
  const n=byId[id];
  const ok=(n.g||[]).some(g=>{const gg=GATES.find(x=>x.id===g);return gg&&gg.s==="PASS";});
  if(!ok){ toast("REFUSED: no green gate for "+id+" (truth rule 1)"); return; }
  if(!isActionable(n)){ toast("LOCKED: prerequisites of "+id+" are not resolved yet"); return; }
  n.st="resolved"; afterChange(id);
}
function runSimGate(id){
  const n=byId[id];
  if(!isActionable(n)){ toast("LOCKED: prerequisites of "+id+" are not resolved yet"); return; }
  if(!n.ev.length||n.oq){ toast("REFUSED: evidence gap on "+id+" — run P0 steps 1-2 first (truth rule 2)"); return; }
  toast("SIMULATED gate for "+id+": verify-existence ✓ · ledger refs ✓ · executable check ✓ — labeled synthetic (truth rule 6)");
  n.st="resolved"; n.simPassed=true; afterChange(id);
}
function unresolve(id){ byId[id].st="open"; afterChange(id); }
function afterChange(id){
  // resolution can unlock dependents; locked children of reopened nodes revert to open
  recomputeStatuses(); renderAll(); if(SEL)renderPanel();
}
function recomputeStatuses(){ /* statuses are explicit; 'locked' is derived in effStatus() */ }

/* ---------- other tabs ---------- */
let sortKey="prio",sortDir=-1;
function renderIssues(){
  const rows=PROJECT.nodes.slice().sort((a,b)=>{
    let x,y;
    if(sortKey==="prio"){x=PRIO[a.id];y=PRIO[b.id];}
    else if(sortKey==="col"){x=a.col;y=b.col;}
    else if(sortKey==="st"){x=effStatus(a);y=effStatus(b);}
    else {x=(a.ev||[]).length;y=(b.ev||[]).length;}
    return (x<y?-1:x>y?1:0)*sortDir;
  });
  let h='<tr><th data-k="prio">priority ▾</th><th data-k="col">layer</th><th>id</th><th>issue</th><th data-k="st">status</th><th>grade</th><th data-k="ev">evidence</th><th>gates</th><th>prompt</th></tr>';
  rows.forEach(n=>{
    const st=effStatus(n);
    const pct=Math.round(100*PRIO[n.id]/PROJECT.maxPrio);
    h+='<tr onclick="gotoTab(\'cloud\');selectNode(\''+n.id+'\')" style="cursor:pointer">'+
      '<td><div style="display:flex;align-items:center;gap:6px"><b>'+pct+'%</b><div class="bar" style="width:70px"><i style="width:'+pct+'%"></i></div></div></td>'+
      '<td class="mono small">L'+n.col+'</td><td class="mono"><b>'+esc(n.id)+'</b></td><td>'+esc(truncate(n.t,60))+'</td>'+
      '<td><span class="dot" style="background:'+STCOL[st]+'"></span>'+st+'</td>'+
      '<td>'+(function(){const g=gradeOf(n);return '<span class="badge-g g-'+g.grade+'">'+g.grade+'</span>';})()+'</td>'+
      '<td>'+(n.ev.length?n.ev.join(", "):'<span style="color:var(--rd)">GAP</span>')+'</td>'+
      '<td class="small">'+(n.g&&n.g.length?n.g.join(", "):"—")+'</td><td class="mono">'+esc(n.p)+'</td></tr>';
  });
  const t=document.getElementById("issueTable");
  t.innerHTML=h;
  t.querySelectorAll("th").forEach(th=>th.addEventListener("click",()=>{const k=th.getAttribute("data-k");if(!k)return;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderIssues();}));
}
function renderIndexes(){
  document.getElementById("idxGrid").innerHTML=INDEXES.map(x=>
   '<div class="card"><h3 style="margin-top:0">'+x.id+' · '+esc(x.n)+'</h3><p class="small">'+esc(x.d)+'</p><p class="small muted">instrument: <span class="mono">'+esc(x.i)+'</span></p><div class="row"><input type="number" placeholder="current value" style="max-width:150px"><span class="small muted">tuning rule: P8 (one knob, falsifier required)</span></div></div>'
  ).join("");
}
function renderEvidence(filterId){
  let h='<tr><th>id</th><th>type</th><th>claim as used</th><th>source</th></tr>';
  EVIDENCE.forEach(e=>{
    if(filterId&&e.id!==filterId)return;
    h+='<tr id="ev-'+e.id+'"><td class="mono"><b>'+e.id+'</b></td><td>'+e.t+'</td><td>'+esc(e.c)+'</td><td>'+(e.u?'<a href="'+e.u+'" target="_blank" rel="noopener">'+e.u+'</a>':'<span class="muted">workspace-empirical (see REPORT.md)</span>')+'</td></tr>';
  });
  document.getElementById("evTable").innerHTML=h;
}
function showEvidence(id){ gotoTab("evidence"); renderEvidence(id); toast("Evidence "+id+" — type "+(EVIDENCE.find(e=>e.id===id)||{t:"?"}).t+" (re-verify secondary sources before reliance)"); }
function renderPrompts(){
  document.getElementById("promptList").innerHTML=PROMPTS.map(p=>{
    const tpl=document.getElementById("tpl-"+p.id);
    const body=tpl?tpl.textContent.trim():"(template missing)";
    return '<details class="acc" id="pr-'+p.id+'"><summary>'+p.id+' · '+esc(p.n)+' <small>'+esc(p.w)+'</small></summary><div class="row" style="margin:10px 0"><button class="btn ghost" onclick="copyPrompt(\''+p.id+'\')">copy prompt</button><span class="small muted">verbatim from prompts/'+p.id.toLowerCase()+'*.md (gate G16-validated)</span></div><pre class="tp" id="pre-'+p.id+'">'+esc(body)+'</pre></details>';
  }).join("");
}
function copyPrompt(id){
  const txt=(document.getElementById("tpl-"+id)||{textContent:""}).textContent.trim();
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(()=>toast(id+" copied"),()=>fallbackCopy(txt,id)); }
  else fallbackCopy(txt,id);
}
function fallbackCopy(txt,id){
  const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); toast(id+" copied (fallback)"); }catch(e){ toast("select the text manually — clipboard blocked in sandbox"); }
  document.body.removeChild(ta);
}
function gotoPrompt(id){ gotoTab("prompts"); const d=document.getElementById("pr-"+id); if(d){ d.open=true; d.scrollIntoView({behavior:"smooth"});} }
function gotoReport(gid){ gotoTab("report"); const r=document.getElementById("gate-"+gid); if(r){ r.scrollIntoView({behavior:"smooth"}); r.style.background="#132a1e"; setTimeout(()=>r.style.background="",1600);} }
function renderGates(revealed){
  let h='<tr><th>gate</th><th>check</th><th>status</th></tr>';
  GATES.forEach((g,i)=>{
    const shown=revealed===undefined||i<revealed;
    h+='<tr id="gate-'+g.id+'"><td class="mono"><b>'+g.id+'</b></td><td>'+esc(g.d)+'</td><td>'+(shown?'<span class="'+(g.s==="PASS"?"pass":"fail")+'">'+(g.s)+'</span>':'<span class="muted">…</span>')+'</td></tr>';
  });
  document.getElementById("gateTable").innerHTML=h;
}
function replayGates(){
  let i=0; const st=document.getElementById("replayState");
  const tm=setInterval(()=>{ i++; renderGates(i); st.textContent="running… "+i+"/"+GATES.length;
    if(i>=GATES.length){ clearInterval(tm); st.textContent="18/18 PASS — replay of the real run 2026-10-17 (authoritative: REPORT.md via gates/run-gates.sh)"; } },140);
}

/* ---------- footer / chrome ---------- */
function renderFooter(){
  const total=PROJECT.nodes.length;
  const res=PROJECT.nodes.filter(n=>n.st==="resolved").length;
  const cov=Math.round(100*PROJECT.nodes.filter(n=>n.ev.length>0).length/total);
  const oq=PROJECT.nodes.filter(n=>n.oq).length;
  document.getElementById("chipProj").textContent=PROJECT.name;
  document.getElementById("chipRes").textContent=res+"/"+total;
  document.getElementById("chipCov").textContent=cov+"%";
  document.getElementById("footCounts").innerHTML='<b>'+esc(PROJECT.name)+'</b> · '+res+'/'+total+' resolved · evidence coverage '+cov+'% · open questions '+oq+(res===total?' · <span class="pass">TREE GREEN — L0 reachable</span>':'');
}
let tick=0;
setInterval(()=>{ tick=(tick+1)%TRUTH_RULES.length; document.getElementById("ticker").textContent=TRUTH_RULES[tick]; },5200);
function toast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.style.display="block";
  clearTimeout(t._h); t._h=setTimeout(()=>t.style.display="none",4200);
}
/* ---------- providers + grades (capabilities ported from free-research-llm) ---------- */
let GRADE_MAP={};
function computeGrades(){
  GRADE_MAP=gradeAll(PROJECT.nodes,{EVIDENCE:EVIDENCE,GATES:GATES,INDEXES:INDEXES});
  return GRADE_MAP;
}
function gradeOf(n){
  return GRADE_MAP[n.id]||gradeNode(n,{EVIDENCE:EVIDENCE,GATES:GATES,INDEXES:INDEXES});
}
/* The chain that decides the outcome: the highest total weight path to L0. */
function weightedCriticalPath(){
  const w={}; PROJECT.nodes.forEach(n=>{w[n.id]=n.w||1;});
  const memo={};
  function best(id){
    if(memo[id])return memo[id];
    let top=null;
    dependents(id).forEach(d=>{ const c=best(d); if(!top||c.val>top.val) top=c; });
    const res=top?{val:w[id]+top.val,path:[id].concat(top.path)}:{val:w[id],path:[id]};
    memo[id]=res; return res;
  }
  let winner=null;
  PROJECT.nodes.forEach(n=>{ const r=best(n.id); if(!winner||r.val>winner.val) winner=r; });
  return winner?winner.path:[];
}
function renderProviders(){
  let rt='<tr><th style="width:110px">role</th><th>order — first choice wins, 429 moves to the next</th></tr>';
  ["deep","fast","reviewer"].forEach(r=>{
    rt+='<tr><td><span class="rolechip '+r+'">'+r+'</span></td><td>'+ROUTE_ORDER[r].map((id,i)=>{
      const p=PROVIDERS.find(x=>x.id===id);
      const mark=p&&p.verified?' <span class="v-ok" title="verified on this machine">✓</span>':'';
      return '<span class="pill">'+(i+1)+' · '+esc(p?p.label:id)+mark+'</span>';
    }).join("")+'</td></tr>';
  });
  document.getElementById("routeTable").innerHTML=rt;

  document.getElementById("provGrid").innerHTML=PROVIDERS.map(p=>
    '<div class="prov"><h4>'+esc(p.label)+
      ' <span class="tier t-'+esc(p.tier)+'">'+esc(p.tier)+'</span>'+
      (p.verified?'<span class="v-ok" title="this machine received real content">&check; verified</span>':'<span class="v-doc">documented</span>')+
    '</h4><div>'+p.roles.map(r=>'<span class="rolechip '+r+'">'+r+'</span>').join(" ")+
      (p.freeOnly?' <span class="rolechip">:free only</span>':'')+'</div>'+
    '<div class="url mono">'+esc(p.baseURL||"(your own endpoint)")+'</div>'+
    '<div class="small">key: <span class="mono">'+esc(p.keyEnv||"none")+'</span>'+
      (p.signup?' · <a href="'+p.signup+'" target="_blank" rel="noopener">get a key</a>':'')+'</div>'+
    '<div class="models"><b>fast</b> '+p.preferFast.map(m=>'<span class="pill">'+esc(m)+'</span>').join("")+'</div>'+
    '<div class="models"><b>deep</b> '+p.preferDeep.map(m=>'<span class="pill">'+esc(m)+'</span>').join("")+'</div>'+
    '<div class="note">'+esc(p.note)+'</div></div>'
  ).join("");

  let st='<tr><th style="width:140px">backend</th><th style="width:220px">env var</th><th>note</th></tr>';
  SEARCH.forEach(s=>{
    st+='<tr><td><b>'+esc(s.label)+'</b></td><td class="mono small">'+esc(s.env)+'</td><td class="small">'+esc(s.note)+
      (s.signup?' · <a href="'+s.signup+'" target="_blank" rel="noopener">signup</a>':'')+'</td></tr>';
  });
  document.getElementById("searchTable").innerHTML=st;
  document.getElementById("nonChatRegex").textContent=NON_CHAT_MODEL;
}
function renderGrades(){
  const grades=computeGrades();
  const c=gradeCounts(grades);
  document.getElementById("gradeSummary").innerHTML=
    '<span class="sumchip"><span class="n" style="color:var(--gr)">'+c.verified+'</span>verified</span>'+
    '<span class="sumchip"><span class="n" style="color:var(--cy)">'+c.supported+'</span>supported</span>'+
    '<span class="sumchip"><span class="n" style="color:var(--am)">'+c.weak+'</span>weak</span>'+
    '<span class="sumchip"><span class="n" style="color:var(--rd)">'+c.unsupported+'</span>unsupported</span>'+
    '<span class="sumchip"><span class="n">'+PROJECT.nodes.length+'</span>issues graded</span>';

  const path=weightedCriticalPath();
  const v=rollupVerdict(path,grades);
  const singleHost=PROJECT.nodes.filter(n=>{
    const f=grades[n.id].checks.filter(c=>!c.passed);
    return f.length===1&&f[0].id==="independent-domains";
  });
  const hosts={};
  PROJECT.nodes.forEach(n=>{
    grades[n.id].checks.forEach(c=>{
      if(c.id==="independent-domains"&&!c.passed){const m=c.detail.match(/domain\(s\): (.+)$/);if(m)m[1].split(", ").forEach(h=>{hosts[h]=(hosts[h]||0)+1;});}
    });
  });
  const topHosts=Object.keys(hosts).sort((a,b)=>hosts[b]-hosts[a]).slice(0,3);
  document.getElementById("verdictCard").innerHTML=
    '<div class="verdict"><span class="v" style="color:'+v.colour+'">'+v.verdict+'</span>'+
    '<span class="small muted">rolled up from the grades of the '+path.length+'-issue critical path — computed, never typed in</span></div>'+
    '<p class="small" style="margin-top:9px">'+esc(v.detail)+'</p>'+
    (singleHost.length?'<p class="small" style="margin-top:7px;color:var(--am)">'+singleHost.length+' issue(s) are weak <i>only</i> because their evidence traces to a single host'+(topHosts.length?' ('+topHosts.map(h=>esc(h)+' ×'+hosts[h]).join(", ")+')':'')+'. One vendor page cannot corroborate itself.</p>':'')+
    '<p class="small" style="margin-top:7px">critical path: '+path.map(id=>'<span class="pill" onclick="selectNode(\''+id+'\');gotoTab(\'cloud\')">'+esc(id)+'</span>').join("")+'</p>';

  let ct='<tr><th>check</th><th style="width:110px">kind</th><th>fails when</th></tr>';
  CHECK_DOC.forEach(d=>{
    ct+='<tr><td><b>'+esc(d.label)+'</b></td><td>'+(d.critical?'<span class="badge-g g-unsupported">critical</span>':'<span class="badge-g g-weak">normal</span>')+'</td><td class="small muted">'+esc(d.why)+'</td></tr>';
  });
  document.getElementById("checksTable").innerHTML=ct;

  const order={unsupported:0,weak:1,supported:2,verified:3};
  const rows=PROJECT.nodes.slice().sort((a,b)=>
    (order[grades[a.id].grade]-order[grades[b.id].grade])||(PRIO[b.id]-PRIO[a.id]));
  let gt='<tr><th style="width:110px">grade</th><th style="width:70px">score</th><th style="width:80px">id</th><th>issue</th><th>failed checks</th><th style="width:100px">next step</th></tr>';
  rows.forEach(n=>{
    const g=grades[n.id];
    const failed=g.checks.filter(x=>!x.passed);
    gt+='<tr onclick="gotoTab(\'cloud\');selectNode(\''+n.id+'\')" style="cursor:pointer">'+
      '<td><span class="badge-g g-'+g.grade+'">'+g.grade+'</span></td>'+
      '<td><span class="gscore">'+g.score+'%</span></td>'+
      '<td class="mono"><b>'+esc(n.id)+'</b></td>'+
      '<td>'+esc(truncate(n.t,52))+'</td>'+
      '<td class="small">'+(failed.length?failed.map(x=>'<span style="color:var(--am)">'+esc(x.label)+'</span>').join('<br>'):'<span class="muted">—</span>')+'</td>'+
      '<td class="small">'+(g.escalate?'<span style="color:var(--rd)">P7 escalate</span>':'<span class="muted">'+(g.grade==="verified"?"hold":"maintain")+'</span>')+'</td></tr>';
  });
  document.getElementById("gradeTable").innerHTML=gt;
}
function renderAll(){ computeGrades(); renderCloud(); renderPanel(); renderIssues(); renderGrades(); renderFooter(); if(CRIT)highlightCritical(); applySearch(); }
function gotoTab(name){
  document.querySelectorAll("section.tab").forEach(s=>s.classList.remove("on"));
  document.getElementById("tab-"+name).classList.add("on");
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.getAttribute("data-t")===name));
  if(name==="cloud"){ renderCloud(); if(CRIT)highlightCritical(); applySearch(); }
}
document.querySelectorAll("#nav button").forEach(b=>b.addEventListener("click",()=>gotoTab(b.getAttribute("data-t"))));

/* search */
function applySearch(){
  const q=(document.getElementById("search").value||"").toLowerCase().trim();
  PROJECT.nodes.forEach(n=>{
    const g=elemRefs.node[n.id]; if(!g)return;
    const hit=!q||n.id.toLowerCase().indexOf(q)>=0||n.t.toLowerCase().indexOf(q)>=0;
    g.style.opacity=hit?1:0.12;
  });
}
document.getElementById("search").addEventListener("input",applySearch);
document.getElementById("btnFit").addEventListener("click",()=>{ layoutProjectView(); });
function layoutProjectView(){ const PADX=140,COLW=300; VIEW={x:0,y:0,w:PADX*2+PROJECT.maxCol*COLW+120,h:1000}; applyView(); }
document.getElementById("btnRelax").addEventListener("click",()=>{ PROJECT.seed=PROJECT.seed+"-r"+Math.floor(Math.random()*999); layoutProject(); renderCloud(); if(CRIT)highlightCritical(); });
document.getElementById("btnCritical").addEventListener("click",()=>{
  if(!SEL){ toast("select a node first — the chain walks from it to L0"); return; }
  CRIT=criticalChain(SEL); highlightCritical(); toast("critical chain: "+CRIT.join(" → "));
});
document.getElementById("btnReplay").addEventListener("click",replayGates);

/* ---------- wizard ---------- */
let wizDomains=[];
document.getElementById("wizNext").addEventListener("click",()=>{
  const desc=document.getElementById("inDesc").value.trim();
  if(!desc){ toast("Describe the desired result first — the tree is rooted in it (P0: desired result first)."); return; }
  wizDomains=detectDomains(desc);
  const dl=document.getElementById("domList");
  if(!wizDomains.length){ dl.innerHTML='<p class="small muted">No known outcome-domain matched — the generator will use the GENERIC delivery pipeline (GN.1–GN.4). Add keywords like bookings, leads, destinations, campaigns, analytics, compliance to detect domains.</p>'; wizDomains=[{k:"generic",title:"Delivery Pipeline (generic)"}]; }
  else dl.innerHTML=wizDomains.map(d=>'<span class="domchip on" data-k="'+d.k+'">✓ '+esc(d.title)+'</span>').join("");
  dl.querySelectorAll(".domchip").forEach(c=>c.addEventListener("click",()=>{ c.classList.toggle("on"); c.textContent=(c.classList.contains("on")?"✓ ":"")+c.textContent.replace(/^[✓x]\s*/,""); }));
  document.getElementById("wiz1").style.display="none";
  document.getElementById("wiz2").style.display="block";
  document.getElementById("st1").classList.remove("on"); document.getElementById("st2").classList.add("on");
});
document.getElementById("wizBack").addEventListener("click",()=>{
  document.getElementById("wiz2").style.display="none"; document.getElementById("wiz1").style.display="block";
  document.getElementById("st2").classList.remove("on"); document.getElementById("st1").classList.add("on");
});
document.getElementById("wizGen").addEventListener("click",()=>{
  const desc=document.getElementById("inDesc").value.trim();
  const inputs=document.getElementById("inInputs").value.trim();
  const keys=[].map.call(document.querySelectorAll(".domchip.on"),c=>c.getAttribute("data-k")).filter(k=>k&&k!=="generic");
  const proj=generateProject(desc,inputs,keys);
  loadProject(proj);
  const gaps=proj.nodes.filter(n=>!n.ev.length||n.oq).length;
  document.getElementById("genSummary").innerHTML='<p>'+proj.nodes.length+' issues · '+proj.edges.length+' dependency edges · engine layers C1–C5 attached (all gate-backed) · <b style="color:var(--rd)">'+gaps+' evidence gap(s)</b> — those nodes are unresolvable until P0 steps 1–2 add ledger entries and gates (truth rule 2, enforced in code).</p><p class="small muted">Deterministic seed: <span class="mono">'+proj.seed+'</span> — the same description always generates the same tree.</p>';
  document.getElementById("wiz2").style.display="none"; document.getElementById("wiz3").style.display="block";
  document.getElementById("st2").classList.remove("on"); document.getElementById("st3").classList.add("on");
});
document.getElementById("goCloud").addEventListener("click",()=>gotoTab("cloud"));
document.getElementById("loadBaseline").addEventListener("click",()=>{ loadProject(baselineProject()); gotoTab("cloud"); toast("FREECC baseline loaded — I3.4 (mutate) and I4.3 (atlas) stay open: operator-run gates"); });

/* ---------- boot ---------- */
renderProviders(); renderIndexes(); renderEvidence(); renderPrompts(); renderGates();
loadProject(baselineProject());
document.getElementById("ticker").textContent=TRUTH_RULES[0];
