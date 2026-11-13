import { SplineCurve, Vector2 } from "three";

const turn = 2 * Math.PI;
const track = new SplineCurve([
  [879, 1143], [941, 1121], [998, 1094], [1057, 1060], [1090, 1020],
  [1092, 985], [1063, 944], [1013, 916], [964, 907], [924, 925],
  [878, 975], [834, 1026], [793, 1048], [762, 1046], [737, 1024],
  [740, 994], [772, 975], [807, 979], [851, 994], [898, 1016],
  [960, 1031], [1012, 1027], [1053, 1014], [1073, 1013],
].map(([x, y]) => new Vector2(x, y)));
const trackPoints = track.getSpacedPoints(240);

function buffer(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d");
}

function patch(atlas, sx, sy, width, height, x, y, fade = 8) {
  const ctx = buffer(width, height);
  ctx.drawImage(atlas, sx, sy, width, height, 0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";
  for (const [w, h] of [[width, 0], [0, height]]) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    const edge = fade / (w || h);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(edge, "black");
    gradient.addColorStop(1 - edge, "black");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  return { canvas: ctx.canvas, x, y };
}

function sprite(image, x, y, width, height, outline) {
  const ctx = buffer(width, height);
  ctx.clip(new Path2D(outline));
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  return ctx.canvas;
}

function wheel(ctx, time, cabin, supports, hub) {
  const angle = time * turn / 23;
  ctx.save();
  ctx.translate(972, 188);
  ctx.transform(1, 0.12, 0, 1, 0, 0);
  for (const [offset, color, lineWidth] of [[8, "#d36a53", 7], [0, "#ef8c70", 8], [-1, "#ffae8c", 2]]) {
    ctx.beginPath();
    ctx.ellipse(offset, -offset * 0.42, 88, 94, 0, 0, turn);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  for (let index = 0; index < 8; index++) {
    const step = angle + index * turn / 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(step) * 88, Math.sin(step) * 94);
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = index % 2 ? "#f59b77" : "#e77d60";
    ctx.stroke();
  }
  ctx.restore();

  for (let index = 0; index < 8; index++) {
    const step = angle + index * turn / 8;
    const x = Math.cos(step) * 88;
    const y = Math.sin(step) * 94 + x * 0.12;
    ctx.save();
    ctx.translate(972 + x, 188 + y);
    ctx.rotate(Math.sin(step) * 0.08);
    ctx.drawImage(cabin, -23, -10, 46, 47);
    ctx.restore();
  }
  ctx.drawImage(supports, 911, 189);
  ctx.drawImage(hub, 947, 165);
}

function carousel(ctx, time, horse, column, canopy) {
  const angle = time * turn / 9;
  const ponies = Array.from({ length: 4 }, (_, index) => {
    const step = angle + index * turn / 4;
    return { x: Math.cos(step), depth: Math.sin(step), lift: Math.sin(time * 3.9 + index * 1.7) };
  }).sort((a, b) => a.depth - b.depth);
  function drawPony({ x, depth, lift }) {
    const scale = 0.9 + depth * 0.15;
    ctx.save();
    ctx.translate(126 + x * 64, 603 + depth * 22 + lift * 7);
    ctx.strokeStyle = depth < 0 ? "#be8a36" : "#ffdb79";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-2, -59 - depth * 16 - lift * 7);
    ctx.lineTo(-2, 23);
    ctx.stroke();
    ctx.scale(depth < 0 ? -scale : scale, scale);
    ctx.drawImage(horse, -28, -31);
    ctx.restore();
  }
  ponies.filter((pony) => pony.depth < 0).forEach(drawPony);
  ctx.drawImage(column, 99, 562);
  ponies.filter((pony) => pony.depth >= 0).forEach(drawPony);
  ctx.drawImage(canopy, 31, 535);
}

function swings(ctx, time, canopy) {
  const angle = time * turn / 7;
  for (let index = 0; index < 6; index++) {
    const step = angle + index * turn / 6;
    const depth = Math.sin(step);
    if (depth < -0.35) continue;
    const x = Math.cos(step);
    const lift = Math.sin(time * 2 + index) * 3;
    const seatX = 1021 + x * 68;
    const seatY = 491 + depth * 26 + lift;
    ctx.strokeStyle = "#ffe4a0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(1021 + x * 45 + side * 4, 446 + depth * 10);
      ctx.lineTo(seatX + side * 6, seatY + side * x * 2);
    }
    ctx.stroke();
    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.rotate(x * 0.3);
    ctx.fillStyle = "#e69b38";
    ctx.beginPath();
    ctx.roundRect(-10, -3, 20, 11, 4);
    ctx.fill();
    ctx.fillStyle = "#ffe279";
    ctx.beginPath();
    ctx.roundRect(-9, -4, 18, 8, 3);
    ctx.fill();
    ctx.fillStyle = index % 2 ? "#f4af5e" : "#ffce77";
    ctx.fillRect(-6, -3, 12, 4);
    ctx.restore();
  }
  ctx.drawImage(canopy, 949, 429);
}

