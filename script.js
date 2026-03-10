// ========================
// QUANTUM STATE ENGINE
// ========================

const SQ2 = 1 / Math.sqrt(2);

// State vector: [a, b, c, d] for |00>, |01>, |10>, |11>
// Using real numbers only (sufficient for Deutsch)
let state = [0, 1, 0, 0]; // |01>

let selectedFn = '0';
let isRunning = false;
let currentStep = -1;
let animFrames = [];

// Oracle matrices (real parts sufficient)
function applyOracle(s, fn) {
  let [a, b, c, d] = s;
  switch(fn) {
    case '0':   return [a, b, c, d];           // f(x)=0: identity
    case '1':   return [b, a, d, c];           // f(x)=1: flip ancilla always
    case 'x':   return [a, b, d, c];           // f(x)=x: CNOT
    case '1-x': return [b, a, c, d];           // f(x)=1-x: flip when x=0
  }
}

function applyH_both(s) {
  let [a, b, c, d] = s;
  return [
    SQ2 * SQ2 * (a + b + c + d),
    SQ2 * SQ2 * (a - b + c - d),
    SQ2 * SQ2 * (a + b - c - d),
    SQ2 * SQ2 * (a - b - c + d)
  ];
}

function applyH_first(s) {
  // H on first qubit only: mixes |0x> and |1x>
  let [a, b, c, d] = s;
  return [
    SQ2 * (a + c),
    SQ2 * (b + d),
    SQ2 * (a - c),
    SQ2 * (b - d)
  ];
}

// ========================
// STATE DISPLAY
// ========================

function updateStateDisplay(s, animateTime = 600) {
  const ids = ['00','01','10','11'];
  const maxAbs = Math.max(...s.map(Math.abs), 0.001);

  ids.forEach((id, i) => {
    const v = s[i];
    const pct = Math.round(v * v * 100);
    const barPct = Math.abs(v) / maxAbs * 100;

    const bar = document.getElementById('bar' + id);
    const val = document.getElementById('val' + id);
    const prob = document.getElementById('prob' + id);

    bar.className = 'state-bar-fill ' + (v >= 0 ? 'pos' : 'neg');
    bar.style.width = barPct.toFixed(1) + '%';
    val.textContent = v.toFixed(3);
    val.style.color = Math.abs(v) > 0.01 ? (v >= 0 ? 'var(--accent)' : 'var(--warn)') : 'var(--text-dim)';
    prob.textContent = pct + '%';
  });

  // Complex row
  const labels = ['ca','cb','cc','cd'];
  labels.forEach((id, i) => {
    const el = document.getElementById(id);
    const v = s[i];
    el.textContent = v === 0 ? '0' : v.toFixed(3);
    el.parentElement.className = 'complex-val' + (Math.abs(v) > 0.01 ? ' nonzero' : '');
  });
}

// ========================
// BLOCH SPHERE RENDERER
// ========================

