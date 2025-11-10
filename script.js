// Triangulation Graph Editor (single-file)
// Data structures
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let DPR = window.devicePixelRatio || 1;
function resize() {
  canvas.width = canvas.clientWidth * DPR;
  canvas.height = canvas.clientHeight * DPR;
  draw();
}
new ResizeObserver(resize).observe(canvas.parentElement);

let vertices = []; // {id,x,y}
let adj = new Map(); // id -> Set(id)
let nextId = 1;
let edgesSelected = new Set(); // keys 'u-v' canonical
let currentMode = 'select';
let tempEdgeFirst = null;
let showTriangles = false;

// UI elements
const modeButtons = {
  select: document.getElementById('mode-select'),
  addv: document.getElementById('mode-addv'),
  adde: document.getElementById('mode-adde'),
  delete: document.getElementById('mode-delete')
};
const validateBtn = document.getElementById('validate');
const flipBtn = document.getElementById('flip');
const clearBtn = document.getElementById('clear');
const statusEl = document.getElementById('status');

function setMode(m){
  currentMode = m;
  Object.values(modeButtons).forEach(b=>b.classList.remove('active'));
  if(m==='select') modeButtons.select.classList.add('active');
  if(m==='addv') modeButtons.addv.classList.add('active');
  if(m==='adde') modeButtons.adde.classList.add('active');
  if(m==='delete') modeButtons.delete.classList.add('active');
  tempEdgeFirst = null;
  draw();
}
modeButtons.select.addEventListener('click', ()=>setMode('select'));
modeButtons.addv.addEventListener('click', ()=>setMode('addv'));
modeButtons.adde.addEventListener('click', ()=>setMode('adde'));
modeButtons.delete.addEventListener('click', ()=>setMode('delete'));

validateBtn.addEventListener('click', ()=>{
  const ok = isValidTriangulation();
  statusEl.textContent = ok ? 'Status: VALID triangulation (each edge participates in at least one triangle).' : 'Status: INVALID triangulation — some edges are not part of any triangle.';
});
flipBtn.addEventListener('click', ()=>{
  const res = flipSelectedEdges();
  statusEl.textContent = res ? 'Status: Flipped selected edges.' : 'Status: Flip failed — selection invalid or interference.';
  draw();
});
clearBtn.addEventListener('click', ()=>{
  vertices=[];adj.clear();nextId=1;edgesSelected.clear();statusEl.textContent='Status: cleared';draw();
});

// util
function key(u,v){return u<v?u+"-"+v:v+"-"+u}
function addVertex(x,y){const id = nextId++;vertices.push({id,x,y});adj.set(id,new Set());return id}
function removeVertex(id){
  // remove edges
  if(!adj.has(id)) return;
  for(let nb of Array.from(adj.get(id))){adj.get(nb).delete(id)}
  adj.delete(id);
  vertices = vertices.filter(v=>v.id!==id);
  // cleanup selected
  for(let s of Array.from(edgesSelected)) if(s.includes(id+"-")) edgesSelected.delete(s);
}
function addEdge(u,v){if(u===v) return false; if(!adj.has(u)||!adj.has(v)) return false; if(adj.get(u).has(v)) return false; adj.get(u).add(v); adj.get(v).add(u); return true}
function removeEdge(u,v){if(!adj.has(u)||!adj.has(v)) return false; if(!adj.get(u).has(v)) return false; adj.get(u).delete(v); adj.get(v).delete(u); edgesSelected.delete(key(u,v)); return true}

function findVertexAt(px,py){
  // hit radius
  const r = 12*DPR;
  for(let v of vertices){
    const dx = v.x*DPR - px; const dy = v.y*DPR - py;
    if(dx*dx+dy*dy <= r*r) return v;
  }
  return null;
}

