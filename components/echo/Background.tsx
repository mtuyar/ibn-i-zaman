import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { Group, Circle, Rect, LinearGradient, vec, Path, Skia } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface BackgroundProps {
    cameraX: SharedValue<number>;
}

export const Background = ({ cameraX }: BackgroundProps) => {
    // 1. Stars (Far Layer) - Parallax Factor 0.1
    const stars = useMemo(() => {
        return new Array(60).fill(0).map(() => ({
            x: Math.random() * width * 2, // Spread over 2 screens width
            y: Math.random() * height * 0.7, // Top 70%
            r: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
        }));
    }, []);

    // 2. Ruins/Mountains (Mid Layer) - Parallax Factor 0.2
    // Procedural jagged path
    const ruinsPath = useMemo(() => {
        const path = Skia.Path.Make();
        path.moveTo(-width, height);
        let currentX = -width;
        // Generate enough width for scrolling
        while (currentX < width * 10) {
            const w = Math.random() * 150 + 50;
            const h = Math.random() * 200 + 50; // Height of mountains
            // Peak
            path.lineTo(currentX + w / 2, height - h);
            // Valley
            path.lineTo(currentX + w, height);
            currentX += w;
        }
        path.lineTo(currentX, height);
        path.close();
        return path;
    }, []);

    // Derived Values for Parallax
    // We use modulo for stars to create an infinite loop effect
    const layer1Transform = useDerivedValue(() => {
        const offset = -(cameraX.value * 0.05);
        return [{ translateX: offset % width }];
    });

    const layer1DuplicateTransform = useDerivedValue(() => {
        const offset = -(cameraX.value * 0.05);
        return [{ translateX: (offset % width) + width }];
    });

    const layer2Transform = useDerivedValue(() => [{ translateX: -(cameraX.value * 0.2) }]);

    return (
        <Group>
            {/* Sky Gradient - More Vibrant / Mystical */}
            <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, height)}
                    colors={['#1e1b4b', '#4c1d95', '#8b5cf6', '#c084fc']}
                    positions={[0, 0.3, 0.7, 1]}
                />
            </Rect>

            {/* Stars Layer 1 (Original) */}
            <Group transform={layer1Transform}>
                {stars.map((star, i) => (
                    <Circle
                        key={i}
                        cx={star.x}
                        cy={star.y}
                        r={star.r}
                        color="#fbbf24" // Amber/Gold tint
                        opacity={star.opacity}
                    />
                ))}
            </Group>

            {/* Stars Layer 2 (Duplicate for seamless loop) */}
            <Group transform={layer1DuplicateTransform}>
                {stars.map((star, i) => (
                    <Circle
                        key={`dup-${i}`}
                        cx={star.x} // Use original x, offset is handled by transform
                        cy={star.y}
                        r={star.r}
                        color="#fbbf24"
                        opacity={star.opacity}
                    />
                ))}
            </Group>

            {/* Ruins / Mountains Layer */}
            <Group transform={layer2Transform}>
                <Path path={ruinsPath} color="#0f172a" opacity={0.9} />
            </Group>
        </Group>
    );
};