class BlochSphere {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.r = this.w * 0.38;
    // Bloch vector: theta (polar), phi (azimuthal)
    this.theta = 0;   // 0 = |0>, pi = |1>, pi/2 = equator
    this.phi = 0;
    this.targetTheta = 0;
    this.targetPhi = 0;
    this.animProgress = 1;
    this.startTheta = 0;
    this.startPhi = 0;
    this.draw();
  }

  setTarget(theta, phi, animDur = 800) {
    this.startTheta = this.theta;
    this.startPhi = this.phi;
    this.targetTheta = theta;
    this.targetPhi = phi;
    this.animProgress = 0;
    this.animDur = animDur;
    this.animStart = performance.now();
  }

  update(now) {
    if (this.animProgress < 1) {
      const t = Math.min((now - this.animStart) / this.animDur, 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      this.theta = this.startTheta + (this.targetTheta - this.startTheta) * ease;
      this.phi = this.startPhi + (this.targetPhi - this.startPhi) * ease;
      this.animProgress = t;
      this.draw();
    }
  }

  draw() {
    const ctx = this.ctx;
    const { cx, cy, r } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    // Sphere shell
    const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Equator ellipse
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Meridian
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.28, r, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.08)';
    ctx.stroke();

    // Axes
    const axes = [
      { dx: 0, dy: -r, label: '|0⟩', col: 'rgba(0,212,255,0.6)' },
      { dx: 0, dy: r, label: '|1⟩', col: 'rgba(0,212,255,0.3)' },
      { dx: r*0.7, dy: r*0.2, label: '|+⟩', col: 'rgba(100,100,200,0.3)' },
    ];
    axes.forEach(ax => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ax.dx, cy + ax.dy);
      ctx.strokeStyle = ax.col;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = ax.col;
      ctx.font = '9px Space Mono, monospace';
      ctx.fillText(ax.label, cx + ax.dx + 3, cy + ax.dy + 4);
    });

    // State vector
    const sinT = Math.sin(this.theta);
    const cosT = Math.cos(this.theta);
    const sinP = Math.sin(this.phi);
    const cosP = Math.cos(this.phi);

    // 3D -> 2D projection (isometric-ish)
    const vx = r * sinT * cosP * 0.7;
    const vy = -r * cosT;
    const vz = r * sinT * sinP * 0.3;

    const ex = cx + vx + vz;
    const ey = cy + vy;

    // Shadow on equator
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + vx + vz, cy);
    ctx.strokeStyle = 'rgba(123,97,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vector arrow
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = '#7b61ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#7b61ff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrowhead
    const ang = Math.atan2(ey - cy, ex - cx);
    const al = 10;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - al * Math.cos(ang - 0.4), ey - al * Math.sin(ang - 0.4));
    ctx.lineTo(ex - al * Math.cos(ang + 0.4), ey - al * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = '#7b61ff';
    ctx.shadowColor = '#7b61ff';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dot at tip
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

const bloch0 = new BlochSphere('bloch0');
const bloch1 = new BlochSphere('bloch1');

// Bloch angles for each step
const blochStates = {
  init:    { q0: [0, 0],          q1: [Math.PI, 0] },        // |0>, |1>
  hadamard:{ q0: [Math.PI/2, 0],  q1: [Math.PI/2, Math.PI] }, // equator
  oracle0: { q0: [Math.PI/2, 0],  q1: [Math.PI/2, Math.PI] },   // constant: no phase change
  oracle1: { q0: [Math.PI/2, Math.PI], q1: [Math.PI/2, Math.PI] }, // constant: global phase
  oraclex: { q0: [Math.PI/2, Math.PI], q1: [Math.PI/2, Math.PI] }, // balanced: phase kick
  oracle1x:{ q0: [Math.PI/2, 0],  q1: [Math.PI/2, Math.PI] }, // balanced
  interfere_const: { q0: [0, 0],       q1: [Math.PI/2, Math.PI] },
  interfere_bal:   { q0: [Math.PI, 0], q1: [Math.PI/2, Math.PI] },
  measure_const:   { q0: [0, 0],       q1: [Math.PI/2, Math.PI] },
  measure_bal:     { q0: [Math.PI, 0], q1: [Math.PI/2, Math.PI] },
};

// Animation loop
function animLoop(now) {
  bloch0.update(now);
  bloch1.update(now);
  requestAnimationFrame(animLoop);
}
requestAnimationFrame(animLoop);

// ========================
// EXPLANATION TEXT
// ========================

const steps = [
    {
      stepLabel: 'Step 0 — Initialization',
      md: `**Two qubits** are prepared: the *input qubit* \\\\(|0\\\\rangle\\\\) and the *ancilla qubit* \\\\(|1\\\\rangle\\\\).
  
  The initial state of the composite system is:
  \\\\[|\\\\psi_0\\\\rangle = |0\\\\rangle \\\\otimes |1\\\\rangle = |01\\\\rangle\\\\]
  
  The ancilla qubit is pre-set to \\\\(|1\\\\rangle\\\\) to enable **phase kickback** in the oracle step.`,
    },
    {
      stepLabel: 'Step 1 — Superposition Creation',
      md: `**Hadamard gates** are applied to *both* qubits simultaneously, creating superposition:
  \\\\[H|0\\\\rangle = \\\\frac{|0\\\\rangle + |1\\\\rangle}{\\\\sqrt{2}}, \\\\quad H|1\\\\rangle = \\\\frac{|0\\\\rangle - |1\\\\rangle}{\\\\sqrt{2}}\\\\]
  
  The full state becomes:
  \\\\[|\\\\psi_1\\\\rangle = \\\\frac{|0\\\\rangle + |1\\\\rangle}{\\\\sqrt{2}} \\\\otimes \\\\frac{|0\\\\rangle - |1\\\\rangle}{\\\\sqrt{2}}\\\\]
  
  The input qubit now encodes **both** \\\\(x=0\\\\) and \\\\(x=1\\\\) simultaneously — this is quantum parallelism.`,
    },
    {
      stepLabel: 'Step 2 — Oracle Evaluation',
      md: `The **oracle** \\\\(U_f\\\\) is applied *once*. It acts as:
  \\\\[U_f|x,y\\\\rangle = |x,\\\\, y \\\\oplus f(x)\\\\rangle\\\\]
  
  Via **phase kickback**, the ancilla \\\\(\\\\frac{|0\\\\rangle-|1\\\\rangle}{\\\\sqrt{2}}\\\\) transforms this into a phase shift:
  \\\\[U_f|x\\\\rangle\\\\otimes|{-}\\\\rangle = (-1)^{f(x)}|x\\\\rangle\\\\otimes|{-}\\\\rangle\\\\]
  
  Information about \\\\(f\\\\) is now encoded as a **phase**, invisible classically but exploitable quantum mechanically.`,
    },
    {
      stepLabel: 'Step 3 — Interference',
      md: `A second **Hadamard** on the input qubit causes *interference*:
  
  - If \\\\(f\\\\) is **constant**: amplitudes add constructively → \\\\(|0\\\\rangle\\\\) is reinforced
  - If \\\\(f\\\\) is **balanced**: amplitudes cancel destructively → \\\\(|1\\\\rangle\\\\) is reinforced
  
  \\\\[H\\\\left[(−1)^{f(0)}|0\\\\rangle + (−1)^{f(1)}|1\\\\rangle\\\\right]\\\\]
  
  The quantum computer **amplifies the correct answer** and cancels the incorrect one.`,
    },
    {
      stepLabel: 'Step 4 — Measurement',
      md: `The **first qubit** is measured in the computational basis:
  
  \\\\[\\\\text{Result } |0\\\\rangle \\\\Rightarrow f \\\\text{ is } \\\\textbf{constant}\\\\]
  \\\\[\\\\text{Result } |1\\\\rangle \\\\Rightarrow f \\\\text{ is } \\\\textbf{balanced}\\\\]
  
  Due to interference, the outcome is **deterministic** — not probabilistic. A classical algorithm would need **2 oracle calls**; Deutsch's algorithm needs only **1**.`,
    },
];

function showExplanation(step) {
  const stepEl = document.getElementById('explainStep');
  const textEl = document.getElementById('explainText');
  stepEl.classList.remove('visible');
  textEl.classList.remove('visible');
  setTimeout(() => {
    stepEl.textContent = steps[step].stepLabel;
    textEl.innerHTML = marked.parse(steps[step].md);
    textEl.classList.add('md-content');
    stepEl.classList.add('visible');
    textEl.classList.add('visible');
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([textEl]).catch(e => console.warn('MathJax error:', e));
    }
  }, 200);
}

