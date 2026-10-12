import { Colors, ThemeColors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? 'light' : 'dark';
  return Colors[theme];
}

export function useIsDark(): boolean {
  const scheme = useColorScheme();
  return scheme !== 'light';
}
