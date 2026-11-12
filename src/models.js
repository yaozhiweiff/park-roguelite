import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const materials = new Map();
const boxes = new Map();
const ball = new THREE.SphereGeometry(1, 16, 12);
const cylinders = new Map();
const cream = 0xffe7a9;
const coral = 0xfb7660;
const gold = 0xffba35;
const green = 0x9ece43;

export function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.74 }));
  return materials.get(color);
}

export function mesh(group, geometry, color, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material(color));
  part.position.set(x, y, z);
  group.add(part);
  return part;
}

export function box(group, w, h, d, color, x = 0, y = 0, z = 0, round = 0.055) {
  const key = [w, h, d, round].join(",");
  if (!boxes.has(key)) boxes.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(w / 2, h / 2, d / 2, round)));
  return mesh(group, boxes.get(key), color, x, y, z);
}

export function sphere(group, radius, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const part = mesh(group, ball, color, x, y, z);
  part.scale.set(radius * sx, radius * sy, radius * sz);
  return part;
}

export function cyl(group, rt, rb, h, color, x, y, z, sides = 20) {
  const key = [rt, rb, h, sides].join(",");
  if (!cylinders.has(key)) cylinders.set(key, new THREE.CylinderGeometry(rt, rb, h, sides));
  return mesh(group, cylinders.get(key), color, x, y, z);
}

export function bar(group, from, to, w, h, color) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const piece = box(group, w, h, Math.hypot(dx, dz) + 0.03, color, (from.x + to.x) / 2, from.y, (from.z + to.z) / 2, 0.024);
  piece.rotation.y = Math.atan2(dx, dz);
  return piece;
}

const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = shadowCanvas.height = 64;
const ink = shadowCanvas.getContext("2d");
const shade = ink.createRadialGradient(32, 32, 6, 32, 32, 32);
shade.addColorStop(0, "rgba(46,54,24,.33)");
shade.addColorStop(0.48, "rgba(46,54,24,.22)");
shade.addColorStop(1, "rgba(46,54,24,0)");
ink.fillStyle = shade;
ink.fillRect(0, 0, 64, 64);
const shadowMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false });
const shadowGeo = new THREE.PlaneGeometry(1, 1);

export function shadow(group, x, z, width, depth, y = 0.034) {
  const item = new THREE.Mesh(shadowGeo, shadowMaterial);
  item.rotation.x = -Math.PI / 2;
  item.position.set(x, y, z);
  item.scale.set(width, depth, 1);
  group.add(item);
  return item;
}

function star(group, x, y, z, size, color = gold) {
  const outline = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = size * (i % 2 ? 0.51 : 1);
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;
    if (i === 0) outline.moveTo(dx, dy);
    else outline.lineTo(dx, dy);
  }
  outline.closePath();
  return mesh(group, new THREE.ExtrudeGeometry(outline, { depth: 0.045, bevelSize: 0.027, bevelThickness: 0.022, bevelSegments: 2 }), color, x, y, z);
}

function arch(group, width = 1.93, height = 1.57, depth = 0.41) {
  const column = width / 2;
  for (const x of [-column, column]) {
    box(group, 0.30, height - 0.32, depth, 0xf9c257, x, (height - 0.32) / 2, 0);
    box(group, 0.44, 0.19, depth + 0.13, cream, x, 0.16, 0);
    box(group, 0.45, 0.23, depth + 0.10, cream, x, height - 0.39, 0);
  }
  const outline = new THREE.Shape();
  outline.moveTo(-column, height - 0.40);
  outline.quadraticCurveTo(0, height + 0.79, column, height - 0.40);
  outline.lineTo(column, height - 0.68);
  outline.quadraticCurveTo(0, height + 0.43, -column, height - 0.68);
  outline.closePath();
  mesh(group, new THREE.ExtrudeGeometry(outline, { depth, bevelSize: 0.052, bevelThickness: 0.043, bevelSegments: 2, curveSegments: 10 }), coral, 0, 0, -depth / 2);
  star(group, 0, height + 0.025, depth / 2 + 0.04, 0.22);
}

