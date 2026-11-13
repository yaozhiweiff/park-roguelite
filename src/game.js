import { maps, pathX } from "./maps.js";

export const startingCoins = 1800;
export const interestRate = 0.10;
export const priceIncrease = 0.05;
export const maxRank = 6;
export const attributeNames = { joy: "欢乐", thrill: "刺激", bliss: "幸福" };

export const cards = {
  coaster: { title: "过山车", description: "刺激 +30", price: 650, stat: "thrill", points: 30 },
  bumper: { title: "碰碰车", description: "欢乐 +30", price: 510, stat: "joy", points: 30 },
  carousel: { title: "旋转木马", description: "幸福 +30", price: 520, stat: "bliss", points: 30 },
  snack: { title: "小吃摊", description: "幸福 ≥30，幸福 +30", price: 480, stat: "bliss", points: 30, needs: "bliss", threshold: 30 },
  photo: { title: "照相馆", description: "幸福 ≥60，欢乐 +50", price: 630, stat: "joy", points: 50, needs: "bliss", threshold: 60 },
  ghost: { title: "鬼屋", description: "刺激低于 30 时 +40，否则 +20", price: 570, stat: "thrill", points: 40, reducedAt: 30, reducedPoints: 20 },
  rest: { title: "休息站", description: "刺激 ≥60，幸福 +20", price: 380, stat: "bliss", points: 20, needs: "thrill", threshold: 60 },
  stage: { title: "演出舞台", description: "欢乐低于 30 时 +40，否则 +10", price: 500, stat: "joy", points: 40, reducedAt: 30, reducedPoints: 10 },
  candy: { title: "棉花糖摊", description: "欢乐 ≥30，幸福 +40", price: 540, stat: "bliss", points: 40, needs: "joy", threshold: 30 },
  wheel: { title: "摩天轮", description: "幸福低于 30 时 +40，否则 +20", price: 620, stat: "bliss", points: 40, reducedAt: 30, reducedPoints: 20 },
  slide: { title: "水上滑梯", description: "刺激 ≥30，欢乐 +40", price: 680, stat: "joy", points: 40, needs: "thrill", threshold: 30 },
  cups: { title: "旋转茶杯", description: "欢乐 ≥30，刺激 +35", price: 560, stat: "thrill", points: 35, needs: "joy", threshold: 30 },
  trampoline: { title: "蹦床", description: "幸福 ≥30，欢乐 +35", price: 470, stat: "joy", points: 35, needs: "bliss", threshold: 30 },
  swings: { title: "飞椅", description: "刺激 +35", price: 640, stat: "thrill", points: 35 },
};

export const buffs = {
  flags: { title: "导览旗", symbol: "⚑", price: 390, description: "岔口更偏向能触发更多设施的路" },
  stamps: { title: "集章卡", symbol: "✿", price: 410, description: "在同一段支路玩两项，汇合时幸福 +25" },
  relay: { title: "接力派对", symbol: "♪", price: 400, description: "连续两座设施提供不同属性，后者额外 +8" },
  bookends: { title: "首尾联票", symbol: "★", price: 460, description: "入口和出口设施均触发且属性不同，离园时欢乐 +25" },
  tasting: { title: "试吃券", symbol: "✦", price: 310, description: "小吃摊和棉花糖摊免门槛" },
  portraits: { title: "摄影日", symbol: "●", price: 360, description: "照相馆所需幸福降至 30" },
  thrills: { title: "刺激专场", symbol: "ϟ", price: 390, stat: "thrill", points: 20, description: "游客入园时刺激 +20" },
  smiles: { title: "笑脸气球", symbol: "☻", price: 370, stat: "joy", points: 20, description: "游客入园时欢乐 +20" },
  welcomeTreat: { title: "入园甜点", symbol: "♥", price: 410, stat: "bliss", points: 20, description: "游客入园时幸福 +20" },
};

