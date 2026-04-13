import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  return (
    <View style={styles.container}>
      {medicamentos.map((med, index) => (
        <View key={`${med.nombre}-${index}`} style={styles.block}>
          <Text style={styles.title}>Medicamento {index + 1}</Text>
          <Input label="Nombre" value={med.nombre} onChangeText={(value) => onChangeNombre(index, value)} />
          <Input label="Dosis (opcional)" value={med.dosis ?? ''} onChangeText={(value) => onChangeDosis(index, value)} />
          <Input label="Cantidad" value={String(med.cantidad)} onChangeText={(value) => onChangeCantidad(index, value)} keyboardType="numeric" />
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
    borderColor: '#dbe4ee',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
  },
});