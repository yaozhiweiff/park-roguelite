import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pathX } from "./maps.js";
import { bar, box, cyl, facility, gate, makeGuest, material, mesh, shadow, sphere } from "./models.js";

const cream = 0xffecc7;
const bark = 0xd39a60;
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
}

function meadow(scene) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const next = random(73);
  ctx.fillStyle = "#9fca52";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 270; i++) {
    const x = next() * 512;
    const y = next() * 512;
    const size = 8 + next() * 25;
    const patch = ctx.createRadialGradient(x, y, 1, x, y, size);
    patch.addColorStop(0, next() < 0.5 ? "rgba(218,242,117,.18)" : "rgba(78,130,55,.17)");
    patch.addColorStop(1, "rgba(165,205,78,0)");
    ctx.fillStyle = patch;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  for (let i = 0; i < 3800; i++) {
    const x = next() * 512;
    const y = next() * 512;
    ctx.strokeStyle = i % 2 ? "rgba(232,250,138,.19)" : "rgba(78,133,42,.15)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 1.2, y - 1.7, x + 0.2, y - 2.2 - next() * 2.8);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 4;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(29, 29), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96 }));
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
}

function ribbon(lane, width, y, color, textured = false) {
  const positions = [];
  const colors = [];
  const triangles = [];
  const count = Math.ceil((lane.start - lane.end) * 12);
  const base = new THREE.Color(color);
  for (let i = 0; i <= count; i++) {
    const z = THREE.MathUtils.lerp(lane.start, lane.end, i / count);
    const x = pathX(lane, z);
    for (const side of [-1, 1]) {
      positions.push(x + width / 2 * side, y, z);
      const variation = textured ? 1 + 0.033 * Math.sin(z * 3.1 + side * 0.2) : 1;
      colors.push(base.r * variation, base.g * variation, base.b * variation);
    }
    if (i < count) {
      const start = i * 2;
      triangles.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  shape.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  shape.setIndex(triangles);
  shape.computeVertexNormals();
  return new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.91, side: THREE.DoubleSide }));
}

function arrow(group, x, z, heading) {
  const mark = new THREE.Shape();
  mark.moveTo(-0.071, -0.28);
  mark.lineTo(0.071, -0.28);
  mark.lineTo(0.071, 0.04);
  mark.lineTo(0.20, 0.04);
  mark.lineTo(0, 0.27);
  mark.lineTo(-0.20, 0.04);
  mark.lineTo(-0.071, 0.04);
  mark.closePath();
  const paint = mesh(group, new THREE.ShapeGeometry(mark), cream, x, 0.037, z);
  paint.rotation.set(-Math.PI / 2, 0, heading);
}


function tree(group, x, z, s, variant) {
  shadow(group, x + 0.36 * s, z - 0.18 * s, 2.3 * s, 1.85 * s);
  const trunk = new THREE.Group();
  trunk.position.set(x, 0, z);
  trunk.scale.setScalar(s);
  group.add(trunk);
  cyl(trunk, 0.14, 0.23, 0.91, bark, 0, 0.455, 0, 12);
  const leaves = variant ? [0x80b747, 0xa2cd50, 0xa7d75d] : [0x85bb42, 0xa9d74e, 0xc3e45c];
  for (const [dx, y, dz, r, color] of [[0, 1.31, -0.11, 0.58, 0], [-0.32, 1.16, 0.14, 0.38, 1], [0.34, 1.28, 0.17, 0.39, 1], [0.05, 1.74, -0.07, 0.47, 2], [-0.13, 1.50, 0.25, 0.40, 2]]) {
    sphere(trunk, r, leaves[color], dx, y, dz, 1.07, 0.90, 1.03);
  }
  batchDecorations(trunk);
  return trunk;
}

