import Animated, {
  sub,
  multiply,
  cond,
  lessThan,
  eq,
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
import React, { useMemo, useRef } from 'react';
import {
  useTapGestureHandler,
  minus,
  withSpringTransition,
} from 'react-native-redash';
import { getPath } from './SvgUtils';

const AnimatedPath = Animated.createAnimatedComponent(Path);
Animated.addWhitelistedNativeProps({
  stopColor: true,
  stopOpacity: true,
  x1: true,
  y1: true,
});
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
  gradientHorizontal?: boolean;
}
const LinearGradientStop = Animated.createAnimatedComponent(LinearGradient);
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
  gradientHorizontal = false,
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
  const curveHeight = (buttonHeight * 20) / 100;
  const x = useRef(position.x);
  const y = useMemo(() => {
    const mid = (buttonWidth - borderRadius) / 2;
    const decrease = divide(abs(sub(mid, x.current)), mid);
    const val = cond(
      or(eq(state, State.BEGAN), eq(state, State.ACTIVE)),
      sub(curveHeight, multiply(curveHeight, decrease)),
      0
    );
    return withSpringTransition(val, { damping: 4, stiffness: 250 }, 5, state);
  }, [borderRadius, buttonWidth, curveHeight, x, state]);
  const d = useMemo(() => {
    return getPath(
      borderRadius,
      buttonWidth,
      buttonHeight,
      x.current,
      state,
      y
    );
  }, [borderRadius, buttonHeight, buttonWidth, y, state]);

  const translateY = useMemo(
    () =>
      withSpringTransition(
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
      ),
    [buttonHeight, curveHeight, state, position.y, y]
  );
  const offset = useMemo(
    () =>
      cond(
        lessThan(translateY, 0),
        sub(1, divide(y, curveHeight)),
        add(1, divide(y, curveHeight))
      ),
    [translateY, y, curveHeight]
  );
  // useEffect(() => {

  // }, [buttonHeight, buttonWidth]);

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
              <LinearGradientStop
                id="grad"
                x1="0"
                y1="0"
                x2={gradientHorizontal ? offset : '0'}
                y2={gradientHorizontal ? '0' : offset}
              >
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
              <LinearGradient
                id="grad"
                x1="0"
                y1="0"
                x2={gradientHorizontal ? '1' : '0'}
                y2={gradientHorizontal ? '0' : '1'}
              >
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