function coaster(ctx, time) {
  const phase = (time / 10.5 + 0.12) % 1;
  for (let car = 2; car >= 0; car--) {
    const progress = (phase - car * 0.025 + 1) % 1;
    const position = progress * (trackPoints.length - 1);
    const index = Math.floor(position);
    const from = trackPoints[index];
    const to = trackPoints[index + 1];
    const fraction = position - index;
    const fade = Math.min(1, progress / 0.05, (1 - progress) / 0.045);
    const heading = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.translate(from.x + (to.x - from.x) * fraction, from.y + (to.y - from.y) * fraction - 4);
    ctx.rotate(heading);
    ctx.scale(1.08, to.x < from.x ? -1.08 : 1.08);
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#9d5742";
    for (const x of [-9, 9]) {
      ctx.beginPath();
      ctx.arc(x, 1, 4.5, 0, turn);
      ctx.fill();
    }
    ctx.fillStyle = "#e69e48";
    ctx.beginPath();
    ctx.roundRect(-15, -9, 31, 11, 4);
    ctx.fill();
    ctx.fillStyle = car === 0 ? "#f88862" : "#ed7859";
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.lineTo(-15, -15);
    ctx.quadraticCurveTo(-10, -20, -4, -16);
    ctx.lineTo(2, -10);
    ctx.quadraticCurveTo(15, -13, 17, -7);
    ctx.lineTo(14, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffcf8d";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
}

function stallGlints(ctx, time, x, y, offset) {
  for (let index = 0; index < 3; index++) {
    const life = (time * 0.65 + index / 3 + offset) % 1;
    const size = 3 + Math.sin(life * Math.PI) * 5;
    const left = x + (index - 1) * 18 + Math.sin(life * Math.PI) * (index - 1) * 10;
    const top = y - life * 25 + (index % 2) * 5;
    ctx.save();
    ctx.globalAlpha = Math.sin(life * Math.PI) * 0.88;
    ctx.fillStyle = "#fff2a3";
    ctx.beginPath();
    ctx.moveTo(left - size, top);
    ctx.lineTo(left - 1.5, top - 1.5);
    ctx.lineTo(left, top - size);
    ctx.lineTo(left + 1.5, top - 1.5);
    ctx.lineTo(left + size, top);
    ctx.lineTo(left + 1.5, top + 1.5);
    ctx.lineTo(left, top + size);
    ctx.lineTo(left - 1.5, top + 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export async function animateLevelPark(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scenery = new Image();
  scenery.src = `${import.meta.env.BASE_URL}art/level-park.jpg`;
  const atlas = new Image();
  atlas.src = `${import.meta.env.BASE_URL}art/level-park-motion.png`;
  try {
    await Promise.all([scenery.decode(), atlas.decode()]);
  } catch {
    return; // The original illustration remains visible if the overlay cannot load.
  }
  const patches = [
    patch(atlas, 0, 0, 280, 250, 842, 70, 7),
    patch(atlas, 0, 252, 142, 109, 898, 1040),
    patch(atlas, 285, 0, 185, 95, 30, 554, 6),
    patch(atlas, 285, 110, 179, 90, 924, 452, 6),
  ];
  const cabin = sprite(scenery, 946, 87, 52, 51,
    "M5 15 Q10 2 24 1 Q39 0 47 13 L50 26 Q51 40 40 46 Q25 52 12 44 Q4 40 3 29 Z");
  const hub = sprite(scenery, 947, 165, 48, 53,
    "M10 10 Q8 1 17 1 Q24 -1 27 5 Q37 2 41 11 Q48 14 45 23 Q52 33 43 37 Q43 46 34 46 Q28 53 20 47 Q9 50 8 40 Q-2 35 1 26 Q-2 15 10 10 Z");
  const supports = sprite(atlas, 69, 119, 122, 121,
    "M41 15 Q43 2 54 3 L72 5 Q82 7 81 19 L111 105 L119 110 L117 119 L86 118 L86 110 L90 106 L64 32 L31 99 L30 109 L1 108 L2 98 L12 94 Z");
  const horse = sprite(scenery, 105, 576, 66, 65,
    "M4 34 Q8 28 16 30 L15 21 L29 19 L33 13 L41 6 L42 0 L47 3 L49 1 L51 8 Q57 9 62 18 Q65 25 57 27 L51 25 L47 31 L53 37 L60 42 L57 49 L50 47 L46 43 L43 49 L48 59 L42 61 L37 54 L31 50 L26 51 L22 61 L16 64 L16 56 L12 53 L10 61 L4 58 L6 48 Q1 44 4 34 Z");
  const carouselColumn = sprite(atlas, 354, 8, 55, 63,
    "M10 0 H44 L45 40 Q56 47 51 55 Q42 63 24 63 Q1 60 1 51 Q1 46 10 41 Z");
  const carouselCanopy = sprite(scenery, 31, 535, 184, 47,
    "M0 0 H184 L181 11 Q166 30 132 36 Q90 47 51 39 Q17 34 5 19 Z");
  const swingCanopy = sprite(scenery, 949, 429, 145, 43,
    "M0 0 H145 L142 13 Q136 25 116 30 Q72 42 42 29 Q13 25 5 13 Z");

  let frame = 0;
  let lastPaint = 0;
  let time = 0;
  let inView = false;

  function paint(now) {
    if (now - lastPaint >= 30) {
      time += lastPaint ? Math.min((now - lastPaint) / 1000, 0.08) : 0;
      lastPaint = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const item of patches) ctx.drawImage(item.canvas, item.x, item.y);
      wheel(ctx, time, cabin, supports, hub);
      carousel(ctx, time, horse, carouselColumn, carouselCanopy);
      swings(ctx, time, swingCanopy);
      coaster(ctx, time);
      stallGlints(ctx, time, 97, 309, 0);
      stallGlints(ctx, time, 974, 589, 0.5);
    }
    frame = requestAnimationFrame(paint);
  }

  function sync() {
    if (inView && !document.hidden && !motion.matches) {
      if (!frame) frame = requestAnimationFrame(paint);
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastPaint = 0;
    }
  }

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }).observe(canvas);
  motion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
}