function findEdgeAt(px,py){
  // return canonical key and endpoints
  // pick closest line within threshold
  const thr = 8*DPR;
  let best = null; let bestD = Infinity;
  for(let [u,neis] of adj.entries()){
    for(let v of neis){
      if(u>v) continue; // only once
      const a = vertices.find(x=>x.id===u); const b = vertices.find(x=>x.id===v);
      if(!a||!b) continue;
      const d = pointToSegmentDistance(px,py,a.x*DPR,a.y*DPR,b.x*DPR,b.y*DPR);
      if(d < bestD && d <= thr){bestD=d; best={u,v}};
    }
  }
  return best;
}

function pointToSegmentDistance(px,py,x1,y1,x2,y2){
  const A = px-x1, B = py-y1, C = x2-x1, D = y2-y1;
  const dot = A*C + B*D;
  const len_sq = C*C + D*D;
  let param = len_sq !== 0 ? dot / len_sq : -1;
  let xx, yy;
  if(param < 0){xx = x1; yy = y1;} else if(param > 1){xx = x2; yy = y2;} else {xx = x1 + param * C; yy = y1 + param * D;}
  const dx = px - xx; const dy = py - yy; return Math.sqrt(dx*dx+dy*dy);
}

// triangle helpers
function trianglesContainingEdge(u,v){
  if(!adj.has(u)||!adj.has(v)) return [];
  const res = [];
  for(let w of adj.get(u)){
    if(w===v) continue;
    if(adj.get(v).has(w)) res.push(w);
  }
  return res;
}

function isFlippable(u,v){
  // flippable if exactly two distinct opposite vertices exist and the new edge doesn't already exist (or is the same)
  const opp = trianglesContainingEdge(u,v);
  const distinct = Array.from(new Set(opp));
  if(distinct.length!==2) return false;
  const a = distinct[0], b = distinct[1];
  if(a===b) return false;
  if(adj.get(a).has(b)) return false; // already connected
  return true;
}

function isValidTriangulation(){
  // every edge must be in at least one triangle (as per user's definition)
  for(let [u,neis] of adj.entries()){
    for(let v of neis){
      if(u>v) continue;
      const opp = trianglesContainingEdge(u,v);
      if(opp.length === 0) return false;
    }
  }
  return true;
}

function flipEdgeSingle(u,v){
  if(!isFlippable(u,v)) return false;
  const opp = trianglesContainingEdge(u,v);
  const a = opp[0], b = opp[1];
  // remove u-v, add a-b
  removeEdge(u,v);
  addEdge(a,b);
  return true;
}

function flipSelectedEdges(){
  if(edgesSelected.size===0) return false;
  // build operations
  const ops = [];
  for(let k of edgesSelected){
    const [su,sv] = k.split('-').map(s=>parseInt(s));
    if(!isFlippable(su,sv)) return false;
    const opp = trianglesContainingEdge(su,sv);
    const a = opp[0], b = opp[1];
    ops.push({u:su,v:sv,a,b,newEdge:key(a,b)});
  }

  // helper: whether two original edges lie in the same triangle
  function edgesInSameTriangle(e1,e2){
    const s = new Set([e1.u,e1.v,e2.u,e2.v]);
    return s.size === 3; // both edges are among the same 3 vertices
  }
  // helper: whether two new edges would lie in the same triangle (bad pair)
  function newEdgesFormTriangle(n1,n2){
    const s = new Set([n1.a,n1.b,n2.a,n2.b]);
    return s.size === 3; // newly created edges would be two edges of a triangle
  }

  // 1) independence: no two selected edges are part of the same triangle
  for(let i=0;i<ops.length;i++){
    for(let j=i+1;j<ops.length;j++){
      if(edgesInSameTriangle(ops[i], ops[j])) return false;
    }
  }

  // 2) bad-pair check: no two edges produce identical new edges or make new edges be two edges of the same triangle
  for(let i=0;i<ops.length;i++){
    for(let j=i+1;j<ops.length;j++){
      if(ops[i].newEdge === ops[j].newEdge) return false; // would create duplicate edge
      if(newEdgesFormTriangle(ops[i], ops[j])) return false; // would place two new edges inside same triangle -> 'parallel' conflict
    }
  }

  // 3) check newEdge conflicts with existing graph (unless being removed by some op)
  const removedSet = new Set(ops.map(o=>key(o.u,o.v)));
  for(let op of ops){
    const [na,nb] = op.newEdge.split('-').map(s=>parseInt(s));
    if(adj.has(na) && adj.get(na).has(nb) && !removedSet.has(op.newEdge)) return false;
  }

  // All checks passed: apply flips (removals then additions)
  for(let op of ops){ removeEdge(op.u,op.v); }
  for(let op of ops){ addEdge(op.a,op.b); }
  edgesSelected.clear();
  return true;
}