export function gate() {
  const group = new THREE.Group();
  arch(group);
  for (const x of [-1.43, 1.43]) {
    box(group, 0.65, 0.37, 0.19, cream, x, 0.23, 0);
    cyl(group, 0.081, 0.084, 0.46, 0xf2bd67, x + Math.sign(x) * 0.28, 0.25, 0);
  }
  return group;
}

function platform(group, w = 1.69, d = 1.40) {
  shadow(group, 0.12, 0.10, w + 1.05, d + 0.92, 0.047);
  box(group, w, 0.14, d, 0xb3a24f, 0, 0.10, 0, 0.095);
  box(group, w - 0.07, 0.13, d - 0.06, green, 0, 0.17, 0, 0.095);
}

function canopy(group, r, height, y, first = coral, second = cream, openFront = false) {
  const wedges = 14;
  for (let i = 0; i < wedges; i++) {
    if (openFront && Math.cos((i + 0.5) * Math.PI * 2 / wedges) > 0.10) continue;
    mesh(group, new THREE.CylinderGeometry(0.09, r, height, 3, 1, false, i * Math.PI * 2 / wedges, Math.PI * 2 / wedges),
      i % 2 ? first : second, 0, y, 0);
  }
  if (!openFront) cyl(group, r, r, 0.11, gold, 0, y - height / 2 - 0.02, 0, 36);
}

function horse(group, angle) {
  const piece = new THREE.Group();
  const x = Math.sin(angle) * 0.53;
  const z = Math.cos(angle) * 0.53;
  piece.position.set(x, 0.44, z);
  piece.rotation.y = angle + Math.PI / 2;
  group.add(piece);
  sphere(piece, 0.18, 0xfff0c6, 0, 0.08, 0, 0.70, 0.78, 1.43);
  sphere(piece, 0.14, 0xffefc9, 0, 0.24, 0.18, 0.78, 1.20, 1);
  sphere(piece, 0.089, 0xf2cb78, 0, 0.21, 0.26, 0.89, 0.65, 1);
  box(piece, 0.16, 0.07, 0.16, 0xec709a, 0, 0.19, -0.06);
  for (const x of [-0.068, 0.068]) for (const z of [-0.115, 0.12]) {
    const leg = cyl(piece, 0.039, 0.048, 0.19, 0xfff0c6, x, -0.04, z, 8);
    leg.rotation.x = z > 0 ? -0.50 : 0.36;
  }
  for (const x of [-0.058, 0.058]) {
    sphere(piece, 0.040, 0xe2aa67, x, 0.37, 0.19, 0.65, 1.4, 0.72);
    sphere(piece, 0.018, 0x62443d, x * 1.69, 0.26, 0.23);
  }
  return piece;
}

function carousel(group) {
  platform(group, 1.90, 1.73);
  cyl(group, 0.79, 0.84, 0.15, coral, 0, 0.31, 0, 36);
  cyl(group, 0.80, 0.80, 0.045, cream, 0, 0.405, 0, 36);
  const riderDeck = new THREE.Group();
  group.add(riderDeck);
  const horses = [];
  for (let i = 0; i < 4; i++) {
    const a = (i + 0.5) * Math.PI / 2;
    horses.push(horse(riderDeck, a));
    cyl(riderDeck, 0.019, 0.019, 0.96, gold, Math.sin(a) * 0.52, 0.87, Math.cos(a) * 0.52, 8);
  }
  cyl(group, 0.07, 0.085, 1.25, gold, 0, 0.99, 0);
  for (const x of [-0.65, 0.65]) cyl(group, 0.049, 0.061, 1.24, cream, x, 0.91, -0.32);
  canopy(group, 0.85, 0.35, 1.58, coral, cream, true);
  star(group, 0, 1.86, 0.04, 0.19);
  return (time) => {
    riderDeck.rotation.y = time * 0.61;
    horses.forEach((pony, index) => { pony.position.y = 0.50 + Math.sin(time * 3.7 + index * 1.57) * 0.13; });
  };
}

