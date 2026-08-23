import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeMode } from '@/constants/theme';

type ThemeOption = {
  id: ThemeMode;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const ThemeSelector = () => {
  const { mode, effectiveTheme, setMode, theme, isDark } = useTheme();

  const options: ThemeOption[] = [
    {
      id: 'light',
      label: 'Claro',
      sublabel: 'Siempre tema claro',
      icon: 'sunny',
    },
    {
      id: 'dark',
      label: 'Oscuro',
      sublabel: 'Siempre tema oscuro',
      icon: 'moon',
    },
    {
      id: 'system',
      label: 'Sistema',
      sublabel: `Auto (actual: ${effectiveTheme === 'dark' ? 'Oscuro' : 'Claro'})`,
      icon: 'phone-portrait-outline',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
      <View style={styles.header}>
        <Ionicons name="color-palette-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Apariencia y Tema</Text>
      </View>

      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Elige cómo deseas visualizar Farma Ya en tu dispositivo.
      </Text>

      <View style={styles.grid}>
        {options.map((option) => {
          const isSelected = mode === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.7}
              onPress={() => void setMode(option.id)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? '#133a36'
                      : '#e6f7f5'
                    : theme.colors.surfaceSecondary,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                },
                isSelected && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : isDark ? '#27364f' : '#e2e8f0',
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={isSelected ? '#ffffff' : isDark ? '#94a3b8' : '#475569'}
                  />
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.textMuted,
                    },
                  ]}
                >
                  {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} /> : null}
                </View>
              </View>

              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>
              <Text style={[styles.optionSublabel, { color: theme.colors.textSecondary }]}>{option.sublabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    gap: 8,
  },
  optionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  optionCardSelected: {
    shadowColor: '#0f766e',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSublabel: {
    fontSize: 12,
    lineHeight: 16,
  },
});
