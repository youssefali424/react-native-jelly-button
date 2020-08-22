import Animated, {
  sub,
  multiply,
  cond,
  lessThan,
  greaterThan,
  concat,
  eq,
  and,
  add,
  or,
  divide,
  abs,
  useCode,
  onChange,
  call,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { StyleSheet } from 'react-native';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import React from 'react';
import {
  useTapGestureHandler,
  minus,
  withSpringTransition,
} from 'react-native-redash';
import arcToBezier, {
  Point,
  curveToNoSmooth,
  curveTo,
  lineTo,
  close,
  moveTo,
} from './SvgUtils';

const AnimatedPath = Animated.createAnimatedComponent(Path);
interface AnimatedButtonProps {
  width: number;
  height: number;
  borderRadius?: number;
  animateGradient?: boolean;
  gradientStart: string;
  gradientEnd: string;
  gradientStartOpacity?: number;
  gradientEndOpacity?: number;
  onPress?: () => void;
}
const JellyButton: React.FC<AnimatedButtonProps> = ({
  borderRadius: borderRadiusProp = 0,
  width: buttonWidth,
  height: buttonHeight,
  gradientEnd,
  gradientStart,
  animateGradient = false,
  gradientEndOpacity = 1,
  gradientStartOpacity = 1,
  onPress,
  children,
}) => {
  const { gestureHandler, position, state } = useTapGestureHandler();

  // const buttonWidth = 200;
  // const buttonHeight = 100;
  const borderRadiusWidth =
    borderRadiusProp > (buttonWidth * 8) / 100
      ? (buttonWidth * 8) / 100
      : borderRadiusProp;
  const borderRadiusHieght =
    borderRadiusProp > (buttonHeight * 25) / 100
      ? (buttonHeight * 25) / 100
      : borderRadiusProp;
  const borderRadius = Math.min(borderRadiusHieght, borderRadiusWidth);

  const curveWidth = (buttonWidth * 100) / 100;
  const curveHeight = (buttonHeight * 20) / 100;

  const width = buttonWidth;
  const height = buttonHeight + curveHeight;
  const x = position.x;
  const mid = (buttonWidth - borderRadius) / 2;
  const decrease = divide(abs(sub(mid, x)), mid);
  const val = cond(
    or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
    sub(curveHeight, multiply(curveHeight, decrease)),
    0
  );

  const y = withSpringTransition(val, { damping: 4, stiffness: 250 }, 5, state);
  const borderMargin = borderRadius * 0.5;
  const topEdgeY = (cy: number, xStart: number, xEnd: number) =>
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
  const bottomEdgeY = (cy: number, xStart: number, xEnd: number) => {
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
  const commands: Animated.Node<string>[] = [];
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
        y: topEdgeY(val.y1, val.x1, val.x),
      },
      c1: {
        x: val.x2,
        y: topEdgeY(val.y2, val.x1, val.x),
      },
      c2: {
        x: val.x,
        y: topEdgeY(val.y, val.x2, val.x),
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
    console.log(val.x2, ' ', val.x);
    curveToNoSmooth(commands, {
      to: {
        x: val.x1,
        y: topEdgeY(val.y1, Math.min(val.x1, xStart), val.x),
      },
      c1: {
        x: val.x2,
        y: topEdgeY(val.y2, Math.min(val.x1, xStart), val.x),
      },
      c2: {
        x: val.x,
        y: topEdgeY(val.y, val.x1, val.x),
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
        y: bottomEdgeY(val.y1, xStart, val.x),
      },
      c1: {
        x: val.x2,
        y: bottomEdgeY(val.y2, val.x, val.x1),
      },
      c2: {
        x: val.x,
        y: bottomEdgeY(val.y, val.x, val.x2),
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
          Math.max(val.x2, val.x1, xStart)
        ),
      },
      c1: {
        x: val.x2,
        y: bottomEdgeY(
          val.y2,
          Math.min(val.x1, val.x),
          Math.max(val.x1, val.x, xStart / 2)
        ),
      },
      c2: {
        x: val.x,
        y: bottomEdgeY(val.y, Math.min(val.x2, val.x), Math.max(val.x2, val.x)),
      },
    });
  });
  lineTo(commands, 0, curveHeight + borderRadius);
  close(commands);
  const d = commands.reduce((acc, c) => concat(acc, c));

  const translateY = withSpringTransition(
    cond(
      or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
      multiply(
        minus(sub(position.y, buttonHeight / 2)),
        divide(y, curveHeight)
      ),
      0
    ),
    { damping: 4, stiffness: 250 },
    5,
    state
  );
  const offset = cond(
    lessThan(translateY, 0),
    sub(1, divide(y, curveHeight)),
    add(1, divide(y, curveHeight))
  );
  const LinearGradientStop = Animated.createAnimatedComponent(LinearGradient);
  Animated.addWhitelistedNativeProps({
    stopColor: true,
    stopOpacity: true,
    x1: true,
    y1: true,
    x2: true,
  });
  useCode(
    () =>
      onChange(
        state,
        cond(
          eq(state, State.END),
          call([], () => onPress && onPress())
        )
      ),
    []
  );
  return (
    <TapGestureHandler {...gestureHandler}>
      <Animated.View
        style={{
          width: buttonWidth,
          height: buttonHeight,
          // backgroundColor: 'blue',
        }}
      >
        <Svg
          style={[
            StyleSheet.absoluteFill,
            {
              height: buttonHeight + curveHeight * 2,
              transform: [{ translateY: -curveHeight }],
              borderRadius: 50,
            },
          ]}
          viewBox={`0 0 ${buttonWidth} ${buttonHeight + curveHeight * 2}`}
        >
          <Defs>
            {animateGradient ? (
              <LinearGradientStop id="grad" x1="0" y1="0" x2="0" y2={offset}>
                <Stop
                  offset="0"
                  stopColor={gradientStart}
                  stopOpacity={gradientStartOpacity}
                />
                <Stop
                  offset="1"
                  stopColor={gradientEnd}
                  stopOpacity={gradientEndOpacity}
                />
              </LinearGradientStop>
            ) : (
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={gradientStart}
                  stopOpacity={gradientStartOpacity}
                />
                <Stop
                  offset="1"
                  stopColor={gradientEnd}
                  stopOpacity={gradientEndOpacity}
                />
              </LinearGradient>
            )}
          </Defs>
          <AnimatedPath {...{ d }} fill="url(#grad)" />
        </Svg>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ translateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </TapGestureHandler>
  );
};
export default JellyButton;