export function popcorn(group, x = 0, y = 0, z = 0, scale = 1) {
  const bucket = new THREE.Group();
  bucket.position.set(x, y, z);
  bucket.scale.setScalar(scale);
  group.add(bucket);
  cyl(bucket, 0.23, 0.17, 0.30, 0xfff0c7, 0, 0.15, 0);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const stripe = box(bucket, 0.071, 0.269, 0.016, coral, Math.sin(angle) * 0.204, 0.15, Math.cos(angle) * 0.204, 0.005);
    stripe.rotation.y = angle;
    stripe.rotateX(0.18);
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39;
    const r = i ? 0.135 : 0;
    sphere(bucket, i ? 0.105 : 0.13, i % 2 ? 0xffdd73 : 0xffefa7, Math.cos(a) * r, i ? 0.33 : 0.43, Math.sin(a) * r);
  }
  return bucket;
}

function cameraIcon(group, x, y, z, scale = 1) {
  const sign = new THREE.Group();
  sign.position.set(x, y, z);
  sign.scale.setScalar(scale);
  group.add(sign);
  box(sign, 0.56, 0.36, 0.16, 0xa476e6);
  box(sign, 0.22, 0.13, 0.15, 0xbe97ef, -0.12, 0.19, -0.01);
  cyl(sign, 0.155, 0.155, 0.070, 0xf8e4ff, 0, 0, 0.112).rotation.x = Math.PI / 2;
  cyl(sign, 0.103, 0.103, 0.074, 0x7354af, 0, 0, 0.141).rotation.x = Math.PI / 2;
  return sign;
}

function kiosk(group, id) {
  const isPhoto = id === "photo";
  const isCandy = id === "candy";
  const accent = isPhoto ? 0xec8ab4 : isCandy ? 0xefa5b9 : coral;
  platform(group);
  for (const x of [-0.61, 0.61]) {
    for (const z of [-0.48, 0.46]) box(group, 0.16, 0.91, 0.17, 0xffcc81, x, 0.71, z);
  }
  box(group, 1.44, 0.12, 1.11, cream, 0, 1.17, -0.05);
  for (let i = 0; i < 7; i++) {
    const panel = box(group, 0.223, 0.11, 1.19, i % 2 ? cream : accent, (i - 3) * 0.218, 1.26, 0.08, 0.048);
    panel.rotation.x = 0.24;
    sphere(group, 0.112, i % 2 ? cream : accent, (i - 3) * 0.218, 1.10, 0.64, 1, 0.72, 0.65);
  }
  box(group, 0.44, 0.46, 0.78, isPhoto ? 0xac7be0 : 0xefb55c, 0.40, 0.45, 0.05);
  box(group, 0.57, 0.09, 0.88, cream, 0.38, 0.71, 0.05);
  if (isPhoto) {
    const sign = cameraIcon(group, 0, 1.55, 0.24);
    const glint = star(group, 0.36, 1.82, 0.46, 0.13, 0xffefa1);
    for (let i = 0; i < 3; i++) {
      sphere(group, 0.11, accent, -0.61 + i * 0.081, 0.77, 0.52, 0.82, 3.2, 0.66);
    }
    box(group, 0.27, 0.23, 0.05, 0xfdf1cb, 0.45, 0.90, 0.59);
    return (time) => {
      sign.rotation.y = Math.sin(time * 2) * 0.23;
      glint.scale.setScalar(Math.max(0.02, Math.sin(time * 2.5) ** 10));
      glint.rotation.z = time * 1.9;
    };
  }
  if (isCandy) {
    const candy = new THREE.Group();
    candy.position.set(0, 1.31, 0.18);
    group.add(candy);
    cyl(candy, 0.032, 0.032, 0.36, cream, 0, 0.12, 0);
    sphere(candy, 0.28, 0xf6a5d1, 0, 0.37, 0, 1, 0.88, 0.92);
    sphere(candy, 0.14, 0xffc2dd, -0.13, 0.49, 0.04);
    return (time) => {
      candy.rotation.y = time * 1.8;
      candy.rotation.z = Math.sin(time * 2.1) * 0.15;
    };
  }
  const bucket = popcorn(group, 0, 1.29, 0.16, 1.19);
  popcorn(group, 0.38, 0.74, 0.40, 0.44);
  const kernels = [0, 1, 2].map((index) => sphere(group, 0.067, 0xffe690, index * 0.15 - 0.15, 1.73, 0.18));
  return (time) => {
    bucket.rotation.z = Math.sin(time * 2.3) * 0.075;
    kernels.forEach((kernel, index) => {
      const phase = (time * 0.9 + index * 0.21) % 1;
      kernel.position.y = 1.72 + Math.sin(phase * Math.PI) * (0.38 + index * 0.035);
      kernel.position.x = (index - 1) * (0.14 + phase * 0.11);
    });
  };
}

