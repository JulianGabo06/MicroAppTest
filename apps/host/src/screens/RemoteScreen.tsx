import { lazy, Suspense } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type RemoteName = 'catalog' | 'profile';

const remotes = {
  catalog: lazy(() => import('catalog/App')),
  profile: lazy(() => import('profile/App')),
};

type Props = {
  remote: RemoteName;
  title: string;
};

/**
 * Carga una micro app remota con React.lazy + Module Federation.
 * Mientras llega el bundle, muestra un loader.
 */
export default function RemoteScreen({ remote, title }: Props) {
  const RemoteApp = remotes[remote];

  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.text}>Cargando {title}…</Text>
          <Text style={styles.hint}>
            Asegúrate de que el servidor de la mini app esté corriendo.
          </Text>
        </View>
      }
    >
      <RemoteApp />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  text: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 13,
  },
});
