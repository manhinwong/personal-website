/* ============================================================
   Marcus Island — RENDERER
   ------------------------------------------------------------
   Draws whatever layout.js produced. It never invents a position:
   every collider, trigger and building comes from LAYOUT, which
   validate.js has already proven legal. Press ` for the dev
   overlay to see collision radii and interact zones in-world.
   ============================================================ */
/* canvas textures are drawn once at boot, so the web fonts must be ready first
   or every sign bakes in the fallback face */
Promise.all([
  document.fonts.load('700 40px "DM Sans"'),
  document.fonts.load('40px "DM Serif Display"'),
  document.fonts.load('500 20px "JetBrains Mono"'),
]).catch(() => {}).then(function () {
'use strict';

const LAYOUT = buildLayout(PROJECTS);
const CFGL = LAYOUT.cfg;

/* ============================== copy ============================== */
const loc = (s) => s || '';
const UI = {
  read: 'Read', talk: 'Talk', open: 'Open', check: 'Visit', close: 'Close',
  directoryTitle: 'Project Directory',
  soundOn: '🔊 Sound', soundOff: '🔇 Muted',
};
const ACCENT = 0xc7572e, INK = 0x1a1a18;

/* ============================ DOM refs ============================ */
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const splash = $('splash'), hint = $('hud-hint'), dialogEl = $('dialog');
const dName = dialogEl.querySelector('.name'), dText = dialogEl.querySelector('.text');
const dActions = dialogEl.querySelector('.actions'), dMore = dialogEl.querySelector('.more'), dPager = dialogEl.querySelector('.pager');
const dirEl = $('directory'), dirList = dirEl.querySelector('.list');
const muteBtn = $('hud-mute'), devhud = $('devhud');

/* ============================== audio ============================== */
const AudioSys = (() => {
  let ctx = null, master = null, muted = false, timer = null;
  const ensure = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.13; master.connect(ctx.destination);
  };
  const tone = (f, dur, type, vol, when = 0, slide = 0) => {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
  const MELODY = [0, 2, 4, 3, 5, 4, 2, 1, 0, 2, 3, 4, 7, 5, 4, 2];
  let step = 0;
  return {
    startMusic() {
      ensure(); if (timer) return;
      timer = setInterval(() => {
        if (muted) return;
        const n = MELODY[step % MELODY.length];
        if (step % 2 === 0) tone(SCALE[n], 0.5, 'triangle', 0.15);
        if (step % 4 === 0) tone(SCALE[0] / 2, 1.4, 'sine', 0.09);
        if (step % 8 === 4) tone(SCALE[(n + 2) % 8] * 2, 0.3, 'sine', 0.05);
        step++;
      }, 350);
    },
    blip() { ensure(); tone(280 + Math.random() * 260, 0.055, 'square', 0.026, 0, 120); },
    chime() { ensure(); tone(660, 0.14, 'triangle', 0.09); tone(880, 0.18, 'triangle', 0.07, 0.07); },
    setMuted(m) { muted = m; muteBtn.textContent = loc(m ? UI.soundOff : UI.soundOn); },
    get muted() { return muted; },
  };
})();
muteBtn.addEventListener('click', () => AudioSys.setMuted(!AudioSys.muted));

/* ============================== three ============================== */
const scene = new THREE.Scene();
const SKY = 0xbfe6f5, SEA = 0x4aa8c9, SEA_DEEP = 0x2d7fa0;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 90, 200);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 520);
const OUT_CAM = { dist: 30, pitch: 0.82 };
const PITCH_MIN = 0.10, PITCH_MAX = 1.45;
let camDist = OUT_CAM.dist, camPitch = OUT_CAM.pitch, camYaw = 0;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.HemisphereLight(0xfff6e6, 0x86b98a, 0.72));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.position.set(-40, 70, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
sun.shadow.camera.far = 240;
sun.shadow.bias = -0.0006;
scene.add(sun);

/* ---------------- materials ---------------- */
const matCache = new Map();
function M(color, opts) {
  const key = color + '|' + JSON.stringify(opts || {});
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  m.color.convertSRGBToLinear();
  if (m.emissive) m.emissive.convertSRGBToLinear();
  matCache.set(key, m);
  return m;
}
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const shadowed = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

function makeTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const FD = '"DM Sans","Trebuchet MS",sans-serif';
const FS = '"DM Serif Display",Georgia,serif';
const FM = '"JetBrains Mono",Menlo,monospace';
function fitText(ctx, text, font, maxW) {
  let size = parseInt(font);
  do { ctx.font = font.replace(/\d+px/, size + 'px'); size -= 2; } while (ctx.measureText(text).width > maxW && size > 8);
}
function texMat(t, opts) { return new THREE.MeshLambertMaterial(Object.assign({ map: t }, opts || {})); }

/* ---------------- gable roof sized to a footprint ---------------- */
function gableRoof(w, d, h, color) {
  const hw = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, 0); s.lineTo(0, h); s.lineTo(hw, 0); s.lineTo(-hw, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return shadowed(new THREE.Mesh(g, M(color, { flatShading: true })));
}

const world = new THREE.Group();
scene.add(world);
const swayers = [], wavers = [];

/* ============================ ocean + island ============================ */
{
  const sea = new THREE.Mesh(new THREE.CircleGeometry(430, 72), M(SEA_DEEP, { transparent: true, opacity: 0.96 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.9;
  world.add(sea);

  const shallow = new THREE.Mesh(new THREE.CircleGeometry(CFGL.island.radius + 26, 72), M(SEA));
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = -0.55;
  world.add(shallow);

  /* landmass from the validated coastline polygon */
  const shape = new THREE.Shape();
  LAYOUT.coast.forEach((p, i) => {
    const x = Math.cos(p.a) * p.r, z = Math.sin(p.a) * p.r;
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  });
  shape.closePath();

  /* ExtrudeGeometry's bevel grows the shape in BOTH extrude directions, so a
     0.7 bevelThickness lifts the top face to y=+0.7 after the rotation. Left
     uncorrected that buries the grass, paths and plaza, which is exactly what
     made the whole island read as bare sand. Offset so the top lands at y=0. */
  const BEVEL_T = 0.7;
  const sandGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: true, bevelSize: 1.4, bevelThickness: BEVEL_T, bevelSegments: 2, curveSegments: 1 });
  sandGeo.rotateX(Math.PI / 2);
  const sand = shadowed(new THREE.Mesh(sandGeo, M(0xe8d5a3)), false, true);
  sand.position.y = -BEVEL_T;
  world.add(sand);

  /* Grass inset from the beach.
     Must use the SAME rotation as the sand: a Shape lives in XY, and
     geometry.rotateX(+90°) maps shape-y -> world +z, while a mesh
     rotation.x = -90° maps shape-y -> world -z. Mixing the two mirrors
     one layer against the other, which is why the island read as all sand. */
  const gShape = new THREE.Shape();
  LAYOUT.coast.forEach((p, i) => {
    const r = p.r - CFGL.island.beach;
    const x = Math.cos(p.a) * r, z = Math.sin(p.a) * r;
    if (i === 0) gShape.moveTo(x, z); else gShape.lineTo(x, z);
  });
  gShape.closePath();
  const grassGeo = new THREE.ShapeGeometry(gShape, 1);
  grassGeo.rotateX(Math.PI / 2);
  const grass = new THREE.Mesh(grassGeo, M(0x7fc06e, { side: THREE.DoubleSide }));
  grass.position.y = 0.07;
  grass.receiveShadow = true;
  world.add(grass);
}

/* ---------------- paths + plaza ---------------- */
function decal(geo, color, x, z, y, rotY) {
  const m = new THREE.Mesh(geo, M(color));
  m.rotation.x = -Math.PI / 2;
  if (rotY) m.rotation.z = rotY;
  m.position.set(x, y || 0.09, z);
  m.receiveShadow = true;
  world.add(m);
  return m;
}
const SAND = 0xe3cf9c;
/* paths are thin boxes, not rotated planes: a box needs only a Y rotation,
   so there is no XY-shape-to-XZ-world convention to get wrong */
LAYOUT.paths.forEach((p) => {
  const dx = p.to.x - p.from.x, dz = p.to.z - p.from.z;
  const len = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(p.width, 0.12, len), M(SAND));
  m.position.set((p.from.x + p.to.x) / 2, 0.1, (p.from.z + p.to.z) / 2);
  m.rotation.y = Math.atan2(dx, dz);
  m.receiveShadow = true;
  world.add(m);
});
decal(new THREE.CircleGeometry(CFGL.plaza.radius, 48), 0xd9c491, 0, 0, 0.1);
decal(new THREE.CircleGeometry(4.5, 32), 0xcbb27b, 0, 0, 0.11);

/* ============================ props ============================ */
function tree(x, z, s, rotY) {
  const g = new THREE.Group();
  const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 2.2 * s, 7), M(0x8a5a33)));
  trunk.position.y = 1.1 * s;
  g.add(trunk);
  const fol = new THREE.Group();
  const greens = [0x3f9e4d, 0x51b45f, 0x2f8f43];
  for (let i = 0; i < 3; i++) {
    const b = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry((1.55 - i * 0.34) * s, 1), M(greens[i % 3], { flatShading: true })));
    b.position.y = (2.6 + i * 0.95) * s;
    b.scale.y = 0.82;
    fol.add(b);
  }
  fol.userData.phase = (x + z) % 9;
  swayers.push(fol);
  g.add(fol);
  g.position.set(x, 0, z);
  g.rotation.y = rotY || 0;
  world.add(g);
}
function rock(x, z, s, rotY) {
  const r = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 0), M(0x9aa5a1, { flatShading: true })));
  r.position.set(x, 0.32 * s, z);
  r.scale.y = 0.7;
  r.rotation.y = rotY || 0;
  world.add(r);
}
LAYOUT.scenery.forEach((s) => (s.kind === 'rock' ? rock : tree)(s.x, s.z, s.s, s.rotY));

