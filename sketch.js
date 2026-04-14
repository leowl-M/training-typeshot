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
let recordedFrames = [];   // array of { dataURL, index }

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
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
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

  // cache DOM elements
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

  // slider labels
  sliders.forEach(([sliderId, labelId]) => {
    const s = document.getElementById(sliderId);
    const l = document.getElementById(labelId);
    if (s && l) {
      s.addEventListener('input', () => { l.textContent = s.value; });
    }
  });

  // color sync
  syncColor('bgColor', 'bgColorText');
  syncColor('textColor', 'textColorText');
  syncColor('blockBgColor', 'blockBgColorText');

  // preset buttons
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

  // buttons
  el.randomizeBtn.addEventListener('click', () => {
    seed = floor(random(999999));
    toast('Seed: ' + seed);
  });
  el.savePngBtn.addEventListener('click', saveSinglePng);
  el.recBtn.addEventListener('click', toggleRecording);

  // responsive canvas sizing
  fitCanvas();
  new ResizeObserver(fitCanvas).observe(document.getElementById('canvas-stage'));

  // set initial FPS
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
  const stageW = stage.clientWidth - 48;
  const stageH = stage.clientHeight - 48;
  const aspect = W / H;
  let cw, ch;
  if (stageW / stageH > aspect) { ch = stageH; cw = ch * aspect; }
  else { cw = stageW; ch = cw / aspect; }
  cw = max(100, floor(cw));
  ch = max(100, floor(ch));
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

  const result = [];
  const rng = new SeededRandom(seed);

  for (let i = 0; i < items.length; i++) {
    let txt = items[i];
    if (p.uppercase) txt = txt.toUpperCase();

    rng.next(); // consume one for legacy compat
    const fontSize = lerp(p.fontSizeMin, p.fontSizeMax, rng.range(0, 1));
    const rot = rng.range(-p.rotation, p.rotation);
    const ox = rng.range(-p.offsetX, p.offsetX);
    const oy = rng.range(-p.offsetY, p.offsetY);

    result.push({ txt, fontSize, rot, ox, oy, index: i, total: items.length });
  }
  return result;
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

  // if it already fits, return as-is
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
      // if a single word is wider than maxWidth, still add it (can't break further)
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [txt];
}

