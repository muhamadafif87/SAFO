import React from 'react';
import { TextInput, TextInputProps, Text, View, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontFamily } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.neutral[400]}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: 14,
    color: Colors.neutral[700],
    marginBottom: Spacing[1],
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    fontSize: 16,
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[0],
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: Spacing[1],
  },
});