function shrub(group, x, z, size, bloom = false) {
  shadow(group, x + 0.07, z, size * 2.1, size * 1.45);
  sphere(group, size * 0.52, 0x8fc543, x - size * 0.38, size * 0.27, z + 0.04, 1.10, 0.75, 1);
  sphere(group, size * 0.57, 0xb3d85a, x + size * 0.31, size * 0.31, z, 1.12, 0.72, 1.02);
  sphere(group, size * 0.63, 0xa4d249, x, size * 0.45, z - size * 0.2, 1.03, 0.86, 1);
  if (bloom) for (let i = 0; i < 3; i++) {
    const cx = x + size * (i - 1) * 0.37;
    const cz = z + (i === 1 ? -0.13 : 0.09);
    const cy = size * (i === 1 ? 0.86 : 0.74);
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5;
      sphere(group, 0.055, i === 1 ? 0xfff1b9 : 0xf59ac3, cx + Math.sin(a) * 0.061, cy, cz + Math.cos(a) * 0.061, 1, 0.53, 1);
    }
    sphere(group, 0.052, 0xffcc52, cx, cy + 0.019, cz, 1, 0.58, 1);
  }
}

function fence(group, route, start, end, side, width) {
  const count = Math.floor((start - end) / 0.42);
  let previous;
  for (let i = 0; i <= count; i++) {
    const z = THREE.MathUtils.lerp(start, end, i / count);
    const x = pathX(route, z) + side * width / 2;
    cyl(group, 0.068, 0.079, 0.36, 0xf1c17c, x, 0.20, z, 10);
    cyl(group, 0.071, 0.071, 0.072, cream, x, 0.386, z, 10);
    if (previous) bar(group, { ...previous, y: 0.188 }, { x, z }, 0.087, 0.115, 0xf4d098);
    previous = { x, z };
  }
}

function batchDecorations(group) {
  const matrices = new THREE.Matrix4();
  group.updateMatrixWorld(true);
  matrices.copy(group.matrixWorld).invert();
  const chunks = new Map();
  const original = [];
  group.traverse((part) => {
    if (!part.isMesh || part.material.transparent || part.material.map || !part.geometry.attributes.normal) return;
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(matrices, part.matrixWorld));
    for (const key of Object.keys(geometry.attributes)) if (key !== "normal" && key !== "position") geometry.deleteAttribute(key);
    const items = chunks.get(part.material) ?? [];
    items.push(geometry);
    chunks.set(part.material, items);
    original.push(part);
  });
  original.forEach((part) => part.removeFromParent());
  for (const [surface, parts] of chunks) {
    const joined = mergeGeometries(parts);
    if (joined) group.add(new THREE.Mesh(joined, surface));
    parts.forEach((part) => part.dispose());
  }
}


