import { withOnBootNetworkActivityRecording } from '@rozenite/network-activity-plugin';
import { registerRootComponent } from 'expo';
import App from './src/App';

// Rozenite: captura también las peticiones previas al primer render (no-op en producción).
withOnBootNetworkActivityRecording();

// Entry síncrono. Shared MF solo incluye react/react-native (eager).
registerRootComponent(App);
