import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const backgroundColor = lightColor
    ? colorScheme === 'dark'
      ? darkColor
      : lightColor
    : theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