LAYOUT.flowers.forEach((f) => {
  const stemG = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 5);
  const headG = new THREE.IcosahedronGeometry(0.16, 0);
  const stems = new THREE.InstancedMesh(stemG, M(0x3f9e4d), f.n);
  const heads = new THREE.InstancedMesh(headG, M(0xffffff), f.n);
  const petals = [0xffffff, 0xffd54f, 0xef8fb0, 0xf4a25f, 0xb5d461];
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < f.n; i++) {
    const a = (i * 2.399) % (Math.PI * 2), r = Math.sqrt((i + 1) / f.n) * f.spread;
    const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
    mtx.makeTranslation(x, 0.3, z); stems.setMatrixAt(i, mtx);
    mtx.makeTranslation(x, 0.6, z); heads.setMatrixAt(i, mtx);
    heads.setColorAt(i, new THREE.Color(petals[i % petals.length]).convertSRGBToLinear());
  }
  heads.instanceColor.needsUpdate = true;
  world.add(stems, heads);
});

/* ---------------- company buildings ---------------- */
const byName = {};
PROJECTS.forEach((p) => { byName[p.name] = p; });
/* long titles like "ChatCHW - AI Health Assistant…" are cut at the dash for signage */
const shortName = (n) => n.split(' - ')[0];

LAYOUT.buildings.forEach((b) => {
  const g = new THREE.Group();
  const walls = shadowed(box(3.8, 2.6, 3.4, M(0xfff6e8)));
  walls.position.y = 1.3;
  const roof = gableRoof(4.3, 3.9, 1.7, b.tone);
  roof.position.y = 2.6;
  const door = shadowed(box(0.95, 1.6, 0.12, M(0x8a5a33)), true, false);
  door.position.set(0, 0.8, 1.73);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M(0xf7c948));
  knob.position.set(0.3, 0.82, 1.81);
  const w1 = box(0.7, 0.7, 0.1, M(0xbfe4f0)); w1.position.set(-1.15, 1.55, 1.72);
  const w2 = w1.clone(); w2.position.x = 1.15;
  const tex = makeTex(460, 130, (ctx, w, h) => {
    ctx.fillStyle = '#fffefb'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 20); ctx.fill();
    ctx.fillStyle = '#' + b.tone.toString(16).padStart(6, '0'); ctx.fillRect(0, h - 15, w, 15);
    ctx.fillStyle = '#1a1a18'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, shortName(b.project), `44px ${FS}`, w - 44);
    ctx.fillText(shortName(b.project), w / 2, h / 2 - 7);
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.56), texMat(tex));
  plaque.position.set(0, 2.2, 1.73);
  g.add(walls, roof, door, knob, w1, w2, plaque);
  g.position.set(b.x, 0, b.z);
  g.rotation.y = b.faceY;
  /* side projects are cottages: same footprint rules, smaller silhouette */
  if (!b.featured) g.scale.setScalar(0.82);
  world.add(g);
});

