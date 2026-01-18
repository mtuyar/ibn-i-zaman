import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Canvas, Fill, Group } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';
import { Player } from './entities/Player';

const { width, height } = Dimensions.get('window');

interface RendererProps {
    playerPos: SharedValue<{ x: number; y: number }>;
    playerState: SharedValue<string>;
}

export const Renderer = ({ playerPos, playerState }: RendererProps) => {
    return (
        <Canvas style={styles.canvas}>
            <Fill color="#0f172a" />

            {/* Background Layers (Parallax) will go here */}

            {/* Game World */}
            <Group>
                <Player position={playerPos} state={playerState} />
            </Group>

            {/* Foreground / UI */}
        </Canvas>
    );
};

const styles = StyleSheet.create({
    canvas: {
        flex: 1,
    },
});
