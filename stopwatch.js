/* ========== Stopwatch logic (performance.now) ========== */
const display = document.getElementById('display');
const nowLabel = document.getElementById('nowLabel');
const startBtn = document.getElementById('startBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const lapsList = document.getElementById('lapsList');
const lapCount = document.getElementById('lapCount');
const clearLapsBtn = document.getElementById('clearLaps');
const statusEl = document.getElementById('status');

let running = false;
let startTime = null;
let offset = 0;
let rafId = null;
let laps = []; // newest first: {time, delta}

function formatTime(ms) {
  ms = Math.max(0, Math.floor(ms));
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

function getElapsed() {
  if (running && startTime != null) return offset + (performance.now() - startTime);
  return offset;
}

function render() {
  const elapsed = getElapsed();
  display.textContent = formatTime(elapsed);
  nowLabel && (nowLabel.textContent = new Date().toLocaleString());
  startBtn.textContent = running ? 'Pause' : 'Start';
  startBtn.className = running ? 'btn-pause' : 'btn-start';
  startBtn.setAttribute('aria-pressed', String(running));
  lapBtn.disabled = !running;
  exportBtn.disabled = laps.length === 0;
  statusEl.textContent = running ? 'Running' : 'Paused';
  lapCount.textContent = laps.length;
}

function tick() {
  render();
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (running) return;
  running = true;
  startTime = performance.now();
  rafId = requestAnimationFrame(tick);
  render();
}

function pause() {
  if (!running) return;
  offset = getElapsed();
  running = false;
  startTime = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  render();
}

function toggle() { running ? pause() : start(); }

function resetAll() {
  pause();
  offset = 0;
  laps = [];
  renderLaps();
  render();
}

function recordLap() {
  if (!running) return;
  const now = getElapsed();
  const delta = laps.length ? now - laps[0].time : now;
  laps.unshift({ time: now, delta });
  renderLaps();
  render();
}

function renderLaps() {
  lapsList.innerHTML = '';
  if (!laps.length) {
    const p = document.createElement('div');
    p.className = 'muted small';
    p.textContent = 'No laps yet';
    lapsList.appendChild(p);
    return;
  }
  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    const row = document.createElement('div');
    row.className = 'lap-row';
    const lapNumber = laps.length - i;
    row.innerHTML = `
      <div class="lap-index">#${lapNumber}</div>
      <div class="lap-time">${formatTime(lap.time)}</div>
      <div class="lap-delta">+${formatTime(lap.delta)}</div>
    `;
    lapsList.appendChild(row);
  }
}

function exportCSV() {
  if (!laps.length) return;
  const rows = ['Lap,Total Time,Delta'];
  const rev = [...laps].reverse();
  rev.forEach((lap, idx) => rows.push(`${idx+1},${formatTime(lap.time)},${formatTime(lap.delta)}`));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laps_${new Date().toISOString()}.csv`;
  document.body.appendChild(a); // needed for some browsers
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* wiring */
startBtn.addEventListener('click', toggle);
lapBtn.addEventListener('click', recordLap);
resetBtn.addEventListener('click', resetAll);
clearLapsBtn.addEventListener('click', () => { laps = []; renderLaps(); render(); });
exportBtn.addEventListener('click', exportCSV);

window.addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.key.toLowerCase() === 'l') { e.preventDefault(); if (running) recordLap(); }
  else if (e.key.toLowerCase() === 'r') { e.preventDefault(); resetAll(); }
});

/* initial render */
render();
renderLaps();

/* ========== Particle canvas background (lightweight) ========== */
(function(){
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0.45';
  canvas.style.mixBlendMode = 'screen';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  window.addEventListener('resize', () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; });

  const PARTICLE_COUNT = Math.min(80, Math.floor((w*h)/12000)); // adaptive, capped
  const particles = [];
  let mx = -9999, my = -9999;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 3,
      hue: 180 + Math.random() * 140
    });
  }

  function loop() {
    ctx.clearRect(0,0,w,h);
    for (const p of particles) {
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.max(1, Math.hypot(dx,dy));
      // small influence so effect is subtle
      p.vx += (dx / dist) * 0.0006;
      p.vy += (dy / dist) * 0.0006;
      p.x += p.vx; p.y += p.vy;

      // wrap
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
      g.addColorStop(0, `hsla(${p.hue},80%,70%,0.18)`);
      g.addColorStop(1, `hsla(${p.hue},80%,50%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.r * 8, p.y - p.r * 8, p.r * 16, p.r * 16);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ========== Spotlight (follows mouse) ========== */
(function(){
  const el = document.createElement('div');
  el.className = 'spotlight';
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.zIndex = '0';
  el.style.pointerEvents = 'none';
  el.style.transition = 'background 90ms linear';
  document.body.appendChild(el);

  function update(e){
    const x = (e.clientX / innerWidth) * 100;
    const y = (e.clientY / innerHeight) * 100;
    // smaller, subtle spotlight in center
    el.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.06), rgba(255,255,255,0) 20%)`;
  }
  window.addEventListener('mousemove', update);
  // also update on touch (mobile)
  window.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches[0]) return;
    update(e.touches[0]);
  }, { passive: true });
})();