/* ---------------- district signs ---------------- */
LAYOUT.props.filter((p) => p.kind === 'districtSign').forEach((p) => {
  const g = new THREE.Group();
  /* Two posts BEHIND the board, not one through the middle of it. A post at
     z=0 with radius 0.13 pokes out past the sign face at z=0.09, so the pole
     visibly cuts across the lettering — that is the "sticking out" look. */
  const POST_Z = -0.22;
  const postL = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.05, 7), M(0x8a5a33)));
  postL.position.set(-1.25, 1.52, POST_Z);
  const postR = postL.clone();
  postR.position.x = 1.25;
  const tex = makeTex(620, 170, (ctx, w, h) => {
    ctx.fillStyle = '#' + p.tone.toString(16).padStart(6, '0');
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, p.label.toUpperCase(), `800 58px ${FD}`, w - 60);
    ctx.fillText(p.label.toUpperCase(), w / 2, h / 2 - 8);
    ctx.font = `500 22px ${FM}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const n = LAYOUT.buildings.filter((b) => b.district === p.district).length;
    ctx.fillText(n + (n === 1 ? ' PROJECT' : ' PROJECTS'), w / 2, h - 34);
  });
  const board = shadowed(box(3.5, 1.0, 0.16, M(0x8a5a33)));
  board.position.y = 3.0;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.9), texMat(tex));
  face.position.set(0, 3.0, 0.09);
  const cap = shadowed(box(3.8, 0.14, 0.42, M(0x6f4a2a)));
  cap.position.set(0, 3.58, -0.04);
  g.add(postL, postR, board, face, cap);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rotY;
  world.add(g);
});

/* ---------------- stat plinths ---------------- */
/* Fund-stat banners. These were grey stone slabs, which read unmistakably as
   gravestones on a green lawn. Now they use the island's own sign language:
   a brand-green panel on two wooden posts with a shingled cap. */
LAYOUT.props.filter((p) => p.kind === 'plinth').forEach((p) => {
  const st = DATA.stats[p.index];
  const g = new THREE.Group();

  const POST_Z = -0.24;
  const postL = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.5, 7), M(0x8a5a33)));
  postL.position.set(-1.05, 1.25, POST_Z);
  const postR = postL.clone(); postR.position.x = 1.05;

  const panel = shadowed(box(2.65, 1.35, 0.16, M(0xa84825)));
  panel.position.y = 2.05;
  const cap = shadowed(box(2.95, 0.13, 0.42, M(0x8a5a33)));
  cap.position.set(0, 2.8, -0.05);

  const tex = makeTex(520, 270, (ctx, w, h) => {
    ctx.fillStyle = '#c7572e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, w, 8);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    fitText(ctx, st.value, `92px ${FS}`, w - 60);
    ctx.fillText(st.value, w / 2, h / 2 - 22);
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    fitText(ctx, st.label.toUpperCase(), `700 30px ${FD}`, w - 56);
    ctx.fillText(st.label.toUpperCase(), w / 2, h / 2 + 62);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), texMat(tex));
  face.position.set(0, 2.05, 0.09);

  g.add(postL, postR, panel, cap, face);
  g.position.set(p.x, 0, p.z);
  /* face the plaza centre so all four read from the middle of the island */
  g.rotation.y = Math.atan2(-p.x, -p.z);
  world.add(g);
});

/* ---------------- flag + hero banner ---------------- */
{
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 9, 8), M(0xd7d2c4)));
  pole.position.y = 4.5;
  world.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), M(0xf7c948));
  knob.position.y = 9.1; world.add(knob);
  const flagTex = makeTex(512, 340, (ctx, w, h) => {
    ctx.fillStyle = '#fafaf8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c7572e'; ctx.lineWidth = 22; ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#c7572e'; ctx.beginPath(); ctx.arc(w / 2, 92, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a18'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, DATA.hero.name, `78px ${FS}`, w - 70);
    ctx.fillText(DATA.hero.name, w / 2, 172);
    ctx.fillStyle = '#6b6962'; ctx.font = `500 21px ${FD}`;
    ctx.fillText('I build AI products that close the gap', w / 2, 238);
    ctx.fillText('between capability and adoption.', w / 2, 268);
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1, 18, 1), texMat(flagTex, { side: THREE.DoubleSide }));
  flag.position.set(1.72, 7.6, 0);
  flag.castShadow = true;
  const pa = flag.geometry.attributes.position;
  flag.userData.wave = (t) => {
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      pa.setZ(i, Math.sin(x * 2.1 + t * 3.2) * 0.13 * ((x + 1.6) / 3.2));
    }
    pa.needsUpdate = true;
  };
  world.add(flag);
  wavers.push(flag);
}

/* ============================ interactions ============================ */
const interactions = {};   // tag -> { verb, label, act }
let currentTrigger = null;

/* ---------------- landmark builders ---------------- */
const landmark = (tag) => LAYOUT.props.find((p) => p.tag === tag);

/* Writing newsstand */
{
  const p = landmark('writing');
  const g = new THREE.Group();
  const b = shadowed(box(3.6, 2.6, 2.8, M(0xfff6e8))); b.position.y = 1.3;
  const awning = shadowed(box(4.2, 0.28, 3.5, M(ACCENT))); awning.position.set(0, 2.98, 0.2);
  const sTex = makeTex(560, 360, (ctx, w, h) => {
    ctx.fillStyle = '#f0eeea'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c7572e'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#c7572e'; ctx.textAlign = 'left';
    ctx.font = `500 24px ${FM}`; ctx.fillText('THE NEWSSTAND', 34, 66);
    ctx.fillStyle = '#1a1a18'; ctx.font = `46px ${FS}`; ctx.fillText('Writing', 34, 128);
    ctx.font = `500 22px ${FD}`; ctx.fillStyle = '#4a4843';
    ARTICLES.forEach((a, i) => {
      fitText(ctx, '• ' + a.title, `600 24px ${FD}`, w - 70);
      ctx.fillText('• ' + a.title, 34, 196 + i * 52);
    });
    ctx.fillStyle = '#6b6962'; ctx.font = `500 20px ${FM}`; ctx.fillText('on Substack →', 34, 318);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), texMat(sTex));
  sign.position.set(0, 1.5, 1.42);
  g.add(b, awning, sign);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rotY;
  world.add(g);

  interactions['writing'] = {
    verb: UI.read, label: 'Writing',
    act: () => openDialog([
      { name: 'Writing', text: 'How I think about building. Two essays from my Substack.' },
      ...ARTICLES.map((a) => ({
        name: `Writing · ${a.date}`,
        text: `${a.title}. ${a.preview}`,
        actions: [{ label: 'Read on Substack', href: a.url, solid: true }],
      })),
    ]),
  };
}

/* Contact mailbox */
{
  const p = landmark('contact');
  const g = new THREE.Group();
  const stem = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 7), M(0x8a5a33)));
  stem.position.y = 0.65;
  const bodyM = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 4, 10), M(ACCENT)));
  bodyM.rotation.x = Math.PI / 2; bodyM.position.y = 1.55;
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), M(0xf0eeea));
  lid.position.set(0, 1.55, 0.74);
  const fl = shadowed(box(0.07, 0.5, 0.16, M(0xf7c948)), true, false);
  fl.position.set(0.44, 2.05, 0);
  g.add(stem, bodyM, lid, fl);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rotY;
  world.add(g);

  interactions['contact'] = {
    verb: UI.open, label: 'Contact',
    act: () => openDialog([{
      name: 'Mailbox',
      text: `${DATA.contact.title} ${DATA.contact.email}`,
      actions: SOCIAL.map((s) => ({ label: s.label, href: s.url, solid: s.label === 'Email' })),
    }]),
  };
}

/* the two big boards */
function bigBoard(tag, titleTop, titleSub, notes, act, verb, label) {
  const p = landmark(tag);
  const g = new THREE.Group();
  /* posts set back behind the panel so they never cross the sign face */
  const p1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 3.3, 7), M(0x8a5a33)));
  p1.position.set(-2.2, 1.65, -0.26);
  const p2 = p1.clone(); p2.position.x = 2.2;
  const tex = makeTex(780, 460, (ctx, w, h) => {
    ctx.fillStyle = '#b07a44'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 26); ctx.fill();
    ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 20); ctx.stroke();
    ctx.fillStyle = '#fffefb'; ctx.textAlign = 'center';
    ctx.font = `58px ${FS}`; ctx.fillText(titleTop, w / 2, 96);
    ctx.font = `700 26px ${FD}`; ctx.fillStyle = '#ffe9c9';
    ctx.fillText(titleSub, w / 2, 142);
    const cols = ['#fafaf8', '#fff3d6', '#fde2e4', '#f0eeea', '#ecf3ea'];
    notes.forEach((n, i) => {
      /* centred on however many notes there are */
      const cx = w / 2 + (i - (notes.length - 1) / 2) * 150;
      ctx.save(); ctx.translate(cx, 305); ctx.rotate((i % 2 ? -1 : 1) * 0.05);
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-68, -100, 136, 195);
      ctx.fillStyle = '#c7572e'; ctx.beginPath(); ctx.arc(0, -87, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1a18'; ctx.font = `700 16px ${FD}`;
      const words = n.split(' ');
      let line = '', ty = -52;
      words.forEach((wd) => {
        const test = line ? line + ' ' + wd : wd;
        if (line && ctx.measureText(test).width > 122) { ctx.fillText(line, 0, ty); ty += 20; line = wd; }
        else line = test;
      });
      if (line) ctx.fillText(line, 0, ty);
      ctx.restore();
    });
  });
  const bb = shadowed(box(6.0, 3.1, 0.18, M(0xb07a44))); bb.position.y = 3.15;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.95), texMat(tex));
  face.position.set(0, 3.15, 0.11);
  const rf = shadowed(box(6.5, 0.22, 0.95, M(ACCENT))); rf.position.y = 4.85;
  g.add(p1, p2, bb, face, rf);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rotY;
  world.add(g);
  interactions[tag] = { verb, label, act };
}

bigBoard('directory', 'Projects', `${PROJECTS.length} THINGS I'VE BUILT`,
  PROJECTS.filter((p) => p.featured).map((p) => shortName(p.name)),
  () => openDirectory(), UI.open, UI.directoryTitle);

