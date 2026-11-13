import "./style.css";
import { buffs, cards, deal, emptyMoodCounts, facilityDescription, interestFor, levels, maxRank, moodFor, moods, priceIncrease, priceOf, refreshPrice, simulate, starsFor, startingCoins, strength, traitInfo } from "./game.js";
import { ParkView } from "./park-view.js";

const $ = (id) => document.getElementById(id);
const labels = $("labels");
const draft = $("draft");
const open = $("open");
const settlement = $("settlement");
const money = new Intl.NumberFormat("zh-CN");
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const format = (amount) => money.format(amount);

let view;
try {
  view = new ParkView($("world"), () => positionLabels());
} catch (error) {
  $("map").classList.add("fallback");
  console.warn("无法启用 3D 画面", error);
}

let level, selectedLevel, ranks, activeBuffs, refreshes;
let day;
let wallet;
let runTotals;
let layout;
let stock;
let options;
let sold;
let panel;
let focus;
let reserve;
let interestDue;
let lastInterest;
let phase;
let preview;
let show;
let elapsed = 0;
let speed = 1;
let nextEvent = 0;
let seen;
let sale;
let photoShown;
let photo;
let guestMoods = [];
let noticeTimer;
let audio;
let lastChime = 0;


const anchors = new Map();
const branchBadges = new Map();
const progressKey = "kai-yuan-la-level-stars";
const progress = {};
try {
  const saved = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
  for (const level of levels) {
    const score = saved?.[level.id];
    if (Number.isInteger(score) && score >= 1 && score <= 3) progress[level.id] = score;
  }
} catch {
  // The game remains playable if the browser blocks storage.
}

function icon(id) {
  if (buffs[id]) return `<span class="buff-art" aria-hidden="true">${buffs[id].symbol}</span>`;
  return `<span class="art" data-art="${id}" aria-hidden="true"></span>`;
}

function starsMarkup(stars) {
  return `<span class="stars" role="img" aria-label="${stars} 星">${[1, 2, 3].map((n) =>
    `<span aria-hidden="true" class="${n <= stars ? "filled" : ""}">★</span>`).join("")}</span>`;
}

function unlocked(candidate) {
  return candidate.id === 1 || Boolean(progress[candidate.id - 1]) || Boolean(progress[candidate.id]);
}

function goalsMarkup(candidate) {
  return candidate.thresholds.map((target, index) => reportItem(`${index + 1} 星`, format(target) + " 金币")).join("");
}

// The percentages match the walkway in level-park.jpg, starting at the front gate.
const markerPositions = [
  [31, 86], [56, 77], [33, 69], [23, 59], [49, 55],
  [74, 48], [51, 41], [31, 35], [65, 29], [56, 19],
];
const levelMarkers = new Map();

function inspectLevel(candidate) {
  selectedLevel = candidate;
  const trait = traitInfo(candidate.trait);
  const stars = progress[candidate.id] ?? 0;
  for (const [id, button] of levelMarkers) button.setAttribute("aria-pressed", String(id === candidate.id));
  $("level-title").textContent = `第 ${candidate.id} 关 · ${candidate.title}`;
  $("level-summary").textContent = `${candidate.map.title} · ${candidate.days} 天 · ${candidate.visitors} 位游客`;
  $("level-best").innerHTML = `<span>最高星级</span>${starsMarkup(stars)}`;
  $("level-trait").innerHTML = `${icon(trait.art)}<div><strong>初始 BUFF · ${trait.title}</strong><span>${trait.description}</span></div>`;
  $("level-goals").innerHTML = candidate.thresholds.map((target, index) =>
    `<div><span><i aria-hidden="true">★</i> ${index + 1} 星</span>
      <strong>${format(target)} <small>金币</small></strong></div>`).join("");
  $("enter-level").disabled = !unlocked(candidate);
  $("enter-level").textContent = unlocked(candidate) ? "进入关卡" : `第 ${candidate.id - 1} 关获得 1 星后解锁`;
}