const levelList = [
  ["欢乐开张", "double", 5, 72, { stat: "joy", points: 35 }, 904, 8800],
  ["甜甜小径", "double", 5, 89, { stat: "bliss", points: 40 }, 326, 12000],
  ["三岔试胆", "triple", 5, 106, { stat: "thrill", points: 40 }, 547, 14400],
  ["叮当木马", "triple", 6, 124, { gift: "carousel" }, 188, 15000],
  ["花园合照", "triple", 6, 143, { stat: "bliss", points: 45 }, 673, 20200],
  ["惊叫连连", "triple", 6, 161, { gift: "coaster" }, 834, 21200],
  ["乐谷派对", "cascade", 7, 180, { stat: "joy", points: 40 }, 251, 24800],
  ["云上集市", "cascade", 7, 198, { gift: "wheel" }, 462, 27200],
  ["极速乐谷", "cascade", 7, 216, { stat: "thrill", points: 45 }, 756, 31000],
  ["压轴演出", "cascade", 7, 235, { gift: "stage" }, 981, 31600],
];

export const levels = levelList.map(([title, mapId, days, visitors, trait, seed, goal], index) => ({
  id: index + 1, title, map: maps[mapId], days, visitors, trait, seed, goal,
  thresholds: [goal, goal * 1.25, goal * 1.5],
}));

export function starsFor(level, revenue) {
  return level.thresholds.filter((goal) => revenue >= goal).length;
}

export function traitInfo(trait) {
  if (trait.gift) {
    return { title: "赠送设施", description: `${cards[trait.gift].title} Lv.1 已放入仓库，可自行摆放`, art: trait.gift };
  }
  return {
    title: `入园${attributeNames[trait.stat]} +${trait.points}`,
    description: `本关每位游客入园时，初始${attributeNames[trait.stat]} +${trait.points}`,
    art: `buff-${trait.stat}`,
  };
}

export function priceOf(id, day) {
  return Math.round((cards[id] ?? buffs[id]).price * (1 + priceIncrease) ** (day - 1));
}

export function interestFor(coins, day, level) {
  return day < level.days ? Math.floor(coins * interestRate) : 0;
}

export const refreshPrice = (times) => 200 + times * 100;

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function deal(level, day, refreshes, ranks, activeBuffs, held = []) {
  const next = random(Math.imul(level.seed + day * 1429, 27644437) ^ Math.imul(refreshes + 1, 1013904223));
  const facilities = Object.keys(cards).filter((id) => (ranks[id] ?? 0) < maxRank);
  const upgrades = facilities.filter((id) => ranks[id]);
  const offers = [...facilities, ...Object.keys(buffs).filter((id) => !activeBuffs.has(id))]
    .filter((id) => !held.includes(id));
  const chosen = Array.from({ length: 3 }, (_, slot) => held[slot]);
  for (let slot = 0; slot < chosen.length && offers.length; slot++) {
    if (chosen[slot]) continue;
    // Facilities already owned have two chances to appear, so upgrading remains viable.
    const weighted = [...offers, ...upgrades.filter((id) => offers.includes(id))];
    const id = weighted[Math.floor(next() * weighted.length)];
    chosen[slot] = id;
    offers.splice(offers.indexOf(id), 1);
  }
  return chosen.filter(Boolean);
}

export function guestCount(level, day) {
  const through = (n) => Math.round(level.visitors * n / level.days + n * (n - level.days) / level.days);
  return through(day) - through(day - 1);
}

export const strength = (rank) => (40 + Math.min(maxRank, rank) * 10);
const scalePoints = (points, rank) => points * strength(rank) / 100;

export function facilityDescription(id, rank) {
  const card = cards[id];
  const value = scalePoints(card.points, rank);
  const gain = `${attributeNames[card.stat]} +${value}`;
  if (card.needs) return `${attributeNames[card.needs]} ≥${card.threshold}，${gain}`;
  if (card.reducedAt !== undefined) {
    return `${attributeNames[card.stat]} <${card.reducedAt} 时 +${value}，否则 +${scalePoints(card.reducedPoints, rank)}`;
  }
  return gain;
}

export const moods = [
  { id: "unhappy", label: "不开心", range: "0–49", coins: 100 },
  { id: "neutral", label: "普通", range: "50–99", coins: 150 },
  { id: "happy", label: "开心", range: "100+", coins: 200 },
];

const happyThreshold = 100;