bigBoard('approach', 'Approach', 'HOW I WORK',
  APPROACH.map((a) => `${a.number}  ${a.title}`),
  () => openDialog(APPROACH.map((a) => ({ name: `${a.number} · ${a.title}`, text: a.description }))),
  UI.read, 'Approach');

/* dock */
{
  const p = landmark('dock');
  const g = new THREE.Group();
  const deck = shadowed(box(3.4, 0.3, 12, M(0xb07a44)));
  deck.position.y = 0.5;
  g.add(deck);
  for (let i = -2; i <= 2; i++) {
    const pl = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.0, 6), M(0x8a5a33)));
    pl.position.set(i % 2 ? 1.3 : -1.3, -0.2, i * 2.6);
    g.add(pl);
  }
  g.position.set(p.x, 0, p.z);
  g.rotation.y = Math.atan2(p.x, p.z);
  world.add(g);
}

/* per-project houses */
LAYOUT.buildings.forEach((b) => {
  const p = byName[b.project];
  const actions = p.links.map((l, i) => ({ label: l.label, href: l.url, solid: i === 0 }));
  if (p.demoVideoUrl) actions.push({ label: 'Watch demo', href: p.demoVideoUrl });
  const pages = [{ name: p.name, text: p.tagline }];
  if (p.description) pages.push({ name: p.name, text: p.description });
  if (p.caseStudy) {
    p.caseStudy.split(/\n\s*\n/).forEach((par) => pages.push({ name: `${shortName(p.name)} · Case study`, text: par.trim() }));
  }
  pages.push({ name: p.name, text: `Built with ${p.tech.join(', ')}.` });
  pages.forEach((pg) => { pg.actions = actions; });
  interactions[b.project] = { verb: UI.check, label: shortName(p.name), act: () => openDialog(pages) };
});

/* hero facts */
DATA.stats.forEach((st, i) => {
  interactions['stat' + i] = {
    verb: UI.read, label: st.value,
    act: () => openDialog([{ name: st.value, text: st.blurb }]),
  };
});

/* ============================ animals ============================ */
/* Every builder returns the same { legs, inner } rig, so one animate function
   and one collision routine drive llamas, bears and rabbits alike. Each mesh
   faces +z. `tagY` is where a floating name tag sits for that body size. */