function showMenu(preferredLevel) {
  phase = "menu";
  view?.finish();
  clearGuestMoods();
  clearNotice();
  $("park").hidden = true;
  $("level-menu").hidden = false;
  const stars = Object.values(progress);
  const starCount = stars.reduce((sum, count) => sum + count, 0);
  $("level-progress").textContent = `★ ${starCount} / ${levels.length * 3}`;
  $("level-progress").setAttribute("aria-label", `累计 ${starCount} 星，共 ${levels.length * 3} 星`);
  levelMarkers.clear();
  const buttons = levels.map((candidate, index) => {
    const locked = !unlocked(candidate);
    const best = progress[candidate.id] ?? 0;
    const [x, y] = markerPositions[index];
    const button = uiButton("", () => inspectLevel(candidate), "level-marker");
    button.classList.toggle("locked", locked);
    button.dataset.map = candidate.map.id;
    button.style.setProperty("--marker-x", `${x}%`);
    button.style.setProperty("--marker-y", `${y}%`);
    button.setAttribute("aria-label", `第 ${candidate.id} 关，${candidate.title}，最高 ${best} 星${locked ? "，未解锁" : ""}`);
    button.innerHTML = `<span class="marker-pin" aria-hidden="true">${candidate.id}</span>${starsMarkup(best)}`;
    levelMarkers.set(candidate.id, button);
    return button;
  });
  $("level-markers").replaceChildren(...buttons);
  inspectLevel(preferredLevel ?? levels.find((candidate) => unlocked(candidate) && !progress[candidate.id]) ?? levels.at(-1));
}

function buildLabels() {
  labels.replaceChildren();
  anchors.clear();
  branchBadges.clear();
  for (const lot of level.map.lots) {
    const button = uiButton("+", () => tapLot(lot.id), "lot");
    button.dataset.lot = lot.id;
    labels.append(button);
    anchors.set(lot.id, button);
  }
  for (const [id, name] of level.map.badges) {
    const badge = document.createElement("span");
    badge.className = "branch";
    badge.innerHTML = `<span>${name}</span><strong>0</strong><span>人</span>`;
    labels.append(badge);
    branchBadges.set(id, badge);
  }
}

function freshGame(candidate) {
  if (!unlocked(candidate)) return;
  level = candidate;
  day = 1;
  wallet = startingCoins;
  runTotals = { revenue: 0, moods: emptyMoodCounts() };
  layout = {};
  stock = level.trait.gift ? [level.trait.gift] : [];
  ranks = level.trait.gift ? { [level.trait.gift]: 1 } : {};
  activeBuffs = new Set();
  reserve = 0;
  interestDue = 0;
  lastInterest = 0;
  $("level-menu").hidden = true;
  $("park").hidden = false;
  $("map").dataset.map = level.map.id;
  buildLabels();
  view?.setMap(level.map);
  prepareDay();
  if (!view) displayNotice("当前设备未启用 WebGL，可继续摆放和结算", 4500);
}

function reroll() {
  options = deal(level, day, refreshes, ranks, activeBuffs);
  sold = new Set();
}

function prepareDay() {
  phase = "plan";
  refreshes = 0;
  reroll();
  panel = "shop";
  focus = null;
  show = null;
  photo = null;
  clearNotice();
  $("effects").replaceChildren();
  clearGuestMoods();
  refresh();
}

function switchPanel(target) {
  if (phase !== "plan") return;
  panel = target;
  focus = null;
  refresh();
}

function payFor(ids) {
  if (phase !== "plan" || !ids.length || ids.some((id) => !options.includes(id) || sold.has(id))) return false;
  const cost = ids.reduce((sum, id) => sum + priceOf(id, day), 0);
  if (cost > wallet) return false;
  wallet -= cost;
  ids.forEach((id) => sold.add(id));
  return true;
}


function applyPurchase(id) {
  if (buffs[id]) {
    activeBuffs.add(id);
    return `${buffs[id].title}已生效`;
  }
  if (ranks[id]) {
    ranks[id]++;
    return `${cards[id].title}已升至 Lv.${ranks[id]}`;
  }
  ranks[id] = 1;
  stock.push(id);
  return `${cards[id].title}已存入仓库`;
}

function buy(ids, openStock = false) {
  if (!payFor(ids)) return;
  const newFacilities = ids.some((id) => cards[id] && !ranks[id]);
  const notices = ids.map(applyPurchase);
  panel = openStock && newFacilities ? "stock" : "shop";
  focus = null;
  refresh();
  displayNotice(notices.join(" · "), 1900);
}

