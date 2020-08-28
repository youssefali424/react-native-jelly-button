import Animated, {
  add,
  multiply,
  cos,
  sin,
  sub,
  sqrt,
  pow,
  cond,
  lessThan,
  greaterThan,
  concat,
  eq,
  and,
  or,
} from 'react-native-reanimated';
import { string, atan2, minus } from 'react-native-redash';
import { State } from 'react-native-gesture-handler';

const TAU = Math.PI * 2;

const mapToEllipse = (
  { x, y }: { x: number; y: number },
  rx: number,
  ry: number,
  cosphi: number,
  sinphi: number,
  centerx: number,
  centery: number
) => {
  x *= rx;
  y *= ry;

  const xp = cosphi * x - sinphi * y;
  const yp = sinphi * x + cosphi * y;

  return {
    x: xp + centerx,
    y: yp + centery,
  } as { x: number; y: number };
};

const approxUnitArc = (ang1: number, ang2: number) => {
  // If 90 degree circular arc, use a constant
  // as derived from http://spencermortensen.com/articles/bezier-circle
  const a =
    ang2 === 1.5707963267948966
      ? 0.551915024494
      : ang2 === -1.5707963267948966
      ? -0.551915024494
      : (4 / 3) * Math.tan(ang2 / 4);

  const x1 = Math.cos(ang1);
  const y1 = Math.sin(ang1);
  const x2 = Math.cos(ang1 + ang2);
  const y2 = Math.sin(ang1 + ang2);

  return [
    {
      x: x1 - y1 * a,
      y: y1 + x1 * a,
    },
    {
      x: x2 + y2 * a,
      y: y2 - x2 * a,
    },
    {
      x: x2,
      y: y2,
    },
  ];
};

const vectorAngle = (ux: number, uy: number, vx: number, vy: number) => {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;

  let dot = ux * vx + uy * vy;

  if (dot > 1) {
    dot = 1;
  }

  if (dot < -1) {
    dot = -1;
  }

  return sign * Math.acos(dot);
};

const getArcCenter = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  largeArcFlag: number,
  sweepFlag: number,
  sinphi: number,
  cosphi: number,
  pxp: number,
  pyp: number
) => {
  const rxsq = Math.pow(rx, 2);
  const rysq = Math.pow(ry, 2);
  const pxpsq = Math.pow(pxp, 2);
  const pypsq = Math.pow(pyp, 2);

  let radicant = rxsq * rysq - rxsq * pypsq - rysq * pxpsq;

  if (radicant < 0) {
    radicant = 0;
  }

  radicant /= rxsq * pypsq + rysq * pxpsq;
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

  const centerxp = ((radicant * rx) / ry) * pyp;
  const centeryp = ((radicant * -ry) / rx) * pxp;

  const centerx = cosphi * centerxp - sinphi * centeryp + (px + cx) / 2;
  const centery = sinphi * centerxp + cosphi * centeryp + (py + cy) / 2;

  const vx1 = (pxp - centerxp) / rx;
  const vy1 = (pyp - centeryp) / ry;
  const vx2 = (-pxp - centerxp) / rx;
  const vy2 = (-pyp - centeryp) / ry;

  let ang1 = vectorAngle(1, 0, vx1, vy1);
  let ang2 = vectorAngle(vx1, vy1, vx2, vy2);

  if (sweepFlag === 0 && ang2 > 0) {
    ang2 -= TAU;
  }

  if (sweepFlag === 1 && ang2 < 0) {
    ang2 += TAU;
  }

  return [centerx, centery, ang1, ang2];
};

