import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  type: 'explosion' | 'sparkle' | 'text';
  text?: string;
}

interface ParticleSystemProps {
  particles: Particle[];
  onComplete: (id: string) => void;
}

const ParticleItem = React.memo(({ particle, onComplete }: { particle: Particle; onComplete: (id: string) => void }) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(particle.type === 'text' ? 0.5 : 1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Random direction for explosion/sparkle
    const angle = Math.random() * Math.PI * 2;
    const distance = particle.type === 'explosion' ? 100 : 60;
    const duration = particle.type === 'text' ? 1000 : (particle.type === 'explosion' ? 600 : 800);

    if (particle.type === 'text') {
      // Float up
      translateY.value = withTiming(-100, { duration, easing: Easing.out(Easing.exp) });
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(500, withTiming(0, { duration: 300 }, () => runOnJS(onComplete)(particle.id)))
      );
      scale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    } else {
      // Explode outward
      const tx = Math.cos(angle) * distance * (Math.random() + 0.5);
      const ty = Math.sin(angle) * distance * (Math.random() + 0.5);

      translateX.value = withTiming(tx, { duration, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(ty, { duration, easing: Easing.out(Easing.quad) });
      
      scale.value = withTiming(0, { duration });
      opacity.value = withTiming(0, { duration }, () => runOnJS(onComplete)(particle.id));
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  if (particle.type === 'text') {
    return (
      <Animated.View style={[styles.textContainer, { left: particle.x, top: particle.y }, style]}>
        <Animated.Text style={[styles.text, { color: particle.color }]}>
          {particle.text}
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.particle, 
        { 
          left: particle.x, 
          top: particle.y, 
          width: particle.size, 
          height: particle.size, 
          backgroundColor: particle.color,
          borderRadius: particle.size / 2
        }, 
        style
      ]} 
    />
  );
});

export const ParticleSystem = ({ particles, onComplete }: ParticleSystemProps) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <ParticleItem key={p.id} particle={p} onComplete={onComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 40,
    marginLeft: -50, // Center horizontally
    marginTop: -20, // Center vertically
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  }
});
