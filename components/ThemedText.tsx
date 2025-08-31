import React from 'react';
import { Text, TextStyle, TextProps } from 'react-native';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

export type TextType = 'default' | 'title' | 'subtitle' | 'body' | 'small' | 'link' | 'error';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: TextType;
};

export function ThemedText({ style, lightColor, darkColor, type = 'default', ...otherProps }: ThemedTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  // Temel renk
  const color = lightColor
    ? colorScheme === 'dark'
      ? darkColor
      : lightColor
    : theme.text;
  
  // Metin türü stilleri
  let textStyle: TextStyle = {};
  
  switch (type) {
    case 'title':
      textStyle = { fontSize: 24, fontWeight: 'bold', marginBottom: 10 };
      break;
    case 'subtitle':
      textStyle = { fontSize: 18, fontWeight: '500', marginBottom: 8 };
      break;
    case 'body':
      textStyle = { fontSize: 16, lineHeight: 22 };
      break;
    case 'small':
      textStyle = { fontSize: 14, color: theme.textDim || '#777' };
      break;
    case 'link':
      textStyle = { fontSize: 16, color: theme.primary, textDecorationLine: 'underline' };
      break;
    case 'error':
      textStyle = { fontSize: 14, color: theme.error || '#ff3b30', marginTop: 4 };
      break;
    default:
      textStyle = { fontSize: 16 };
  }

  return <Text style={[{ color }, textStyle, style]} {...otherProps} />;
}