function ghost(group) {
  platform(group, 1.83, 1.56);
  for (const x of [-0.49, 0.49]) {
    box(group, 0.44, 0.81, 1.14, 0xab7ad4, x, 0.66, -0.02);
    box(group, 0.22, 0.29, 0.05, 0xffd36f, x, 0.75, 0.57);
  }
  box(group, 1.55, 0.23, 1.16, 0xa971d0, 0, 1.15, -0.03);
  const roof = new THREE.Shape();
  roof.moveTo(-0.97, 0);
  roof.lineTo(0, 0.74);
  roof.lineTo(0.97, 0);
  roof.closePath();
  mesh(group, new THREE.ExtrudeGeometry(roof, { depth: 1.31, bevelSize: 0.062, bevelThickness: 0.054, bevelSegments: 2 }), 0x8b57c7, 0, 1.23, -0.68);
  for (const dir of [-1, 1]) {
    const tile = box(group, 1.22, 0.09, 1.50, 0xa471e2, dir * 0.49, 1.64, -0.02);
    tile.rotation.z = -dir * 0.65;
    sphere(group, 0.075, gold, dir * 0.68, 0.69, 0.66);
  }
  const spirit = new THREE.Group();
  group.add(spirit);
  sphere(spirit, 0.19, 0xffeeff, 0, 0.08, 0, 1.16, 1, 0.45);
  for (const x of [-0.062, 0.062]) sphere(spirit, 0.029, 0x634080, x, 0.10, 0.082);
  for (const x of [-0.15, 0.15]) sphere(spirit, 0.082, 0xffeeff, x, -0.03, 0, 1, 0.70, 0.52);
  cyl(group, 0.027, 0.027, 0.29, gold, 0, 2.02, 0);
  const banner = box(group, 0.26, 0.115, 0.044, 0xbc8cf4, 0.15, 2.08, 0);
  return (time) => {
    spirit.position.set(Math.sin(time * 1.6) * 0.12, 1.43 + Math.sin(time * 2.65) * 0.14, 0.78);
    spirit.rotation.z = Math.sin(time * 2.5) * 0.22;
    banner.rotation.y = Math.sin(time * 4) * 0.36;
  };
}

function bumper(group) {
  platform(group, 1.94, 1.53);
  box(group, 1.82, 0.09, 1.44, 0x9fcec2, 0, 0.29, 0, 0.09);
  const cars = [-1, 1].map((dir) => {
    const car = new THREE.Group();
    group.add(car);
    box(car, 0.57, 0.11, 0.70, 0x526171, 0, 0, 0, 0.092);
    box(car, 0.48, 0.18, 0.61, dir > 0 ? coral : 0x6ecbeb, 0, 0.11, 0, 0.092);
    sphere(car, 0.11, cream, 0, 0.22, 0.15, 1, 0.62, 1);
    cyl(car, 0.014, 0.014, 0.38, gold, 0.13, 0.27, -0.19, 8);
    return car;
  });
  for (const x of [-0.83, 0.83]) cyl(group, 0.035, 0.038, 0.99, cream, x, 0.73, -0.59, 10);
  for (let i = 0; i < 5; i++) {
    const pennant = mesh(group, new THREE.ConeGeometry(0.099, 0.15, 3), i % 2 ? coral : gold, (i - 2) * 0.31, 1.10, -0.60);
    pennant.rotation.z = Math.PI;
  }
  return (time) => cars.forEach((car, i) => {
    const phase = time * 1.4 + i * 2.5;
    car.position.set((i ? 1 : -1) * 0.47 + Math.sin(phase) * 0.12, 0.38, Math.cos(phase) * 0.22);
    car.rotation.y = Math.sin(phase) * 0.84;
  });
}

