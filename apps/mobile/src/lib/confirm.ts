import { Alert, Platform } from 'react-native';
import { translateCurrent } from '@fin/shared';

/** Cross-platform yes/no confirmation (Alert.alert is a no-op on react-native-web). */
export function confirm(
  title: string,
  message: string,
  confirmLabel = 'Aceptar',
  translateMessage = true,
): Promise<boolean> {
  const translatedTitle = translateCurrent(title);
  const translatedMessage = translateMessage ? translateCurrent(message) : message;
  const translatedConfirmLabel = translateCurrent(confirmLabel);
  const cancelLabel = translateCurrent("common.cancel");
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${translatedTitle}\n\n${translatedMessage}`));
  return new Promise((resolve) => {
    Alert.alert(translatedTitle, translatedMessage, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: translatedConfirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