// ========================
// GATE HIGHLIGHTING
// ========================

function clearGates() {
  ['g-h1','g-h2','g-h3','g-uf1','g-uf2','g-m1'].forEach(id => {
    const el = document.getElementById(id);
    el.className = el.className.replace(/\bactive-\w+\b|\bdone-\w+\b/g, '').trim();
  });
}

function activateGates(ids, type) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('active-' + type);
  });
}

function doneGates(ids, type) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active-' + type);
    el.classList.add('done-' + type);
  });
}

// ========================
// STEP DOTS
// ========================

function updateDots(activeStep) {
  for (let i = 0; i < 5; i++) {
    const dot = document.getElementById('dot' + i);
    dot.className = 'step-dot';
    if (i < activeStep) dot.classList.add('done');
    else if (i === activeStep) dot.classList.add('active');
  }
}

// ========================
// PARTICLES
// ========================

function spawnParticles(count, color) {
  const container = document.getElementById('particles');
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const x = 20 + Math.random() * 80;
    const y = 20 + Math.random() * 80;
    const dx = (Math.random() - 0.5) * 200;
    const dy = (Math.random() - 0.5) * 200;
    p.style.cssText = `left:${x}%;top:${y}%;background:${color};--tx:translate(${dx}px,${dy}px);animation-delay:${Math.random()*0.3}s;animation-duration:${0.8 + Math.random()*0.7}s`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }
}

