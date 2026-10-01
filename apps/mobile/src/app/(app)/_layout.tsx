import AppTabs from '@/components/app-tabs';
import { useReminderSync } from '@/lib/reminders';

export default function AppLayout() {
  useReminderSync();
  return <AppTabs />;
}
