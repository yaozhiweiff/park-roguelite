import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cards, deal, interestFor, levels, maxRank, moods, priceOf, refreshPrice, simulate, starsFor, startingCoins } from "../src/game.js";
import { pathX } from "../src/maps.js";

const solutions = JSON.parse(readFileSync(new URL("./three-star-runs.json", import.meta.url)));
assert.deepEqual(solutions.map(({ id }) => id), levels.map(({ id }) => id));
assert.deepEqual([0, 1, 2].map(refreshPrice), [200, 300, 400]);

for (const { id, revenue: recordedRevenue, replay } of solutions) {
  const level = levels[id - 1];
  const ranks = level.trait.gift ? { [level.trait.gift]: 1 } : {};
  const buffs = new Set();
  const slots = new Set(level.map.lots.map((lot) => lot.id));
  let revenue = 0;
  let wallet = startingCoins;
  let guests = 0;
  assert.equal(replay.length, level.days);

  replay.forEach(({ steps, layout }, index) => {
    const day = index + 1;
    steps.forEach((purchases, refreshes) => {
      if (refreshes > 0) {
        wallet -= refreshPrice(refreshes - 1);
        assert.ok(wallet >= 0, `Level ${id}, day ${day}: cannot afford refresh`);
      }
      const offers = deal(level, day, refreshes, ranks, buffs);
      for (const purchase of new Set(purchases)) {
        assert.ok(offers.includes(purchase), `Level ${id}, day ${day}: ${purchase} is not on sale`);
        wallet -= priceOf(purchase, day);
        assert.ok(wallet >= 0, `Level ${id}, day ${day}: cannot afford ${purchase}`);
        if (cards[purchase]) {
          ranks[purchase] = (ranks[purchase] ?? 0) + 1;
          assert.ok(ranks[purchase] <= maxRank);
        } else {
          assert.ok(!buffs.has(purchase));
          buffs.add(purchase);
        }
      }
      assert.equal(new Set(purchases).size, purchases.length);
    });

    for (const [slot, facility] of Object.entries(layout)) {
      assert.ok(slots.has(slot) && ranks[facility], `Level ${id}, day ${day}: illegal placement`);
    }
    assert.equal(new Set(Object.values(layout)).size, Object.values(layout).length);
    const forecast = simulate(layout, level, day, ranks, buffs).results;
    const wave = simulate(layout, level, day, ranks, buffs, true);
    assert.deepEqual(wave.results, forecast);
    const exits = wave.events.filter((event) => event.type === "exit");
    assert.equal(exits.length, forecast.count);
    assert.equal(new Set(exits.map((event) => event.guest)).size, forecast.count);
    assert.equal(exits.reduce((sum, event) => sum + event.coins, 0), forecast.revenue);
    const baseRevenue = moods.reduce((sum, mood) => sum + forecast.moods[mood.id] * mood.coins, 0);
    assert.equal(forecast.revenue, baseRevenue + forecast.happyBonus);
    for (const [route, count] of Object.entries(forecast.routes)) {
      assert.equal(wave.events.filter((event) => event.type === "branch" && event.route === route).length, count);
    }
    assert.equal(Object.values(forecast.routes).reduce((sum, count) => sum + count, 0), forecast.count);
    for (const guest of wave.guests) {
      guest.segments.slice(1).forEach((step, stepIndex) => {
        const previous = guest.segments[stepIndex];
        assert.equal(step.start, previous.end);
        assert.equal(step.from, previous.to);
        assert.ok(Math.abs(pathX(step.lane, step.from) - pathX(previous.lane, previous.to)) < 1e-9);
      });
    }
    guests += forecast.count;
    revenue += forecast.revenue;
    wallet += forecast.revenue + interestFor(wallet, day, level);
  });

  assert.equal(guests, level.visitors);
  assert.equal(revenue, recordedRevenue);
  assert.equal(starsFor(level, revenue), 3);
  level.thresholds.forEach((target, index) => {
    assert.equal(starsFor(level, target - 1), index);
    assert.equal(starsFor(level, target), index + 1);
  });
  console.log(`Level ${id}: ${revenue.toLocaleString("en-US")} / ${level.thresholds[2].toLocaleString("en-US")} · 3 stars`);
}

const testLevel = levels[0];
for (const [score, payout] of [[99, 150], [100, 200], [100.5, 200], [101, 201], [125.5, 225]]) {
  const level = { ...testLevel, trait: { stat: "joy", points: score } };
  const { results, events } = simulate({}, level, 1, {}, new Set(), true);
  assert.equal(results.revenue, results.count * payout);
  assert.equal(results.happyBonus, results.count * Math.max(0, payout - 200));
  assert.ok(events.filter((event) => event.type === "exit").every((event) => event.coins === payout));
}

for (let refreshes = 0; refreshes < 30; refreshes++) {
  const offers = deal(testLevel, 1, refreshes, { coaster: maxRank }, new Set(["relay"]));
  assert.equal(new Set(offers).size, 3);
  assert.ok(!offers.includes("coaster") && !offers.includes("relay"));
}

const firstOffers = deal(testLevel, 1, 0, {}, new Set());
const held = [firstOffers[0], undefined, firstOffers[2]];
for (const [day, refreshes] of [[1, 1], [2, 0]]) {
  const refreshed = deal(testLevel, day, refreshes, {}, new Set(), held);
  assert.equal(refreshed[0], held[0]);
  assert.equal(refreshed[2], held[2]);
  assert.equal(new Set(refreshed).size, 3);
}