const arcToBezier = ({
  px,
  py,
  cx,
  cy,
  rx,
  ry,
  xAxisRotation = 0,
  largeArcFlag = 0,
  sweepFlag = 0,
}: {
  px: number;
  py: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  xAxisRotation?: number;
  largeArcFlag?: number;
  sweepFlag?: number;
}) => {
  const curves = [];

  if (rx === 0 || ry === 0) {
    return [];
  }

  const sinphi = Math.sin((xAxisRotation * TAU) / 360);
  const cosphi = Math.cos((xAxisRotation * TAU) / 360);

  const pxp = (cosphi * (px - cx)) / 2 + (sinphi * (py - cy)) / 2;
  const pyp = (-sinphi * (px - cx)) / 2 + (cosphi * (py - cy)) / 2;

  if (pxp === 0 && pyp === 0) {
    return [];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const lambda =
    Math.pow(pxp, 2) / Math.pow(rx, 2) + Math.pow(pyp, 2) / Math.pow(ry, 2);

  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  let [centerx, centery, ang1, ang2] = getArcCenter(
    px,
    py,
    cx,
    cy,
    rx,
    ry,
    largeArcFlag,
    sweepFlag,
    sinphi,
    cosphi,
    pxp,
    pyp
  );

  // If 'ang2' == 90.0000000001, then `ratio` will evaluate to
  // 1.0000000001. This causes `segments` to be greater than one, which is an
  // unecessary split, and adds extra points to the bezier curve. To alleviate
  // this issue, we round to 1.0 when the ratio is close to 1.0.
  let ratio = Math.abs(ang2) / (TAU / 4);
  if (Math.abs(1.0 - ratio) < 0.0000001) {
    ratio = 1.0;
  }

  const segments = Math.max(Math.ceil(ratio), 1);

  ang2 /= segments;

  for (let i = 0; i < segments; i++) {
    curves.push(approxUnitArc(ang1, ang2));
    ang1 += ang2;
  }

  return curves.map((curve) => {
    const { x: x1, y: y1 } = mapToEllipse(
      curve[0],
      rx,
      ry,
      cosphi,
      sinphi,
      centerx,
      centery
    );
    const { x: x2, y: y2 } = mapToEllipse(
      curve[1],
      rx,
      ry,
      cosphi,
      sinphi,
      centerx,
      centery
    );
    const { x, y } = mapToEllipse(
      curve[2],
      rx,
      ry,
      cosphi,
      sinphi,
      centerx,
      centery
    );

    return { x1, y1, x2, y2, x, y };
  });
};

export interface Point {
  x: Animated.Adaptable<number>;
  y: Animated.Adaptable<number>;
}
export interface Curve {
  to: Point;
  c1: Point;
  c2: Point;
}
export const curveTo = (
  commands: Animated.Node<string>[],
  c: Curve,
  previous: Point,
  next: Point
) => {
  const { x: cpsX, y: cpsY } = controlPoint(c.c1, previous, c.c2);
  const { x: cpeX, y: cpeY } = controlPoint(c.c2, c.c1, next, true);
  commands.push(string`C${cpsX},${cpsY} ${cpeX},${cpeY} ${c.c2.x},${c.c2.y} `);
};
export const curveToNoSmooth = (
  commands: Animated.Node<string>[],
  c: Curve
) => {
  commands.push(
    string`C${c.to.x},${c.to.y} ${c.c1.x},${c.c1.y} ${c.c2.x},${c.c2.y} `
  );
};
const controlPoint = (
  current: Point,
  previous: Point,
  next: Point,
  reverse?: boolean
) => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const o = line(p, n);
  const angle = add(o.angle, reverse ? Math.PI : 0);
  const length = multiply(o.length, smoothing);
  const x = add(current.x, multiply(cos(angle), length));
  const y = add(current.y, multiply(sin(angle), length));
  return { x, y } as Point;
};
export const line = (pointA: Point, pointB: Point) => {
  const lengthX = sub(pointB.x, pointA.x);
  const lengthY = sub(pointB.y, pointA.y);
  return {
    length: sqrt(add(pow(lengthX, 2), pow(lengthY, 2))),
    angle: atan2(lengthY, lengthX),
  };
};
export const moveTo = (
  commands: Animated.Node<string>[],
  x: Animated.Adaptable<number>,
  y: Animated.Adaptable<number>
) => {
  commands.push(string`M${x},${y} `);
};

export const lineTo = (
  commands: Animated.Node<string>[],
  x: Animated.Adaptable<number>,
  y: Animated.Adaptable<number>
) => {
  commands.push(string`L${x},${y} `);
};

export const close = (commands: Animated.Node<string>[]) => {
  commands.push(string`Z`);
};

export default arcToBezier;

const topEdgeY = (
  cy: number,
  xStart: number,
  xEnd: number,
  borderMargin: number,
  state: Animated.Value<State>,
  x: Animated.Value<number>,
  y: Animated.Node<number>
) =>
  cond(
    and(
      or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
      and(
        greaterThan(x, xStart - borderMargin),
        lessThan(x, xEnd + borderMargin)
      )
    ),
    add(cy, minus(y)),
    cy
  );