function buyAndPlace(id, slot) {
  if (!anchors.has(slot) || layout[slot] || !cards[id] || ranks[id] || !payFor([id])) return;
  ranks[id] = 1;
  layout[slot] = id;
  panel = "shop";
  focus = null;
  clearNotice();
  refresh();
}

function refreshShop() {
  const cost = refreshPrice(refreshes);
  if (phase !== "plan" || panel !== "shop" || wallet < cost) return;
  wallet -= cost;
  refreshes++;
  focus = null;
  reroll();
  refresh();
}

function returnToStock(slot) {
  if (phase !== "plan" || !layout[slot]) return;
  stock.push(layout[slot]);
  delete layout[slot];
  switchPanel("stock");
}

function tapLot(id) {
  if (phase !== "plan") return;
  const placed = layout[id];
  if (focus?.source === "shop") {
    if (placed) displayNotice("新设施请放在空地", 1350);
    else buyAndPlace(focus.id, id);
    return;
  }
  if (focus?.source === "stock") {
    const index = stock.indexOf(focus.id);
    if (index < 0) return;
    layout[id] = focus.id;
    stock.splice(index, 1);
    if (placed) stock.push(placed);
    focus = { source: "lot", slot: id };
  } else if (focus?.source === "lot" && focus.moving) {
    const from = focus.slot;
    if (from !== id) {
      layout[id] = layout[from];
      if (placed) layout[from] = placed;
      else delete layout[from];
    }
    focus = { source: "lot", slot: id };
  } else if (placed) {
    focus = { source: "lot", slot: id, moving: true };
  } else {
    displayNotice(panel === "shop" ? "拖动设施卡，或点卡后再点空地" : "先选一张仓库里的设施卡", 1350);
  }
  refresh();
}

