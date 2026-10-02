/* ============================================================
   Marcus Island — LAYOUT
   ------------------------------------------------------------
   Pure data + placement math. No Three.js, no DOM. Runs in Node
   (for the build-time validator) and in the browser (for the
   renderer), so what gets validated is exactly what gets drawn.

   Nothing here is hand-positioned by eye. Every building is
   placed by a rule that guarantees spacing, and validate.js
   proves the result before the file is ever built.
   ============================================================ */

/* deterministic PRNG — layout must be identical in Node and browser,
   otherwise the validator would be checking a different island */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CFG = {
  seed: 20260805,
  island: { radius: 74, beach: 8 },   // land radius, sandy rim width
  plaza: { radius: 15 },
  walkRadius: 66,                      // hard cap on how far the player may roam

  /* spacing rules — the validator enforces these, so they are the
     single source of truth for "is this layout legal" */
  rules: {
    minColliderGap: 0.4,   // solid things must not overlap, plus breathing room
    minTriggerGap: 1.2,    // distinct interact zones must not touch
    spawnClearance: 1.0,   // spawn must be this far outside every trigger + collider
  },

  building: { spacing: 9.0, collider: 2.7, trigger: 3.0 },
  districtRing: 40,        // distance from plaza centre to each district centre
};

/* districts, angle in radians (0 = +x, CCW). Featured sits straight up the
   north road from spawn; side projects branch off to the east. */
const DISTRICTS = [
  { key: 'featured', angle: -Math.PI / 2, tone: 0xc7572e, label: 'Featured Builds' },
  { key: 'side',     angle:  0.30,        tone: 0x7d9a7e, label: 'Side Projects' },
];

/* ---------- placement helpers ---------- */

/* Lay N points out in centred rows on a local grid. Row width grows with N
   so a 19-building district stays compact instead of becoming a long wall.
   Spacing is guaranteed by construction: neighbours are exactly `spacing`
   apart on both axes, and `spacing` > 2 * collider radius. */
function gridCluster(n, spacing) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.35)));
  const rows = Math.ceil(n / cols);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rowCount = Math.min(cols, n - r * cols);   // centre each row on its own count
    pts.push({
      x: (c - (rowCount - 1) / 2) * spacing,
      z: (r - (rows - 1) / 2) * spacing,
    });
  }
  /* callers need the footprint to place signs/paths relative to the cluster
     instead of guessing a magic offset */
  pts.halfW = pts.reduce((m, p) => Math.max(m, Math.abs(p.x)), 0);
  pts.halfD = pts.reduce((m, p) => Math.max(m, Math.abs(p.z)), 0);
  return pts;
}

/* Walk outward from a preferred spot until the position satisfies every
   spacing rule. Layout code should never hand-pick a coordinate and hope —
   it states intent ("near here, pushed this way") and lets the search find
   a legal spot, so new content can't silently overlap old content. */
function findClear(pref, dir, myR, colliders, triggers, rules, maxSteps) {
  const step = 1.0;
  for (let i = 0; i < (maxSteps || 80); i++) {
    const x = pref.x + dir.x * step * i;
    const z = pref.z + dir.z * step * i;
    const okC = colliders.every((c) => Math.hypot(x - c.x, z - c.z) >= c.r + myR + rules.minColliderGap);
    const okT = triggers.every((t) => Math.hypot(x - t.x, z - t.z) >= t.r + myR + rules.minTriggerGap);
    if (okC && okT) return { x, z };
  }
  return null;
}

function rotate(p, a) {
  const s = Math.sin(a), c = Math.cos(a);
  return { x: p.x * c - p.z * s, z: p.x * s + p.z * c };
}

/* ---------- build the island ---------- */

