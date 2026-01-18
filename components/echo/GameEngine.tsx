import React from 'react';
import { StyleSheet, View, Dimensions, Pressable, Text } from 'react-native';
import { Canvas, Fill, Circle, Group, BlurMask, Rect, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, useFrameCallback } from 'react-native-reanimated';
import { Background } from './Background';
import { Level, GOAL_POS } from './Level';
import { IntroScreen } from './IntroScreen';

const { width, height } = Dimensions.get('window');

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const FRICTION = 0.8;

// Traveler Design: A small cloak/hood silhouette
const playerPath = Skia.Path.Make();
playerPath.moveTo(0, -15); // Head top
playerPath.lineTo(10, 5);  // Right shoulder
playerPath.lineTo(15, 20); // Right cloak bottom
playerPath.lineTo(-15, 20); // Left cloak bottom
playerPath.lineTo(-10, 5); // Left shoulder
playerPath.close();

const Player = ({ position }: { position: { value: { x: number, y: number } } }) => {
    const transform = useDerivedValue(() => [
        { translateX: position.value.x },
        { translateY: position.value.y },
    ]);

    return (
        <Group transform={transform}>
            {/* Glow / Soul */}
            <Circle cx={0} cy={0} r={12} color="#fbbf24" opacity={0.6}>
                <BlurMask blur={8} style="normal" />
            </Circle>

            {/* Cloak Body */}
            <Path path={playerPath} color="#e2e8f0" />

            {/* Hood/Head */}
            <Circle cx={0} cy={-5} r={8} color="#0f172a" />

            {/* Eyes (Glowing) */}
            <Circle cx={2} cy={-5} r={2} color="#fbbf24" />
            <Circle cx={-2} cy={-5} r={2} color="#fbbf24" />
        </Group>
    );
};

