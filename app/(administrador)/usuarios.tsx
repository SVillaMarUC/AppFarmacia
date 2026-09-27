import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { firestoreService } from '@/services/firebase/firestore.service';
import type { Usuario } from '@/types';

type Rol = Usuario['rol'];

const ROLES_DISPONIBLES: { label: string; valor: Rol; icon: any }[] = [
  { label: 'Afiliado', valor: 'afiliado', icon: 'person-outline' },
  { label: 'Despachador', valor: 'despachador', icon: 'cube-outline' },
  { label: 'Domiciliario', valor: 'domiciliario', icon: 'bicycle-outline' },
  { label: 'Administrador', valor: 'administrador', icon: 'shield-checkmark-outline' },
];

export default function AdminUsuariosScreen() {
  const { theme } = useTheme();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos');
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [nuevoRol, setNuevoRol] = useState<Rol>('afiliado');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = firestoreService.escucharUsuarios((lista) => {
      setUsuarios(lista);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusqueda =
        !busqueda ||
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(u.cedula).includes(busqueda) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase());

      const matchRol = filtroRol === 'todos' || u.rol === filtroRol;

      return matchBusqueda && matchRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const abrirEditorRol = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setNuevoRol(usuario.rol);
  };

  const guardarCambioRol = async () => {
    if (!usuarioEditando) return;

    try {
      setGuardando(true);
      await firestoreService.actualizarUsuario(usuarioEditando.uid, {
        rol: nuevoRol,
      });
      Alert.alert('Éxito', `El rol de ${usuarioEditando.nombre} fue actualizado a ${nuevoRol}.`);
      setUsuarioEditando(null);
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      Alert.alert('Error', 'No fue posible actualizar el rol del usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const getRoleBadgeStyle = (rol: Rol) => {
    switch (rol) {
      case 'administrador':
        return { bg: '#fee2e2', text: '#b91c1c' };
      case 'despachador':
        return { bg: '#e0e7ff', text: '#4338ca' };
      case 'domiciliario':
        return { bg: '#fef3c7', text: '#b45309' };
      default:
        return { bg: '#dcfce7', text: '#15803d' };
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader
          kicker="Gestión de Cuentas"
          title="Gestión de Usuarios"
          subtitle="Administra roles, accesos y permisos de afiliados y personal operativo."
        />

        {/* Buscador */}
        <Card>
          <View style={styles.block}>
            <Input
              label="Buscar Usuario"
              placeholder="Nombre, cédula o correo..."
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
            />

            {/* Chips de filtro por rol */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {(['todos', 'afiliado', 'despachador', 'domiciliario', 'administrador'] as const).map((rol) => {
                const activo = filtroRol === rol;
                return (
                  <TouchableOpacity
                    key={rol}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: activo ? theme.colors.primary : theme.colors.surfaceSecondary,
                        borderColor: activo ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setFiltroRol(rol)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: activo ? '#ffffff' : theme.colors.textSecondary },
                      ]}
                    >
                      {rol.charAt(0).toUpperCase() + rol.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Card>

        {/* Lista de Usuarios */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>Cargando usuarios...</Text>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={[styles.conteoText, { color: theme.colors.textSecondary }]}>
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
            </Text>

            {usuariosFiltrados.map((u) => {
              const badge = getRoleBadgeStyle(u.rol);
              return (
                <Card key={u.uid}>
                  <View style={styles.userCardContent}>
                    <View style={styles.userHeader}>
                      <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceSecondary }]}>
                        <Ionicons name="person" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.colors.text }]}>
                          {u.nombre || 'Sin nombre'}
                        </Text>
                        <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {u.email || 'Sin correo'}
                        </Text>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                          {u.rol}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="card-outline" size={13} color={theme.colors.textSecondary} />
                        <Text style={[styles.userMeta, { color: theme.colors.textSecondary }]}>
                          C.C. {u.cedula}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="medical-outline" size={13} color={theme.colors.textSecondary} />
                        <Text style={[styles.userMeta, { color: theme.colors.textSecondary }]}>
                          EPS: {u.eps || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <Button
                        texto="Cambiar Rol"
                        onPress={() => abrirEditorRol(u)}
                        variant="secundario"
                      />
                    </View>
                  </View>
                </Card>
              );
            })}

            {usuariosFiltrados.length === 0 && (
              <Card>
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No se encontraron usuarios con ese criterio de búsqueda.
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Cambio de Rol */}
      <Modal
        visible={Boolean(usuarioEditando)}
        transparent
        animationType="fade"
        onRequestClose={() => setUsuarioEditando(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Cambiar Rol de Usuario</Text>
              <TouchableOpacity onPress={() => setUsuarioEditando(null)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Usuario: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{usuarioEditando?.nombre}</Text>
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Cédula: {usuarioEditando?.cedula}
            </Text>

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 8 }]}>Seleccionar nuevo rol:</Text>
            <View style={styles.rolesOptionsList}>
              {ROLES_DISPONIBLES.map((r) => {
                const seleccionado = nuevoRol === r.valor;
                return (
                  <Pressable
                    key={r.valor}
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: seleccionado ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
                        borderColor: seleccionado ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNuevoRol(r.valor)}
                  >
                    <Ionicons
                      name={r.icon}
                      size={18}
                      color={seleccionado ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.roleOptionText,
                        {
                          color: seleccionado ? theme.colors.primary : theme.colors.text,
                          fontWeight: seleccionado ? '700' : '500',
                          flex: 1,
                        },
                      ]}
                    >
                      {r.label}
                    </Text>
                    <Ionicons
                      name={seleccionado ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={seleccionado ? theme.colors.primary : theme.colors.textSecondary}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <Button
                texto="Guardar Cambio"
                onPress={guardarCambioRol}
                loading={guardando}
              />
              <Button
                texto="Cancelar"
                onPress={() => setUsuarioEditando(null)}
                variant="secundario"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  block: { gap: 10 },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conteoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  userCardContent: {
    gap: 8,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userMeta: {
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  actionRow: {
    marginTop: 2,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  rolesOptionsList: {
    gap: 8,
    marginVertical: 6,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 14,
  },
  modalButtons: {
    gap: 8,
    marginTop: 6,
  },
});
