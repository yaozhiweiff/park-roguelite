const smooth = (value) => value * value * (3 - 2 * value);

function lane(id, from, to, bends, lots = []) {
  return { id, from, to, bends, lots };
}

function map(id, title, width, nodes, lanes, badges, colors) {
  const outgoing = {};
  const lots = [];
  for (const route of lanes) {
    route.points = [nodes[route.from], ...route.bends, nodes[route.to]];
    (outgoing[route.from] ??= []).push(route);
    for (const [id, z, label] of route.lots) {
      const lot = { id, z, label, x: pathX(route, z) };
      lots.push(lot);
      (route.slots ??= []).push(lot);
    }
    route.slots ??= [];
  }
  return { id, title, width, nodes, lanes, badges, lots, outgoing, colors };
}

export function pathX(route, z) {
  const points = route.points;
  if (z >= points[0][1]) return points[0][0];
  for (let index = 1; index < points.length; index++) {
    const [toX, toZ] = points[index];
    if (z < toZ) continue;
    const [fromX, fromZ] = points[index - 1];
    return fromX + (toX - fromX) * smooth((fromZ - z) / (fromZ - toZ));
  }
  return points.at(-1)[0];
}

const welcome = (z) => ["welcome", z, "入口共用格"];
const farewell = (z) => ["farewell", z, "汇合后格"];
const pair = (id, title, first, last) => [
  [`${id}-first`, first, `${title}第一个格`],
  [`${id}-last`, last, `${title}第二个格`],
];

export const maps = {
  double: map("double", "双路草坪", 9.6, {
    entry: [0, 7.05], fork: [0, 3.18], merge: [0, -4.04], exit: [0, -6.45],
  }, [
    lane("entry", "entry", "fork", [], [welcome(5.15)]),
    lane("left", "fork", "merge", [[-2.1, -0.06], [-2.1, -2.12]], pair("left", "左路", 0.70, -2.03)),
    lane("right", "fork", "merge", [[2.1, -0.06], [2.1, -2.12]], pair("right", "右路", 0.70, -2.03)),
    lane("exit", "merge", "exit", [], [farewell(-4.92)]),
  ], [["left", "左路", -3.35, 0.68], ["right", "右路", 3.35, 0.68]], [0xf8bd8e, 0xe0a66e]),

  triple: map("triple", "三岔花园", 10.7, {
    entry: [0, 8], fork: [0, 4.6], merge: [0, -5.2], exit: [0, -8],
  }, [
    lane("entry", "entry", "fork", [], [welcome(6.23)]),
    lane("left", "fork", "merge", [[-3.45, 0.95], [-3.45, -2.56]], pair("left", "左路", 0.61, -2.35)),
    lane("center", "fork", "merge", [], pair("center", "中路", 0.61, -2.35)),
    lane("right", "fork", "merge", [[3.45, 0.95], [3.45, -2.56]], pair("right", "右路", 0.61, -2.35)),
    lane("exit", "merge", "exit", [], [farewell(-6.35)]),
  ], [["left", "左路", -3.45, -0.79], ["center", "中路", 0, -0.79], ["right", "右路", 3.45, -0.79]], [0xf6c490, 0xdfa77e]),

  cascade: map("cascade", "四径乐谷", 12.1, {
    entry: [0, 9], fork: [0, 6.1], leftFork: [-3.67, 0.95], rightFork: [3.67, 0.95],
    merge: [0, -7.25], exit: [0, -10.4],
  }, [
    lane("entry", "entry", "fork", [], [welcome(7.47)]),
    lane("left", "fork", "leftFork", [[-3.67, 3.17]], [["left-stem", 3, "左路分叉前格"]]),
    lane("right", "fork", "rightFork", [[3.67, 3.17]], [["right-stem", 3, "右路分叉前格"]]),
    lane("a", "leftFork", "merge", [[-5.44, -1.04], [-5.44, -4.34]], pair("a", "左外路", -1.08, -3.83)),
    lane("b", "leftFork", "merge", [[-1.84, -1.04], [-1.84, -4.34]], pair("b", "左内路", -1.08, -3.83)),
    lane("c", "rightFork", "merge", [[1.84, -1.04], [1.84, -4.34]], pair("c", "右内路", -1.08, -3.83)),
    lane("d", "rightFork", "merge", [[5.44, -1.04], [5.44, -4.34]], pair("d", "右外路", -1.08, -3.83)),
    lane("exit", "merge", "exit", [], [farewell(-8.65)]),
  ], [["a", "左外", -5.44, -6.18], ["b", "左内", -1.84, -6.18], ["c", "右内", 1.84, -6.18], ["d", "右外", 5.44, -6.18]], [0xf3bd92, 0xdba183]),
};
