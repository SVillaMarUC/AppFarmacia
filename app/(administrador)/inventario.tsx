import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { medicationService } from '@/services/medication.service';
import type { ItemInventario } from '@/types';

export default function InventarioAdminScreen() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoSeeder, setCargandoSeeder] = useState(false);

  useEffect(() => {
    const unsub = medicationService.escucharInventario((items) => {
      setInventario(items);
      setCargando(false);
      setRefrescando(false);
    });

    return () => unsub();
  }, []);

  const handleCargarIniciales = () => {
    Alert.alert(
      'Cargar Medicamentos Iniciales',
      '¿Deseas verificar y registrar la lista inicial de medicamentos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            try {
              setCargandoSeeder(true);
              const nuevos = await medicationService.cargarMedicamentosIniciales();

              if (nuevos === 0) {
                Alert.alert('Inventario al día', 'Los medicamentos iniciales ya están registrados.');
              } else {
                Alert.alert('Éxito', `Se agregaron ${nuevos} medicamentos correctamente.`);
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cargar la lista inicial de medicamentos.');
            } finally {
              setCargandoSeeder(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefrescando(true);
    // onSnapshot actualizará automáticamente el estado al detectar cambios
    setTimeout(() => setRefrescando(false), 1000);
  };

  const renderItem = ({ item }: { item: ItemInventario }) => {
    const estadoStock = medicationService.evaluarEstadoStock(item.stock, item.stockMinimo);
    
    // Asignación dinámica de colores según el nivel de stock
    const configStock = {
      agotado: { bg: '#FEE2E2', color: '#DC2626', label: 'Agotado' },
      critico: { bg: '#FEF3C7', color: '#D97706', label: `Crítico: ${item.stock}` },
      bajo: { bg: '#FEF3C7', color: '#D97706', label: `Bajo: ${item.stock}` },
      ok: { bg: '#DCFCE7', color: '#16A34A', label: `Stock: ${item.stock}` },
    }[estadoStock];

    return (
      <View style={[styles.cardItem, !item.activo && styles.cardInactivo]}>
        <View style={styles.headerCard}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <View style={[styles.badgeStock, { backgroundColor: configStock.bg }]}>
            <Text style={[styles.stockText, { color: configStock.color }]}>
              {configStock.label}
            </Text>
          </View>
        </View>

        <Text style={styles.subtexto}>
          Principio Activo: {item.principioActivo || 'N/A'}
        </Text>
        
        <View style={styles.detallesRow}>
          <Text style={styles.subtexto}>
            {item.concentracion ? `${item.concentracion} | ` : ''}
            {item.presentacion || 'Sin presentación'}
          </Text>

          {item.requiereReceta && (
            <View style={styles.badgeReceta}>
              <Text style={styles.textReceta}>Receta Requerida</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Gestión de Inventario</Text>

        <TouchableOpacity
          style={[styles.botonSeeder, cargandoSeeder && styles.botonDeshabilitado]}
          onPress={handleCargarIniciales}
          disabled={cargandoSeeder}
        >
          {cargandoSeeder ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.textoBoton}>Cargar Medicamentos Iniciales</Text>
          )}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={inventario}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={handleRefresh} colors={['#2563EB']} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No hay medicamentos en el inventario. Presiona el botón superior para cargar la lista inicial.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9FAFB' },
  header: { marginBottom: 16, gap: 12 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  botonSeeder: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  list: { gap: 12, paddingBottom: 24 },
  cardItem: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  cardInactivo: { opacity: 0.5 },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  badgeStock: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockText: { fontSize: 12, fontWeight: 'bold' },
  subtexto: { fontSize: 13, color: '#6B7280' },
  detallesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  badgeReceta: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  textReceta: { fontSize: 10, color: '#1D4ED8', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#6B7280' },
});