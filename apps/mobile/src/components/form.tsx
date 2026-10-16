import { useState } from 'react';
import { formatMoney, isValidPositiveMoneyDraft, parsePositiveMoneyInput } from '@fin/shared';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
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

export function MoneyField({
  label,
  labelKey,
  translationValues,
  value,
  onChangeText,
  currency,
  error,
  ...props
}: TextInputProps & LocalizedLabel & TranslationValues & {
  value: string;
  onChangeText: (value: string) => void;
  currency?: string;
  error?: string;
}) {
  const { locale } = useLocale();
  const [focused, setFocused] = useState(false);
  const minor = parsePositiveMoneyInput(value);
  const display = focused || minor === null || !currency ? value : formatMoney(minor, currency, locale);
  const labelProps = labelKey
    ? { labelKey, translationValues }
    : { label: label ?? '', translationValues };

  return (
    <TextField
      {...labelProps}
      {...props}
      value={display}
      onChangeText={(draft) => {
        if (isValidPositiveMoneyDraft(draft)) onChangeText(draft);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      keyboardType="decimal-pad"
      error={error}
    />
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
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const labelText = labelKey
    ? translateKey(locale, labelKey, translationValues)
    : translate(locale, label ?? '', translationValues);
  const compact = Platform.OS !== 'web' || width < 768;
  const optionLabel = (option: T) => {
    const raw = labels?.[option] ?? option;
    return translateLabels ? translate(locale, raw) : raw;
  };
  const visibleOptions = options.filter((option) =>
    optionLabel(option).toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)),
  );
  const selectedLabel = options.includes(value as T) ? optionLabel(value as T) : '';
  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{labelText}</ThemedText>
      <View style={compact ? undefined : styles.dropdown}>
        <Pressable
          onPress={() => setOpen((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={labelText}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [
            styles.pickerButton,
            { backgroundColor: theme.backgroundElement, borderColor: error ? '#dc2626' : theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" translateText={false}>
            {selectedLabel || translate(locale, 'Seleccionar…')}
          </ThemedText>
          <ThemedText type="small" translateText={false}>{open ? '⌃' : '⌄'}</ThemedText>
        </Pressable>
        {!compact && open ? (
          <View style={[styles.desktopMenu, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <OptionSearch
              value={search}
              onChangeText={setSearch}
              textColor={theme.text}
              borderColor={theme.backgroundSelected}
            />
            <OptionList
              options={visibleOptions}
              value={value}
              label={labelText}
              onSelect={(option) => {
                onChange(option);
                close();
              }}
              labelFor={optionLabel}
              selectedColor={theme.backgroundSelected}
              textColor={theme.text}
            />
          </View>
        ) : null}
      </View>
      <Modal
        visible={compact && open}
        transparent
        animationType="slide"
        onRequestClose={close}
        statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close} accessible={false}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <ThemedText type="smallBold">{labelText}</ThemedText>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel={translate(locale, 'Cerrar selector')}
                hitSlop={12}
                style={styles.closeButton}>
                <ThemedText type="smallBold" translateText={false}>×</ThemedText>
              </Pressable>
            </View>
            <OptionSearch
              value={search}
              onChangeText={setSearch}
              textColor={theme.text}
              borderColor={theme.backgroundSelected}
            />
            <OptionList
              options={visibleOptions}
              value={value}
              label={labelText}
              onSelect={(option) => {
                onChange(option);
                close();
              }}
              labelFor={optionLabel}
              selectedColor={theme.backgroundSelected}
              textColor={theme.text}
            />
          </Pressable>
        </Pressable>
      </Modal>
      {error ? <ThemedText type="small" style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

function OptionSearch({
  value,
  onChangeText,
  textColor,
  borderColor,
}: {
  value: string;
  onChangeText: (value: string) => void;
  textColor: string;
  borderColor: string;
}) {
  const { locale } = useLocale();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={translate(locale, 'Buscar…')}
      accessibilityLabel={translate(locale, 'Buscar opciones')}
      placeholderTextColor={textColor}
      style={[styles.search, { color: textColor, borderColor }]}
      autoCorrect={false}
    />
  );
}

function OptionList<T extends string>({
  options,
  value,
  label,
  onSelect,
  labelFor,
  selectedColor,
  textColor,
}: {
  options: readonly T[];
  value: string;
  label: string;
  onSelect: (value: T) => void;
  labelFor: (value: T) => string;
  selectedColor: string;
  textColor: string;
}) {
  const { locale } = useLocale();
  return (
    <FlatList
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      keyboardShouldPersistTaps="handled"
      data={options}
      keyExtractor={(option) => option}
      ListEmptyComponent={
        <ThemedText type="small" style={styles.emptySearch}>
          {translate(locale, 'No hay resultados')}
        </ThemedText>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item)}
          accessibilityRole="radio"
          accessibilityState={{ selected: item === value }}
          style={[
            styles.optionRow,
            item === value && { backgroundColor: selectedColor },
          ]}>
          <ThemedText type="small" translateText={false} style={{ color: textColor }}>{labelFor(item)}</ThemedText>
          {item === value ? <ThemedText type="smallBold" translateText={false} style={{ color: textColor }}>✓</ThemedText> : null}
        </Pressable>
      )}
    />
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
  dropdown: { position: 'relative', zIndex: 2 },
  pickerButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  desktopMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 5,
    maxHeight: 300,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sheetHeader: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#737373',
  },
  optionRow: {
    minHeight: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptySearch: { padding: Spacing.three },
});