function buildLayout(projects) {
  const rnd = mulberry32(CFG.seed);

  const colliders = [];   // { x, z, r, tag }
  const triggers = [];    // { x, z, r, tag, kind }
  const spawns = [];      // { x, z, tag }
  const buildings = [];   // { project, x, z, faceY, tone }
  const props = [];       // { kind, x, z, s, rotY }
  const paths = [];       // { from:{x,z}, to:{x,z}, width }

  const addCollider = (x, z, r, tag) => colliders.push({ x, z, r, tag });
  const addTrigger = (x, z, r, tag, kind) => triggers.push({ x, z, r, tag, kind });

  /* --- coastline: irregular but deterministic, sampled as a closed ring --- */
  const coast = [];
  const COAST_SEGMENTS = 96;
  for (let i = 0; i < COAST_SEGMENTS; i++) {
    const a = (i / COAST_SEGMENTS) * Math.PI * 2;
    const wobble =
      Math.sin(a * 3 + 0.6) * 5.5 +
      Math.sin(a * 5 - 1.2) * 3.0 +
      Math.sin(a * 8 + 2.1) * 1.6;
    coast.push({ a, r: CFG.island.radius + wobble });
  }
  const coastRadiusAt = (angle) => {
    const t = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const f = (t / (Math.PI * 2)) * COAST_SEGMENTS;
    const i0 = Math.floor(f) % COAST_SEGMENTS;
    const i1 = (i0 + 1) % COAST_SEGMENTS;
    const k = f - Math.floor(f);
    return coast[i0].r * (1 - k) + coast[i1].r * k;
  };

  /* --- town plaza (spawn) --- */
  spawns.push({ x: 0, z: 18, tag: 'start' });
  addCollider(0, 0, 0.6, 'flagpole');

  /* fund-stat plinths on the plaza diagonals */
  const STAT_R = 10.5;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.cos(a) * STAT_R, z = Math.sin(a) * STAT_R;
    addCollider(x, z, 1.5, `plinth${i}`);
    addTrigger(x, z + 2.6, 2.4, `stat${i}`, 'stat');
    props.push({ kind: 'plinth', x, z, s: 1, rotY: 0, index: i });
  }

  /* --- districts: every project gets a house --- */
  DISTRICTS.forEach((d) => {
    const list = projects.filter((p) => (p.featured ? 'featured' : 'side') === d.key);
    if (!list.length) return;

    const cx = Math.cos(d.angle) * CFG.districtRing;
    const cz = Math.sin(d.angle) * CFG.districtRing;

    /* face the buildings back toward the plaza */
    const faceY = Math.atan2(-cx, -cz);
    const pts = gridCluster(list.length, CFG.building.spacing);

    list.forEach((proj, i) => {
      const local = rotate(pts[i], d.angle + Math.PI / 2);
      const x = cx + local.x, z = cz + local.z;
      buildings.push({ project: proj.name, featured: !!proj.featured, x, z, faceY, tone: d.tone, district: d.key });
      addCollider(x, z, CFG.building.collider, proj.name);
      /* trigger sits in front of the door, offset toward the plaza */
      addTrigger(
        x + Math.sin(faceY) * 3.4,
        z + Math.cos(faceY) * 3.4,
        CFG.building.trigger,
        proj.name,
        'project',
      );
    });

    /* District signpost: a landmark you read at a glance, not another thing to
       press E on — the buildings themselves carry the interactions. Placed just
       in front of the cluster and pushed sideways off the path until legal. */
    const signA = d.angle;
    const inFront = CFG.districtRing - pts.halfD - 7;
    const side = { x: Math.cos(signA + Math.PI / 2), z: Math.sin(signA + Math.PI / 2) };
    const pref = {
      x: Math.cos(signA) * inFront + side.x * 5.5,
      z: Math.sin(signA) * inFront + side.z * 5.5,
    };
    const spot = findClear(pref, side, 1.6, colliders, triggers, CFG.rules) || pref;
    /* face the sign back toward the plaza, same rule the buildings use — the
       old `-signA` pointed them outward, so you read them from behind */
    props.push({
      kind: 'districtSign', x: spot.x, z: spot.z,
      rotY: Math.atan2(-spot.x, -spot.z),
      label: d.label, tone: d.tone, district: d.key,
    });
    addCollider(spot.x, spot.z, 1.6, `sign:${d.key}`);

    /* The path stops at the district ENTRANCE, not its centre. Running it to
       the cluster centre put the road straight through the houses — the
       nearest buildings sat exactly on the centreline. */
    const stop = CFG.districtRing - pts.halfD - 6.5;
    paths.push({ from: { x: 0, z: 0 }, to: { x: Math.cos(signA) * stop, z: Math.sin(signA) * stop }, width: 5.0 });
  });

  /* --- landmarks around the plaza rim --- */
  /* With two districts there are only two paths, so landmarks are given
     explicit angles well clear of both roads; validate.js proves it. */
  const LANDMARKS = [
    { kind: 'board',     angle: -2.55, dist: 22, r: 2.6, trigger: 3.2, tag: 'directory' },
    { kind: 'philboard', angle: -0.75, dist: 22, r: 2.6, trigger: 3.2, tag: 'approach' },
    { kind: 'kiosk',     angle:  3.05, dist: 23, r: 2.6, trigger: 3.0, tag: 'writing' },
    { kind: 'mailbox',   angle:  2.05, dist: 21, r: 0.8, trigger: 2.4, tag: 'contact' },
    { kind: 'dock',      angle:  1.25, dist: CFG.island.radius - 4, r: 0, trigger: 0, tag: 'dock' },
  ];
  LANDMARKS.forEach((lm) => {
    const x = Math.cos(lm.angle) * lm.dist;
    const z = Math.sin(lm.angle) * lm.dist;
    const faceY = Math.atan2(-x, -z);
    props.push({ kind: lm.kind, x, z, rotY: faceY, tag: lm.tag });
    if (lm.r > 0) addCollider(x, z, lm.r, lm.tag);
    if (lm.trigger > 0) {
      addTrigger(x + Math.sin(faceY) * (lm.r + 1.6), z + Math.cos(faceY) * (lm.r + 1.6), lm.trigger, lm.tag, lm.kind);
    }
  });

  /* --- the guide stands by the spawn and can be talked to again --- */
  const guide = { x: 3.6, z: 14.8 };
  addCollider(guide.x, guide.z, 0.6, 'guide');
  addTrigger(guide.x, guide.z, 2.2, 'guide', 'talk');

  /* --- animal hosts beside the newsstand and mailbox, decorative only --- */
  const hosts = [];
  [['writing', 'rabbit'], ['contact', 'bear']].forEach(([tag, kind]) => {
    const lm = props.find((p) => p.tag === tag);
    const side = { x: Math.cos(Math.atan2(lm.z, lm.x) + Math.PI / 2), z: Math.sin(Math.atan2(lm.z, lm.x) + Math.PI / 2) };
    const pref = { x: lm.x + side.x * 3.5, z: lm.z + side.z * 3.5 };
    const spot = findClear(pref, side, 0.6, colliders, triggers, CFG.rules) || pref;
    hosts.push({ kind, x: spot.x, z: spot.z, faceY: Math.atan2(-spot.x, -spot.z), tag });
    addCollider(spot.x, spot.z, 0.6, `host:${tag}`);
  });

  /* --- scenery: trees + rocks, placed only where they don't collide --- */
  const scenery = [];
  /* myR is the candidate's own radius: clearance must be measured the same way
     the validator measures it (r1 + r2 + gap), otherwise placement passes here
     and fails there — which is exactly how a tree ended up inside a signpost */
  const clearOf = (x, z, myR, pad) => {
    const g = CFG.rules.minColliderGap + (pad || 0);
    for (const c of colliders) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + myR + g) return false;
    }
    for (const t of triggers) {
      if (Math.hypot(x - t.x, z - t.z) < t.r + myR + CFG.rules.minTriggerGap) return false;
    }
    for (const s of scenery) {
      if (Math.hypot(x - s.x, z - s.z) < s.r * s.s + myR + g) return false;
    }
    for (const p of paths) {
      if (distToSegment(x, z, p.from, p.to) < p.width / 2 + myR + 0.8) return false;
    }
    /* never drop scenery on a spawn point — a tree landing on the start
       position wedges the player inside a collider on the first frame */
    for (const s of spawns) {
      if (Math.hypot(x - s.x, z - s.z) < myR + CFG.rules.spawnClearance + 2.0) return false;
    }
    return Math.hypot(x, z) > CFG.plaza.radius + myR;
  };
  let guard = 0;
  /* trees are thinned near the middle of the island: dense scenery around the
     plaza turns the third-person camera into a wall of foliage */
  while (scenery.length < 95 && guard++ < 9000) {
    const a = rnd() * Math.PI * 2;
    const rr = 24 + rnd() * (CFG.island.radius - 32);
    if (rr > coastRadiusAt(a) - CFG.island.beach - 3) continue;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const isRock = rnd() < 0.18;
    const base = isRock ? 0.7 : 1.0;
    const s = isRock ? 0.6 + rnd() * 0.6 : 0.75 + rnd() * 0.55;
    if (!clearOf(x, z, base * s, 0)) continue;
    scenery.push({ kind: isRock ? 'rock' : 'tree', x, z, r: base, s, rotY: rnd() * Math.PI * 2 });
    addCollider(x, z, base * s, isRock ? 'rock' : 'tree');
  }

  /* flower patches — decorative only, no colliders */
  const flowers = [];
  guard = 0;
  while (flowers.length < 26 && guard++ < 4000) {
    const a = rnd() * Math.PI * 2;
    const rr = 18 + rnd() * (CFG.island.radius - 30);
    if (rr > coastRadiusAt(a) - CFG.island.beach - 4) continue;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!clearOf(x, z, 2.2)) continue;
    flowers.push({ x, z, n: 12 + Math.floor(rnd() * 16), spread: 2.2 + rnd() * 2.4 });
  }

  /* home spots for the roaming llamas and rabbits — spread out, on clear ground, well
     inside the beach so they never wander into the sea */
  const wanderers = [];
  guard = 0;
  while (wanderers.length < 8 && guard++ < 6000) {
    const a = rnd() * Math.PI * 2;
    const rr = 22 + rnd() * (CFG.island.radius - 46);
    if (rr > coastRadiusAt(a) - CFG.island.beach - 10) continue;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!clearOf(x, z, 1.4, 0.6)) continue;
    if (wanderers.some((w) => Math.hypot(x - w.x, z - w.z) < 15)) continue;
    const kind = wanderers.length % 2 ? 'rabbit' : 'llama';
    wanderers.push({ x, z, kind, roam: 7 + rnd() * 5, seed: Math.floor(rnd() * 1e6) });
  }

  return {
    cfg: CFG,
    districts: DISTRICTS,
    coast,
    coastRadiusAt,
    colliders,
    triggers,
    spawns,
    buildings,
    props,
    paths,
    scenery,
    flowers,
    wanderers,
    guide,
    hosts,
  };
}

function distToSegment(px, pz, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const wx = px - a.x, wz = pz - a.z;
  const len2 = vx * vx + vz * vz;
  let t = len2 ? (wx * vx + wz * vz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildLayout, CFG, DISTRICTS, distToSegment };
}