export function moodFor(score) {
  if (score >= happyThreshold) return moods[2];
  if (score >= 50) return moods[1];
  return moods[0];
}

export function emptyMoodCounts() {
  return { unhappy: 0, neutral: 0, happy: 0 };
}

function total(stats) {
  return stats.joy + stats.thrill + stats.bliss;
}


function thresholdFor(id, activeBuffs) {
  if ((id === "snack" || id === "candy") && activeBuffs.has("tasting")) return 0;
  if (id === "photo" && activeBuffs.has("portraits")) return 30;
  return cards[id].threshold;
}

function visitPoints(id, stats, rank, activeBuffs) {
  const card = cards[id];
  if (card.needs && stats[card.needs] < thresholdFor(id, activeBuffs)) return 0;
  const reduced = card.reducedAt !== undefined && stats[card.stat] >= card.reducedAt;
  return scalePoints(reduced ? card.reducedPoints : card.points, rank);
}

function planTours(layout, level, ranks, activeBuffs) {
  const { map, trait } = level;
  const stats = { joy: 0, thrill: 0, bliss: 0 };
  if (trait.stat) stats[trait.stat] = trait.points;
  for (const id of activeBuffs) {
    const buff = buffs[id];
    if (buff.stat) stats[buff.stat] += buff.points;
  }

  function trace(lane, previous) {
    const state = { ...previous, stats: { ...previous.stats } };
    const [startX, startZ] = map.nodes[lane.from];
    const [endX, endZ] = map.nodes[lane.to];
    const stops = [];
    let hits = 0;
    let gates = 0;

    function bonus(id, text, stat, points, x, z) {
      state.stats[stat] += points;
      stops.push({ type: "bonus", id, text, score: total(state.stats), x, z });
    }

    if (lane.from === "merge" && state.stamps && activeBuffs.has("stamps")) {
      bonus("stamps", "集齐两枚章！幸福 +25", "bliss", 25, startX, startZ);
    }

    for (const lot of lane.slots) {
      const id = layout[lot.id];
      if (!id) continue;
      const card = cards[id];
      const points = visitPoints(id, state.stats, ranks[id], activeBuffs);
      const stop = { id, lot: lot.id, x: lot.x, z: lot.z };
      if (!points) {
        stops.push({ ...stop, type: "miss", text: `${attributeNames[card.needs]}不足` });
        state.last = null;
        continue;
      }
      const relay = state.last && state.last !== card.stat && activeBuffs.has("relay");
      state.stats[card.stat] += points + (relay ? 8 : 0);
      state.last = card.stat;
      if (lot.id === "welcome") state.entrance = card.stat;
      if (lot.id === "farewell") state.exit = card.stat;
      stops.push({
        ...stop, type: "visit", score: total(state.stats),
        text: `${attributeNames[card.stat]} +${points}${relay ? " · 接力 +8" : ""}`,
        relay, gag: id === "photo" && state.popcorn,
      });
      if (id === "snack") state.popcorn = true;
      hits++;
      if (card.needs) gates++;
    }
    if (lane.from !== "entry" && lane.to !== "exit" && hits >= 2) state.stamps = true;
    if (lane.to === "exit" && state.entrance && state.exit && state.entrance !== state.exit && activeBuffs.has("bookends")) {
      bonus("bookends", "首尾联票！欢乐 +25", "joy", 25, endX, endZ + 0.65);
    }

    const children = (map.outgoing[lane.to] ?? []).map((child) => trace(child, state));
    const least = Math.min(...children.map((child) => child.hits));
    const weights = children.map((child) => 1 + Number(child.gates > 0) +
      (activeBuffs.has("flags") ? (child.hits - least) * 3 : 0));
    const sharedExit = lane.to === "exit";
    const score = total(state.stats);
    return {
      lane, stops, children, weights,
      hits: sharedExit ? 0 : hits + Math.max(0, ...children.map((child) => child.hits)),
      gates: sharedExit ? 0 : gates + Math.max(0, ...children.map((child) => child.gates)),
      mood: moodFor(score),
      happyBonus: Math.max(0, Math.floor(score - happyThreshold)),
    };
  }

  return { first: trace(map.outgoing.entry[0], { stats }), initialScore: total(stats) };
}

