import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert — notifikasi satu tombol.
 * Web: window.alert | Native: Alert.alert
 */
export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const msg = message ? `${title}\n\n${message}` : title;
      window.alert(msg);
    }
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Cross-platform confirm — dialog dua pilihan (Batal / Konfirmasi).
 * Web: window.confirm | Native: Alert.alert dengan dua tombol.
 * @param onConfirm - callback yang dijalankan jika user menekan tombol konfirmasi
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  },
) => {
  const confirmText = options?.confirmText ?? 'Ya';
  const cancelText = options?.cancelText ?? 'Batal';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      {
        text: confirmText,
        style: options?.destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  }
};