// ── Animation system ──
function computeAnimation(type, t, i, total, speed, intensity) {
  let ax = 0, ay = 0, ar = 0, aAlpha = 255, aScale = 1;
  const delay = i * 0.18;

  switch (type) {

    // ── Base ──
    case 'drift':
      ax = sin(t * speed + i * 0.7) * intensity;
      ay = cos(t * speed * 0.8 + i * 1.1) * intensity * 0.5;
      break;

    case 'wave':
      ay = sin(t * speed + i * 0.5) * intensity;
      ar = sin(t * speed * 0.6 + i * 0.9) * intensity * 0.1;
      break;

    case 'shake': {
      const sr = new SeededRandom(seed + i + floor(t * speed * 10));
      ax = sr.range(-intensity, intensity);
      ay = sr.range(-intensity * 0.5, intensity * 0.5);
      break;
    }

    // ── Entrata ──
    case 'typewriter': {
      const prog = constrain(t * speed * 0.3 - delay, 0, 1);
      const e = easeOutCubic(prog);
      aAlpha = e * 255;
      ax = (1 - e) * 40;
      break;
    }

    case 'fade-in': {
      const prog = constrain(t * speed * 0.4 - delay, 0, 1);
      aAlpha = easeOutCubic(prog) * 255;
      break;
    }

    case 'slide-left': {
      const prog = constrain(t * speed * 0.35 - delay, 0, 1);
      const e = easeOutCubic(prog);
      ax = (1 - e) * -(W * 0.3 + intensity * 10);
      aAlpha = e * 255;
      break;
    }

    case 'slide-right': {
      const prog = constrain(t * speed * 0.35 - delay, 0, 1);
      const e = easeOutCubic(prog);
      ax = (1 - e) * (W * 0.3 + intensity * 10);
      aAlpha = e * 255;
      break;
    }

    case 'slide-up': {
      const prog = constrain(t * speed * 0.35 - delay, 0, 1);
      const e = easeOutCubic(prog);
      ay = (1 - e) * (H * 0.2 + intensity * 10);
      aAlpha = e * 255;
      break;
    }

    case 'drop': {
      const prog = constrain(t * speed * 0.35 - delay, 0, 1);
      const e = easeOutBounce(prog);
      ay = (1 - e) * -(200 + intensity * 8);
      aAlpha = min(prog * 4, 1) * 255;
      break;
    }

    case 'scale-in': {
      const prog = constrain(t * speed * 0.35 - delay, 0, 1);
      const e = easeOutBack(prog);
      aScale = e;
      aAlpha = min(prog * 3, 1) * 255;
      break;
    }

    case 'rotate-in': {
      const prog = constrain(t * speed * 0.3 - delay, 0, 1);
      const e = easeOutCubic(prog);
      ar = (1 - e) * (90 + intensity * 2) * (i % 2 === 0 ? 1 : -1);
      aAlpha = e * 255;
      aScale = 0.3 + e * 0.7;
      break;
    }

    // ── Loop ──
    case 'bounce': {
      const phase = (t * speed + i * 0.6) % TWO_PI;
      ay = -abs(sin(phase)) * intensity * 1.5;
      break;
    }

    case 'breathe': {
      const phase = t * speed * 0.8 + i * 0.4;
      aScale = 1 + sin(phase) * intensity * 0.008;
      break;
    }

    case 'swing': {
      const phase = t * speed + i * 0.5;
      ar = sin(phase) * intensity * 0.4;
      break;
    }

    case 'glitch': {
      const gr = new SeededRandom(seed + i + floor(t * speed * 6));
      if (gr.next() > 0.7) {
        ax = gr.range(-intensity * 3, intensity * 3);
        ay = gr.range(-intensity, intensity);
      }
      break;
    }

    case 'elastic': {
      const phase = t * speed + i * 0.7;
      const raw = sin(phase);
      ax = raw * intensity * 1.5;
      aScale = 1 + cos(phase * 1.3) * intensity * 0.005;
      break;
    }

    case 'scramble': {
      const cycle = floor(t * speed * 2);
      const sr = new SeededRandom(seed + i * 13 + cycle);
      ax = sr.range(-intensity * 2, intensity * 2);
      ay = sr.range(-intensity, intensity);
      ar = sr.range(-intensity * 0.3, intensity * 0.3);
      break;
    }
  }

  return { ax, ay, ar, aAlpha, aScale };
}

