import React from 'react';
import { Group, Rect, LinearGradient, vec, Path, Skia, Circle, BlurMask } from '@shopify/react-native-skia';

// Define Level Data for Physics
export const LEVEL_DATA = [
    // Main Ground - Lowered to 600 to show more background
    { x: -10000, y: 600, w: 20000, h: 1000, type: 'ground' },
    // Platforms
    { x: 300, y: 450, w: 150, h: 20, type: 'platform' },
    { x: 600, y: 350, w: 150, h: 20, type: 'platform' },
    { x: 900, y: 250, w: 150, h: 20, type: 'platform' },
    { x: 1200, y: 350, w: 150, h: 20, type: 'platform' },
    { x: 1500, y: 450, w: 150, h: 20, type: 'platform' },
];

// Goal Position
export const GOAL_POS = { x: 1600, y: 350 };

export const Level = () => {
    return (
        <Group>
            {LEVEL_DATA.map((obj, i) => {
                if (obj.type === 'ground') {
                    return (
                        <Rect key={i} x={obj.x} y={obj.y} width={obj.w} height={obj.h}>
                            <LinearGradient
                                start={vec(0, obj.y)}
                                end={vec(0, obj.y + 200)}
                                colors={['#0f172a', '#000000']}
                            />
                        </Rect>
                    );
                }
                return (
                    <Group key={i}>
                        {/* Platform Glow */}
                        <Rect
                            x={obj.x - 2} y={obj.y - 2}
                            width={obj.w + 4} height={obj.h + 4}
                            color="#38bdf8" opacity={0.3}
                            style="stroke" strokeWidth={2}
                        />
                        {/* Platform Body */}
                        <Rect
                            x={obj.x} y={obj.y}
                            width={obj.w} height={obj.h}
                            color="#334155" // Lighter slate
                        />
                    </Group>
                );
            })}

            {/* The Anchor (Goal) */}
            <Group transform={[{ translateX: GOAL_POS.x }, { translateY: GOAL_POS.y }]}>
                <Circle cx={0} cy={0} r={30} color="#fbbf24" opacity={0.8}>
                    <BlurMask blur={15} style="normal" />
                </Circle>
                <Circle cx={0} cy={0} r={15} color="#fff" />
                <Circle cx={0} cy={0} r={10} color="#fbbf24" style="stroke" strokeWidth={2} />
            </Group>
        </Group>
    );
};