function buildLlama(bodyColor, scarfColor) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const B = M(bodyColor);
  const body = shadowed(box(0.72, 0.62, 1.15, B)); body.position.y = 0.78;
  const fluff = shadowed(box(0.8, 0.34, 1.24, B)); fluff.position.y = 1.02;
  const neck = shadowed(box(0.32, 0.75, 0.32, B)); neck.position.set(0, 1.45, 0.44);
  const head = shadowed(box(0.42, 0.42, 0.56, B)); head.position.set(0, 1.9, 0.52);
  const snout = shadowed(box(0.26, 0.22, 0.2, M(0xffffff)), true, false); snout.position.set(0, 1.82, 0.85);
  const earG = new THREE.ConeGeometry(0.09, 0.28, 5);
  const e1 = new THREE.Mesh(earG, B); e1.position.set(-0.13, 2.22, 0.42);
  const e2 = e1.clone(); e2.position.x = 0.13;
  const eyeG = new THREE.SphereGeometry(0.045, 8, 6);
  const eyeM = M(0x1a1a18);
  const y1 = new THREE.Mesh(eyeG, eyeM); y1.position.set(-0.19, 1.95, 0.72);
  const y2 = y1.clone(); y2.position.x = 0.19;
  const scarf = shadowed(box(0.4, 0.18, 0.4, M(scarfColor)), true, false); scarf.position.set(0, 1.18, 0.44);
  const tail = shadowed(box(0.18, 0.2, 0.16, B), true, false); tail.position.set(0, 0.95, -0.62);
  inner.add(body, fluff, neck, head, snout, e1, e2, y1, y2, scarf, tail);
  const legs = addLegs(inner, B, [[-0.24, 0.42], [0.24, 0.42], [-0.24, -0.38], [0.24, -0.38]], 0.55, 0.17);
  g.add(inner);
  g.userData = { legs, inner, tagY: 2.85 };
  return g;
}

function buildBear(bodyColor, scarfColor) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const B = M(bodyColor);
  const muzzleM = M(0xe8d2b0);
  const body = shadowed(box(0.98, 0.82, 1.2, B)); body.position.y = 0.86;
  const belly = shadowed(box(0.62, 0.5, 0.06, muzzleM), true, false); belly.position.set(0, 0.8, 0.61);
  const head = shadowed(box(0.74, 0.66, 0.62, B)); head.position.set(0, 1.56, 0.5);
  const snout = shadowed(box(0.36, 0.26, 0.2, muzzleM), true, false); snout.position.set(0, 1.45, 0.88);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0x2a1d14)); nose.position.set(0, 1.53, 0.99);
  const earG = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
  const e1 = shadowed(new THREE.Mesh(earG, B), true, false); e1.rotation.x = Math.PI / 2; e1.position.set(-0.29, 1.93, 0.46);
  const e2 = e1.clone(); e2.position.x = 0.29;
  const eyeG = new THREE.SphereGeometry(0.05, 8, 6);
  const eyeM = M(0x1a1a18);
  const y1 = new THREE.Mesh(eyeG, eyeM); y1.position.set(-0.18, 1.66, 0.81);
  const y2 = y1.clone(); y2.position.x = 0.18;
  const scarf = shadowed(box(0.82, 0.16, 0.5, M(scarfColor)), true, false); scarf.position.set(0, 1.24, 0.42);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), B); tail.position.set(0, 0.98, -0.62);
  inner.add(body, belly, head, snout, nose, e1, e2, y1, y2, scarf, tail);
  const legs = addLegs(inner, B, [[-0.28, 0.38], [0.28, 0.38], [-0.28, -0.38], [0.28, -0.38]], 0.46, 0.27);
  g.add(inner);
  g.userData = { legs, inner, tagY: 2.55 };
  return g;
}

function buildRabbit(bodyColor, scarfColor) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const B = M(bodyColor);
  const body = shadowed(box(0.5, 0.46, 0.7, B)); body.position.y = 0.52;
  const head = shadowed(box(0.42, 0.4, 0.4, B)); head.position.set(0, 0.94, 0.3);
  const earG = new THREE.BoxGeometry(0.11, 0.52, 0.06);
  const pinkM = M(0xf2b6c1);
  const e1 = shadowed(new THREE.Mesh(earG, B), true, false); e1.position.set(-0.11, 1.38, 0.24); e1.rotation.z = 0.12;
  const e2 = e1.clone(); e2.position.x = 0.11; e2.rotation.z = -0.12;
  const in1 = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.38), pinkM); in1.position.set(-0.11, 1.38, 0.275); in1.rotation.z = 0.12;
  const in2 = in1.clone(); in2.position.x = 0.11; in2.rotation.z = -0.12;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), pinkM); nose.position.set(0, 0.9, 0.51);
  const eyeG = new THREE.SphereGeometry(0.04, 8, 6);
  const eyeM = M(0x1a1a18);
  const y1 = new THREE.Mesh(eyeG, eyeM); y1.position.set(-0.13, 1.0, 0.5);
  const y2 = y1.clone(); y2.position.x = 0.13;
  const scarf = shadowed(box(0.38, 0.1, 0.32, M(scarfColor)), true, false); scarf.position.set(0, 0.74, 0.3);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M(0xffffff)); tail.position.set(0, 0.58, -0.38);
  inner.add(body, head, e1, e2, in1, in2, nose, y1, y2, scarf, tail);
  const legs = addLegs(inner, B, [[-0.15, 0.2], [0.15, 0.2], [-0.15, -0.22], [0.15, -0.22]], 0.3, 0.14);
  g.add(inner);
  g.userData = { legs, inner, tagY: 1.95, hop: true };
  return g;
}

function addLegs(inner, mat, spots, len, thick) {
  return spots.map(([lx, lz]) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, len, lz);
    const leg = shadowed(box(thick, len, thick, mat), true, false);
    leg.position.y = -len / 2;
    pivot.add(leg); inner.add(pivot);
    return pivot;
  });
}

const BUILD = { llama: buildLlama, bear: buildBear, rabbit: buildRabbit };

function nameTag(text, y) {
  const tex = makeTex(360, 110, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(26,26,24,0.82)';
    ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 30); ctx.fill();
    ctx.fillStyle = '#fafaf8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 46px ${FD}`; ctx.fillText(text, w / 2, h / 2 + 2);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(1.7, 0.52, 1);
  sp.position.y = y;
  sp.renderOrder = 5;
  return sp;
}