function rest(group) {
  platform(group);
  for (let i = 0; i < 3; i++) box(group, 0.75, 0.073, 0.10, 0xa4d777, -0.31, 0.47, 0.06 + i * 0.112);
  box(group, 0.79, 0.16, 0.10, 0x82c667, -0.31, 0.63, -0.02);
  for (const x of [-0.63, 0.01]) box(group, 0.10, 0.28, 0.32, 0xffd47a, x, 0.36, 0.20);
  cyl(group, 0.042, 0.053, 1.19, cream, 0.53, 0.84, -0.28);
  const top = new THREE.Group();
  top.position.set(0.51, 0, -0.27);
  group.add(top);
  canopy(top, 0.53, 0.31, 1.42, 0xffc550, 0xffe286);
  const steam = sphere(group, 0.07, 0xfff8d5, -0.31, 0.70, 0.29);
  cyl(group, 0.085, 0.060, 0.105, 0x88bfc0, -0.31, 0.57, 0.29);
  return (time) => {
    top.rotation.y = Math.sin(time * 1.7) * 0.35;
    const phase = (time * 0.67) % 1;
    steam.position.y = 0.66 + phase * 0.34;
    steam.scale.setScalar(0.08 * Math.sin(phase * Math.PI));
  };
}

function stage(group) {
  platform(group);
  box(group, 1.58, 0.17, 1.20, 0xc88e6a, 0, 0.34, 0);
  for (const x of [-0.65, 0.65]) {
    box(group, 0.22, 0.94, 0.35, 0xdd5f8d, x, 0.81, -0.29);
    for (let i = 0; i < 3; i++) sphere(group, 0.073, 0xf181a9, x + i * 0.063 - 0.061, 0.83, 0.015, 0.72, 5.2, 0.70);
  }
  box(group, 1.63, 0.25, 0.62, 0xf28f8c, 0, 1.32, -0.25);
  const marquee = star(group, 0, 1.53, 0.12, 0.22);
  for (const x of [-0.63, 0.63]) sphere(group, 0.088, gold, x, 1.20, 0.16);
  const dancer = new THREE.Group();
  group.add(dancer);
  sphere(dancer, 0.15, 0xffb4a7, 0, 0.29, 0);
  cyl(dancer, 0.11, 0.15, 0.18, 0x985dd0, 0, 0.12, 0);
  box(dancer, 0.31, 0.06, 0.27, 0x7146a8, 0, 0.43, 0);
  cyl(dancer, 0.10, 0.11, 0.15, 0x7146a8, 0, 0.49, 0);
  return (time) => {
    dancer.position.set(Math.sin(time * 2.5) * 0.32, 0.43 + Math.abs(Math.sin(time * 3.5)) * 0.13, 0.27);
    dancer.rotation.y = Math.sin(time * 2.5) * 0.72;
    marquee.rotation.z = Math.sin(time * 2.3) * 0.20;
  };
}

