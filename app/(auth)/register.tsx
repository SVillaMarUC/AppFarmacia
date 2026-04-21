import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { DEPARTAMENTOS_COLOMBIA } from '@/constants/departamentosColombia';
import { useLocation } from '@/hooks/useLocation';
import { authService } from '@/services/firebase/auth.service';

const schema = z.object({
  cedula: z
    .string()
    .regex(/^\d{7,10}$/, 'La cédula debe tener entre 7 y 10 dígitos.'),
  email: z.string().email('Correo inválido.'),
  nombre: z.string().min(3, 'Nombre inválido.'),
  fechaNacimiento: z.string().min(8, 'Fecha obligatoria (YYYY-MM-DD).'),
  genero: z.string().min(1, 'Selecciona un género.'),
  eps: z.string().min(2, 'EPS obligatoria.'),
  telefono: z.string().min(7, 'Teléfono inválido.'),
  direccion: z.string().min(6, 'Dirección obligatoria.'),
  contactoNombre: z.string().min(3, 'Nombre de contacto obligatorio.'),
  contactoParentesco: z.string().min(2, 'Parentesco obligatorio.'),
  contactoTelefono: z.string().min(7, 'Teléfono de contacto inválido.'),
  contrasena: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres.'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [mostrarListaDepartamento, setMostrarListaDepartamento] = useState(false);
  const { getCurrentLocation, loading: loadingUbicacion } = useLocation();

  const departamentos = useMemo(() => {
    return [...DEPARTAMENTOS_COLOMBIA].sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cedula: '',
      email: '',
      nombre: '',
      fechaNacimiento: '',
      genero: '',
      eps: '',
      telefono: '',
      direccion: '',
      contactoNombre: '',
      contactoParentesco: '',
      contactoTelefono: '',
      contrasena: '',
    },
  });

  const cargarUbicacion = async () => {
    try {
      const ubicacion = await getCurrentLocation();
      setCoords({ lat: ubicacion.coords.latitude, lon: ubicacion.coords.longitude });
      Alert.alert('Ubicación capturada', 'Se registró tu ubicación para domicilios.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!aceptaTerminos) {
      Alert.alert('Términos requeridos', 'Debes aceptar Ley 1581 de Habeas Data para continuar.');
      return;
    }

    if (!departamentoSeleccionado) {
      Alert.alert('Departamento requerido', 'Debes seleccionar un departamento de la lista');
      return;
    }

    try {
      setLoading(true);
      const fecha = new Date(data.fechaNacimiento);
      const cedulaNumerica = Number(data.cedula);

      await authService.registrarUsuario(cedulaNumerica, data.email, data.contrasena, {
        cedula: cedulaNumerica,
        email: data.email,
        nombre: data.nombre,
        fechaNacimiento: fecha,
        genero: data.genero,
        eps: data.eps,
        ciudad: departamentoSeleccionado,
        direcciones: [
          {
            etiqueta: 'Principal',
            direccion: data.direccion,
            ciudad: departamentoSeleccionado,
            latitud: coords?.lat ?? 4.60971,
            longitud: coords?.lon ?? -74.08175,
            principal: true,
          },
        ],
        telefono: data.telefono,
        contactoEmergencia: {
          nombre: data.contactoNombre,
          parentesco: data.contactoParentesco,
          telefono: data.contactoTelefono,
        },
        esPrioritario: false,
        rol: 'afiliado',
      });

      Alert.alert('Registro exitoso', 'Tu cuenta fue creada. Ahora puedes iniciar sesión.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo completar el registro.';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Registro seguro</Text>
          <Text style={styles.titulo}>Crea tu cuenta afiliado</Text>
          <Text style={styles.subtitulo}>Te pedimos los datos mínimos para que tu entrega y trazabilidad queden completas desde el inicio.</Text>
        </View>

        <Card>
          <View style={styles.form}>
            {([
              ['cedula', 'Cédula', 'numeric'],
              ['email', 'Correo electrónico', 'email-address'],
              ['nombre', 'Nombre completo', 'default'],
              ['fechaNacimiento', 'Fecha nacimiento (YYYY-MM-DD)', 'default'],
              ['genero', 'Género', 'default'],
              ['eps', 'EPS', 'default'],
              ['telefono', 'Teléfono', 'phone-pad'],
            ] as const).map(([name, label, keyboardType]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={label}
                    value={value}
                    onChangeText={name === 'cedula' ? (text) => onChange(text.replace(/\D/g, '')) : onChange}
                    keyboardType={keyboardType as 'default' | 'numeric' | 'phone-pad' | 'email-address'}
                    secureTextEntry={name === 'contrasena'}
                    maxLength={name === 'cedula' ? 10 : undefined}
                    error={errors[name]?.message}
                  />
                )}
              />
            ))}

            <View style={styles.ciudadContainer}>
              <Text style={styles.label}>Departamento</Text>
              <TouchableOpacity style={styles.selectorCiudad} onPress={() => setMostrarListaDepartamento((prev) => !prev)}>
                <Text style={[styles.selectorTexto, !departamentoSeleccionado && styles.selectorPlaceholder]}>
                  {departamentoSeleccionado || 'Selecciona tu departamento'}
                </Text>
                <Text style={styles.selectorFlecha}>{mostrarListaDepartamento ? '▴' : '▾'}</Text>
              </TouchableOpacity>

              {departamentoSeleccionado ? (
                <TouchableOpacity
                  style={styles.confirmacionCiudad}
                  onPress={() => {
                    setDepartamentoSeleccionado('');
                    setMostrarListaDepartamento(false);
                  }}
                >
                  <Text style={styles.confirmacionTexto}>✓ {departamentoSeleccionado}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {([
              ['contactoNombre', 'Contacto emergencia - Nombre', 'default'],
              ['contactoParentesco', 'Contacto emergencia - Parentesco', 'default'],
              ['contactoTelefono', 'Contacto emergencia - Teléfono', 'phone-pad'],
              ['direccion', 'Dirección', 'default'],
              ['contrasena', 'Contraseña', 'default'],
            ] as const).map(([name, label, keyboardType]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={label}
                    value={value}
                    onChangeText={onChange}
                    keyboardType={keyboardType as 'default' | 'numeric' | 'phone-pad' | 'email-address'}
                    secureTextEntry={name === 'contrasena'}
                    error={errors[name]?.message}
                  />
                )}
              />
            ))}

            <Button texto="Usar mi geolocalización" onPress={cargarUbicacion} loading={loadingUbicacion} variant="secundario" />

            <Pressable style={styles.terminos} onPress={() => setAceptaTerminos((prev) => !prev)}>
              <View style={[styles.checkbox, aceptaTerminos && styles.checkboxActivo]} />
              <Text style={styles.terminosTexto}>Acepto tratamiento de datos personales (Ley 1581 - Habeas Data).</Text>
            </Pressable>

            <Button texto="Crear cuenta" onPress={handleSubmit(onSubmit)} loading={loading} />
          </View>
        </Card>
      </ScrollView>

      <Modal
        visible={mostrarListaDepartamento}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarListaDepartamento(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMostrarListaDepartamento(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Selecciona tu departamento</Text>
            <FlatList
              data={departamentos}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.sugerenciasScroll}
              initialNumToRender={25}
              windowSize={10}
              renderItem={({ item: departamento }) => (
                <TouchableOpacity
                  style={styles.sugerenciaItem}
                  onPress={() => {
                    setDepartamentoSeleccionado(departamento);
                    setMostrarListaDepartamento(false);
                  }}
                >
                  <Text style={styles.sugerenciaTexto}>{departamento}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  hero: {
    gap: 6,
  },
  kicker: {
    color: '#0f766e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  subtitulo: {
    color: '#334155',
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  ciudadContainer: {
    gap: 6,
  },
  label: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  selectorCiudad: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTexto: {
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  selectorPlaceholder: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectorFlecha: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    maxHeight: '72%',
  },
  modalTitle: {
    color: '#0f172a',
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ee',
  },
  sugerenciasScroll: {
    maxHeight: 420,
  },
  sugerenciaItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ee',
  },
  sugerenciaTexto: {
    color: '#334155',
  },
  confirmacionCiudad: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdfa',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  confirmacionTexto: {
    color: '#0f766e',
    fontWeight: '700',
  },
  terminos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 14,
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 4,
  },
  checkboxActivo: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  terminosTexto: {
    flex: 1,
    color: '#334155',
    fontWeight: '600',
  },
});