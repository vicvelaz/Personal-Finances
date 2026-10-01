import { formatIsoDate, formatMoney, reminderDate, translate } from '@fin/shared';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useProfile } from '@/lib/profile';
import { type ScheduledRow, useScheduled } from '@/lib/scheduled';

// iOS keeps at most 64 pending local notifications per app.
const MAX_PENDING = 60;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function hasPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces all pending reminders with one per active schedule, at 09:00 local on the reminder day. */
export async function syncReminders(rows: ScheduledRow[], locale: string): Promise<void> {
  const now = Date.now();
  const planned = rows
    .filter((r) => r.is_active && r.reminder_days_before !== null)
    .map((r) => ({ row: r, at: new Date(`${reminderDate(r.next_run_on, r.reminder_days_before!)}T09:00:00`) }))
    .filter((p) => p.at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PENDING);

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!planned.length || !(await hasPermission())) return;

  for (const { row, at } of planned) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: translate(locale, "scheduled.upcomingScheduledTransaction"),
        body: translate(locale, '{description}: {amount} on {date}', {
          description: row.description,
          amount: formatMoney(row.amount, row.currency, locale),
          date: formatIsoDate(row.next_run_on, locale),
        }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/** Keeps local reminders in sync with the user's schedules. No-op on web. */
export function useReminderSync() {
  const scheduled = useScheduled();
  const profile = useProfile();
  const locale = profile.data?.locale ?? 'es-ES';

  useEffect(() => {
    if (Platform.OS === 'web' || !scheduled.data) return;
    syncReminders(scheduled.data, locale).catch(() => undefined);
  }, [scheduled.data, locale]);
}