function coaster(group) {
  platform(group, 1.62, 1.24);
  const station = new THREE.Group();
  station.scale.setScalar(0.71);
  station.position.set(0, 0.24, 0.36);
  group.add(station);
  arch(station, 1.64, 1.23, 0.54);
  const route = new THREE.CatmullRomCurve3([
    [-1.44, 0.49, 0.15], [-1.12, 0.81, -0.70], [-0.36, 1.29, -0.91],
    [0.61, 0.93, -0.91], [1.33, 0.55, -0.63], [1.42, 0.43, 0.29],
    [0.72, 0.40, 0.82], [-0.57, 0.41, 0.83], [-1.28, 0.46, 0.59],
  ].map((position) => new THREE.Vector3(...position)), true);
  for (const side of [-1, 1]) {
    const line = Array.from({ length: 52 }, (_, i) => {
      const point = route.getPointAt(i / 52);
      const tangent = route.getTangentAt(i / 52);
      point.x += tangent.z * side * 0.102;
      point.z -= tangent.x * side * 0.102;
      return point;
    });
    mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line, true), 64, 0.041, 6, true), 0xf66a51);
  }
  for (let i = 0; i < 24; i++) {
    const point = route.getPointAt(i / 24);
    const tangent = route.getTangentAt(i / 24);
    const tie = box(group, 0.23, 0.045, 0.069, cream, point.x, point.y - 0.021, point.z, 0.012);
    tie.rotation.y = Math.atan2(tangent.x, tangent.z);
    if (i % 3 === 0 && Math.abs(point.x) > 0.72) {
      cyl(group, 0.056, 0.079, point.y - 0.07, gold, point.x, point.y / 2, point.z, 10);
    }
  }
  const train = [coral, 0x62b6df, 0xffab6a].map((color, i) => {
    const car = new THREE.Group();
    group.add(car);
    box(car, 0.29, 0.17, 0.34, color, 0, 0.055, 0, 0.06);
    sphere(car, 0.092, 0xf8c292, 0, 0.213, -0.03);
    sphere(car, 0.083, i === 0 ? gold : 0x9b6550, 0, 0.265, -0.034, 1.1, 0.6, 1);
    return car;
  });
  return (time) => train.forEach((car, i) => {
    const u = (time * 0.22 + 1 - i * 0.051) % 1;
    const point = route.getPointAt(u);
    const tangent = route.getTangentAt(u);
    car.position.copy(point);
    car.position.y += 0.052;
    car.rotation.y = Math.atan2(tangent.x, tangent.z);
    car.rotation.x = -Math.asin(tangent.y) * 0.65;
  });
}

function wheel(group) {
  platform(group, 1.88, 1.46);
  const center = 1.18;
  const radius = 0.73;
  for (const side of [-1, 1]) {
    const leg = box(group, 0.11, 1.05, 0.15, 0xffc060, side * 0.31, 0.70, -0.08);
    leg.rotation.z = side * 0.36;
  }
  const axle = cyl(group, 0.13, 0.13, 0.18, gold, 0, center, 0.10);
  axle.rotation.x = Math.PI / 2;
  const frame = new THREE.Group();
  frame.position.y = center;
  group.add(frame);
  mesh(frame, new THREE.TorusGeometry(radius, 0.041, 8, 36), 0x5dbda3);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const spoke = box(frame, 0.035, radius * 2, 0.042, cream);
    spoke.rotation.z = angle;
  }
  const cabins = Array.from({ length: 6 }, (_, i) => {
    const seat = new THREE.Group();
    group.add(seat);
    const color = [coral, 0x80c7ed, 0xf8c45c, 0xc094e7, 0x81cba8, 0xf5a2ba][i];
    box(seat, 0.29, 0.19, 0.23, color, 0, -0.06, 0.09, 0.067);
    box(seat, 0.31, 0.05, 0.25, cream, 0, 0.08, 0.09, 0.028);
    return seat;
  });
  return (time) => {
    const turn = time * 0.40;
    frame.rotation.z = turn;
    cabins.forEach((seat, i) => {
      const angle = i * Math.PI / 3 + turn;
      seat.position.set(Math.cos(angle) * radius, center + Math.sin(angle) * radius, 0);
      seat.rotation.z = Math.cos(angle) * 0.11;
    });
  };
}

