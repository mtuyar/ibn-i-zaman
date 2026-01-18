import React from 'react';
import { Circle, Group, Paint, BlurMask } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

interface PlayerProps {
    position: SharedValue<{ x: number; y: number }>;
    state: SharedValue<string>;
}

export const Player = ({ position, state }: PlayerProps) => {
    const cx = useDerivedValue(() => position.value.x);
    const cy = useDerivedValue(() => position.value.y);

    return (
        <Group>
            {/* Glow Effect */}
            <Circle cx={cx} cy={cy} r={20} color="#38bdf8" opacity={0.3}>
                <BlurMask blur={10} style="normal" />
            </Circle>

            {/* Core Body */}
            <Circle cx={cx} cy={cy} r={10} color="#e0f2fe" />
        </Group>
    );
};
