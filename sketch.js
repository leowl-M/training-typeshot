/* ──────────────────────────────────────────────
   TypeShot — p5.js Typography Playground
   ────────────────────────────────────────────── */

const W = 1080;
const H = 1350;

let pg;            // off-screen graphics at full resolution
let seed = 0;
let blocks = [];   // computed text blocks
let fontsReady = false;

// fonts loaded via CSS — we just need to ensure they're available
let fontInter, fontHelvetica, fontPlayfair;

// ── UI references ──
const el = {};
const sliders = [
  ['fontSizeMin', 'fontSizeMinVal'],
  ['fontSizeMax', 'fontSizeMaxVal'],
  ['rotation', 'rotationVal'],
  ['offsetX', 'offsetXVal'],
  ['spacing', 'spacingVal'],
  ['margin', 'marginVal'],
  ['blockPadding', 'blockPaddingVal'],
  ['blockRadius', 'blockRadiusVal'],
  ['animIntensity', 'animIntensityVal'],
  ['animSpeed', 'animSpeedVal'],
  ['frameCount', 'frameCountVal'],
  ['fps', 'fpsVal'],
];

// ── Export state ──
let exporting = false;
let exportFrame = 0;
let exportTotal = 0;

// ── Toast ──
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
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
    'layoutMode', 'textAlign', 'rotation', 'offsetX', 'spacing', 'margin',
    'bgColor', 'bgColorText', 'textColor', 'textColorText',
    'blockBgColor', 'blockBgColorText', 'blockBgEnabled', 'blockPadding',
    'blockShape', 'blockRadius',
    'animationType', 'animIntensity', 'animSpeed',
    'frameCount', 'fps',
    'randomizeBtn', 'savePngBtn', 'saveSeqBtn',
    'infoFrame', 'infoFps',
    'exportOverlay', 'exportProgress', 'exportStatus',
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

  // color sync: picker -> text
  syncColor('bgColor', 'bgColorText');
  syncColor('textColor', 'textColorText');
  syncColor('blockBgColor', 'blockBgColorText');

  // buttons
  el.randomizeBtn.addEventListener('click', () => {
    seed = floor(random(999999));
    toast('Seed: ' + seed);
  });
  el.savePngBtn.addEventListener('click', saveSinglePng);
  el.saveSeqBtn.addEventListener('click', startSequenceExport);

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
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
      picker.value = text.value;
    }
  });
}

function fitCanvas() {
  const stage = document.getElementById('canvas-stage');
  if (!stage) return;
  const stageW = stage.clientWidth - 48;
  const stageH = stage.clientHeight - 48;
  const aspect = W / H;
  let cw, ch;
  if (stageW / stageH > aspect) {
    ch = stageH;
    cw = ch * aspect;
  } else {
    cw = stageW;
    ch = cw / aspect;
  }
  cw = max(100, floor(cw));
  ch = max(100, floor(ch));
  resizeCanvas(cw, ch);
}

// ── Read parameters ──
function getParams() {
  return {
    text: el.textInput.value || '',
    splitMode: el.splitMode.value,
    fontFamily: el.fontFamily.value,
    fontWeight: parseInt(el.fontWeight.value),
    fontSizeMin: parseInt(el.fontSizeMin.value),
    fontSizeMax: parseInt(el.fontSizeMax.value),
    italic: el.italicToggle.checked,
    uppercase: el.uppercaseToggle.checked,
    layoutMode: el.layoutMode.value,
    textAlign: el.textAlign.value,
    rotation: parseFloat(el.rotation.value),
    offsetX: parseInt(el.offsetX.value),
    spacing: parseInt(el.spacing.value),
    margin: parseInt(el.margin.value),
    bgColor: el.bgColor.value,
    textColor: el.textColor.value,
    blockBgColor: el.blockBgColor.value,
    blockBgEnabled: el.blockBgEnabled.checked,
    blockPadding: parseInt(el.blockPadding.value),
    blockShape: el.blockShape.value,
    blockRadius: parseInt(el.blockRadius.value),
    animationType: el.animationType.value,
    animIntensity: parseFloat(el.animIntensity.value),
    animSpeed: parseFloat(el.animSpeed.value),
    frameCount: parseInt(el.frameCount.value),
    fps: parseInt(el.fps.value),
  };
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

    const t = rng.range(0, 1);
    const fontSize = lerp(p.fontSizeMin, p.fontSizeMax, rng.range(0, 1));
    const rot = rng.range(-p.rotation, p.rotation);
    const ox = rng.range(-p.offsetX, p.offsetX);

    result.push({ txt, fontSize, rot, ox, index: i, total: items.length });
  }
  return result;
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

// ── Measure text with pg context ──
function measureText(pg, txt, fontFamily, fontSize, fontWeight, italic) {
  const style = (italic ? 'italic ' : '') + fontWeight + ' ' + fontSize + 'px ' + '"' + fontFamily + '"';
  pg.drawingContext.font = style;
  const metrics = pg.drawingContext.measureText(txt);
  const w = metrics.width;
  const h = fontSize * 1.15;
  return { w, h };
}

