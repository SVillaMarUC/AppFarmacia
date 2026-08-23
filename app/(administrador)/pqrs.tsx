import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/context/ThemeContext';

export default function PqrsScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Button texto="← Volver" onPress={() => router.back()} variant="secundario" />
        <Card>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.text }]}>PQRS</Text>
            <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Próximamente</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  content: { gap: 8 },
  title: { fontWeight: '800', fontSize: 24 },
  text: { fontSize: 14, lineHeight: 20 },
});

