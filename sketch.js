/* ──────────────────────────────────────────────
   TypeShot — p5.js Typography Playground
   ────────────────────────────────────────────── */

const W = 1080;
const H = 1350;

let pg;
let seed = 0;

// ── UI references ──
const el = {};
const sliders = [
  ['fontSizeMin', 'fontSizeMinVal'],
  ['fontSizeMax', 'fontSizeMaxVal'],
  ['rotation', 'rotationVal'],
  ['offsetX', 'offsetXVal'],
  ['offsetY', 'offsetYVal'],
  ['spacing', 'spacingVal'],
  ['margin', 'marginVal'],
  ['blockPadding', 'blockPaddingVal'],
  ['blockRadius', 'blockRadiusVal'],
  ['animIntensity', 'animIntensityVal'],
  ['animSpeed', 'animSpeedVal'],
  ['fps', 'fpsVal'],
];

// ── Color presets ──
const PRESETS = {
  rosso:     { bg: '#e63312', text: '#1a1a1a', block: '#f5f0e8', blockOn: true },
  blu:       { bg: '#e8dcc8', text: '#0000cc', block: '#ffffff', blockOn: true },
  nero:      { bg: '#d4d0c8', text: '#1a1a1a', block: '#ffffff', blockOn: true },
  arancio:   { bg: '#e63312', text: '#1a1a1a', block: '#b8a44c', blockOn: true },
  bianco:    { bg: '#ffffff', text: '#0a0a0a', block: '#f0f0f0', blockOn: false },
  neon:      { bg: '#0a0a0a', text: '#39ff14', block: '#1a1a1a', blockOn: false },
  sunset:    { bg: '#ff6b35', text: '#fef3c7', block: '#c44d1a', blockOn: true },
  ocean:     { bg: '#1e3a5f', text: '#f0f4f8', block: '#15294a', blockOn: false },
  brutalist: { bg: '#ffe600', text: '#0a0a0a', block: '#ffffff', blockOn: true },
  lavanda:   { bg: '#e8daf5', text: '#2d1b4e', block: '#ffffff', blockOn: true },
};

// ── Recording state ──
let recording = false;
let recordedFrames = [];

// ── Toast ──
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Easing helpers ──
function easeOutCubic(x)   { return 1 - pow(1 - x, 3); }
function easeOutElastic(x) {
  if (x === 0 || x === 1) return x;
  return pow(2, -10 * x) * sin((x * 10 - 0.75) * (TWO_PI / 3)) + 1;
}
function easeOutBounce(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1)     return n1 * x * x;
  if (x < 2 / d1)     return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1)   return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2);
}

// ── p5.js setup ──
function setup() {
  const wrap = document.getElementById('canvasWrap');
  const cvs = createCanvas(10, 10);
  cvs.parent(wrap);
  pixelDensity(1);

  pg = createGraphics(W, H);
  pg.pixelDensity(1);

  seed = floor(random(999999));

  const ids = [
    'textInput', 'splitMode', 'fontFamily', 'fontWeight',
    'fontSizeMin', 'fontSizeMax', 'italicToggle', 'uppercaseToggle',
    'layoutMode', 'textAlign', 'rotation', 'offsetX', 'offsetY', 'spacing', 'margin',
    'bgColor', 'bgColorText', 'textColor', 'textColorText',
    'blockBgColor', 'blockBgColorText', 'blockBgEnabled', 'blockPadding',
    'blockShape', 'blockRadius',
    'animationType', 'animIntensity', 'animSpeed',
    'fps',
    'randomizeBtn', 'savePngBtn', 'recBtn', 'recLabel', 'recIcon', 'recIndicator',
    'infoFrame', 'infoFps',
    'exportOverlay', 'exportProgress', 'exportStatus', 'exportTitle',
  ];
  ids.forEach(id => el[id] = document.getElementById(id));

  sliders.forEach(([sliderId, labelId]) => {
    const s = document.getElementById(sliderId);
    const l = document.getElementById(labelId);
    if (s && l) s.addEventListener('input', () => { l.textContent = s.value; });
  });

  syncColor('bgColor', 'bgColorText');
  syncColor('textColor', 'textColorText');
  syncColor('blockBgColor', 'blockBgColorText');

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      setColor('bgColor', 'bgColorText', p.bg);
      setColor('textColor', 'textColorText', p.text);
      setColor('blockBgColor', 'blockBgColorText', p.block);
      el.blockBgEnabled.checked = p.blockOn;
    });
  });

  el.randomizeBtn.addEventListener('click', () => {
    seed = floor(random(999999));
    toast('Seed: ' + seed);
  });
  el.savePngBtn.addEventListener('click', saveSinglePng);
  el.recBtn.addEventListener('click', toggleRecording);

  fitCanvas();
  new ResizeObserver(fitCanvas).observe(document.getElementById('canvas-stage'));

  frameRate(parseInt(el.fps.value) || 24);
  el.fps.addEventListener('input', () => {
    frameRate(parseInt(el.fps.value) || 24);
  });
}