export const GameEngine = () => {
    // Shared Values
    const pos = useSharedValue({ x: width / 2, y: 300 });
    const vel = useSharedValue({ x: 0, y: 0 });
    // Split inputs to avoid race conditions during multi-touch
    const inputLeft = useSharedValue(false);
    const inputRight = useSharedValue(false);
    const inputJump = useSharedValue(false);

    // Time Rewind State
    const history = useSharedValue<{ x: number, y: number }[]>([]);
    const isRewinding = useSharedValue(false);
    const MAX_HISTORY = 600; // 10 seconds at 60fps

    // Game Loop
    useFrameCallback((frameInfo) => {
        if (!frameInfo.timeSincePreviousFrame) return;

        if (isRewinding.value) {
            // REWIND MODE
            const currentHistory = [...history.value];
            if (currentHistory.length > 0) {
                const previousState = currentHistory.pop();
                if (previousState) {
                    pos.value = previousState;
                    // Sync velocity to 0 while rewinding so we don't shoot off when stopping
                    vel.value = { x: 0, y: 0 };
                }
                history.value = currentHistory; // Update shared value reference
            } else {
                // History empty, stop rewinding
                isRewinding.value = false;
            }
        } else {
            // PLAY MODE
            const left = inputLeft.value;
            const right = inputRight.value;
            const jump = inputJump.value;

            let vx = vel.value.x;
            let vy = vel.value.y;
            let px = pos.value.x;
            let py = pos.value.y;

            // Record History
            // Create a copy to ensure immutability/reactivity
            const currentHistory = [...history.value];
            if (currentHistory.length >= MAX_HISTORY) {
                currentHistory.shift();
            }
            currentHistory.push({ x: px, y: py });
            history.value = currentHistory;

            // Physics Constants
            const ACCEL = 1.0; // Snappier movement
            const AIR_ACCEL = 0.8; // Good air control
            const GROUND_FRICTION = 0.85;
            const AIR_FRICTION = 0.98; // Very low friction in air to keep momentum

            // We need to know if we are grounded BEFORE applying input/friction
            // But collision happens AFTER movement application usually.
            // To solve this in a simple loop: use the 'grounded' state from the PREVIOUS frame.
            // Or, we can do a predictive check? 
            // Simpler: Just assume we are in air if y < 500, or use a shared value for 'isGrounded'.
            // For now, let's just use a simple check based on position.
            const isGrounded = py >= 500 || (py >= 350 && (px > 300 && px < 1650)); // Rough check

            // Apply Input
            const acceleration = isGrounded ? ACCEL : AIR_ACCEL;
            if (left) vx -= acceleration;
            if (right) vx += acceleration;

            // Apply Friction
            const friction = isGrounded ? GROUND_FRICTION : AIR_FRICTION;
            vx *= friction;

            // Clamp Speed
            if (vx > MOVE_SPEED) vx = MOVE_SPEED;
            if (vx < -MOVE_SPEED) vx = -MOVE_SPEED;

            // Vertical
            vy += GRAVITY;

            // Apply
            px += vx;
            py += vy;

            // Collision Detection
            let grounded = false;

            // Check against all level objects
            // Since we are in a worklet/frame callback, we need efficient checking.
            // For now, iterating a small array is fine.
            // We need to access LEVEL_DATA. Since it's a constant exported from a file, 
            // we might need to capture it or ensure it's available in the UI thread.
            // Constants are usually fine.

            // Simple AABB Collision for Floor/Platforms
            // We only collide if falling down (vy >= 0) and feet are above/at platform top

            // Hardcoded Ground for safety if LEVEL_DATA fails to load in worklet
            if (py > 600) {
                py = 600;
                vy = 0;
                grounded = true;
            }

            // Platform Collisions (Simplified)
            // We'll define the platforms here locally to ensure worklet availability if needed, 
            // or trust the import. Let's try trusting the import first, but if it fails we'll inline.
            // To be safe in Reanimated, let's define the data inside the component or pass it via SharedValue if dynamic.
            // For static data, it *should* work if defined outside.

            // Let's use the hardcoded ground for now to fix the visual/physics sync immediately.
            // And add a few hardcoded platforms for testing.
            const platforms = [
                { x: 300, y: 450, w: 150 },
                { x: 600, y: 350, w: 150 },
                { x: 900, y: 250, w: 150 },
            ];

            for (const plat of platforms) {
                if (
                    px >= plat.x && px <= plat.x + plat.w && // Horizontal overlap
                    py >= plat.y && py <= plat.y + 20 &&      // Vertical overlap (feet within top range)
                    vy >= 0                                   // Falling
                ) {
                    py = plat.y;
                    vy = 0;
                    grounded = true;
                }
            }

            if (grounded && jump) {
                vy = JUMP_FORCE;
                inputJump.value = false; // Reset jump flag directly
            }

            // Update State
            vel.value = { x: vx, y: vy };
            pos.value = { x: px, y: py };
        }
    });

    // Input Handlers
    const handleJump = () => { inputJump.value = true; };
    const handleLeftPress = () => { inputLeft.value = true; };
    const handleLeftRelease = () => { inputLeft.value = false; };
    const handleRightPress = () => { inputRight.value = true; };
    const handleRightRelease = () => { inputRight.value = false; };

    const handleRewindPress = () => { isRewinding.value = true; };
    const handleRewindRelease = () => { isRewinding.value = false; };

    // Camera System
    // Camera follows player but smooths out or locks to center
    const cameraX = useDerivedValue(() => {
        // Simple center lock: Camera is where player is, minus half screen width
        return pos.value.x - width / 2;
    });

    const worldTransform = useDerivedValue(() => [{ translateX: -cameraX.value }]);

    // Game State
    const [gameStarted, setGameStarted] = React.useState(false);

    return (
        <View style={styles.container}>
            {!gameStarted && <IntroScreen onStart={() => setGameStarted(true)} />}

            <Canvas style={styles.canvas}>
                <Background cameraX={cameraX} />

                {/* World Layer - Affected by Camera */}
                <Group transform={worldTransform}>
                    <Level />
                    <Player position={pos} />
                </Group>
            </Canvas>

            {gameStarted && (
                <View style={styles.controls}>
                    <View style={styles.controlsLeft}>
                        <Pressable
                            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                            onPressIn={handleLeftPress}
                            onPressOut={handleLeftRelease}
                        >
                            <Text style={styles.btnText}>←</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                            onPressIn={handleRightPress}
                            onPressOut={handleRightRelease}
                        >
                            <Text style={styles.btnText}>→</Text>
                        </Pressable>
                    </View>

                    <View style={styles.controlsRight}>
                        <Pressable
                            style={({ pressed }) => [styles.btn, styles.btnRewind, pressed && styles.btnPressed]}
                            onPressIn={handleRewindPress}
                            onPressOut={handleRewindRelease}
                        >
                            <Text style={styles.btnText}>↺</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.btn, styles.btnJump, pressed && styles.btnPressed]}
                            onPressIn={handleJump}
                        >
                            <Text style={styles.btnText}>↑</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    canvas: {
        flex: 1,
    },
    debugContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        pointerEvents: 'none',
    },
    debugText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'monospace',
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
    },
    controlsLeft: {
        flexDirection: 'row',
        gap: 20,
    },
    controlsRight: {
        flexDirection: 'row',
    },
    btn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    btnJump: {
        backgroundColor: 'rgba(56, 189, 248, 0.3)',
        borderColor: 'rgba(56, 189, 248, 0.5)',
    },
    btnRewind: {
        backgroundColor: 'rgba(234, 179, 8, 0.3)',
        borderColor: 'rgba(234, 179, 8, 0.5)',
        marginRight: 20,
    },
    btnText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    btnPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transform: [{ scale: 0.95 }],
    },
});