// ── Render frame ──
function renderFrame(g, p, t) {
  g.background(p.bgColor);

  const blocks = buildBlocks(p);
  if (blocks.length === 0) return;

  const m = p.margin;
  const usableW = W - m * 2;

  // measure all blocks
  for (const b of blocks) {
    const meas = measureText(g, b.txt, p.fontFamily, b.fontSize, p.fontWeight, p.italic);
    b.w = meas.w;
    b.h = meas.h;
  }

  // layout
  let curY = m;
  const totalTextH = blocks.reduce((s, b) => s + b.h + p.spacing, -p.spacing);

  if (p.layoutMode === 'center') {
    curY = (H - totalTextH) / 2;
  } else if (p.layoutMode === 'stack') {
    curY = m;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    let bx, by;

    if (p.layoutMode === 'scatter') {
      const rng2 = new SeededRandom(seed + i * 7);
      bx = rng2.range(m, W - m - b.w);
      by = rng2.range(m, H - m - b.h);
    } else {
      // stack or center
      by = curY;

      if (p.textAlign === 'left') {
        bx = m + b.ox;
      } else if (p.textAlign === 'right') {
        bx = W - m - b.w + b.ox;
      } else {
        bx = (W - b.w) / 2 + b.ox;
      }

      curY += b.h + p.spacing;
    }

    // animation offsets
    let ax = 0, ay = 0, ar = 0, aAlpha = 255;
    const speed = p.animSpeed;
    const intensity = p.animIntensity;

    if (p.animationType === 'drift') {
      ax = sin(t * speed + i * 0.7) * intensity;
      ay = cos(t * speed * 0.8 + i * 1.1) * intensity * 0.5;
    } else if (p.animationType === 'wave') {
      ay = sin(t * speed + i * 0.5) * intensity;
      ar = sin(t * speed * 0.6 + i * 0.9) * intensity * 0.1;
    } else if (p.animationType === 'typewriter') {
      const progress = constrain((t * speed * 0.3 - i * 0.15), 0, 1);
      const eased = progress < 1 ? 1 - pow(1 - progress, 3) : 1;
      aAlpha = eased * 255;
      ax = (1 - eased) * 40;
    } else if (p.animationType === 'shake') {
      const shakeRng = new SeededRandom(seed + i + floor(t * speed * 10));
      ax = shakeRng.range(-intensity, intensity);
      ay = shakeRng.range(-intensity * 0.5, intensity * 0.5);
    }

    const finalX = bx + ax;
    const finalY = by + ay;
    const finalR = b.rot + ar;

    g.push();
    g.translate(finalX + b.w / 2, finalY + b.h / 2);
    g.rotate(radians(finalR));

    // block background
    if (p.blockBgEnabled) {
      g.noStroke();
      const bgCol = g.color(p.blockBgColor);
      bgCol.setAlpha(aAlpha);
      g.fill(bgCol);

      const pad = p.blockPadding;
      const bw = b.w + pad * 2;
      const bh = b.h + pad * 2;
      const bx0 = -b.w / 2 - pad;
      const by0 = -b.h / 2 - pad;

      // determine shape for this block
      let shape = p.blockShape;
      if (shape === 'auto') {
        // short words (<=3 chars) get circle, medium get pill, long get rounded
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
        const r = max(p.blockRadius, 8);
        g.rect(bx0, by0, bw, bh, r);
      } else {
        // rect
        g.rect(bx0, by0, bw, bh, p.blockRadius);
      }
    }

    // text
    const txtCol = g.color(p.textColor);
    txtCol.setAlpha(aAlpha);
    g.fill(txtCol);
    g.noStroke();

    const style = (p.italic ? 'italic ' : '') + p.fontWeight + ' ' + b.fontSize + 'px ' + '"' + p.fontFamily + '"';
    g.drawingContext.font = style;
    g.drawingContext.textBaseline = 'middle';
    g.drawingContext.fillStyle = g.drawingContext.fillStyle;
    g.drawingContext.fillText(b.txt, -b.w / 2, 0);

    g.pop();
  }
}

// ── p5 draw loop ──
function draw() {
  const p = getParams();

  // update info
  el.infoFrame.textContent = 'Frame: ' + frameCount;
  el.infoFps.textContent = 'FPS: ' + floor(frameRate());

  // time for animation
  const t = frameCount / max(1, p.fps);

  // render to off-screen
  renderFrame(pg, p, t);

  // display scaled
  background(10);
  image(pg, 0, 0, width, height);

  // export sequence
  if (exporting) {
    exportFrame++;
    const progress = exportFrame / exportTotal;
    el.exportProgress.style.width = (progress * 100) + '%';
    el.exportStatus.textContent = exportFrame + ' / ' + exportTotal;

    // save this frame
    pg.save('typeshot_' + nf(exportFrame, 4) + '.png');

    if (exportFrame >= exportTotal) {
      exporting = false;
      el.exportOverlay.classList.remove('active');
      toast('Sequenza salvata: ' + exportTotal + ' frame');
    }
  }
}

// ── Save single PNG ──
function saveSinglePng() {
  pg.save('typeshot.png');
  toast('PNG salvato');
}

// ── Sequence export ──
function startSequenceExport() {
  const p = getParams();
  if (p.animationType === 'none') {
    // just save one frame
    saveSinglePng();
    return;
  }
  exportFrame = 0;
  exportTotal = p.frameCount;
  exporting = true;
  el.exportOverlay.classList.add('active');
  el.exportProgress.style.width = '0%';
  el.exportStatus.textContent = '0 / ' + exportTotal;
  toast('Esportazione sequenza...');
}