function syncColor(pickerId, textId) {
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  picker.addEventListener('input', () => { text.value = picker.value; });
  text.addEventListener('change', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
  });
}

function setColor(pickerId, textId, hex) {
  document.getElementById(pickerId).value = hex;
  document.getElementById(textId).value = hex;
}

function fitCanvas() {
  const stage = document.getElementById('canvas-stage');
  if (!stage) return;
  const sw = stage.clientWidth - 48;
  const sh = stage.clientHeight - 48;
  const aspect = W / H;
  const cw = sw / sh > aspect ? floor(max(100, sh * aspect)) : floor(max(100, sw));
  const ch = sw / sh > aspect ? floor(max(100, sh))          : floor(max(100, sw / aspect));
  resizeCanvas(cw, ch);
}

// ── Read parameters ──
function getParams() {
  return {
    text:           el.textInput.value || '',
    splitMode:      el.splitMode.value,
    fontFamily:     el.fontFamily.value,
    fontWeight:     parseInt(el.fontWeight.value),
    fontSizeMin:    parseInt(el.fontSizeMin.value),
    fontSizeMax:    parseInt(el.fontSizeMax.value),
    italic:         el.italicToggle.checked,
    uppercase:      el.uppercaseToggle.checked,
    layoutMode:     el.layoutMode.value,
    textAlign:      el.textAlign.value,
    rotation:       parseFloat(el.rotation.value),
    offsetX:        parseInt(el.offsetX.value),
    offsetY:        parseInt(el.offsetY.value),
    spacing:        parseInt(el.spacing.value),
    margin:         parseInt(el.margin.value),
    bgColor:        el.bgColor.value,
    textColor:      el.textColor.value,
    blockBgColor:   el.blockBgColor.value,
    blockBgEnabled: el.blockBgEnabled.checked,
    blockPadding:   parseInt(el.blockPadding.value),
    blockShape:     el.blockShape.value,
    blockRadius:    parseInt(el.blockRadius.value),
    animationType:  el.animationType.value,
    animIntensity:  parseFloat(el.animIntensity.value),
    animSpeed:      parseFloat(el.animSpeed.value),
    fps:            parseInt(el.fps.value),
  };
}