function slide(group) {
  platform(group, 1.94, 1.64);
  box(group, 1.07, 0.14, 0.70, 0x68c9dd, 0.22, 0.29, 0.35, 0.10);
  box(group, 0.84, 0.04, 0.53, 0x96edee, 0.22, 0.37, 0.35);
  for (const x of [-0.72, -0.39]) cyl(group, 0.048, 0.056, 1.31, cream, x, 0.88, -0.54);
  box(group, 0.49, 0.08, 0.46, gold, -0.55, 1.53, -0.54);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 1.49, -0.48),
    new THREE.Vector3(-0.06, 1.15, -0.44),
    new THREE.Vector3(0.58, 0.84, -0.20),
    new THREE.Vector3(0.36, 0.51, 0.12),
    new THREE.Vector3(0.16, 0.42, 0.53),
  ]);
  for (let i = -1; i <= 1; i++) {
    const pieces = path.getPoints(18).map((point) => point.add(new THREE.Vector3(i * 0.113, i === 0 ? 0 : 0.035, 0)));
    mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pieces), 26, i === 0 ? 0.115 : 0.052, 7), i === 0 ? 0x64c9dc : 0xffca58);
  }
  const raft = sphere(group, 0.16, coral, 0, 0.6, 0.2, 1, 0.44, 1.2);
  return (time) => {
    raft.position.copy(path.getPointAt((time * 0.46) % 1));
    raft.position.y += 0.12;
  };
}

function cups(group) {
  platform(group, 1.86, 1.60);
  cyl(group, 0.79, 0.83, 0.11, 0xc6a5e8, 0, 0.29, 0, 32);
  const deck = new THREE.Group();
  group.add(deck);
  const colors = [0xf192b6, 0x8dc9e0, 0xffcb62];
  for (let i = 0; i < 3; i++) {
    const a = (i + 0.3) * Math.PI * 2 / 3;
    const x = Math.sin(a) * 0.49;
    const z = Math.cos(a) * 0.49;
    cyl(deck, 0.30, 0.21, 0.32, colors[i], x, 0.54, z);
    cyl(deck, 0.30, 0.30, 0.053, cream, x, 0.70, z);
    cyl(deck, 0.24, 0.24, 0.035, 0xb982b1, x, 0.731, z);
    mesh(deck, new THREE.TorusGeometry(0.112, 0.026, 7, 14), colors[i], x + 0.26, 0.54, z);
  }
  return (time) => { deck.rotation.y = time * 0.92; };
}

function trampoline(group) {
  platform(group, 1.83, 1.53);
  cyl(group, 0.75, 0.72, 0.24, 0x6da995, 0, 0.40, 0, 32);
  cyl(group, 0.64, 0.64, 0.053, 0x576e76, 0, 0.531, 0, 32);
  mesh(group, new THREE.TorusGeometry(0.697, 0.075, 9, 30), gold, 0, 0.54, 0).rotation.x = Math.PI / 2;
  for (const x of [-0.63, 0.63]) cyl(group, 0.035, 0.048, 0.68, cream, x, 0.57, -0.20);
  const jumper = star(group, 0, 0.82, 0.08, 0.18, 0xffd04d);
  return (time) => {
    jumper.position.y = 0.78 + Math.abs(Math.sin(time * 3.2)) * 0.55;
    jumper.rotation.y = Math.sin(time * 2.7) * 0.25;
  };
}

function swings(group) {
  platform(group, 1.89, 1.60);
  cyl(group, 0.13, 0.19, 1.37, cream, 0, 0.96, 0);
  canopy(group, 0.89, 0.36, 1.66, 0xff9272, 0xffd77e);
  star(group, 0, 1.94, 0.02, 0.17);
  const ride = new THREE.Group();
  group.add(ride);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const seat = new THREE.Group();
    ride.add(seat);
    seat.position.set(Math.sin(a) * 0.69, 1.45, Math.cos(a) * 0.69);
    seat.rotation.y = a;
    seat.rotation.x = -0.26;
    for (const x of [-0.072, 0.072]) cyl(seat, 0.012, 0.012, 0.62, cream, x, -0.30, 0, 8);
    box(seat, 0.27, 0.11, 0.22, i % 2 ? 0x80c8e2 : coral, 0, -0.62, 0.04);
  }
  return (time) => { ride.rotation.y = time * 1.13; };
}