// ── Render frame ──
function renderFrame(g, p, t) {
  g.background(p.bgColor);

  const blocks = buildBlocks(p);
  if (blocks.length === 0) return;

  const m = p.margin;

  const maxTextW = W - m * 2 - p.blockPadding * 2;

  // measure all blocks, wrap text if needed
  for (const b of blocks) {
    b.lines = wrapText(g, b.txt, p.fontFamily, b.fontSize, p.fontWeight, p.italic, maxTextW);
    const lineH = b.fontSize * 1.15;
    b.lineH = lineH;

    // measure widest line
    setFont(g, p.fontFamily, b.fontSize, p.fontWeight, p.italic);
    let maxW = 0;
    for (const ln of b.lines) {
      const lw = g.drawingContext.measureText(ln).width;
      if (lw > maxW) maxW = lw;
    }
    b.w = maxW;
    b.h = lineH * b.lines.length;
  }

  // layout
  let curY = m;
  const totalTextH = blocks.reduce((s, b) => s + b.h + p.spacing, -p.spacing);

  if (p.layoutMode === 'center') {
    curY = (H - totalTextH) / 2;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    let bx, by;

    if (p.layoutMode === 'scatter') {
      const rng2 = new SeededRandom(seed + i * 7);
      bx = rng2.range(m, W - m - b.w);
      by = rng2.range(m, H - m - b.h);
    } else {
      by = curY + b.oy;

      if (p.textAlign === 'left') bx = m + b.ox;
      else if (p.textAlign === 'right') bx = W - m - b.w + b.ox;
      else bx = (W - b.w) / 2 + b.ox;

      curY += b.h + p.spacing;
    }

    // animation
    const anim = computeAnimation(
      p.animationType, t, i, blocks.length,
      p.animSpeed, p.animIntensity
    );

    const finalX = bx + anim.ax;
    const finalY = by + anim.ay;
    const finalR = b.rot + anim.ar;

    g.push();
    g.translate(finalX + b.w / 2, finalY + b.h / 2);
    g.rotate(radians(finalR));
    if (anim.aScale !== 1) g.scale(anim.aScale);

    // block background
    if (p.blockBgEnabled) {
      g.noStroke();
      const bgCol = g.color(p.blockBgColor);
      bgCol.setAlpha(anim.aAlpha);
      g.fill(bgCol);

      const pad = p.blockPadding;
      const bw = b.w + pad * 2;
      const bh = b.h + pad * 2;
      const bx0 = -b.w / 2 - pad;
      const by0 = -b.h / 2 - pad;

      let shape = p.blockShape;
      if (shape === 'auto') {
        shape = b.txt.length <= 3 ? 'circle' : (b.txt.length <= 6 ? 'pill' : 'rounded');
      } else if (shape === 'random') {
        const shapeRng = new SeededRandom(seed + i * 31);
        const shapes = ['rect', 'rounded', 'pill', 'circle'];
        shape = shapes[floor(shapeRng.range(0, shapes.length - 0.01))];
      }

      if (shape === 'circle') {
        const diameter = max(bw, bh);
        g.ellipse(0, 0, diameter, diameter);
      } else if (shape === 'pill') {
        g.rect(bx0, by0, bw, bh, bh / 2);
      } else if (shape === 'rounded') {
        g.rect(bx0, by0, bw, bh, max(p.blockRadius, 8));
      } else {
        g.rect(bx0, by0, bw, bh, p.blockRadius);
      }
    }

    // text
    const txtCol = g.color(p.textColor);
    txtCol.setAlpha(anim.aAlpha);
    g.fill(txtCol);
    g.noStroke();

    setFont(g, p.fontFamily, b.fontSize, p.fontWeight, p.italic);
    g.drawingContext.textBaseline = 'middle';
    g.drawingContext.fillStyle = g.drawingContext.fillStyle;

    // render each wrapped line
    const totalLinesH = b.lineH * b.lines.length;
    for (let li = 0; li < b.lines.length; li++) {
      const ly = -totalLinesH / 2 + b.lineH * li + b.lineH / 2;
      g.drawingContext.fillText(b.lines[li], -b.w / 2, ly);
    }

    g.pop();
  }
}

// ── p5 draw loop ──
function draw() {
  const p = getParams();

  el.infoFrame.textContent = 'Frame: ' + frameCount;
  el.infoFps.textContent = 'FPS: ' + floor(frameRate());

  const t = frameCount / max(1, p.fps);

  renderFrame(pg, p, t);

  background(10);
  image(pg, 0, 0, width, height);

  // capture frame if recording
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

// ── Record / Stop toggle ──
function toggleRecording() {
  if (!recording) {
    // start recording
    recording = true;
    recordedFrames = [];
    el.recLabel.textContent = 'Stop';
    el.recBtn.classList.remove('bg-white', 'text-black', 'hover:bg-neutral-200');
    el.recBtn.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
    el.recIndicator.classList.remove('hidden');
    toast('Registrazione avviata');
  } else {
    // stop recording
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
}

// ── Build ZIP and trigger download ──
async function buildAndDownloadZip(frames) {
  el.exportOverlay.classList.add('active');
  el.exportTitle.textContent = 'Preparazione ZIP...';
  el.exportProgress.style.width = '0%';
  el.exportStatus.textContent = '0 / ' + frames.length;

  const zip = new JSZip();
  const folder = zip.folder('typeshot_sequence');

  for (let i = 0; i < frames.length; i++) {
    const dataUrl = frames[i];
    const base64 = dataUrl.split(',')[1];
    folder.file('frame_' + String(i + 1).padStart(5, '0') + '.png', base64, { base64: true });

    const progress = (i + 1) / frames.length;
    el.exportProgress.style.width = (progress * 50) + '%'; // first 50% is adding files
    el.exportStatus.textContent = (i + 1) + ' / ' + frames.length;

    // yield to keep UI responsive
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
  }

  el.exportTitle.textContent = 'Compressione ZIP...';
  el.exportProgress.style.width = '50%';

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
    (meta) => {
      el.exportProgress.style.width = (50 + meta.percent * 0.5) + '%';
    }
  );

  // trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'typeshot_sequence_' + frames.length + 'f.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // cleanup
  el.exportOverlay.classList.remove('active');
  toast('ZIP scaricato: ' + frames.length + ' frame');

  // free memory
  recordedFrames = [];
}
