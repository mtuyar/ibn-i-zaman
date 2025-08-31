/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2E7DFF';
const tintColorDark = '#60A5FA';

export type Theme = {
  text: string;
  textDim: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  headerBackground: [string, string];
  cardGradient: [string, string];
  placeholder: string;
  subtitle: string;
};

type Colors = {
  light: Theme;
  dark: Theme;
};

const Colors: Colors = {
  light: {
    text: '#1A1A1A',
    textDim: '#64748B',
    background: '#F8FAFF',
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    primary: '#2E7DFF',
    secondary: '#0EA5E9',
    accent: '#38BDF8',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    headerBackground: ['#2E7DFF', '#60A5FA'],
    cardGradient: ['#2E7DFF', '#38BDF8'],
    surface: '#FFFFFF',
    border: '#E2E8F0',
    placeholder: '#94A3B8',
    subtitle: '#64748B',
    card: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    textDim: '#94A3B8',
    background: '#0F172A',
    tint: tintColorDark,
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
    primary: '#60A5FA',
    secondary: '#0EA5E9',
    accent: '#38BDF8',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    headerBackground: ['#60A5FA', '#2E7DFF'],
    cardGradient: ['#60A5FA', '#38BDF8'],
    surface: '#1E293B',
    border: '#334155',
    placeholder: '#64748B',
    subtitle: '#94A3B8',
    card: '#1E293B',
  },
};

export default Colors;