const startSpawn = LAYOUT.spawns.find((s) => s.tag === 'start');
const player = buildBear(0xa0714a, ACCENT);
player.position.set(startSpawn.x, 0, startSpawn.z);
scene.add(player);

const guide = buildLlama(0xf2e6d2, 0x7d9a7e);
guide.position.set(LAYOUT.guide.x, 0, LAYOUT.guide.z);
guide.rotation.y = Math.PI;
guide.add(nameTag(DATA.guide.name, guide.userData.tagY));
scene.add(guide);

interactions['guide'] = {
  verb: UI.talk, label: DATA.guide.name,
  act: () => openDialog(DATA.about.map((t) => ({ name: DATA.guide.name, text: t }))),
};

/* animal hosts standing beside the newsstand and the mailbox */
const HOST_TONES = { rabbit: [0xf3efe8, ACCENT], bear: [0x6b4a33, 0x7d9a7e] };
const hosts = LAYOUT.hosts.map((h) => {
  const m = BUILD[h.kind](...HOST_TONES[h.kind]);
  m.position.set(h.x, 0, h.z);
  m.rotation.y = h.faceY;
  scene.add(m);
  return m;
});

/* ---------------- roaming llamas and rabbits ---------------- */
const WANDER_TONES = {
  llama: [[0xefe0c8, 0xf7c948], [0xe8d3b5, 0x7d9a7e], [0xf6eede, ACCENT], [0xdcc7a5, 0x64b5f6]],
  rabbit: [[0xd9c3a5, 0xf7c948], [0xf6f3ee, 0x7d9a7e], [0x9c8a78, ACCENT], [0xe9ddd0, 0x64b5f6]],
};
/* one of each kind is named; named ones carry a floating label and a stable
   trigger object so the interact prompt does not flicker as they move
   (identity comparison needs the same object each frame) */
const WANDER_NAMES = { llama: 'Lou', rabbit: 'Pip' };
const named = new Set();

const wanderers = LAYOUT.wanderers.map((w, i) => {
  const tones = WANDER_TONES[w.kind];
  const m = BUILD[w.kind](...tones[Math.floor(i / 2) % tones.length]);
  m.position.set(w.x, 0, w.z);
  m.rotation.y = (w.seed % 628) / 100;
  scene.add(m);
  let name = null;
  if (!named.has(w.kind)) { named.add(w.kind); name = WANDER_NAMES[w.kind]; m.add(nameTag(name, m.userData.tagY)); }
  return {
    name,
    trig: name ? { tag: 'npc:' + name, r: 3.0, dynamic: true } : null,
    mesh: m,
    home: { x: w.x, z: w.z },
    roam: w.roam,
    target: { x: w.x, z: w.z },
    wait: (w.seed % 400) / 100,
    /* deterministic-ish per-animal wander so they don't all move in lockstep */
    step: (w.kind === 'rabbit' ? 2.2 : 1.5) + ((w.seed % 90) / 100),
  };
});

function tickWanderers(dt) {
  wanderers.forEach((w) => {
    const p = w.mesh.position;
    const dx = w.target.x - p.x, dz = w.target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35 || w.wait > 0) {
      w.wait -= dt;
      if (w.wait <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * w.roam;
        w.target.x = w.home.x + Math.cos(a) * r;
        w.target.z = w.home.z + Math.sin(a) * r;
      }
      animateLlama(w.mesh, false, dt);
    } else {
      p.x += (dx / d) * w.step * dt;
      p.z += (dz / d) * w.step * dt;
      resolveCollisions(p, 0.5);
      w.mesh.rotation.y = Math.atan2(dx, dz);
      animateLlama(w.mesh, true, dt, 0.45);
      if (Math.random() < dt * 0.2) w.wait = 1.5 + Math.random() * 3.5;
    }
  });
}

interactions['npc:Lou'] = {
  verb: UI.talk, label: 'Lou',
  act: () => openDialog([
    { name: 'Lou', text: 'Lou here. The big houses up the north road are the featured builds. Each one has the full story inside.' },
    { name: 'Lou', text: 'If you would rather read than walk, the project board by the plaza lists everything.' },
  ]),
};
interactions['npc:Pip'] = {
  verb: UI.talk, label: 'Pip',
  act: () => openDialog([
    { name: 'Pip', text: "Pip! I hop laps around the side projects to the east. They're small, but every one shipped." },
    { name: 'Pip', text: 'Press space if you feel like jumping. No reason. It is just nice.' },
  ]),
};

/* ============================ dev overlay ============================ */
const devGroup = new THREE.Group();
devGroup.visible = false;
scene.add(devGroup);
{
  const ring = (x, z, r, color, y) => {
    const g = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.05, r - 0.12), r, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, y, z);
    devGroup.add(g);
  };
  LAYOUT.colliders.forEach((c) => ring(c.x, c.z, c.r, 0xff3b30, 0.5));
  LAYOUT.triggers.forEach((t) => ring(t.x, t.z, t.r, 0x34c759, 0.55));
  LAYOUT.spawns.forEach((s) => ring(s.x, s.z, 0.9, 0x0a84ff, 0.6));
}

/* ============================ dialog UI ============================ */
let dialog = null;
function openDialog(pages) {
  dialog = { pages, idx: 0 };
  dialogEl.classList.add('show');
  hint.classList.remove('show');
  AudioSys.chime();
  renderPage();
}
function renderPage() {
  const pg = dialog.pages[dialog.idx];
  dName.textContent = loc(pg.name);
  dActions.innerHTML = '';
  dPager.textContent = dialog.pages.length > 1 ? `${dialog.idx + 1} / ${dialog.pages.length}` : '';
  dMore.textContent = dialog.idx < dialog.pages.length - 1 ? '▼' : '✕';
  if (pg.html) { dialog.typing = false; dText.innerHTML = pg.html(); showActions(pg); }
  else { dialog.typing = true; dialog.typeStr = loc(pg.text); dialog.typeI = 0; dText.textContent = ''; }
}
function showActions(pg) {
  dActions.innerHTML = '';
  (pg.actions || []).forEach((a) => {
    let el;
    if (a.href) {
      el = document.createElement('a'); el.href = a.href;
      if (!a.href.startsWith('mailto:')) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    }
    else {
      el = document.createElement('button');
      if (a.onClick) el.addEventListener('click', (e) => { e.stopPropagation(); a.onClick(); });
    }
    el.className = a.solid ? 'solid' : 'ghost';
    el.textContent = loc(a.label);
    el.addEventListener('click', (e) => e.stopPropagation());
    dActions.appendChild(el);
  });
}
function advanceDialog() {
  if (!dialog) return;
  if (dialog.typing) { dialog.typing = false; dText.textContent = dialog.typeStr; showActions(dialog.pages[dialog.idx]); return; }
  if (dialog.idx < dialog.pages.length - 1) { dialog.idx++; renderPage(); }
  else closeDialog();
}
function closeDialog() { dialog = null; dialogEl.classList.remove('show'); }
dialogEl.addEventListener('click', advanceDialog);

