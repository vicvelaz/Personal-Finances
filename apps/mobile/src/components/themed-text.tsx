import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { translate, translateKey, type TranslationKey } from '@fin/shared';
import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  translateText?: boolean;
  translationKey?: TranslationKey;
  translationValues?: Record<string, string | number>;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  translateText = true,
  translationKey,
  translationValues,
  accessibilityLabel,
  children: rawChildren,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const { locale } = useLocale();
  const children = translationKey
    ? translateKey(locale, translationKey, translationValues)
    : translateText
      ? translateChildren(rawChildren, locale)
      : rawChildren;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
      accessibilityLabel={accessibilityLabel ? translate(locale, accessibilityLabel) : undefined}
    >
      {children}
    </Text>
  );
}

function translateChildren(children: ReactNode, locale: string): ReactNode {
  if (typeof children === 'string') return translate(locale, children);
  if (Array.isArray(children)) return children.map((child) => translateChildren(child, locale));
  return children;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
