import '../global.css';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator, { type RootStackParamList } from './navigation/RootNavigator';

/**
 * App principal (Host / Shell).
 * Aquí vive la navegación y los botones que abren cada micro app.
 */
export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Paneles de Rozenite en React Native DevTools (no-op en producción).
  useReactNavigationDevTools({ ref: navigationRef });
  useNetworkActivityDevTools();

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
