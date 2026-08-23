import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/context/ThemeContext';
import type { Medicamento } from '@/types';

type Props = {
  medicamentos: Medicamento[];
  onChangeNombre: (index: number, value: string) => void;
  onChangeCantidad: (index: number, value: string) => void;
  onChangeDosis: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export const ManualMedicationForm = ({
  medicamentos,
  onChangeNombre,
  onChangeCantidad,
  onChangeDosis,
  onAdd,
  onRemove,
}: Props) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {medicamentos.map((med, index) => (
        <View
          key={`${med.nombre}-${index}`}
          style={[
            styles.block,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>Medicamento {index + 1}</Text>
          <Input
            label="Nombre"
            value={med.nombre}
            onChangeText={(value) => onChangeNombre(index, value)}
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit
            returnKeyType="done"
          />
          <Input
            label="Dosis (opcional)"
            value={med.dosis ?? ''}
            onChangeText={(value) => onChangeDosis(index, value)}
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit
            returnKeyType="done"
          />
          <Input
            label="Cantidad"
            value={String(med.cantidad)}
            onChangeText={(value) => onChangeCantidad(index, value)}
            keyboardType="numeric"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit
            returnKeyType="done"
          />
          {medicamentos.length > 1 ? <Button texto="Quitar" onPress={() => onRemove(index)} variant="peligro" /> : null}
        </View>
      ))}
      <Button texto="Agregar medicamento" onPress={onAdd} variant="secundario" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 8,
  },
  block: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  title: {
    fontWeight: '700',
  },
});