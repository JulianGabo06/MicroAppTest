import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import RemoteScreen from '../screens/RemoteScreen';

export type RootStackParamList = {
  Home: undefined;
  Catalog: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'MicroApps Host' }} />
      <Stack.Screen name="Catalog" options={{ title: 'Catálogo' }}>
        {() => <RemoteScreen remote="catalog" title="Catálogo" />}
      </Stack.Screen>
      <Stack.Screen name="Profile" options={{ title: 'Perfil' }}>
        {() => <RemoteScreen remote="profile" title="Perfil" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