// ── Seeded RNG ──
class SeededRandom {
  constructor(s) { this.s = s; }
  next() {
    this.s = (this.s * 16807 + 0) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(a, b) { return a + (b - a) * this.next(); }
}

// ── Build text blocks ──
function buildBlocks(p) {
  const items = p.splitMode === 'word'
    ? p.text.split(/\s+/).filter(s => s.length > 0)
    : p.text.split('\n').filter(s => s.trim().length > 0);

  if (items.length === 0) return [];

  const rng = new SeededRandom(seed);
  return items.map((txt, i) => {
    if (p.uppercase) txt = txt.toUpperCase();
    rng.next(); // consume one for legacy compat
    return {
      txt,
      fontSize: lerp(p.fontSizeMin, p.fontSizeMax, rng.range(0, 1)),
      rot:      rng.range(-p.rotation, p.rotation),
      ox:       rng.range(-p.offsetX, p.offsetX),
      oy:       rng.range(-p.offsetY, p.offsetY),
      index:    i,
      total:    items.length,
    };
  });
}

// ── Measure text ──
function setFont(g, fontFamily, fontSize, fontWeight, italic) {
  const style = (italic ? 'italic ' : '') + fontWeight + ' ' + fontSize + 'px "' + fontFamily + '"';
  g.drawingContext.font = style;
  return style;
}

function measureText(g, txt, fontFamily, fontSize, fontWeight, italic) {
  setFont(g, fontFamily, fontSize, fontWeight, italic);
  const metrics = g.drawingContext.measureText(txt);
  return { w: metrics.width, h: fontSize * 1.15 };
}

// ── Word-wrap a string to fit maxWidth ──
function wrapText(g, txt, fontFamily, fontSize, fontWeight, italic, maxWidth) {
  setFont(g, fontFamily, fontSize, fontWeight, italic);
  const ctx = g.drawingContext;

  if (ctx.measureText(txt).width <= maxWidth) return [txt];

  const words = txt.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [txt];
}

// ── Animation system ──
const ANIM_DEFAULTS = { ax: 0, ay: 0, ar: 0, aAlpha: 255, aScale: 1 };

const ANIM_HANDLERS = {
  drift: (t, i, speed, intensity) => ({
    ax: sin(t * speed + i * 0.7) * intensity,
    ay: cos(t * speed * 0.8 + i * 1.1) * intensity * 0.5,
  }),

  wave: (t, i, speed, intensity) => ({
    ay: sin(t * speed + i * 0.5) * intensity,
    ar: sin(t * speed * 0.6 + i * 0.9) * intensity * 0.1,
  }),

  shake: (t, i, speed, intensity) => {
    const sr = new SeededRandom(seed + i + floor(t * speed * 10));
    return { ax: sr.range(-intensity, intensity), ay: sr.range(-intensity * 0.5, intensity * 0.5) };
  },

  typewriter: (t, i, speed) => {
    const prog = constrain(t * speed * 0.3 - i * 0.18, 0, 1);
    const e = easeOutCubic(prog);
    return { aAlpha: e * 255, ax: (1 - e) * 40 };
  },

  'fade-in': (t, i, speed) => {
    const prog = constrain(t * speed * 0.4 - i * 0.18, 0, 1);
    return { aAlpha: easeOutCubic(prog) * 255 };
  },

  'slide-left': (t, i, speed, intensity) => {
    const prog = constrain(t * speed * 0.35 - i * 0.18, 0, 1);
    const e = easeOutCubic(prog);
    return { ax: (1 - e) * -(W * 0.3 + intensity * 10), aAlpha: e * 255 };
  },

  'slide-right': (t, i, speed, intensity) => {
    const prog = constrain(t * speed * 0.35 - i * 0.18, 0, 1);
    const e = easeOutCubic(prog);
    return { ax: (1 - e) * (W * 0.3 + intensity * 10), aAlpha: e * 255 };
  },

  'slide-up': (t, i, speed, intensity) => {
    const prog = constrain(t * speed * 0.35 - i * 0.18, 0, 1);
    const e = easeOutCubic(prog);
    return { ay: (1 - e) * (H * 0.2 + intensity * 10), aAlpha: e * 255 };
  },

  drop: (t, i, speed, intensity) => {
    const prog = constrain(t * speed * 0.35 - i * 0.18, 0, 1);
    const e = easeOutBounce(prog);
    return { ay: (1 - e) * -(200 + intensity * 8), aAlpha: min(prog * 4, 1) * 255 };
  },

  'scale-in': (t, i, speed) => {
    const prog = constrain(t * speed * 0.35 - i * 0.18, 0, 1);
    const e = easeOutBack(prog);
    return { aScale: e, aAlpha: min(prog * 3, 1) * 255 };
  },

  'rotate-in': (t, i, speed, intensity) => {
    const prog = constrain(t * speed * 0.3 - i * 0.18, 0, 1);
    const e = easeOutCubic(prog);
    return {
      ar:     (1 - e) * (90 + intensity * 2) * (i % 2 === 0 ? 1 : -1),
      aAlpha: e * 255,
      aScale: 0.3 + e * 0.7,
    };
  },

  bounce: (t, i, speed, intensity) => ({
    ay: -abs(sin((t * speed + i * 0.6) % TWO_PI)) * intensity * 1.5,
  }),

  breathe: (t, i, speed, intensity) => ({
    aScale: 1 + sin(t * speed * 0.8 + i * 0.4) * intensity * 0.008,
  }),

  swing: (t, i, speed, intensity) => ({
    ar: sin(t * speed + i * 0.5) * intensity * 0.4,
  }),

  glitch: (t, i, speed, intensity) => {
    const gr = new SeededRandom(seed + i + floor(t * speed * 6));
    if (gr.next() > 0.7) {
      return { ax: gr.range(-intensity * 3, intensity * 3), ay: gr.range(-intensity, intensity) };
    }
    return {};
  },

  elastic: (t, i, speed, intensity) => {
    const phase = t * speed + i * 0.7;
    return { ax: sin(phase) * intensity * 1.5, aScale: 1 + cos(phase * 1.3) * intensity * 0.005 };
  },

  scramble: (t, i, speed, intensity) => {
    const sr = new SeededRandom(seed + i * 13 + floor(t * speed * 2));
    return {
      ax: sr.range(-intensity * 2, intensity * 2),
      ay: sr.range(-intensity, intensity),
      ar: sr.range(-intensity * 0.3, intensity * 0.3),
    };
  },
};

function computeAnimation(type, t, i, total, speed, intensity) {
  const handler = ANIM_HANDLERS[type];
  return { ...ANIM_DEFAULTS, ...(handler ? handler(t, i, speed, intensity, total) : {}) };
}

// ── Measure all blocks in-place ──
function measureBlocks(g, blocks, p) {
  const maxTextW = W - p.margin * 2 - p.blockPadding * 2;
  for (const b of blocks) {
    b.lines = wrapText(g, b.txt, p.fontFamily, b.fontSize, p.fontWeight, p.italic, maxTextW);
    b.lineH = b.fontSize * 1.15;
    setFont(g, p.fontFamily, b.fontSize, p.fontWeight, p.italic);
    let maxW = 0;
    for (const ln of b.lines) {
      const lw = g.drawingContext.measureText(ln).width;
      if (lw > maxW) maxW = lw;
    }
    b.w = maxW;
    b.h = b.lineH * b.lines.length;
  }
}

// ── Compute (bx, by) position for each block ──
function computeBlockPositions(blocks, p) {
  const m = p.margin;
  const totalTextH = blocks.reduce((s, b) => s + b.h + p.spacing, -p.spacing);
  let curY = p.layoutMode === 'center' ? (H - totalTextH) / 2 : m;

  return blocks.map((b, i) => {
    if (p.layoutMode === 'scatter') {
      const rng2 = new SeededRandom(seed + i * 7);
      return { bx: rng2.range(m, W - m - b.w), by: rng2.range(m, H - m - b.h) };
    }

    const by = curY + b.oy;
    let bx;
    if      (p.textAlign === 'left')  bx = m + b.ox;
    else if (p.textAlign === 'right') bx = W - m - b.w + b.ox;
    else                              bx = (W - b.w) / 2 + b.ox;

    curY += b.h + p.spacing;
    return { bx, by };
  });
}

// ── Resolve block background shape ──
function resolveBlockShape(shape, txt, i) {
  if (shape === 'auto') {
    return txt.length <= 3 ? 'circle' : txt.length <= 6 ? 'pill' : 'rounded';
  }
  if (shape === 'random') {
    const shapes = ['rect', 'rounded', 'pill', 'circle'];
    return shapes[floor(new SeededRandom(seed + i * 31).range(0, shapes.length - 0.01))];
  }
  return shape;
}

// ── Draw block background ──
function drawBlockBg(g, b, anim, p, i) {
  g.noStroke();
  const bgCol = g.color(p.blockBgColor);
  bgCol.setAlpha(anim.aAlpha);
  g.fill(bgCol);

  const pad = p.blockPadding;
  const bw  = b.w + pad * 2;
  const bh  = b.h + pad * 2;
  const bx0 = -b.w / 2 - pad;
  const by0 = -b.h / 2 - pad;
  const shape = resolveBlockShape(p.blockShape, b.txt, i);

  if      (shape === 'circle')  g.ellipse(0, 0, max(bw, bh), max(bw, bh));
  else if (shape === 'pill')    g.rect(bx0, by0, bw, bh, bh / 2);
  else if (shape === 'rounded') g.rect(bx0, by0, bw, bh, max(p.blockRadius, 8));
  else                          g.rect(bx0, by0, bw, bh, p.blockRadius);
}

// ── Draw block text lines ──
function drawBlockText(g, b, anim, p) {
  const txtCol = g.color(p.textColor);
  txtCol.setAlpha(anim.aAlpha);
  g.fill(txtCol);
  g.noStroke();
  setFont(g, p.fontFamily, b.fontSize, p.fontWeight, p.italic);
  g.drawingContext.textBaseline = 'middle';
  g.drawingContext.fillStyle = g.drawingContext.fillStyle;

  const totalLinesH = b.lineH * b.lines.length;
  for (let li = 0; li < b.lines.length; li++) {
    const ly = -totalLinesH / 2 + b.lineH * li + b.lineH / 2;
    g.drawingContext.fillText(b.lines[li], -b.w / 2, ly);
  }
}

// ── Render frame ──
function renderFrame(g, p, t) {
  g.background(p.bgColor);

  const blocks = buildBlocks(p);
  if (blocks.length === 0) return;

  measureBlocks(g, blocks, p);
  const positions = computeBlockPositions(blocks, p);

  for (let i = 0; i < blocks.length; i++) {
    const b    = blocks[i];
    const { bx, by } = positions[i];
    const anim = computeAnimation(p.animationType, t, i, blocks.length, p.animSpeed, p.animIntensity);

    g.push();
    g.translate(bx + anim.ax + b.w / 2, by + anim.ay + b.h / 2);
    g.rotate(radians(b.rot + anim.ar));
    if (anim.aScale !== 1) g.scale(anim.aScale);

    if (p.blockBgEnabled) drawBlockBg(g, b, anim, p, i);
    drawBlockText(g, b, anim, p);
    g.pop();
  }
}

// ── p5 draw loop ──
function draw() {
  const p = getParams();

  el.infoFrame.textContent = 'Frame: ' + frameCount;
  el.infoFps.textContent   = 'FPS: ' + floor(frameRate());

  renderFrame(pg, p, frameCount / max(1, p.fps));

  background(10);
  image(pg, 0, 0, width, height);

  if (recording) {
    const canvas = pg.elt || pg.canvas;
    recordedFrames.push(canvas.toDataURL('image/png'));
  }
}

// ── Save single PNG ──
function saveSinglePng() {
  pg.save('typeshot.png');
  toast('PNG salvato');
}

// ── Recording control ──
function startRecording() {
  recording = true;
  recordedFrames = [];
  el.recLabel.textContent = 'Stop';
  el.recBtn.classList.remove('bg-white', 'text-black', 'hover:bg-neutral-200');
  el.recBtn.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
  el.recIndicator.classList.remove('hidden');
  toast('Registrazione avviata');
}

function stopRecording() {
  recording = false;
  el.recLabel.textContent = 'Registra';
  el.recBtn.classList.remove('bg-red-600', 'text-white', 'hover:bg-red-700');
  el.recBtn.classList.add('bg-white', 'text-black', 'hover:bg-neutral-200');
  el.recIndicator.classList.add('hidden');

  if (recordedFrames.length === 0) {
    toast('Nessun frame registrato');
    return;
  }

  toast('Registrati ' + recordedFrames.length + ' frame — preparazione ZIP...');
  buildAndDownloadZip(recordedFrames);
}

function toggleRecording() {
  if (recording) stopRecording();
  else           startRecording();
}

// ── Build ZIP and trigger download ──
async function buildAndDownloadZip(frames) {
  el.exportOverlay.classList.add('active');
  el.exportTitle.textContent    = 'Preparazione ZIP...';
  el.exportProgress.style.width = '0%';
  el.exportStatus.textContent   = '0 / ' + frames.length;

  const zip    = new JSZip();
  const folder = zip.folder('typeshot_sequence');

  for (let i = 0; i < frames.length; i++) {
    const base64 = frames[i].split(',')[1];
    folder.file('frame_' + String(i + 1).padStart(5, '0') + '.png', base64, { base64: true });

    el.exportProgress.style.width = ((i + 1) / frames.length * 50) + '%';
    el.exportStatus.textContent   = (i + 1) + ' / ' + frames.length;

    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  el.exportTitle.textContent    = 'Compressione ZIP...';
  el.exportProgress.style.width = '50%';

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
    (meta) => { el.exportProgress.style.width = (50 + meta.percent * 0.5) + '%'; }
  );

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'typeshot_sequence_' + frames.length + 'f.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  el.exportOverlay.classList.remove('active');
  toast('ZIP scaricato: ' + frames.length + ' frame');
  recordedFrames = [];
}