const bottomEdgeY = (
  cy: number,
  xStart: number,
  xEnd: number,
  borderMargin: number,
  state: Animated.Value<State>,
  x: Animated.Value<number>,
  y: Animated.Node<number>
) => {
  return cond(
    and(
      or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
      and(
        greaterThan(x, xStart - borderMargin),
        lessThan(x, xEnd + borderMargin)
      )
    ),
    add(cy, y),
    cy
  );
};
export const getPath = (
  borderRadius: number,
  buttonWidth: number,
  buttonHeight: number,
  x: Animated.Value<number>,
  state: Animated.Value<State>,
  y: Animated.Node<number>
) => {
  const curveWidth = (buttonWidth * 100) / 100;
  const curveHeight = (buttonHeight * 20) / 100;
  const borderMargin = borderRadius * 0.5;
  const commands: Animated.Node<string>[] = [];
  const width = buttonWidth;
  const height = buttonHeight + curveHeight;
  const curveStart = cond(
    lessThan(x, curveWidth / 2),
    borderRadius / 2,
    sub(x, curveWidth / 2)
  );
  const curveEnd = cond(
    greaterThan(x, width - curveWidth),
    width - borderRadius,
    add(curveStart, curveWidth)
  );
  moveTo(commands, 0, curveHeight + borderRadius);
  const curvesTopLeft = arcToBezier({
    cx: borderRadius,
    cy: curveHeight,
    rx: borderRadius,
    ry: borderRadius,
    px: 0,
    py: curveHeight + borderRadius,
    xAxisRotation: 0,
    largeArcFlag: 0,
    sweepFlag: 1,
  });
  let finalPointTopLeft: Point = { x: 0, y: curveHeight + borderRadius };
  curvesTopLeft.forEach((val) => {
    finalPointTopLeft = {
      x: val.x2,
      y: val.y2,
    };
    curveToNoSmooth(commands, {
      to: {
        x: val.x1,
        y: topEdgeY(val.y1, val.x1, val.x, borderMargin, state, x, y),
      },
      c1: {
        x: val.x2,
        y: topEdgeY(val.y2, val.x1, val.x, borderMargin, state, x, y),
      },
      c2: {
        x: val.x,
        y: topEdgeY(val.y, val.x2, val.x, borderMargin, state, x, y),
      },
    });
  });
  const curvesTopRight = arcToBezier({
    cx: width,
    cy: curveHeight + borderRadius,
    rx: borderRadius,
    ry: borderRadius,
    px: width - borderRadius,
    py: curveHeight,
    xAxisRotation: 0,
    largeArcFlag: 0,
    sweepFlag: 1,
  });
  const finalPointTopRight: Point =
    curvesTopRight.length > 10
      ? {
          x: curvesTopRight[curvesTopRight.length - 1].x1,
          y: cond(
            greaterThan(x, width - borderRadius * 2),
            add(curvesTopRight[curvesTopRight.length - 1].y1, y),
            curvesTopRight[curvesTopRight.length - 1].y1
          ),
        }
      : {
          x: width - borderRadius,
          y: cond(
            greaterThan(x, width - borderRadius * 2),
            add(curveHeight, minus(y)),
            curveHeight
          ),
        };
  curveTo(
    commands,
    {
      to: {
        x: curveStart,
        y: curveHeight,
      },
      c1: {
        x: x,
        y: minus(sub(y, curveHeight)),
      },
      c2: {
        x: width - borderRadius,
        y: curveHeight,
      },
    },
    finalPointTopLeft,
    finalPointTopRight
  );

  curvesTopRight.forEach((val, i) => {
    const xStart = i === 0 ? width - borderRadius * 2 : width;
    // console.log(val.x2, ' ', val.x);
    curveToNoSmooth(commands, {
      to: {
        x: val.x1,
        y: topEdgeY(
          val.y1,
          Math.min(val.x1, xStart),
          val.x,
          borderMargin,
          state,
          x,
          y
        ),
      },
      c1: {
        x: val.x2,
        y: topEdgeY(
          val.y2,
          Math.min(val.x1, xStart),
          val.x,
          borderMargin,
          state,
          x,
          y
        ),
      },
      c2: {
        x: val.x,
        y: topEdgeY(val.y, val.x1, val.x, borderMargin, state, x, y),
      },
    });
  });

  lineTo(commands, width, height - borderRadius);
  const curvesBottomRight = arcToBezier({
    cx: width - borderRadius,
    cy: height,
    rx: borderRadius,
    ry: borderRadius,
    px: width,
    py: height - borderRadius,
    xAxisRotation: 0,
    largeArcFlag: 0,
    sweepFlag: 1,
  });
  const finalPointBottomRight: Point =
    curvesBottomRight.length > 0
      ? {
          x: curvesBottomRight[curvesBottomRight.length - 1].x1,
          y: cond(
            and(
              greaterThan(x, width - borderRadius * 2),
              or(eq(state, State.BEGAN), eq(state, State.ACTIVE))
            ),
            add(curvesBottomRight[curvesBottomRight.length - 1].y1, y),
            curvesBottomRight[curvesBottomRight.length - 1].y1
          ),
        }
      : {
          x: width - borderRadius,
          y: cond(
            greaterThan(x, width - borderRadius * 2),
            add(height, y),
            height
          ),
        };
  curvesBottomRight.forEach((val, i) => {
    const xStart = i === 0 ? width - borderRadius * 1.5 : 0;
    curveToNoSmooth(commands, {
      to: {
        x: val.x1,
        y: bottomEdgeY(val.y1, xStart, val.x, borderMargin, state, x, y),
      },
      c1: {
        x: val.x2,
        y: bottomEdgeY(val.y2, val.x, val.x1, borderMargin, state, x, y),
      },
      c2: {
        x: val.x,
        y: bottomEdgeY(val.y, val.x, val.x2, borderMargin, state, x, y),
      },
    });
  });
  const curvesBottomLeft = arcToBezier({
    cx: 0,
    cy: height - borderRadius,
    rx: borderRadius,
    ry: borderRadius,
    px: borderRadius,
    py: height,
    xAxisRotation: 0,
    largeArcFlag: 0,
    sweepFlag: 1,
  });
  const finalPointBottomLeft: Point =
    curvesBottomLeft.length > 0
      ? {
          x: curvesBottomLeft[curvesBottomLeft.length - 1].x1,
          y: cond(
            and(
              lessThan(x, borderRadius * 2),
              or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
              greaterThan(y, 0)
            ),
            add(curvesBottomLeft[curvesBottomLeft.length - 1].y1, y),
            curvesBottomLeft[curvesBottomLeft.length - 1].y1
          ),
        }
      : {
          x: borderRadius,
          y: cond(lessThan(x, borderRadius * 2), add(height, y), height),
        };

  curveTo(
    commands,
    {
      to: {
        x: curveEnd,
        y: height,
      },
      c1: {
        x: x,
        y: add(height, y),
      },
      c2: {
        x: borderRadius,
        y: cond(
          and(
            lessThan(x, borderRadius * 1.5),
            or(eq(state, State.BEGAN), eq(state, State.ACTIVE))
          ),
          add(height, y),
          height
        ),
      },
    },
    finalPointBottomRight,
    finalPointBottomLeft
  );
  // lineTo(commands, borderRadius, height);
  curvesBottomLeft.forEach((val, i) => {
    const xStart = i === 0 ? borderRadius * 1.5 : 0;
    curveToNoSmooth(commands, {
      to: {
        x: val.x1,
        y: bottomEdgeY(
          val.y1,
          Math.min(val.x2, val.x1),
          Math.max(val.x2, val.x1, xStart),
          borderMargin,
          state,
          x,
          y
        ),
      },
      c1: {
        x: val.x2,
        y: bottomEdgeY(
          val.y2,
          Math.min(val.x1, val.x),
          Math.max(val.x1, val.x, xStart / 2),
          borderMargin,
          state,
          x,
          y
        ),
      },
      c2: {
        x: val.x,
        y: bottomEdgeY(
          val.y,
          Math.min(val.x2, val.x),
          Math.max(val.x2, val.x),
          borderMargin,
          state,
          x,
          y
        ),
      },
    });
  });
  lineTo(commands, 0, curveHeight + borderRadius);
  close(commands);
  const d = commands.reduce((acc, c) => concat(acc, c));
  return d;
};