// drawing
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save(); ctx.scale(DPR,DPR);

  // triangles fill if showTriangles true
  if(showTriangles){
    ctx.globalAlpha = 0.06;
    for(let [u,neis] of adj.entries()){
      for(let v of neis){ if(u>v) continue;
        const opp = trianglesContainingEdge(u,v);
        for(let w of opp){
          // draw triangle u-v-w
          const A = vertices.find(x=>x.id===u); const B = vertices.find(x=>x.id===v); const C = vertices.find(x=>x.id===w);
          if(!A||!B||!C) continue;
          ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.lineTo(C.x,C.y); ctx.closePath(); ctx.fillStyle = '#7dd3fc'; ctx.fill();
        }
      }}
    ctx.globalAlpha = 1.0;
  }

  // edges
  ctx.lineWidth = 2;
  for(let [u,neis] of adj.entries()){
    for(let v of neis){ if(u>v) continue;
      const A = vertices.find(x=>x.id===u); const B = vertices.find(x=>x.id===v); if(!A||!B) continue;
      const k = key(u,v);
      if(edgesSelected.has(k)){
        ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = '#cde8f8'; ctx.lineWidth = 2;
      }
      ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    }
  }

  // vertices
  for(let v of vertices){
    ctx.beginPath(); ctx.arc(v.x,v.y,6,0,Math.PI*2); ctx.fillStyle = '#052233'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#bfe9ff'; ctx.stroke();
    ctx.fillStyle='#dff4ff'; ctx.font='11px Inter, Arial'; ctx.fillText(String(v.id), v.x+8, v.y-8);
  }

  ctx.restore();
}

