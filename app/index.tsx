import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(auth)/login');
  }, [router]);

  return <LoadingOverlay texto="Cargando..." />;
}