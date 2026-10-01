import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { translate, translateKey, type TranslationKey } from '@fin/shared';
import { useLocale } from '@/lib/i18n';

type LocalizedLabel =
  | { label: string; labelKey?: never }
  | { label?: never; labelKey: TranslationKey };

type LocalizedTitle =
  | { title: string; titleKey?: never }
  | { title?: never; titleKey: TranslationKey };

type TranslationValues = { translationValues?: Record<string, string | number> };

export function TextField({
  label,
  labelKey,
  translationValues,
  error,
  placeholder,
  accessibilityLabel,
  ...props
}: TextInputProps & LocalizedLabel & TranslationValues & { error?: string }) {
  const theme = useTheme();
  const { locale } = useLocale();
  const labelText = labelKey
    ? translateKey(locale, labelKey, translationValues)
    : translate(locale, label ?? '', translationValues);
  const translatedPlaceholder = placeholder ? translate(locale, placeholder) : undefined;
  const translatedAccessibilityLabel = accessibilityLabel
    ? translate(locale, accessibilityLabel)
    : labelText;
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{labelText}</ThemedText>
      <TextInput
        accessibilityLabel={translatedAccessibilityLabel}
        placeholder={translatedPlaceholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, borderColor: error ? '#dc2626' : theme.backgroundSelected },
        ]}
        {...props}
      />
      {error ? <ThemedText type="small" style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

export function Button({
  title,
  titleKey,
  translationValues,
  onPress,
  loading,
  variant = 'primary',
}: LocalizedTitle & {
  translationValues?: Record<string, string | number>;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'link';
}) {
  const { locale } = useLocale();
  const titleText = titleKey
    ? translateKey(locale, titleKey, translationValues)
    : translate(locale, title ?? '');
  if (variant === 'link') {
    return (
      <Pressable onPress={onPress} accessibilityRole="link">
        <ThemedText type="linkPrimary">{titleText}</ThemedText>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, (pressed || loading) && styles.pressed]}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <ThemedText style={styles.buttonText}>{titleText}</ThemedText>
      )}
    </Pressable>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.alert, { backgroundColor: error ? '#fee2e2' : '#dcfce7' }]}>
      <ThemedText type="small" style={{ color: error ? '#b91c1c' : '#15803d' }}>
        {error ?? message}
      </ThemedText>
    </View>
  );
}

export function OptionPicker<T extends string>({
  label,
  labelKey,
  translationValues,
  options,
  value,
  onChange,
  error,
  labels,
  translateLabels = false,
}: LocalizedLabel & TranslationValues & {
  options: readonly T[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
  labels?: Partial<Record<T, string>>;
  translateLabels?: boolean;
}) {
  const theme = useTheme();
  const { locale } = useLocale();
  const labelText = labelKey
    ? translateKey(locale, labelKey, translationValues)
    : translate(locale, label ?? '', translationValues);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{labelText}</ThemedText>
      <View style={styles.options}>
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: o === value }}
            style={[
              styles.option,
              { backgroundColor: o === value ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <ThemedText type="small" translateText={translateLabels}>{labels?.[o] ?? o}</ThemedText>
          </Pressable>
        ))}
      </View>
      {error ? <ThemedText type="small" style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: { color: '#dc2626' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 600 },
  pressed: { opacity: 0.7 },
  alert: { borderRadius: Spacing.two, padding: Spacing.three },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