export function facility(id) {
  const group = new THREE.Group();
  let animate;
  if (id === "carousel") animate = carousel(group);
  else if (id === "coaster") animate = coaster(group);
  else if (id === "bumper") animate = bumper(group);
  else if (id === "ghost") animate = ghost(group);
  else if (id === "stage") animate = stage(group);
  else if (id === "rest") animate = rest(group);
  else if (id === "wheel") animate = wheel(group);
  else if (id === "slide") animate = slide(group);
  else if (id === "cups") animate = cups(group);
  else if (id === "trampoline") animate = trampoline(group);
  else if (id === "swings") animate = swings(group);
  else animate = kiosk(group, id);
  return { group, animate };
}

export function makeGuest(index) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const shirts = [0x5ea9e1, 0xed7fa8, 0x70bd9c, 0x8d94e7, 0xf0a44e];
  const skins = [0xffd4aa, 0xeeb185, 0xc98d66, 0xf8bd92];
  const skin = skins[index % skins.length];
  const shirt = shirts[index % shirts.length];
  shadow(group, 0.02, 0.03, 0.62, 0.53, 0.044);
  group.add(body);
  body.add(head);
  head.position.y = 0.55;
  sphere(head, 0.174, skin, 0, 0.035, 0.01, 1.04, 1.03, 0.98);
  sphere(head, 0.176, 0x8e5739, 0, 0.088, -0.057, 1, 0.80, 0.79);
  for (const x of [-0.058, 0.058]) sphere(head, 0.017, 0x4e382b, x, 0.054, 0.162, 0.88, 1.2, 0.61);
  const hat = new THREE.Group();
  hat.position.y = 0.14;
  head.add(hat);
  if (index % 3 !== 1) {
    sphere(hat, 0.176, index % 2 ? 0xef9bb5 : gold, 0, 0.032, 0, 1.04, 0.60, 1);
    sphere(hat, 0.148, index % 2 ? 0xec88a8 : 0xffd15c, 0, -0.026, 0.095, 1.11, 0.15, 1.03);
  } else {
    sphere(hat, 0.109, 0x985f43, 0.085, 0.041, -0.083);
    sphere(hat, 0.055, 0xf48db9, 0.071, 0.101, -0.010);
  }
  sphere(body, 0.144, shirt, 0, 0.383, 0, 0.96, 1.12, 0.72);
  box(body, 0.19, 0.186, 0.11, index % 2 ? gold : coral, 0, 0.403, -0.118, 0.042);
  box(body, 0.15, 0.071, 0.036, 0xf8bc6d, 0, 0.442, -0.175, 0.023);
  const legs = [-1, 1].map((side) => {
    const part = new THREE.Group();
    part.position.set(side * 0.073, 0.252, 0);
    body.add(part);
    box(part, 0.098, 0.127, 0.11, 0xb98b61, 0, -0.035, 0);
    cyl(part, 0.036, 0.033, 0.108, skin, 0, -0.133, 0, 8);
    box(part, 0.099, 0.065, 0.15, 0x805239, 0, -0.196, 0.027);
    return part;
  });
  const arms = [-1, 1].map((side) => {
    const part = new THREE.Group();
    part.position.set(side * 0.137, 0.459, 0);
    body.add(part);
    sphere(part, 0.063, shirt, 0, -0.034, 0, 1, 1.1, 1);
    cyl(part, 0.039, 0.044, 0.094, skin, 0, -0.092, 0, 8);
    sphere(part, 0.043, skin, 0, -0.137, 0);
    return part;
  });
  const bucket = popcorn(body, 0, 0.28, 0.201, 0.48);
  bucket.visible = false;
  const candy = new THREE.Group();
  candy.position.set(0.08, 0.32, 0.22);
  cyl(candy, 0.012, 0.012, 0.17, cream, 0, 0.02, 0, 8);
  sphere(candy, 0.12, 0xf9a7d1, 0, 0.15, 0, 0.94, 1.1, 0.85);
  sphere(candy, 0.075, 0xffc5e0, 0.045, 0.19, 0.02);
  candy.visible = false;
  body.add(candy);
  return { group, body, head, hat, legs, arms, bucket, candy };
}
