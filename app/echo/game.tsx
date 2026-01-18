import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GameEngine } from '../../components/echo/GameEngine';

export default function EchoGameScreen() {
    return (
        <View style={styles.container}>
            <GameEngine />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
