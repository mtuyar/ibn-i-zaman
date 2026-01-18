import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Pressable, Text } from 'react-native';
import { Canvas, Rect, Circle, Group, Fill, Shader, vec } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, useFrameCallback, runOnJS } from 'react-native-reanimated';
import { lightingShader } from './shaders';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Physics Constants
const GRAVITY = 0.4;
const FRICTION = 0.92;
const MOVE_SPEED = 0.6;
const MAX_SPEED = 6;
const JUMP_FORCE = -10;

// Level Data
const PLATFORMS = [
    { x: 100, y: 400, w: 200, h: 20 },
    { x: 400, y: 300, w: 150, h: 20 },
    { x: 200, y: 200, w: 100, h: 20 },
    { x: 600, y: 400, w: 200, h: 20 },
    { x: 500, y: 150, w: 100, h: 20 },
    { x: 800, y: 300, w: 150, h: 20 }, // Goal area
];

const GOAL = { x: 850, y: 250, r: 20 };

export const LuminaGame = () => {
    const router = useRouter();
    // const clock = useClockValue(); // Deprecated
    const time = useSharedValue(0);

    // Player State
    const pos = useSharedValue({ x: 150, y: 300 });
    const vel = useSharedValue({ x: 0, y: 0 });
    const input = useSharedValue({ left: false, right: false, jump: false });

    // Light State
    const lightRadius = useSharedValue(250);

    // Game Loop
    useFrameCallback((frameInfo) => {
        if (!frameInfo.timeSincePreviousFrame) return;

        // Update Time
        time.value += frameInfo.timeSincePreviousFrame / 1000;

        const { left, right, jump } = input.value;
        let { x: px, y: py } = pos.value;
        let { x: vx, y: vy } = vel.value;

        // Movement (Floating feel)
        if (left) vx -= MOVE_SPEED;
        if (right) vx += MOVE_SPEED;

        vx *= FRICTION;

        // Clamp
        if (vx > MAX_SPEED) vx = MAX_SPEED;
        if (vx < -MAX_SPEED) vx = -MAX_SPEED;

        // Gravity
        vy += GRAVITY;

        // Apply Velocity
        px += vx;
        py += vy;

        // Collision
        let grounded = false;

        // Floor
        if (py > height - 50) {
            py = height - 50;
            vy = 0;
            grounded = true;
        }

        // Platforms
        // Only collide if visible (within light radius + margin)
        // This is the core mechanic: "Light reveals reality"
        // Actually, let's make them always solid but only visible in light for now to avoid frustration.
        // Or better: "Shadow Platforms" - they don't exist unless lit? No, that's hard to platform on.
        // Let's stick to: They are solid, but you can't see them without light.

        for (const p of PLATFORMS) {
            if (
                px >= p.x && px <= p.x + p.w &&
                py >= p.y && py <= p.y + p.h &&
                vy >= 0 && // Falling
                py - vy <= p.y // Was above
            ) {
                py = p.y;
                vy = 0;
                grounded = true;
            }
        }

        // Jump
        if (jump && grounded) {
            vy = JUMP_FORCE;
            // Reset jump input to prevent bunny hopping
            input.value = { ...input.value, jump: false };
        }

        // Update
        pos.value = { x: px, y: py };
        vel.value = { x: vx, y: vy };

        // Light Pulse
        // lightRadius.value = 250 + Math.sin(clock.value * 0.002) * 20;
    });

    // Shader Uniforms
    const uniforms = useDerivedValue(() => ({
        u_resolution: vec(width, height),
        u_lightPos: vec(pos.value.x, pos.value.y),
        u_lightRadius: lightRadius.value,
        u_time: time.value,
    }));

    // Input Handlers
    const handleTouchStart = (dir: 'left' | 'right' | 'jump') => {
        input.value = { ...input.value, [dir]: true };
    };
    const handleTouchEnd = (dir: 'left' | 'right' | 'jump') => {
        input.value = { ...input.value, [dir]: false };
    };

    return (
        <View style={styles.container}>
            <Canvas style={styles.canvas}>
                {/* Background Layer (The Void) */}
                <Fill color="#000000" />

                {/* Atmospheric Lighting Shader */}
                <Fill>
                    <Shader source={lightingShader} uniforms={uniforms} />
                </Fill>

                {/* Platforms (Only visible if lit - we can use opacity based on distance in shader, 
                    but here we just draw them dark so they blend into shadow, and light reveals them) 
                */}
                {PLATFORMS.map((p, i) => (
                    <Rect
                        key={i}
                        x={p.x} y={p.y} width={p.w} height={p.h}
                        color="#1e293b"
                    />
                ))}

                {/* Goal */}
                <Circle cx={GOAL.x} cy={GOAL.y} r={GOAL.r} color="#fbbf24" opacity={0.8} />

                {/* Player (The Light Source) */}
                <Circle cx={pos.value.x} cy={pos.value.y} r={10} color="#ffffff" />
                <Circle cx={pos.value.x} cy={pos.value.y} r={15} color="#ffffff" opacity={0.3} />
            </Canvas>

            {/* UI Overlay */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color="white" />
                </Pressable>
                <Text style={styles.title}>LUMINA</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <View style={styles.controlsLeft}>
                    <Pressable
                        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                        onPressIn={() => handleTouchStart('left')}
                        onPressOut={() => handleTouchEnd('left')}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                        onPressIn={() => handleTouchStart('right')}
                        onPressOut={() => handleTouchEnd('right')}
                    >
                        <Ionicons name="arrow-forward" size={24} color="white" />
                    </Pressable>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.btn, styles.btnJump, pressed && styles.btnPressed]}
                    onPressIn={() => handleTouchStart('jump')}
                    onPressOut={() => handleTouchEnd('jump')}
                >
                    <Ionicons name="arrow-up" size={24} color="white" />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    canvas: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 4,
        opacity: 0.8,
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    controlsLeft: {
        flexDirection: 'row',
        gap: 20,
    },
    btn: {
        width: 65,
        height: 65,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnJump: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.4)',
    },
    btnPressed: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ scale: 0.95 }],
    },
});