export function simulate(layout, level, day, ranks, activeBuffs, show = false) {
  const count = guestCount(level, day);
  const { map } = level;
  const { first, initialScore } = planTours(layout, level, ranks, activeBuffs);
  const results = {
    count, routes: Object.fromEntries(map.badges.map(([id]) => [id, 0])),
    revenue: 0, happyBonus: 0, moods: emptyMoodCounts(), visits: {}, photoGag: false,
  };
  const guests = [];
  const events = [];
  const next = random(level.seed + day * 5519);

  function distribute(tour, amount, path) {
    if (!amount) return;
    const { lane, stops, children, weights, mood, happyBonus } = tour;
    const itinerary = show ? [...path, tour] : null;
    if (lane.id in results.routes) results.routes[lane.id] += amount;
    for (const event of stops) {
      if (event.type === "visit") {
        results.visits[event.id] = (results.visits[event.id] ?? 0) + amount;
        results.photoGag ||= Boolean(event.gag);
      }
    }
    if (!children.length) {
      const coins = mood.coins + happyBonus;
      results.revenue += coins * amount;
      results.happyBonus += happyBonus * amount;
      results.moods[mood.id] += amount;
      if (show) for (let index = 0; index < amount; index++) guests.push({ itinerary, mood, coins });
      return;
    }
    const combined = weights.reduce((sum, weight) => sum + weight, 0);
    let sum = 0;
    let assigned = 0;
    children.forEach((child, index) => {
      sum += weights[index];
      const boundary = Math.round(amount * sum / combined);
      distribute(child, boundary - assigned, itinerary);
      assigned = boundary;
    });
  }

  distribute(first, count, []);
  if (!show) return { results };
  for (let i = guests.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [guests[i], guests[j]] = [guests[j], guests[i]];
  }

  guests.forEach((guest, guestIndex) => {
    const index = guestIndex;
    const group = Math.floor(index / 3);
    const member = index % 3;
    const start = 0.22 + group * 1.05 + member * 0.24;
    const segments = [];
    let time = start;
    let z = map.nodes.entry[1];
    let lane = first.lane;

    function travel(destination, extra = {}) {
      if (destination === z && !extra.pause) return;
      const xDistance = Math.abs(pathX(lane, destination) - pathX(lane, z));
      const duration = extra.pause ?? Math.hypot(z - destination, xDistance) / (1.7 + 0.05 * member);
      segments.push({ from: z, to: destination, start: time, end: time + duration, lane, facility: extra.facility });
      time += duration;
      z = destination;
    }

    guest.itinerary.forEach(({ lane: route, stops }, routeIndex) => {
      lane = route;
      const previous = guest.itinerary[routeIndex - 1];
      if (previous?.children.length > 1) {
        const [x, branchZ] = map.nodes[lane.from];
        const index = previous.children.findIndex((child) => child.lane === lane);
        const guided = activeBuffs.has("flags") && previous.children[index].hits > Math.min(...previous.children.map((child) => child.hits));
        const direction = Math.sign(pathX(lane, branchZ - 0.8) - x);
        events.push({ type: "branch", time, guest: guestIndex, route: lane.id, direction, guided, x, z });
      } else if (lane.id in results.routes) {
        events.push({ type: "branch", time, guest: guestIndex, route: lane.id });
      }
      for (const stop of stops) {
        travel(stop.z);
        if (stop.type === "visit") travel(z, { pause: stop.id === "coaster" ? 0.66 : 0.39, facility: stop.id });
        events.push({ ...stop, time, guest: guestIndex });
      }
      const end = map.nodes[lane.to][1];
      if (lane.to === "exit") {
        travel(end + 0.32);
        events.push({ type: "farewell", time, guest: guestIndex, mood: guest.mood.id });
        travel(z, { pause: 0.29 });
      }
      travel(end);
    });
    events.push({ type: "exit", time, guest: index, coins: guest.coins });
    Object.assign(guest, { index, start, member, group, segments, initialScore, end: time });
    delete guest.itinerary;
  });

  events.sort((a, b) => a.time - b.time);
  return { guests, events, results, duration: Math.max(...guests.map((guest) => guest.end)) + 0.42 };
}
