import { registerRootComponent } from 'expo';
import App from './src/App';

// Entry síncrono. Shared MF solo incluye react/react-native (eager).
registerRootComponent(App);
