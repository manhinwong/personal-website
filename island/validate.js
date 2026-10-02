#!/usr/bin/env node
/* ============================================================
   Marcus Island — LAYOUT VALIDATOR
   ------------------------------------------------------------
   Runs before every build. Proves the layout is physically sane
   so geometry bugs are caught here, at build time, instead of by
   whoever is walking around the island.

   Every check below exists because that exact bug shipped once:
     - colliders overlapping      -> an NPC merged with its own desk
     - trigger zones touching     -> one keypress fired the wrong thing
     - spawn inside a trigger     -> instant unwanted teleport
     - trigger sealed by solids   -> interactable you can't reach
     - object off the island      -> houses beyond the walk radius
     - prop sitting on a path     -> signboard standing in the road
   ============================================================ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const ctx = { module: undefined, console };
vm.createContext(ctx);
/* both files must share one lexical scope: top-level `const` does not attach
   to the VM context object, so running them separately would hide PROJECTS */
vm.runInContext(
  fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'layout.js'), 'utf8') + '\n' +
  ';globalThis.__X = { buildLayout, CFG, DISTRICTS, distToSegment, PROJECTS };',
  ctx,
);

const { buildLayout, CFG, distToSegment, PROJECTS } = ctx.__X;
const L = buildLayout(PROJECTS);

const problems = [];
const fail = (kind, msg) => problems.push({ kind, msg });