// ========================
// MAIN ALGORITHM
// ========================

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runAlgorithm() {
  if (isRunning) return;
  isRunning = true;
  document.getElementById('runBtn').disabled = true;
  document.querySelectorAll('.fn-btn').forEach(b => b.disabled = true);

  const resultPanel = document.getElementById('resultPanel');
  resultPanel.classList.remove('visible');
  clearGates();

  const fn = selectedFn;
  const isConstant = fn === '0' || fn === '1';

  // STEP 0: Init
  state = [0, 1, 0, 0];
  updateStateDisplay(state);
  updateDots(0);
  showExplanation(0);
  bloch0.setTarget(0, 0, 700);
  bloch1.setTarget(Math.PI, 0, 700);
  await delay(4500);

  // STEP 1: Hadamards
  updateDots(1);
  activateGates(['g-h1','g-h3'], 'h');
  showExplanation(1);
  spawnParticles(12, 'var(--accent)');

  await delay(900);
  state = applyH_both(state);
  updateStateDisplay(state);

  bloch0.setTarget(Math.PI/2, 0, 800);
  bloch1.setTarget(Math.PI/2, Math.PI, 800);

  await delay(4500);
  doneGates(['g-h1','g-h3'], 'h');
  await delay(1400);

  // STEP 2: Oracle
  updateDots(2);
  activateGates(['g-uf1','g-uf2'], 'uf');
  showExplanation(2);
  spawnParticles(16, 'var(--accent2)');

  await delay(1000);
  state = applyOracle(state, fn);
  updateStateDisplay(state);

  if (fn === '0') {
    bloch0.setTarget(Math.PI/2, 0, 800);
    bloch1.setTarget(Math.PI/2, Math.PI, 800);
  } else if (fn === '1') {
    bloch0.setTarget(Math.PI/2, Math.PI, 800);
    bloch1.setTarget(Math.PI/2, Math.PI, 800);
  } else if (fn === 'x') {
    bloch0.setTarget(Math.PI/2, Math.PI, 800);
    bloch1.setTarget(Math.PI/2, Math.PI, 800);
  } else {
    bloch0.setTarget(Math.PI/2, 0, 800);
    bloch1.setTarget(Math.PI/2, Math.PI, 800);
  }

  await delay(4000);
  doneGates(['g-uf1','g-uf2'], 'uf');
  await delay(1600);

  // STEP 3: Interference
  updateDots(3);
  activateGates(['g-h2'], 'h');
  showExplanation(3);
  spawnParticles(14, isConstant ? 'var(--accent)' : 'var(--accent2)');

  await delay(1000);
  state = applyH_first(state);
  updateStateDisplay(state);

  if (isConstant) {
    bloch0.setTarget(0, 0, 800);
  } else {
    bloch0.setTarget(Math.PI, 0, 800);
  }

  await delay(4000);
  doneGates(['g-h2'], 'h');
  await delay(1600);

  // STEP 4: Measure
  updateDots(4);
  activateGates(['g-m1'], 'measure');
  showExplanation(4);
  spawnParticles(20, isConstant ? 'var(--accent)' : 'var(--accent2)');

  await delay(3000);

  if (isConstant) {
    const norm = Math.sqrt(state[0]*state[0] + state[1]*state[1]);
    if (norm > 0) state = [state[0]/norm, state[1]/norm, 0, 0];
    else state = [1, 0, 0, 0];
    bloch0.setTarget(0, 0, 500);
  } else {
    const norm = Math.sqrt(state[2]*state[2] + state[3]*state[3]);
    if (norm > 0) state = [0, 0, state[2]/norm, state[3]/norm];
    else state = [0, 0, 1, 0];
    bloch0.setTarget(Math.PI, 0, 500);
  }
  updateStateDisplay(state);

  doneGates(['g-m1'], 'measure');

  await delay(600);

  // Show result
  const rv = document.getElementById('resultValue');
  const rf = document.getElementById('resultFn');

  const fnNames = {'0':'f(x) = 0', '1':'f(x) = 1', 'x':'f(x) = x', '1-x':'f(x) = 1−x'};
  rv.textContent = isConstant ? 'CONSTANT' : 'BALANCED';
  rv.className = 'result-value ' + (isConstant ? 'constant' : 'balanced');
  rf.textContent = 'Your function: ' + fnNames[fn];

  resultPanel.classList.add('visible');
  spawnParticles(30, isConstant ? 'var(--accent)' : 'var(--accent2)');

  isRunning = false;
  document.getElementById('runBtn').disabled = false;
  document.querySelectorAll('.fn-btn').forEach(b => b.disabled = false);
}

