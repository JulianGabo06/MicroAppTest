import { FlatList, StyleSheet, Text, View } from 'react-native';

const PRODUCTS = [
  { id: '1', name: 'Café de origen', price: '$12' },
  { id: '2', name: 'Taza cerámica', price: '$18' },
  { id: '3', name: 'Filtro V60', price: '$9' },
  { id: '4', name: 'Molino manual', price: '$45' },
];

/**
 * Micro app Catalog — UI independiente, desplegable por separado.
 */
export default function CatalogApp() {
  return (
    <View style={styles.screen}>
      <Text style={styles.badge}>mini app · catalog</Text>
      <Text style={styles.title}>Catálogo</Text>
      <Text style={styles.subtitle}>
        Este bundle se sirve desde el puerto 9001 (o desde S3/Floci).
      </Text>
      <FlatList
        data={PRODUCTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#082F49',
    padding: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#0F172A',
    backgroundColor: '#7DD3FC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F0F9FF',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#BAE6FD',
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0C4A6E',
    padding: 16,
    borderRadius: 12,
  },
  name: {
    color: '#E0F2FE',
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    color: '#7DD3FC',
    fontWeight: '700',
  },
});