let typeAcc = 0;
function tickTypewriter(dt) {
  if (!dialog || !dialog.typing) return;
  typeAcc += dt;
  while (typeAcc > 1 / 42 && dialog.typing) {
    typeAcc -= 1 / 42;
    dialog.typeI++;
    dText.textContent = dialog.typeStr.slice(0, dialog.typeI);
    if (dialog.typeI % 3 === 1) AudioSys.blip();
    if (dialog.typeI >= dialog.typeStr.length) { dialog.typing = false; showActions(dialog.pages[dialog.idx]); }
  }
}

/* ============================ directory ============================ */
function openDirectory() { renderDirectory(); dirEl.classList.add('show'); hint.classList.remove('show'); AudioSys.chime(); }
function renderDirectory() {
  dirEl.querySelector('h2').textContent = UI.directoryTitle;
  dirEl.querySelector('.sub').textContent = `${PROJECTS.length} projects · things I've built`;
  dirEl.querySelector('.head button').textContent = UI.close;
  dirList.innerHTML = '';
  LAYOUT.districts.forEach((d) => {
    const items = PROJECTS.filter((p) => (p.featured ? 'featured' : 'side') === d.key);
    if (!items.length) return;
    const head = document.createElement('div');
    head.className = 'cat-head';
    const color = '#' + d.tone.toString(16).padStart(6, '0');
    head.innerHTML = `<span class="dot" style="background:${color}"></span>${d.label} · ${items.length}`;
    dirList.appendChild(head);
    items.forEach((p) => {
      const row = document.createElement('a');
      row.className = 'row'; row.href = p.links[0].url; row.target = '_blank'; row.rel = 'noopener noreferrer';
      const top = document.createElement('span'); top.className = 'top';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name;
      const yr = document.createElement('span'); yr.className = 'yr'; yr.textContent = p.tech.slice(0, 2).join(' · ');
      const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = p.tagline;
      top.append(nm, yr); row.append(top, ds);
      dirList.appendChild(row);
    });
  });
}
dirEl.querySelector('.head button').addEventListener('click', () => dirEl.classList.remove('show'));
dirEl.addEventListener('click', (e) => { if (e.target === dirEl) dirEl.classList.remove('show'); });

/* ============================ input ============================ */
const keys = {};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  /* only E opens an interaction; Space/Enter merely advance an open dialog */
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    if (dialog) { advanceDialog(); e.preventDefault(); return; }
    if (e.code === 'KeyE' && currentTrigger) { fireTrigger(currentTrigger); e.preventDefault(); }
    if (e.code === 'Space' && started && grounded) { vy = JUMP_V; grounded = false; e.preventDefault(); }
  }
  if (e.code === 'Escape') { if (dialog) closeDialog(); dirEl.classList.remove('show'); }
  if (e.code === 'KeyM') AudioSys.setMuted(!AudioSys.muted);
  if (e.code === 'Backquote') {
    devGroup.visible = !devGroup.visible;
    document.body.classList.toggle('dev', devGroup.visible);
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

const joyState = { active: false, dx: 0, dz: 0 };
{
  const joy = $('joy'), stick = joy.querySelector('.stick');
  let origin = null;
  const onTouch = (e) => {
    const t = e.touches[0]; if (!t) return;
    if (!origin) { const r = joy.getBoundingClientRect(); origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    let dx = t.clientX - origin.x, dy = t.clientY - origin.y;
    const len = Math.hypot(dx, dy), max = 44;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    stick.style.transform = `translate(${dx}px,${dy}px)`;
    joyState.active = true; joyState.dx = dx / max; joyState.dz = dy / max;
    e.preventDefault();
  };
  joy.addEventListener('touchstart', onTouch, { passive: false });
  joy.addEventListener('touchmove', onTouch, { passive: false });
  joy.addEventListener('touchend', () => { joyState.active = false; joyState.dx = joyState.dz = 0; stick.style.transform = ''; origin = null; });
  $('btn-act').addEventListener('click', () => { if (dialog) advanceDialog(); else if (currentTrigger) fireTrigger(currentTrigger); });
  if ('ontouchstart' in window) document.body.classList.add('touch');
}

{
  let dragId = null, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => { dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    camYaw -= (e.clientX - lastX) * 0.006;
    camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitch + (e.clientY - lastY) * 0.006));
    lastX = e.clientX; lastY = e.clientY;
  });
  const rel = (e) => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', rel);
  canvas.addEventListener('pointercancel', rel);
  canvas.addEventListener('wheel', (e) => {
    camDist = Math.max(6, Math.min(46, camDist + Math.sign(e.deltaY) * 1.6));
    e.preventDefault();
  }, { passive: false });
}

/* ============================ camera ============================ */
function cameraOffset() {
  const h = camDist * Math.cos(camPitch);
  return { x: Math.sin(camYaw) * h, y: camDist * Math.sin(camPitch), z: Math.cos(camYaw) * h };
}
function snapCamera() {
  const o = cameraOffset();
  camera.position.set(player.position.x + o.x, player.position.y + o.y, player.position.z + o.z);
  camera.lookAt(player.position.x, player.position.y + 2.2, player.position.z);
}

/* ============================ game loop ============================ */
const clock = new THREE.Clock();
let started = false, heading = Math.PI;
/* jump: Space when no dialog is open. Purely vertical, so it never affects
   collision (which is 2D) or lets the player leave the walkable island. */
const JUMP_V = 8.2, GRAVITY = 22;
let vy = 0, grounded = true;
/* debug-only: freeze the follow camera so verification can frame the island */
let freeCam = false;