// ========================
// UI INTERACTIONS
// ========================

document.querySelectorAll('.fn-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isRunning) return;
    document.querySelectorAll('.fn-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedFn = btn.dataset.fn;

    // Reset to init
    state = [0, 1, 0, 0];
    updateStateDisplay(state);
    clearGates();
    updateDots(-1);
    document.getElementById('resultPanel').classList.remove('visible');

    bloch0.setTarget(0, 0, 400);
    bloch1.setTarget(Math.PI, 0, 400);

    const stepEl = document.getElementById('explainStep');
    const textEl = document.getElementById('explainText');
    stepEl.classList.remove('visible');
    textEl.classList.remove('visible');
    setTimeout(() => {
      stepEl.textContent = 'Ready';
      const isC = selectedFn === '0' || selectedFn === '1';
      const fnLabel = {'0':'f(x)=0','1':'f(x)=1','x':'f(x)=x','1-x':'f(x)=1-x'}[selectedFn];
      const mdText = `**Function selected:** \\\\(${fnLabel}\\\\) — this is a **${isC?'constant':'balanced'}** function.\n\nPress **Run** to watch the quantum computer determine this with a **single oracle call** \\\\(U_f\\\\).`;
      textEl.innerHTML = marked.parse(mdText);
      textEl.classList.add('md-content');
      stepEl.classList.add('visible');
      textEl.classList.add('visible');
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([textEl]).catch(()=>{});
      }
    }, 200);
  });
});

document.getElementById('runBtn').addEventListener('click', runAlgorithm);

// Initialize display
updateStateDisplay(state);
bloch0.draw();
bloch1.draw();

// Show initial explanation + typeset
setTimeout(() => {
  const textEl = document.getElementById('explainText');
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([textEl]).catch(()=>{});
  }
}, 800);

// ========================
// FLOATING GATE TOOLTIPS
// ========================

const gateInfo = {
  h: {
    name: 'Hadamard Gate',
    badge: '\\(H\\)',
    badgeClass: 'badge-h',
    nameColor: 'var(--accent)',
    formulaClass: '',
    formulaLatex: `\\[ H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix}1 & 1\\\\1 & -1\\end{pmatrix} \\]`,
    descMd: `**What it does:** Puts a qubit into equal superposition — like flipping a quantum coin that lands on both heads and tails simultaneously.

**On basis states:**
\\\\[ H|0\\\\rangle = \\\\frac{|0\\\\rangle + |1\\\\rangle}{\\\\sqrt{2}} \\\\quad H|1\\\\rangle = \\\\frac{|0\\\\rangle - |1\\\\rangle}{\\\\sqrt{2}} \\\\]

**Key properties:**
- *Self-inverse*: \\\\(H^2 = I\\\\), so applying H twice returns to the original state
- *Unitary*: \\\\(H^\\dagger H = I\\\\), preserving total probability = 1
- Maps the Z-axis of the Bloch sphere to the X-axis

**In this algorithm:** The first H creates quantum parallelism — the input qubit represents both \\\\(x=0\\\\) and \\\\(x=1\\\\) at once. The second H enables interference to extract the answer.`,
  },
  uf: {
    name: 'Oracle Gate  \\(U_f\\)',
    badge: '\\(U_f\\)',
    badgeClass: 'badge-uf',
    nameColor: 'var(--accent2)',
    formulaClass: 'uf-color',
    formulaLatex: `\\[ U_f|x,y\\rangle = |x,\\; y \\oplus f(x)\\rangle \\]`,
    descMd: `**What it does:** Evaluates the hidden function \\\\(f(x)\\\\) reversibly by XOR-ing its output into an ancilla qubit \\\\(y\\\\).

**Phase kickback trick:** When ancilla \\\\(y = |{-}\\\\rangle = \\\\tfrac{|0\\rangle - |1\\\\rangle}{\\\\sqrt{2}}\\\\), the oracle imprints a *phase* instead of changing a bit:
\\\\[ U_f|x\\\\rangle|{-}\\\\rangle = (-1)^{f(x)}|x\\\\rangle|{-}\\\\rangle \\\\]

**The four oracles:**
- \\\\(f(x)=0\\\\): Identity — no change (constant)
- \\\\(f(x)=1\\\\): Flips ancilla always (constant)
- \\\\(f(x)=x\\\\): CNOT gate — flip ancilla if \\\\(x=1\\\\) (balanced)
- \\\\(f(x)=1{-}x\\\\): flip ancilla if \\\\(x=0\\\\) (balanced)

**Quantum advantage:** One call evaluates *both* \\\\(f(0)\\\\) and \\\\(f(1)\\\\) simultaneously thanks to superposition.`,
  },
  m: {
    name: 'Measurement',
    badge: '\\(M\\)',
    badgeClass: 'badge-m',
    nameColor: 'var(--accent3)',
    formulaClass: 'm-color',
    formulaLatex: `\\[ P(|k\\rangle) = |\\langle k|\\psi\\rangle|^2 \\]`,
    descMd: `**What it does:** Collapses the quantum superposition into a definite classical bit — the irreversible bridge between quantum and classical worlds.

**Born rule:** The probability of outcome \\\\(|k\\\\rangle\\\\) equals the squared amplitude:
\\\\[ P(|0\\\\rangle) = |\\\\alpha|^2 \\\\qquad P(|1\\\\rangle) = |\\\\beta|^2 \\\\]
where \\\\(|\\\\psi\\\\rangle = \\\\alpha|0\\\\rangle + \\\\beta|1\\\\rangle\\\\).

**In the Deutsch algorithm:**
- Measuring **\\\\(|0\\\\rangle\\\\)** → function is **constant** (\\\\(f(0)=f(1)\\\\))
- Measuring **\\\\(|1\\\\rangle\\\\)** → function is **balanced** (\\\\(f(0)\\\\neq f(1)\\\\))

**Why deterministic?** Interference before measurement drives the correct amplitude to ±1 and the wrong amplitude to exactly 0 — no probability, just certainty.`,
  },
};

