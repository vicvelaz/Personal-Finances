import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { translate } from '@fin/shared';
import { useLocale } from '@/lib/i18n';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, accessibilityLabel, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const { locale } = useLocale();

  return (
    <View
      style={[{ backgroundColor: theme[type ?? 'background'] }, style]}
      accessibilityLabel={accessibilityLabel ? translate(locale, accessibilityLabel) : undefined}
      {...otherProps}
    />
  );
}