function decorate(map) {
  const root = new THREE.Group();
  const garden = new THREE.Group();
  const wind = new THREE.Group();
  root.add(garden, wind);
  const roadWidth = map.id === "double" ? 2.12 : map.id === "triple" ? 1.78 : 1.65;
  const [top, edge] = map.colors;
  const entryZ = map.nodes.entry[1];
  const exitZ = map.nodes.exit[1];

  map.lanes.forEach((lane, index) => {
    const start = map.nodes[lane.from][1] + (lane.from === "entry" ? 0.65 : 0);
    const end = map.nodes[lane.to][1] - (lane.to === "exit" ? 0.65 : 0);
    const strip = { ...lane, start, end };
    root.add(ribbon(strip, roadWidth, 0.009 + index * 0.001, edge));
    root.add(ribbon(strip, roadWidth - 0.14, 0.024 + index * 0.001, top, true));
    const z = start - (start - end) * 0.40;
    const heading = Math.atan2(pathX(lane, z - 0.4) - pathX(lane, z + 0.4), 0.8);
    arrow(garden, pathX(lane, z), z, -heading);
    if (lane.to === "exit" || lane.from === "entry") {
      for (const side of [-1, 1]) fence(garden, lane, start - 0.7, end + 0.75, side, roadWidth);
    } else if (lane.to === "merge" && lane.points.length > 2) {
      const [, first] = lane.points[1];
      const [, last] = lane.points.at(-2);
      for (const side of [-1, 1]) fence(garden, lane, first, last, side, roadWidth);
    }
  });

  const nearGate = gate();
  const farGate = gate();
  nearGate.position.z = entryZ - 0.05;
  nearGate.scale.setScalar(0.88);
  farGate.position.z = exitZ + 0.08;
  farGate.scale.setScalar(0.91);
  garden.add(nearGate, farGate);
  const groves = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 5; index++) {
      const z = THREE.MathUtils.lerp(entryZ - 0.9, exitZ + 0.7, index / 4);
      const outer = Math.max(0, ...map.lanes.filter((lane) => z <= lane.points[0][1] && z >= lane.points.at(-1)[1])
        .map((lane) => Math.abs(pathX(lane, z))));
      const x = side * Math.max(outer + roadWidth / 2 + 0.60, 2.58 + (index % 3) * 0.45);
      groves.push([x, z, 0.86 + (index % 3) * 0.13]);
    }
  }
  if (map.id === "double") groves.push([0, -1.07, 0.67]);
  const trees = groves.map(([x, z, size], i) => tree(wind, x, z, size, i % 3 === 0));
  const next = random(242);
  for (let index = 0; index < 110; index++) {
    const x = (next() < 0.5 ? -1 : 1) * (0.15 + next() * map.width / 2);
    const z = exitZ + next() * (entryZ - exitZ + 0.8);
    const occupied = map.lanes.some((lane) => z <= lane.points[0][1] + 0.4 && z >= lane.points.at(-1)[1] - 0.4 &&
      Math.abs(pathX(lane, z) - x) < roadWidth / 2 + 0.32);
    if (occupied || groves.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 0.50)) continue;
    const size = 0.15 + next() * 0.27;
    if (index % 6 === 0) {
      sphere(garden, size, index % 2 ? 0xd0bd9e : 0xc2b7ae, x, size * 0.26, z, 1.14, 0.72, 0.90);
    } else shrub(garden, x, z, size, index % 5 === 0);
  }
  batchDecorations(garden);

  const flags = new Map();
  for (const [id, lanes] of Object.entries(map.outgoing)) {
    if (lanes.length < 2) continue;
    const [x, z] = map.nodes[id];
    const group = new THREE.Group();
    group.position.set(x + 0.71, 0, z + 0.27);
    cyl(group, 0.035, 0.046, 0.93, cream, 0, 0.48, 0, 10);
    sphere(group, 0.071, 0xffd45c, 0, 0.97, 0);
    const banner = box(group, 0.46, 0.22, 0.048, 0x42ae91, 0.21, 0.81, 0);
    root.add(group);
    flags.set(id, { group, banner });
  }
  const stamp = new THREE.Group();
  const [mergeX, mergeZ] = map.nodes.merge;
  stamp.position.set(mergeX - 0.88, 0, mergeZ + 0.23);
  cyl(stamp, 0.28, 0.33, 0.13, 0xe4a3cd, 0, 0.095, 0);
  box(stamp, 0.42, 0.32, 0.38, 0xc181d7, 0, 0.28, 0);
  cyl(stamp, 0.09, 0.15, 0.28, 0xffe5a1, 0, 0.52, 0);
  root.add(stamp);
  return { root, flags, trees, stamp, pads: new Map() };
}

function pad() {
  const group = new THREE.Group();
  box(group, 1.28, 0.085, 1.01, 0xe7a76e, 0, 0.072, 0, 0.14);
  box(group, 1.24, 0.065, 0.97, 0xffe4b3, 0, 0.126, 0, 0.12);
  return group;
}

export class ParkView {
  constructor(canvas, onResize) {
    this.canvas = canvas;
    this.onResize = onResize;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setClearColor(0xa4cf56);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.10;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 8, -8, 0.1, 65);
    this.scene.add(new THREE.HemisphereLight(0xfff4da, 0x9fac71, 2.0));
    const sun = new THREE.DirectionalLight(0xfff1d2, 2.30);
    sun.position.set(-4, 9, 6);
    this.scene.add(sun);
    const bounce = new THREE.DirectionalLight(0xd7e7ff, 0.44);
    bounce.position.set(5, 2, -5);
    this.scene.add(bounce);

