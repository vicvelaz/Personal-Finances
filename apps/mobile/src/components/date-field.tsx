import { formatManualDate, formatMonth, isValidIsoDate, maskManualDateInput, parseManualDate, shiftMonth, translate } from '@fin/shared';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  const { locale } = useLocale();
  const [draft, setDraft] = useState(() => formatManualDate(value) ?? '');
  const [month, setMonth] = useState(
    () => (isValidIsoDate(value) ? value.slice(0, 7) : new Date().toISOString().slice(0, 7)),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const iso = parseManualDate(draft);
  const draftInvalid = draft !== '' && iso === null;
  const displayedError = error ?? (draftInvalid ? translate(locale, 'Fecha no válida') : undefined);
  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year!, monthNumber! - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const days = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2023, 0, index + 1)),
    ),
  );
  const labelText = translate(locale, label);

  function changeDraft(text: string) {
    const masked = maskManualDateInput(text);
    setDraft(masked);
    const parsed = parseManualDate(masked);
    if (parsed) {
      setMonth(parsed.slice(0, 7));
      onChange(parsed);
    } else {
      onChange('');
    }
  }

  function selectDate(day: number) {
    const value = `${month}-${String(day).padStart(2, '0')}`;
    const formatted = formatManualDate(value);
    if (!formatted) return;
    setDraft(formatted);
    onChange(value);
    setCalendarOpen(false);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{labelText}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={changeDraft}
          placeholder="DD/MM/YYYY"
          accessibilityLabel={labelText}
          accessibilityHint={draftInvalid ? translate(locale, 'Fecha no válida') : undefined}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: displayedError ? '#dc2626' : theme.backgroundSelected },
          ]}
        />
        <Pressable
          onPress={() => setCalendarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={translate(locale, 'Abrir calendario')}
          accessibilityState={{ expanded: calendarOpen }}
          style={({ pressed }) => [
            styles.calendarButton,
            { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" translateText={false}>▦</ThemedText>
        </Pressable>
      </View>
      {displayedError ? (
        <ThemedText
          type="small"
          accessibilityRole="alert"
          style={styles.error}>
          {displayedError}
        </ThemedText>
      ) : null}
      <Modal
        visible={calendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarOpen(false)}
        statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setCalendarOpen(false)} accessible={false}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <ThemedText type="smallBold">{translate(locale, 'Seleccionar fecha')}</ThemedText>
              <Pressable
                onPress={() => setCalendarOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={translate(locale, 'Cerrar calendario')}
                style={styles.closeButton}>
                <ThemedText type="smallBold" translateText={false}>×</ThemedText>
              </Pressable>
            </View>
            <View style={styles.monthNavigation}>
              <NavButton label={translate(locale, 'Año anterior')} text="«" onPress={() => setMonth((current) => shiftMonth(current, -12))} />
              <NavButton label={translate(locale, 'Mes anterior')} text="‹" onPress={() => setMonth((current) => shiftMonth(current, -1))} />
              <ThemedText type="smallBold" style={styles.monthTitle}>{formatMonth(month, locale)}</ThemedText>
              <NavButton label={translate(locale, 'Mes siguiente')} text="›" onPress={() => setMonth((current) => shiftMonth(current, 1))} />
              <NavButton label={translate(locale, 'Año siguiente')} text="»" onPress={() => setMonth((current) => shiftMonth(current, 12))} />
            </View>
            <View style={styles.calendarGrid}>
              {weekdays.map((weekday, index) => (
                <ThemedText key={`${weekday}-${index}`} type="small" style={styles.weekday}>
                  {weekday}
                </ThemedText>
              ))}
              {days.map((day, index) =>
                day === null ? (
                  <View key={`empty-${index}`} style={styles.dayCell} />
                ) : (
                  <Pressable
                    key={day}
                    onPress={() => selectDate(day)}
                    accessibilityRole="button"
                    accessibilityLabel={translate(locale, 'Seleccionar fecha {date}', {
                      date: `${String(day).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}/${year}`,
                    })}
                    accessibilityState={{ selected: iso === `${month}-${String(day).padStart(2, '0')}` }}
                    style={[
                      styles.dayCell,
                      iso === `${month}-${String(day).padStart(2, '0')}` && {
                        backgroundColor: theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText type="small">{day}</ThemedText>
                  </Pressable>
                ),
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function NavButton({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.navButton}>
      <ThemedText type="smallBold" translateText={false}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  inputRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  calendarButton: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#dc2626' },
  pressed: { opacity: 0.7 },
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
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { flex: 1, textAlign: 'center' },
  navButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', paddingVertical: Spacing.one },
  dayCell: {
    width: '14.2857%',
    minHeight: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