// mouse handling
canvas.addEventListener('pointerdown', (ev)=>{
  const rect = canvas.getBoundingClientRect();
  const px = (ev.clientX - rect.left) * DPR; const py = (ev.clientY - rect.top) * DPR;
  if(currentMode==='addv'){
    // add vertex at unscaled coords
    const x = px/DPR, y = py/DPR; addVertex(x,y); statusEl.textContent='Status: vertex added'; draw(); return;
  }
  if(currentMode==='adde'){
    const v = findVertexAt(px,py);
    if(!v) { statusEl.textContent='Status: click a vertex to start/finish an edge'; return; }
    if(!tempEdgeFirst){ tempEdgeFirst = v.id; statusEl.textContent='Status: first vertex selected for edge ('+v.id+')'; }
    else { const u = tempEdgeFirst; const w = v.id; if(u===w){ statusEl.textContent='Status: same vertex, cancelled'; tempEdgeFirst=null; return; } const ok = addEdge(u,w); statusEl.textContent = ok?('Status: edge '+u+'-'+w+' added'):'Status: edge exists or invalid'; tempEdgeFirst=null; draw(); }
    return;
  }
  if(currentMode==='delete'){
    const v = findVertexAt(px,py);
    if(v){ removeVertex(v.id); statusEl.textContent='Status: vertex '+v.id+' deleted'; draw(); return; }
    const e = findEdgeAt(px,py);
    if(e){ removeEdge(e.u,e.v); statusEl.textContent='Status: edge '+e.u+'-'+e.v+' deleted'; draw(); return; }
    statusEl.textContent='Status: click a vertex or edge to delete'; return;
  }

  // select/flip mode
  const e = findEdgeAt(px,py);
  if(e){ const k = key(e.u,e.v);
    const shift = ev.shiftKey;
    if(!shift){
      // single select toggles
      if(edgesSelected.has(k)) edgesSelected.delete(k); else {
        // select only if flippable
        if(!isFlippable(e.u,e.v)){ statusEl.textContent='Status: edge not flippable (must be shared by exactly 2 triangles and opposite vertices not connected)'; }
        else { edgesSelected.clear(); edgesSelected.add(k); statusEl.textContent='Status: edge '+k+' selected'; }
      }
      draw(); return;
    } else {
      // shift multi-select: follow the parallel-flip independence rules
      if(!isFlippable(e.u,e.v)){ statusEl.textContent='Status: cannot select — not flippable'; return; }
      const [su,sv] = [e.u,e.v];
      const opp = trianglesContainingEdge(su,sv); if(opp.length!==2) return; const a=opp[0], b=opp[1];
      const candidate = {u:su,v:sv,a,b,newEdge:key(a,b)};

      // build planned ops for current selection
      const existing = [];
      for(let s of edgesSelected){
        const [pu,pv] = s.split('-').map(x=>parseInt(x));
        const opps = trianglesContainingEdge(pu,pv);
        existing.push({u:pu,v:pv,a:opps[0],b:opps[1],newEdge:key(opps[0],opps[1])});
      }

      // helper checks (same logic as flips):
      function edgesInSameTriangle(e1,e2){ const s=new Set([e1.u,e1.v,e2.u,e2.v]); return s.size===3; }
      function newEdgesFormTriangle(n1,n2){ const s=new Set([n1.a,n1.b,n2.a,n2.b]); return s.size===3; }

      // 1) candidate must not be in same triangle with any existing
      for(let ex of existing) if(edgesInSameTriangle(ex, candidate)){ statusEl.textContent='Status: cannot multi-select — shares triangle with selection'; return; }
      // 2) candidate's new edge must not collide with any existing new edge or create a bad pair
      for(let ex of existing){ if(ex.newEdge === candidate.newEdge){ statusEl.textContent='Status: cannot multi-select — new edge conflict'; return; } if(newEdgesFormTriangle(ex, candidate)){ statusEl.textContent='Status: cannot multi-select — bad pair (new edges would form a triangle)'; return; } }
      // 3) candidate's new edge must not already exist in the graph unless it's being removed
      const removedSet = new Set(existing.map(o=>key(o.u,o.v)));
      if(adj.has(candidate.a) && adj.get(candidate.a).has(candidate.b) && !removedSet.has(candidate.newEdge)){ statusEl.textContent='Status: cannot multi-select — new edge already exists'; return; }

      edgesSelected.add(k); statusEl.textContent='Status: edge '+k+' multi-selected'; draw(); return;
    }
  } else {
    statusEl.textContent='Status: click on an edge to select/flippable-check';
    draw();
  }
});

// keyboard shortcuts
window.addEventListener('keydown',(ev)=>{
  if(ev.key==='f' || ev.key==='F'){ ev.preventDefault(); flipBtn.click(); }
  if(ev.key==='Delete' || ev.key==='Backspace'){ // delete selected edges or vertex under mouse? we'll delete selected edges
    const toRem = Array.from(edgesSelected);
    if(toRem.length>0){ for(let s of toRem){ const [u,v]=s.split('-').map(x=>parseInt(x)); removeEdge(u,v);} edgesSelected.clear(); statusEl.textContent='Status: deleted selected edges'; draw(); }
  }
});

// sample starter graph
function seedSample(){
  // create a convex pentagon with triangulation diagonals
  vertices = []; adj.clear(); nextId=1; edgesSelected.clear();
  const cx = 400, cy = 300, R=160;
  for(let i=0;i<6;i++){ const ang = Math.PI*2*i/6 - Math.PI/2; addVertex(cx + Math.cos(ang)*R, cy + Math.sin(ang)*R); }
  // connect cycle
  for(let i=0;i<6;i++){ addEdge(i+1, ((i+1)%6)+1 ); }
  // add some diagonals to triangulate
  addEdge(1,3); addEdge(1,4); addEdge(1,5); addEdge(3,5);
}
// seedSample();

// initial draw

resize();