    meadow(this.scene);
    this.stages = new Map();
    this.facilities = new Map();
    this.buildings = new Map();
    this.models = [];
    this.position = new THREE.Vector3();
    this.motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ringGeometry = new THREE.RingGeometry(0.48, 0.59, 24);
    this.signals = Array.from({ length: 6 }, () => {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xffef82, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.scene.add(ring);
      return { ring, end: -1 };
    });
    this.nextSignal = 0;
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas);
  }

  fit() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (!width || !height || !this.map) return;
    this.width = width;
    this.height = height;
    const aspect = width / height;
    const entry = this.map.nodes.entry[1];
    const exit = this.map.nodes.exit[1];
    const pitch = Math.atan2(17.2, 15.6);
    const top = height > 390 ? 114 : 91;
    const bottom = 16;
    const usable = Math.max(150, height - top - bottom);
    const vertical = Math.max((entry - exit + 2.1) * Math.sin(pitch) * height / usable, this.map.width / aspect);
    this.camera.left = -vertical * aspect / 2;
    this.camera.right = vertical * aspect / 2;
    this.camera.top = vertical / 2;
    this.camera.bottom = -vertical / 2;
    const center = (entry + exit) / 2 - (top - bottom) * vertical / (height * 2 * Math.sin(pitch));
    this.camera.position.set(0, 17.2, center + 15.6);
    this.camera.lookAt(0, 0.08, center);
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.onResize();
  }

  setMap(map) {
    this.finish();
    if (this.stage) this.stage.root.removeFromParent();
    this.facilities.forEach((building) => building.group.removeFromParent());
    this.facilities.clear();
    this.map = map;
    if (!this.stages.has(map.id)) {
      const stage = decorate(map);
      for (const lot of map.lots) {
        const marker = pad();
        marker.position.set(lot.x, 0, lot.z);
        stage.root.add(marker);
        stage.pads.set(lot.id, marker);
      }
      this.stages.set(map.id, stage);
    }
    this.stage = this.stages.get(map.id);
    this.scene.add(this.stage.root);
    this.fit();
  }

  setBuffs(activeBuffs) {
    this.stage.flags.forEach(({ group }) => { group.visible = activeBuffs.has("flags"); });
    this.stage.stamp.visible = activeBuffs.has("stamps");
  }

  signal(event) {
    if (!this.motion) return;
    if (event.guided) {
      const fork = Object.keys(this.map.nodes).find((id) => this.map.nodes[id][1] === event.z && this.map.nodes[id][0] === event.x);
      const marker = this.stage.flags.get(fork);
      if (marker) marker.end = this.now + 0.55;
      return;
    }
    const signal = this.signals[this.nextSignal++ % this.signals.length];
    signal.ring.position.set(event.x, 0.14, event.z);
    signal.ring.material.color.setHex(event.id === "stamps" ? 0xff9bdf : event.relay ? 0x9ef7d0 : 0xffe57e);
    signal.end = this.now + 0.62;
  }

  project(x, y, z) {
    this.position.set(x, y, z).project(this.camera);
    return { x: (this.position.x + 1) * this.width / 2, y: (1 - this.position.y) * this.height / 2 };
  }


  setLayout(layout, operating) {
    for (const [slot, building] of this.facilities) {
      if (layout[slot] === building.id) continue;
      building.group.removeFromParent();
      this.facilities.delete(slot);
    }
    for (const lot of this.map.lots) {
      const id = layout[lot.id];
      this.stage.pads.get(lot.id).visible = !id && !operating;
      if (!id || this.facilities.has(lot.id)) continue;
      if (!this.buildings.has(id)) this.buildings.set(id, { ...facility(id), id });
      const model = this.buildings.get(id);
      model.group.position.set(lot.x, 0.025, lot.z);
      const size = this.map.id === "cascade" ? 0.828 : 0.912;
      model.group.scale.setScalar(id === "coaster" ? size * 0.93 : size);
      this.scene.add(model.group);
      this.facilities.set(lot.id, model);
    }
  }

  start(guests) {
    this.guests = guests;
    guests.forEach((guest, i) => {
      if (!this.models[i]) {
        const model = makeGuest(i);
        this.scene.add(model.group);
        this.models.push(model);
      }
      const model = this.models[i];
      model.group.visible = false;
      model.bucket.visible = false;
      model.candy.visible = false;
      model.reaction = null;
      model.segment = 0;
    });
  }

  react(event) {
    const model = this.models[event.guest];
    if (!model) return;
    if (event.type === "visit" && event.id === "snack") {
      model.bucket.visible = true;
      model.candy.visible = false;
    }
    if (event.type === "visit" && event.id === "candy" && !model.bucket.visible) model.candy.visible = true;
    model.reaction = event;
  }

  projectGuest(index) {
    const model = this.models[index];
    if (!model?.group.visible) return null;
    const { x, z } = model.group.position;
    return this.project(x, 1.35 + model.body.position.y, z);
  }

  finish() {
    this.guests = null;
    this.signals.forEach((signal) => { signal.end = -1; signal.ring.visible = false; });
    this.models.forEach((model) => { model.group.visible = false; });
  }

  takePhoto() {
    const width = 220;
    const height = 132;
    if (!this.width || this.width < width || this.height < height) return;
    this.photo ??= this.makePhotoScene(width / height);
    const { scene, camera } = this.photo;
    const renderer = this.renderer;
    const ratio = renderer.getPixelRatio();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
    canvas.getContext("2d").drawImage(this.canvas, 0, this.canvas.height - canvas.height, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, this.width, this.height);
    return canvas.toDataURL("image/webp", 0.90);
  }

  makePhotoScene(aspect) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffd69b);
    const camera = new THREE.OrthographicCamera(-0.64 * aspect, 0.64 * aspect, 0.64, -0.64, 0.1, 15);
    camera.position.set(0.10, 1.28, 3.7);
    camera.lookAt(0, 0.49, 0);
    scene.add(new THREE.HemisphereLight(0xffefdb, 0xbaa584, 2.05));
    const lamp = new THREE.DirectionalLight(0xffe7c9, 2.0);
    lamp.position.set(-2, 4, 3);
    scene.add(lamp);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material(0xf6bd8e));
    base.rotation.x = -Math.PI / 2;
    scene.add(base);
    const friend = makeGuest(1);
    friend.group.position.set(0.28, 0, -0.14);
    friend.body.rotation.z = -0.20;
    friend.arms[1].rotation.x = -1.32;
    friend.arms[1].rotation.z = 0.58;
    const guest = makeGuest(0);
    guest.group.position.set(-0.37, 0, 0.09);
    guest.bucket.visible = true;
    guest.bucket.scale.setScalar(1.36);
    guest.bucket.position.set(0.50, 0.38, 0.23);
    guest.arms[1].rotation.x = -1.55;
    guest.arms[1].rotation.z = 0.88;
    scene.add(friend.group, guest.group);
    return { scene, camera };
  }

  draw(now, elapsed) {

    this.now = now;
    this.facilities.forEach((building) => building.animate(this.motion ? now : 0));
    if (this.motion && this.stage) {
      this.stage.trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(now * 1.24 + i * 0.76) * 0.042;
        tree.rotation.x = Math.sin(now * 1.04 + i * 0.81) * 0.027;
      });
      this.stage.flags.forEach((marker) => {
        const lit = (marker.end ?? 0) > now;
        marker.banner.rotation.y = Math.sin(now * (lit ? 10 : 3)) * (lit ? 0.44 : 0.12);
        marker.banner.scale.setScalar(lit ? 1.15 : 1);
      });
      for (const { ring, end } of this.signals) {
        ring.visible = end > now;
        if (ring.visible) {
          const life = (end - now) / 0.62;
          ring.material.opacity = life * 0.95;
          ring.scale.setScalar(2.1 - life * 1.35);
        }
      }
    }
    if (this.guests) for (const guest of this.guests) {
      const model = this.models[guest.index];
      const active = elapsed >= guest.start && elapsed < guest.end;
      model.group.visible = active;
      if (!active) continue;
      const steps = guest.segments;
      while (model.segment < steps.length - 1 && elapsed > steps[model.segment].end) model.segment++;
      const step = steps[model.segment];
      const phase = THREE.MathUtils.clamp((elapsed - step.start) / (step.end - step.start), 0, 1);
      const z = THREE.MathUtils.lerp(step.from, step.to, phase);
      const walking = step.from !== step.to;
      const currentX = pathX(step.lane, z);
      const nextX = pathX(step.lane, z - 0.12);
      const beat = elapsed * (guest.member === 2 ? 17.4 : 12.5) + guest.index * 0.9;
      const t = model.reaction ? elapsed - model.reaction.time : 3;
      const reacting = t >= 0 && t < 0.78;
      const id = reacting ? model.reaction.id : null;
      const missed = reacting && model.reaction.type === "miss";
      const panic = !missed && (id === "ghost" || id === "coaster" || id === "slide");
      const pose = !missed && id === "photo" && t < 0.62;
      const happy = reacting && model.reaction.milestone === "happy";
      const bounce = !missed && (id === "trampoline" || id === "stamps" || id === "bookends");
      const spin = !missed && id === "cups" ? Math.min(t / 0.48, 1) * Math.PI * 2 : 0;
      const wave = id === "farewell" && model.reaction.mood !== "unhappy";
      const point = id === "turn" && t < 0.38;
      const armsUp = happy || bounce || (panic && guest.member !== 1);
      const carrying = model.bucket.visible || model.candy.visible;
      const spread = (guest.member - 1) * 0.37;
      const lateral = spread + (step.facility ? (guest.member === 1 ? 0.43 : -0.43) * Math.sin(phase * Math.PI) : 0);
      model.group.position.set(currentX + lateral + (walking ? Math.sin(beat) * 0.034 : 0), 0.027, z);
      model.group.rotation.y = Math.atan2(nextX - currentX, -0.12) + (pose ? 1.58 : wave ? 0.94 : 0) + spin;
      model.body.position.y = walking ? 0.034 * Math.abs(Math.sin(beat)) : 0.01;
      if (bounce) model.body.position.y += Math.abs(Math.sin(t * 11)) * Math.max(0, 0.40 - t * 0.35);
      else if (armsUp && t < 0.48) model.body.position.y += Math.sin(t / 0.48 * Math.PI) * (happy ? 0.30 : 0.18);
      model.body.rotation.x = missed ? 0.24 * Math.sin(t / 0.78 * Math.PI) : id === "rest" ? -0.16 * Math.sin(t / 0.78 * Math.PI) : 0;
      model.body.rotation.z = panic ? Math.sin(beat * 1.65) * 0.16 : Math.sin(beat) * 0.040;
      model.hat.position.y = 0.14 + (armsUp ? Math.max(0, 0.18 * Math.sin(t / 0.72 * Math.PI)) : 0);
      model.head.rotation.y = point ? (model.reaction.direction < 0 ? 0.54 : -0.54) : missed || id === "wheel" ? Math.sin(beat * 0.57) * 0.31 : 0;
      for (let side = 0; side < 2; side++) {
        const swing = Math.sin(beat + side * Math.PI);
        model.legs[side].rotation.x = walking ? swing * (panic ? 0.78 : 0.53) : 0;
        const gesture = (wave && side === 1) || (point && side === (model.reaction.direction < 0 ? 0 : 1));
        model.arms[side].rotation.x = gesture ? -1.69 : carrying ? -0.88 : armsUp ? -1.75 : walking ? -swing * 0.44 : 0;
        model.arms[side].rotation.z = gesture ? (side ? 1 : -1) * (0.88 + Math.sin(beat) * 0.20) : (side ? 1 : -1) * (armsUp ? 0.66 : 0.09);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
