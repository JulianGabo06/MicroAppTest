import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * Vista pedida: app principal + 2 botones.
 * Cada botón abre una micro app distinta (Module Federation).
 */
export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>MicroApps</Text>
      <Text style={styles.subtitle}>Host con Re.Pack. Cada botón carga una mini app remota.</Text>

      <Pressable
        style={({ pressed }) => [styles.button, styles.catalog, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.buttonTitle}>Abrir Catálogo</Text>
        <Text style={styles.buttonHint}>micro app → catalog (:9001)</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.button, styles.profile, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.buttonTitle}>Abrir Perfil</Text>
        <Text style={styles.buttonHint}>micro app → profile (:9002)</Text>
      </Pressable>

      <Text style={styles.footer}>
        Los bundles remotos pueden publicarse en S3 local (Floci :4566).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#94A3B8',
    marginBottom: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  catalog: {
    backgroundColor: '#0EA5E9',
  },
  profile: {
    backgroundColor: '#14B8A6',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
  },
  buttonHint: {
    color: '#0F172A',
    opacity: 0.7,
    marginTop: 4,
    fontSize: 13,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 24,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
});