function resolveCollisions(pos, r) {
  for (const c of LAYOUT.colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const d2 = dx * dx + dz * dz, min = c.r + r;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
}
function animateLlama(llama, moving, dt, scale) {
  const t = clock.elapsedTime * 10 * (scale || 1);
  const { legs, inner } = llama.userData;
  legs.forEach((leg, i) => {
    const target = moving ? Math.sin(t + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI * 0.5)) * 0.6 : 0;
    leg.rotation.x += (target - leg.rotation.x) * Math.min(1, dt * 14);
  });
  /* rabbits hop instead of walk: a tall bounce on the same gait clock */
  const amp = llama.userData.hop ? 0.32 : 0.06;
  const bob = moving ? Math.abs(Math.sin(t)) * amp : Math.sin(clock.elapsedTime * 2) * 0.015;
  inner.position.y += (bob - inner.position.y) * Math.min(1, dt * 10);
}

function fireTrigger(t) {
  const it = interactions[t.tag];
  if (it) it.act();
}

const camTarget = new THREE.Vector3();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  let ix = 0, iz = 0;
  if (!dialog && started && !dirEl.classList.contains('show')) {
    if (keys.KeyW || keys.ArrowUp) iz -= 1;
    if (keys.KeyS || keys.ArrowDown) iz += 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (joyState.active) { ix = joyState.dx; iz = joyState.dz; }
  }
  const fwd = { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
  const right = { x: Math.cos(camYaw), z: -Math.sin(camYaw) };
  const mx = ix * right.x - iz * fwd.x;
  const mz = ix * right.z - iz * fwd.z;
  const moving = Math.hypot(mx, mz) > 0.15;
  if (moving) {
    const len = Math.hypot(mx, mz), speed = 8.4;
    player.position.x += (mx / len) * speed * dt;
    player.position.z += (mz / len) * speed * dt;
    resolveCollisions(player.position, 0.55);
    const d = Math.hypot(player.position.x, player.position.z);
    if (d > CFGL.walkRadius) { player.position.x *= CFGL.walkRadius / d; player.position.z *= CFGL.walkRadius / d; }
    const want = Math.atan2(mx, mz);
    let dh = want - heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    heading += dh * Math.min(1, dt * 12);
    player.rotation.y = heading;
  }
  /* vertical motion */
  if (!grounded || vy !== 0) {
    vy -= GRAVITY * dt;
    player.position.y += vy * dt;
    if (player.position.y <= 0) { player.position.y = 0; vy = 0; grounded = true; }
  }
  animateLlama(player, moving, dt);
  /* tuck the legs and tip forward slightly while airborne */
  {
    const air = Math.min(1, player.position.y / 1.6);
    player.userData.legs.forEach((leg) => { leg.rotation.x += (-0.55 * air - leg.rotation.x) * Math.min(1, dt * 12); });
    player.userData.inner.rotation.x += ((-0.12 * air) - player.userData.inner.rotation.x) * Math.min(1, dt * 10);
  }
  animateLlama(guide, false, dt);
  hosts.forEach((h) => animateLlama(h, false, dt));
  tickWanderers(dt);

  {
    const dx = player.position.x - guide.position.x, dz = player.position.z - guide.position.z;
    if (dx * dx + dz * dz < 70) {
      const want = Math.atan2(dx, dz);
      let dh = want - guide.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      guide.rotation.y += dh * Math.min(1, dt * 4);
    }
  }

  /* nearest trigger */
  if (!dialog && started && !dirEl.classList.contains('show')) {
    let best = null, bestD = 1e9;
    for (const t of LAYOUT.triggers) {
      if (!interactions[t.tag]) continue;
      const dx = player.position.x - t.x, dz = player.position.z - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < t.r * t.r && d2 < bestD) { best = t; bestD = d2; }
    }
    /* named roamers move, so their zone is checked live */
    for (const w of wanderers) {
      if (!w.trig) continue;
      const dx = player.position.x - w.mesh.position.x;
      const dz = player.position.z - w.mesh.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < w.trig.r * w.trig.r && d2 < bestD) { best = w.trig; bestD = d2; }
    }
    if (best !== currentTrigger) {
      currentTrigger = best;
      if (best) {
        const it = interactions[best.tag];
        hint.innerHTML = `<span class="key">E</span>${loc(it.verb)} · ${loc(it.label)}`;
        hint.classList.add('show');
      } else hint.classList.remove('show');
    }
  } else if (currentTrigger) { currentTrigger = null; hint.classList.remove('show'); }

  const t = clock.elapsedTime;
  swayers.forEach((f) => { f.rotation.z = Math.sin(t * 1.3 + f.userData.phase) * 0.025; });
  wavers.forEach((w) => w.userData.wave(t));

  tickTypewriter(dt);

  if (devGroup.visible) {
    devhud.textContent =
      `pos   ${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}\n` +
      `zone  ${currentTrigger ? currentTrigger.tag : '—'}\n` +
      `cam   yaw ${camYaw.toFixed(2)} pitch ${camPitch.toFixed(2)} dist ${camDist.toFixed(1)}\n` +
      `world ${LAYOUT.buildings.length} buildings · ${LAYOUT.colliders.length} colliders · ${LAYOUT.triggers.length} zones\n` +
      `red = collider   green = interact zone   blue = spawn`;
  }

  if (!freeCam) {
    const o = cameraOffset();
    camTarget.set(player.position.x + o.x, player.position.y + o.y, player.position.z + o.z);
    camera.position.lerp(camTarget, Math.min(1, dt * 4));
    camera.lookAt(player.position.x, player.position.y + 2.2, player.position.z);
  }

  renderer.render(scene, camera);
}

/* ============================ boot ============================ */
window.__li = {
  player, camera, LAYOUT, interactions, wanderers,
  start: () => splash.click(),
  freeCam: (on, pos, look) => {
    freeCam = !!on;
    if (on && pos) { camera.position.set(pos[0], pos[1], pos[2]); camera.lookAt(look ? look[0] : 0, look ? look[1] : 0, look ? look[2] : 0); }
  },
  closeDialog,
  keys,
  debug: () => ({ started, dialog: !!dialog, camYaw, camPitch, t: clock.elapsedTime,
                  zone: currentTrigger && currentTrigger.tag,
                  pos: { x: +player.position.x.toFixed(2), z: +player.position.z.toFixed(2) } }),
};
AudioSys.setMuted(false);
splash.addEventListener('click', () => {
  if (started) return;
  started = true;
  splash.classList.add('hidden');
  AudioSys.startMusic();
  setTimeout(() => openDialog(DATA.guide.pages.map((p) => ({ name: DATA.guide.name, text: p }))), 700);
});
snapCamera();
tick();
});
