import { Alert, Platform } from 'react-native';

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
