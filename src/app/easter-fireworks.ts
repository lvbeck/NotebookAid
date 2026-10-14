/** Small, silent particle bursts; this module is imported only for an explicit celebration. */
export function fireworks(host: HTMLElement, done: () => void): () => void {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
  const context = canvas.getContext('2d'); if (!context) { canvas.remove(); done(); return () => {}; }
  const width = host.clientWidth, height = host.clientHeight, ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = width * ratio; canvas.height = height * ratio; context.scale(ratio, ratio);
  const accent = getComputedStyle(host).getPropertyValue('--accent').trim() || '#7460c9';
  const colors = [accent, '#92a8ba', '#9aa99b', '#c3b397'];
  type Particle = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string };
  let particles: Particle[] = [], frame = 0, ended = false, previous = performance.now(), start = previous, lastBurst = -700;
  const cancel = () => { ended = true; cancelAnimationFrame(frame); particles = []; canvas.remove(); };
  const draw = (now: number) => {
    if (ended) return;
    const elapsed = now - start, delta = Math.min(now - previous, 34); previous = now;
    if (elapsed >= 4100 || document.hidden) { cancel(); done(); return; }
    if (elapsed < 3000 && elapsed - lastBurst >= 620) {
      lastBurst = elapsed; const x = width * (.2 + Math.random() * .6), y = height * (.3 + Math.random() * .3);
      for (let i = 0; i < 26 && particles.length < 110; i++) { const angle = Math.PI * 2 * i / 26, speed = 1.2 + Math.random(); particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 1100 + Math.random() * 400, color: colors[i % colors.length]! }); }
    }
    context.clearRect(0, 0, width, height);
    particles = particles.filter(p => p.age < p.life);
    for (const p of particles) { p.age += delta; p.x += p.vx * delta / 16; p.y += p.vy * delta / 16; p.vy += .025 * delta / 16; context.globalAlpha = .7 * Math.max(0, 1 - p.age / p.life); context.fillStyle = p.color; context.beginPath(); context.arc(p.x, p.y, 2, 0, Math.PI * 2); context.fill(); }
    context.globalAlpha = 1; frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw); return cancel;
}
