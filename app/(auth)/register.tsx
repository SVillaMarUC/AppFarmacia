import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useLocation } from '@/hooks/useLocation';
import { authService } from '@/services/firebase/auth.service';

const schema = z.object({
  cedula: z.string().min(6, 'La cédula es obligatoria.'),
  email: z.string().email('Correo inválido.'),
  nombre: z.string().min(3, 'Nombre inválido.'),
  fechaNacimiento: z.string().min(8, 'Fecha obligatoria (YYYY-MM-DD).'),
  genero: z.string().min(1, 'Selecciona un género.'),
  eps: z.string().min(2, 'EPS obligatoria.'),
  telefono: z.string().min(7, 'Teléfono inválido.'),
  direccion: z.string().min(6, 'Dirección obligatoria.'),
  ciudad: z.string().min(3, 'Ciudad obligatoria.'),
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
  const { getCurrentLocation, loading: loadingUbicacion } = useLocation();

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
      ciudad: 'Bogotá',
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

    try {
      setLoading(true);
      const fecha = new Date(data.fechaNacimiento);

      await authService.registrarUsuario(data.cedula, data.email, data.contrasena, {
        cedula: data.cedula,
        email: data.email,
        nombre: data.nombre,
        fechaNacimiento: fecha,
        genero: data.genero,
        eps: data.eps,
        direcciones: [
          {
            etiqueta: 'Principal',
            direccion: data.direccion,
            ciudad: data.ciudad,
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
      Alert.alert('Error', 'No se pudo completar el registro.');
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
              ['direccion', 'Dirección', 'default'],
              ['ciudad', 'Ciudad', 'default'],
              ['contactoNombre', 'Contacto emergencia - Nombre', 'default'],
              ['contactoParentesco', 'Contacto emergencia - Parentesco', 'default'],
              ['contactoTelefono', 'Contacto emergencia - Teléfono', 'phone-pad'],
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