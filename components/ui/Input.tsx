import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string;
  maxLength?: number;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
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
  autoCapitalize,
  autoCorrect,
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
      <Text style={[styles.label, { color: theme.colors.inputLabel }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inputPlaceholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : undefined)}
        autoCorrect={autoCorrect ?? (secureTextEntry ? false : undefined)}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        returnKeyType={returnKeyType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor: focused
              ? theme.colors.primary
              : error
              ? theme.colors.error
              : theme.colors.inputBorder,
            color: theme.colors.inputText,
          },
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputFocused: {
    shadowOpacity: 0.08,
  },
  inputError: {
    borderWidth: 1.5,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
  },
});