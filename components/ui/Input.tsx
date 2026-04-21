import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputSubmitEditingEventData, NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  error?: string;
  maxLength?: number;
  onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
  blurOnSubmit?: boolean;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
};

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  error,
  maxLength,
  onSubmitEditing,
  blurOnSubmit,
  returnKeyType,
}: InputProps) => {
  const [focused, setFocused] = useState(false);
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.inputLabel }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        returnKeyType={returnKeyType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText },
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dee8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputFocused: {
    borderColor: '#0f766e',
    shadowOpacity: 0.08,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  error: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
});