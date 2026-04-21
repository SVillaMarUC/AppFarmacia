import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';

export default function ReportesScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <Button texto="← Volver" onPress={() => router.back()} variant="secundario" />
        <Card>
          <View style={styles.content}>
            <Text style={styles.title}>Reportes</Text>
            <Text style={styles.text}>Próximamente</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  content: { gap: 8 },
  title: { color: '#0f172a', fontWeight: '800', fontSize: 24 },
  text: { color: '#334155', fontSize: 14, lineHeight: 20 },
});