// Create single reusable tooltip element
const tooltip = document.createElement('div');
tooltip.className = 'gate-tooltip';
tooltip.innerHTML = '<div class="gate-tooltip-inner"><div class="gate-tooltip-name"></div><div class="gate-tooltip-formula"></div><div class="gate-tooltip-desc"></div></div>';
document.body.appendChild(tooltip);

let tooltipTimeout = null;

function positionTooltip(rect) {
  const tw = 380;
  const margin = 12;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
  const spaceBelow = window.innerHeight - rect.bottom;
  const tooltipH = 340; // estimated
  const top = spaceBelow > tooltipH + 20
    ? rect.bottom + 12
    : rect.top - tooltipH - 12;
  tooltip.style.left = left + 'px';
  tooltip.style.top = Math.max(8, top) + 'px';
  tooltip.style.width = tw + 'px';
  const arrowLeft = (rect.left + rect.width / 2) - left;
  const inner = tooltip.querySelector('.gate-tooltip-inner');
  inner.style.setProperty('--arrow-left', arrowLeft + 'px');
}

document.querySelectorAll('.gate[data-gate]').forEach(gate => {
  gate.addEventListener('mouseenter', (e) => {
    clearTimeout(tooltipTimeout);
    const type = gate.dataset.gate;
    const info = gateInfo[type];
    if (!info) return;

    const nameEl = tooltip.querySelector('.gate-tooltip-name');
    nameEl.innerHTML = `<span style="color:${info.nameColor}">${info.name}</span><span class="badge ${info.badgeClass}">${info.badge}</span>`;

    const formulaEl = tooltip.querySelector('.gate-tooltip-formula');
    formulaEl.innerHTML = info.formulaLatex;
    formulaEl.className = 'gate-tooltip-formula ' + info.formulaClass;

    const descEl = tooltip.querySelector('.gate-tooltip-desc');
    descEl.innerHTML = marked.parse(info.descMd);
    descEl.classList.add('md-content');

    const rect = gate.getBoundingClientRect();
    positionTooltip(rect);
    tooltip.classList.add('visible');

    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([tooltip]).catch(e => console.warn('MathJax:', e));
    }
  });

  gate.addEventListener('mouseleave', () => {
    tooltipTimeout = setTimeout(() => tooltip.classList.remove('visible'), 300);
  });

  gate.addEventListener('mousemove', (e) => {
    const rect = gate.getBoundingClientRect();
    positionTooltip(rect);
  });
});