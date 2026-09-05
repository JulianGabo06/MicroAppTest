import { StyleSheet, Text, View } from 'react-native';

/**
 * Micro app Profile — UI independiente, desplegable por separado.
 */
export default function ProfileApp() {
  return (
    <View style={styles.screen}>
      <Text style={styles.badge}>mini app · profile</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>JG</Text>
      </View>
      <Text style={styles.title}>Julián García</Text>
      <Text style={styles.role}>Mobile Engineer · Portfolio</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Equipo</Text>
        <Text style={styles.value}>Pragma · microfrontends</Text>
        <Text style={styles.label}>Stack demo</Text>
        <Text style={styles.value}>Expo · Re.Pack · Floci S3</Text>
      </View>
      <Text style={styles.hint}>
        Este bundle se sirve desde el puerto 9002 (o desde S3/Floci).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#042F2E',
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#042F2E',
    backgroundColor: '#5EEAD4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 28,
    overflow: 'hidden',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#042F2E',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F0FDFA',
  },
  role: {
    marginTop: 6,
    color: '#99F6E4',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#134E4A',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  label: {
    marginTop: 8,
    color: '#5EEAD4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    color: '#CCFBF1',
    fontSize: 16,
  },
  hint: {
    marginTop: 24,
    color: '#5EEAD4',
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 13,
  },
});