/* 1 ── no two colliders overlap ------------------------------------------ */
{
  const gap = CFG.rules.minColliderGap;
  let worst = null;
  for (let i = 0; i < L.colliders.length; i++) {
    for (let j = i + 1; j < L.colliders.length; j++) {
      const a = L.colliders[i], b = L.colliders[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const need = a.r + b.r + gap;
      if (d < need) {
        const slack = need - d;
        if (!worst || slack > worst.slack) worst = { a: a.tag, b: b.tag, d, need, slack };
      }
    }
  }
  if (worst) {
    fail('collider-overlap',
      `"${worst.a}" and "${worst.b}" overlap: ${worst.d.toFixed(2)} apart, need ${worst.need.toFixed(2)} ` +
      `(short by ${worst.slack.toFixed(2)})`);
  }
}

/* 2 ── distinct trigger zones must not touch ------------------------------ */
{
  const gap = CFG.rules.minTriggerGap;
  const hits = [];
  for (let i = 0; i < L.triggers.length; i++) {
    for (let j = i + 1; j < L.triggers.length; j++) {
      const a = L.triggers[i], b = L.triggers[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const need = a.r + b.r + gap;
      if (d < need) hits.push({ a: a.tag, b: b.tag, d, need });
    }
  }
  hits.slice(0, 5).forEach((h) => fail('trigger-touch',
    `interact zones "${h.a}" and "${h.b}" touch: ${h.d.toFixed(2)} apart, need ${h.need.toFixed(2)}`));
  if (hits.length > 5) fail('trigger-touch', `…and ${hits.length - 5} more touching pairs`);
}

/* 3 ── spawns are in genuinely neutral ground ----------------------------- */
{
  const clear = CFG.rules.spawnClearance;
  L.spawns.forEach((s) => {
    L.triggers.forEach((t) => {
      const d = Math.hypot(s.x - t.x, s.z - t.z);
      if (d < t.r + clear) {
        fail('spawn-in-trigger',
          `spawn "${s.tag}" is ${d.toFixed(2)} from trigger "${t.tag}" (r=${t.r}) — ` +
          `needs ${(t.r + clear).toFixed(2)}; player would be able to fire it immediately`);
      }
    });
    L.colliders.forEach((c) => {
      const d = Math.hypot(s.x - c.x, s.z - c.z);
      if (d < c.r + clear) {
        fail('spawn-in-collider', `spawn "${s.tag}" is inside collider "${c.tag}" (${d.toFixed(2)} < ${(c.r + clear).toFixed(2)})`);
      }
    });
  });
}

/* 4 ── every trigger has standable ground inside it ----------------------- */
{
  const PLAYER_R = 0.55;
  L.triggers.forEach((t) => {
    let standable = false;
    for (let k = 0; k < 24 && !standable; k++) {
      const a = (k / 24) * Math.PI * 2;
      for (const frac of [0.35, 0.6, 0.85]) {
        const px = t.x + Math.cos(a) * t.r * frac;
        const pz = t.z + Math.sin(a) * t.r * frac;
        const blocked = L.colliders.some((c) => Math.hypot(px - c.x, pz - c.z) < c.r + PLAYER_R);
        if (!blocked) { standable = true; break; }
      }
    }
    if (!standable) fail('trigger-unreachable', `trigger "${t.tag}" is sealed off by colliders — nowhere to stand`);
  });
}

/* 5 ── everything the player can reach is inside the walkable island ------ */
{
  const maxR = CFG.walkRadius;
  L.triggers.forEach((t) => {
    if (Math.hypot(t.x, t.z) > maxR) {
      fail('out-of-bounds', `trigger "${t.tag}" sits ${Math.hypot(t.x, t.z).toFixed(1)} from centre, beyond walk radius ${maxR}`);
    }
  });
  L.buildings.forEach((b) => {
    const r = Math.hypot(b.x, b.z);
    const coastR = L.coastRadiusAt(Math.atan2(b.z, b.x));
    if (r > coastR - CFG.island.beach) {
      fail('in-the-sea', `building "${b.project}" at r=${r.toFixed(1)} is past the beach line (${(coastR - CFG.island.beach).toFixed(1)})`);
    }
  });
}

/* 6 ── nothing solid is standing in a path -------------------------------- */
{
  /* checked for every solid thing, not just signs: a building or tree sitting
     in the road reads as a mistake even though nothing is technically broken */
  const onPath = (x, z, r, name, kind) => {
    L.paths.forEach((pa) => {
      const d = distToSegment(x, z, pa.from, pa.to);
      const need = pa.width / 2 + r;
      if (d < need) {
        hitsPath.push({ kind, name, d, need, over: need - d });
      }
    });
  };
  const hitsPath = [];
  L.props.filter((p) => p.kind === 'districtSign')
    .forEach((p) => onPath(p.x, p.z, 1.6 + 1.2, p.label || p.kind, 'sign'));
  L.buildings.forEach((b) => onPath(b.x, b.z, CFG.building.collider + 0.6, b.project, 'building'));
  L.scenery.forEach((s) => onPath(s.x, s.z, s.r * s.s + 0.6, s.kind, 'scenery'));
  /* landmarks and hosts too — these have hand-set angles, which is exactly the
     thing that silently breaks the next time a district angle moves */
  L.colliders.filter((c) => ['writing', 'contact', 'directory', 'approach', 'guide'].includes(c.tag) || c.tag.startsWith('host:'))
    .forEach((c) => onPath(c.x, c.z, c.r + 0.6, c.tag, 'landmark'));

  const worst = hitsPath.sort((a, b) => b.over - a.over);
  worst.slice(0, 6).forEach((h) =>
    fail('on-path', `${h.kind} "${h.name}" stands in a path — ${h.d.toFixed(2)} from the centreline, needs ${h.need.toFixed(2)}`));
  if (worst.length > 6) fail('on-path', `…and ${worst.length - 6} more things blocking paths`);
}

/* 7 ── every project is actually on the island --------------------------- */
{
  const placed = new Set(L.buildings.map((b) => b.project));
  const missing = PROJECTS.filter((p) => !placed.has(p.name));
  if (missing.length) fail('missing-project', `${missing.length} projects have no house: ${missing.map((m) => m.name).join(', ')}`);
  if (placed.size !== L.buildings.length) fail('duplicate-project', 'a project was placed more than once');
}

/* ---------------- report ---------------- */
const counts = {
  projects: PROJECTS.length,
  buildings: L.buildings.length,
  colliders: L.colliders.length,
  triggers: L.triggers.length,
  scenery: L.scenery.length,
  districts: L.districts.length,
};

if (problems.length) {
  console.error('\n✗ LAYOUT INVALID — ' + problems.length + ' problem(s):\n');
  problems.forEach((p) => console.error(`  [${p.kind}] ${p.msg}`));
  console.error('');
  process.exit(1);
}

console.log('✓ layout valid');
console.log(`  ${counts.buildings}/${counts.projects} projects placed across ${counts.districts} districts`);
console.log(`  ${counts.colliders} colliders · ${counts.triggers} interact zones · ${counts.scenery} scenery props`);
console.log('  checks: no collider overlaps · no touching interact zones · spawns neutral');
console.log('          all triggers standable · nothing in the sea · nothing blocking a path');
