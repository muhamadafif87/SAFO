import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontWeight } from '@/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  let backgroundColor = Colors.primary[500];
  let textColor = '#fff';

  if (isSecondary) {
    backgroundColor = Colors.secondary[100];
    textColor = Colors.secondary[700];
  } else if (isGhost) {
    backgroundColor = 'transparent';
    textColor = Colors.neutral[600];
  } else if (isDanger) {
    backgroundColor = '#FEE2E2';
    textColor = '#DC2626';
  }

  if (disabled) {
    backgroundColor = Colors.neutral[200];
    textColor = Colors.neutral[400];
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
  },
  text: {
    fontSize: 16,
    fontWeight: FontWeight.semiBold,
  },
});