function uiButton(title, action, className, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = title;
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function drawStockCard(id) {
  const card = cards[id];
  const button = uiButton("", () => {
    focus = { source: "stock", id };
    refresh();
  }, "card");
  button.dataset.card = id;
  button.innerHTML = `${icon(id)}<strong>${card.title} Lv.${ranks[id]}</strong><small>${facilityDescription(id, ranks[id])}</small>`;
  draft.append(button);
}

function dropSlot(event) {
  const button = document.elementFromPoint(event.clientX, event.clientY)?.closest(".lot");
  return button && !button.hidden && !layout[button.dataset.lot] ? button : null;
}

function enableShopDrag(button, id) {
  let pointer;
  let ghost;
  let hovered;
  let suppressClick = false;

  function clearDrag() {
    pointer = null;
    if (!ghost) return;
    ghost.remove();
    ghost = null;
    hovered = null;
    button.classList.remove("drag-source");
    for (const slot of anchors.values()) slot.classList.remove("drag-target", "drop-target");
  }

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary || phase !== "plan") return;
    suppressClick = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (pointer?.id !== event.pointerId) return;
    if (!ghost) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7) return;
      suppressClick = true;
      ghost = document.createElement("div");
      ghost.className = "shop-drag-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.innerHTML = icon(id);
      document.body.append(ghost);
      button.classList.add("drag-source");
      for (const [slot, target] of anchors) {
        if (!layout[slot]) target.classList.add("drag-target");
      }
    }
    ghost.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -90%)`;
    const next = dropSlot(event);
    if (next !== hovered) {
      hovered?.classList.remove("drop-target");
      next?.classList.add("drop-target");
      hovered = next;
    }
  });
  button.addEventListener("pointerup", (event) => {
    if (pointer?.id !== event.pointerId) return;
    const target = ghost && dropSlot(event);
    const dragged = Boolean(ghost);
    clearDrag();
    if (target) buyAndPlace(id, target.dataset.lot);
    else if (dragged) displayNotice("拖到地图空地后松手即可购买", 1350);
  });
  button.addEventListener("pointercancel", clearDrag);
  button.addEventListener("lostpointercapture", clearDrag);
  button.addEventListener("click", (event) => {
    if (suppressClick && event.detail > 0) event.stopImmediatePropagation();
  }, { capture: true });
}


function drawShopCard(id) {
  const card = cards[id] ?? buffs[id];
  const purchased = sold.has(id);
  const isBuff = Boolean(buffs[id]);
  const isUpgrade = !isBuff && Boolean(ranks[id]);
  const price = priceOf(id, day);
  const disabled = purchased || wallet < price;
  const item = document.createElement("div");
  item.className = "shop-item";
  const button = uiButton("", () => {
    if (isBuff || isUpgrade) buy([id]);
    else {
      focus = focus?.source === "shop" && focus.id === id ? null : { source: "shop", id };
      refresh();
    }
  }, "card shop-card", disabled);
  const rank = purchased ? ranks[id] : Math.min(maxRank, (ranks[id] ?? 0) + 1);
  const description = isBuff ? card.description : facilityDescription(id, rank);
  const action = isBuff ? "购买并生效" : isUpgrade ? `升级至 Lv.${rank}` : "购买并摆放";
  button.dataset.card = id;
  if (!isBuff && !isUpgrade) button.setAttribute("aria-pressed", String(focus?.source === "shop" && focus.id === id));
  button.setAttribute("aria-label", `${card.title}，${description}，${purchased ? "已购" : `${action}，${format(price)} 金币`}`);
  button.innerHTML = `${icon(id)}<strong>${card.title}</strong><small class="card-kind">${isBuff ? "本关 BUFF" : `Lv.${rank}${!purchased && isUpgrade ? " 升级" : ""}`}</small><small>${description}</small>`;
  item.append(button);

  if (purchased) {
    const label = document.createElement("span");
    label.className = "shop-price sold";
    label.textContent = "已购";
    item.append(label);
  } else {
    const priceButton = uiButton(format(price), () => buy([id]), "shop-price", disabled);
    const operation = isBuff ? `购买${card.title}并立即生效` : isUpgrade ? `升级${card.title}至 Lv.${rank}` : `购买${card.title}存入仓库`;
    priceButton.setAttribute("aria-label", `${operation}，${format(price)} 金币`);
    item.append(priceButton);
    if (!isBuff && !isUpgrade && !disabled) {
      button.classList.add("shop-draggable");
      enableShopDrag(button, id);
    }
  }
  draft.append(item);
}

function drawDetail() {
  const id = focus.source === "lot" ? layout[focus.slot] : focus.id;
  const rank = ranks[id];
  const box = document.createElement("div");
  box.className = "chosen";
  box.innerHTML = `${icon(id)}<div><strong>${cards[id].title} · Lv.${rank}</strong>
    <span>${facilityDescription(id, rank)}</span><span>${rank === maxRank ? "已满级" : `效果 ${strength(rank)}%`}</span></div>`;
  if (focus.source === "lot") {
    const slot = focus.slot;
    box.append(uiButton("收回仓库", () => returnToStock(slot), "back-to-draft"));
  }
  draft.append(box);
}

function drawDraft() {
  draft.replaceChildren();
  $("shop-nav").hidden = phase !== "plan";
  draft.hidden = phase !== "plan";
  if (phase !== "plan") return;
  $("shop-tab").setAttribute("aria-pressed", String(panel === "shop" && (!focus || focus.source === "shop")));
  $("stock-tab").setAttribute("aria-pressed", String(panel === "stock" && !focus));
  $("stock-tab").textContent = `仓库 ${stock.length}`;
  const remaining = options.filter((id) => !sold.has(id));
  const price = remaining.reduce((sum, id) => sum + priceOf(id, day), 0);
  const shopping = panel === "shop" && focus?.source !== "lot";
  $("buy-all").hidden = !shopping;
  $("buy-all").disabled = !remaining.length || wallet < price;
  $("buy-all").textContent = remaining.length ? `全买 ${format(price)}` : "已买齐";
  const cost = refreshPrice(refreshes);
  $("refresh-shop").hidden = !shopping;
  $("refresh-shop").disabled = wallet < cost;
  $("refresh-shop").textContent = `刷新 ${format(cost)}`;
  if (focus && focus.source !== "shop") drawDetail();
  else if (panel === "shop" && options.length) options.forEach(drawShopCard);
  else if (panel === "stock" && stock.length) {
    const list = document.createElement("div");
    list.className = "stock-list";
    stock.forEach(drawStockCard);
    list.append(...draft.children);
    draft.append(list);
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-stock";
    empty.textContent = panel === "shop" ? "设施已满级，BUFF 已购齐" : "仓库暂无设施";
    draft.append(empty);
  }
}


function positionLabels() {
  if (!level) return;
  const project = (x, y, z) => {
    if (view?.width) {
      const point = view.project(x, y, z);
      return [`${point.x}px`, `${point.y}px`];
    }
    const near = level.map.nodes.entry[1];
    const far = level.map.nodes.exit[1];
    return [`${50 + x / level.map.width * 92}%`, `${24 + (z - far) / (near - far) * 66}%`];
  };
  for (const lot of level.map.lots) {
    const isBuilt = Boolean(layout?.[lot.id]);
    const [x, y] = project(lot.x, 0.2, lot.z + (isBuilt ? 0.64 : 0));
    const button = anchors.get(lot.id);
    button.style.setProperty("--x", x);
    button.style.setProperty("--y", y);
  }
  for (const [id, , x, z] of level.map.badges) {
    const [left, top] = project(x, 0.29, z);
    const badge = branchBadges.get(id);
    badge.style.setProperty("--x", left);
    badge.style.setProperty("--y", top);
  }
}

function drawLots() {
  for (const lot of level.map.lots) {
    const button = anchors.get(lot.id);
    const id = layout[lot.id];
    button.textContent = id ? `${cards[id].title} · ${ranks[id]}` : "+";
    button.classList.toggle("built", Boolean(id));
    const placing = focus?.source === "stock";
    button.classList.toggle("target", Boolean(focus?.moving || placing || (focus?.source === "shop" && !id)));
    button.classList.toggle("selected", focus?.source === "lot" && focus.slot === lot.id);
    button.setAttribute("aria-label", id ? `${lot.label}：${cards[id].title} Lv.${ranks[id]}` : `${lot.label}：空地`);
    button.hidden = phase !== "plan";
  }
  view?.setLayout(layout, phase !== "plan");
  view?.setBuffs(activeBuffs);
  positionLabels();
}

function routeCounts(counts) {
  for (const [id, badge] of branchBadges) badge.querySelector("strong").textContent = counts[id] ?? 0;
}

function showBuff(title, description) {
  $("buff-title").textContent = title;
  $("buff-description").textContent = description;
  $("buff-detail").showModal();
}

function updateGoal() {
  const amount = phase === "run" ? runTotals.revenue + sale : runTotals.revenue;
  const stars = starsFor(level, amount);
  $("show-goals").textContent = stars === 3
    ? `★★★ ${format(amount)}`
    : `${stars + 1}★ ${format(amount)} / ${format(level.thresholds[stars])}`;
}

function updateHud() {
  $("day").textContent = `第 ${day} / ${level.days} 天`;
  $("wallet").textContent = format(wallet);
  const trait = traitInfo(level.trait);
  const traitButton = uiButton("", () => showBuff(trait.title, trait.description), "trait-chip");
  traitButton.innerHTML = `${icon(trait.art)}<span>${trait.title}</span>`;
  const buttons = Array.from(activeBuffs, (id) => {
    const buff = buffs[id];
    const button = uiButton("", () => showBuff(buff.title, buff.description), "buff-chip");
    button.setAttribute("aria-label", `查看 ${buff.title} 效果`);
    button.innerHTML = icon(id);
    return button;
  });
  $("active-buffs").replaceChildren(traitButton, ...buttons);
  updateGoal();
}

function refresh() {
  preview = simulate(layout, level, day, ranks, activeBuffs).results;
  updateHud();
  $("guest-caption").textContent = "今日游客";
  $("guest-count").textContent = `${preview.count} 人`;
  $("revenue-caption").textContent = "预计营收";
  $("revenue").textContent = format(preview.revenue);
  routeCounts(preview.routes);
  drawLots();
  drawDraft();
  let hint = "拖到空地购买并摆放 · 点价格存仓库";
  if (focus?.moving) hint = "点另一格换位，或再点自己取消";
  else if (focus?.source === "shop") hint = "点地图上的空地购买并摆放";
  else if (focus?.source === "stock") hint = "点空地摆放，点已有设施则换回仓库";
  else if (panel === "stock") hint = "仓库设施可摆放到任意路线";
  else if (lastInterest > 0) hint = `利息 +${format(lastInterest)} 已到账`;
  $("hint").textContent = hint;
  open.textContent = "开园营业";
  open.disabled = Boolean(focus?.moving);
}

function wakeSound() {
  if (!window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  } catch {
    audio = null;
  }
}

function sound(id) {
  if (!audio || audio.state !== "running" || audio.currentTime - lastChime < 0.18) return;
  const tones = { photo: 1120, coaster: 580, ghost: 385, snack: 730, exit: 920, cheer: 990, slide: 680, trampoline: 540, cups: 830 };
  if (!tones[id]) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  lastChime = now;
  const start = tones[id];
  oscillator.type = id === "photo" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(start, now);
  const rising = id === "coaster" || id === "cheer" || id === "trampoline";
  oscillator.frequency.exponentialRampToValueAtTime(rising ? start * 1.55 : start * 0.66, now + 0.14);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.058, now + 0.016);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.19);
}

function clearNotice() {
  clearTimeout(noticeTimer);
  $("map-notice").hidden = true;
}

function displayNotice(text, duration = 1650) {
  clearNotice();
  const notice = $("map-notice");
  notice.textContent = text;
  notice.hidden = false;
  noticeTimer = setTimeout(clearNotice, duration);
}

function float(event) {
  if (!view?.width || prefersReducedMotion) return;

  const point = Number.isFinite(event.z)
    ? view.project(event.x + (event.guest % 2 ? 0.26 : -0.24), event.type === "visit" ? 1.8 : 1.25, event.z)
    : view.project(0.8, 1.09, level.map.nodes.exit[1] + 0.45);
  const item = document.createElement("span");
  item.className = `float ${event.id ?? "coins"} ${event.type}`;
  item.textContent = event.text ?? `+${event.coins}`;
  item.style.left = `${point.x}px`;
  item.style.top = `${point.y}px`;
  $("effects").append(item);
  item.addEventListener("animationend", () => item.remove(), { once: true });
  if (event.id === "photo" && event.type === "visit") {
    const flash = document.createElement("i");
    flash.className = "flash";
    flash.style.left = item.style.left;
    flash.style.top = item.style.top;
    $("effects").append(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  }
}

function moodIcon(mood) {
  return `<span class="mood-badge" data-mood="${mood}" aria-hidden="true"><span class="mood-face"></span></span>`;
}

function clearGuestMoods() {
  guestMoods = [];
  $("guest-moods").replaceChildren();
}

function createGuestMoods(guests) {
  const markers = $("guest-moods");
  guestMoods = guests.map((guest) => {
    const marker = document.createElement("span");
    marker.className = "guest-mood";
    marker.hidden = true;
    marker.setAttribute("role", "img");
    marker.innerHTML = moodIcon("unhappy");
    markers.append(marker);
    return marker;
  });
  for (const guest of guests) updateGuestMood(guest.index, guest.initialScore);
}

function updateGuestMood(index, score) {
  const marker = guestMoods[index];
  if (!marker) return;
  const badge = marker.firstElementChild;
  const mood = moodFor(score);
  const changed = badge.dataset.mood !== mood.id;
  if (changed && !prefersReducedMotion) {
    badge.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], { duration: 300, easing: "ease-out" });
  }
  badge.dataset.mood = mood.id;
  badge.style.setProperty("--progress", `${Math.min(100, score)}%`);
  marker.setAttribute("aria-label", `游客 ${index + 1}，${mood.label}，属性总和 ${score}`);
  return changed ? mood : null;
}

function positionGuestMoods() {
  const shown = [];
  const offsets = [[0, 0], [-10, -7], [10, -7], [-17, 0], [17, 0], [0, -17], [-20, -11], [20, -11]];
  for (const [index, marker] of guestMoods.entries()) {
    const point = view?.projectGuest(index);
    const hidden = !point;
    if (marker.hidden !== hidden) marker.hidden = hidden;
    if (!point) continue;
    const offset = offsets.find(([x, y]) => {
      const proposed = { x: point.x + x, y: point.y + y };
      return shown.every((other) => (proposed.x - other.x) ** 2 + (proposed.y - other.y) ** 2 >= 400);
    }) ?? offsets[0];
    const markerPoint = { x: point.x + offset[0], y: point.y + offset[1] };
    shown.push(markerPoint);
    marker.style.transform = `translate3d(${Math.round(markerPoint.x)}px, ${Math.round(markerPoint.y)}px, 0) translate(-50%, -50%)`;
  }
}

function onEvent(event) {
  if (event.type === "branch") {
    if (branchBadges.has(event.route)) seen.routes[event.route] = (seen.routes[event.route] ?? 0) + 1;
    routeCounts(seen.routes);
    if (event.guided) {
      view?.signal(event);
      if (event.guest % 3 === 0) float({ ...event, id: "flags", text: "这边好玩！" });
    }
    view?.react({ ...event, id: "turn" });
  } else if (event.type === "farewell") {
    view?.react({ ...event, id: "farewell" });
  } else if (event.type === "exit") {
    sale += event.coins;
    seen.exited++;
    $("guest-count").textContent = `${seen.exited} / ${show.results.count} 人`;
    $("revenue").textContent = format(sale);
    updateGoal();
    if (event.guest % 3 === 0) {
      float(event);
      sound("exit");
    }
  } else if (event.type === "visit" || event.type === "bonus") {
    const changed = updateGuestMood(event.guest, event.score);
    view?.react({ ...event, milestone: changed?.id });
    if (event.type === "bonus" || event.relay) view?.signal(event);
    if (event.guest % 3 === 0 || event.id === "photo") {
      float(changed?.id === "happy" ? { ...event, text: `开心啦！${event.text}` } : event);
      sound(changed?.id === "happy" && event.id !== "photo" ? "cheer" : event.id);
    }
    if (event.gag && !photoShown) {
      photoShown = true;
      photo = view?.takePhoto();
      displayNotice("咔嚓！爆米花把脸挡住啦");
    }
  } else if (event.type === "miss") {
    view?.react(event);
    if (event.guest % 3 === 0) float(event);
  }
}

function startDay() {
  if (phase !== "plan" || focus?.moving) return;
  wakeSound();
  clearNotice();
  reserve = wallet;
  interestDue = interestFor(reserve, day, level);
  phase = "run";
  elapsed = 0;
  speed = 1;
  nextEvent = 0;
  sale = 0;
  seen = { routes: {}, exited: 0 };
  photoShown = false;
  show = simulate(layout, level, day, ranks, activeBuffs, true);
  view?.start(show.guests);
  createGuestMoods(show.guests);
  drawLots();
  drawDraft();
  routeCounts(seen.routes);
  $("guest-caption").textContent = "已离园";
  $("guest-count").textContent = `0 / ${show.results.count} 人`;
  $("revenue-caption").textContent = "今日营收";
  $("revenue").textContent = "0";
  $("hint").textContent = "营业中 · 留意游客选路和设施反应";
  open.textContent = "加速营业 ×2";
}

function reportItem(label, value) {
  return `<div><span>${label}</span><strong>${value}</strong></div>`;
}

function reportMood(mood, count) {
  return `<div class="mood-row">${moodIcon(mood.id)}
    <span class="mood-name"><b>${mood.label}</b><small>${mood.range} 分</small></span>
    <span class="mood-rate">${count} 人 × ${mood.coins}</span>
    <strong class="mood-subtotal">${format(count * mood.coins)}</strong>
  </div>`;
}


function endDay() {
  const result = show.results;
  phase = "settled";
  wallet += result.revenue;
  runTotals.revenue += result.revenue;
  for (const mood of moods) runTotals.moods[mood.id] += result.moods[mood.id];
  view?.finish();
  clearGuestMoods();
  clearNotice();
  $("wallet").textContent = format(wallet);
  updateGoal();
  $("hint").textContent = "本波游客已离园";
  open.textContent = "今日已结算";
  open.disabled = true;
  const final = day === level.days;
  const breakdown = final ? runTotals : result;
  const stars = starsFor(level, runTotals.revenue);
  if (final && stars > (progress[level.id] ?? 0)) {
    progress[level.id] = stars;
    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
      // Keep this session's progress when persistent storage is unavailable.
    }
  }
  $("settlement-title").textContent = final
    ? (stars ? `第 ${level.id} 关通关！` : `第 ${level.id} 关营业结束`)
    : `第 ${day} 天结算`;
  $("earned-stars").hidden = !final;
  $("earned-stars").innerHTML = final ? starsMarkup(stars) : "";
  $("report").innerHTML = [
    reportItem(final ? "本关累计营收" : "今日营收", format(breakdown.revenue)),
    final ? reportItem("1 星目标", format(level.goal)) : reportItem("本关累计", format(runTotals.revenue)),
    ...moods.map((mood) => reportMood(mood, breakdown.moods[mood.id])),
    final ? reportItem("可用金币", format(wallet)) : reportItem("下轮到账利息", `+${format(interestDue)}`),
  ].join("");
  const highlights = Object.entries(result.visits)
    .filter(([id]) => cards[id].needs)
    .map(([id, visitors]) => `${cards[id].title}触发 ${visitors} 人`);
  $("report-note").textContent = final
    ? stars === 3 ? "三星目标达成！" : `距离 ${stars + 1} 星还差 ${format(level.thresholds[stars] - breakdown.revenue)} 金币`
    : result.photoGag ? "今日趣事：爆米花也上了合照。" : highlights.join(" · ");
  const souvenir = $("souvenir");
  souvenir.hidden = !photo;
  if (photo) souvenir.querySelector("img").src = photo;
  $("continue").textContent = final ? "返回选关" : "继续经营";
  $("replay-level").hidden = !final;
  settlement.showModal();
}

open.addEventListener("click", () => {
  if (phase === "run") {
    speed = speed === 1 ? 2 : 1;
    open.textContent = speed === 1 ? "加速营业 ×2" : "恢复原速 ×1";
  } else startDay();
});

$("continue").addEventListener("click", () => {
  settlement.close();
  if (day === level.days) {
    const next = levels[level.id];
    showMenu(next && progress[level.id] ? next : level);
  }
  else {
    wallet += interestDue;
    lastInterest = interestDue;
    interestDue = 0;
    day++;
    prepareDay();
  }
});
$("replay-level").addEventListener("click", () => {
  settlement.close();
  freshGame(level);
});
$("enter-level").addEventListener("click", () => {
  freshGame(selectedLevel);
});
$("back-to-levels").addEventListener("click", () => $("leave-level").showModal());
$("confirm-leave").addEventListener("click", () => {
  $("leave-level").close();
  showMenu(level);
});
$("show-goals").addEventListener("click", () => {
  $("park-goals-report").innerHTML = goalsMarkup(level);
  $("park-goals").showModal();
});
$("shop-tab").addEventListener("click", () => switchPanel("shop"));
$("stock-tab").addEventListener("click", () => switchPanel("stock"));
$("refresh-shop").addEventListener("click", refreshShop);
$("buy-all").addEventListener("click", () => buy(options.filter((id) => !sold.has(id)), true));
$("money-help").addEventListener("click", () => {
  const shopping = phase === "plan";
  const saved = shopping ? wallet : reserve;
  $("money-report").innerHTML = [
    reportItem("可用金币", format(wallet)),
    reportItem("本轮利息已到账", `+${format(lastInterest)}`),
    reportItem(shopping ? "按当前余额预计" : "本轮开园留存", format(saved)),
    reportItem("下轮利息", day < level.days ? `+${format(interestFor(saved, day, level))}` : "最后一轮"),
    reportItem("本轮价格倍率", `×${((1 + priceIncrease) ** (day - 1)).toFixed(2)}`),
  ].join("");
  $("money-rules").showModal();
});
settlement.addEventListener("cancel", (event) => event.preventDefault());

showMenu();
let previousFrame;
const firstFrame = performance.now();

function frame(now) {
  if (phase === "run" && !$("leave-level").open) {
    elapsed += Math.min(0.14, Math.max(0, (now - (previousFrame ?? now)) / 1000)) * speed;
    while (nextEvent < show.events.length && show.events[nextEvent].time <= elapsed) {
      onEvent(show.events[nextEvent++]);
    }
    if (elapsed >= show.duration) endDay();
  }
  previousFrame = now;
  if (phase !== "menu" && view?.width) view.draw((now - firstFrame) / 1000, elapsed);
  if (phase === "run") positionGuestMoods();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
