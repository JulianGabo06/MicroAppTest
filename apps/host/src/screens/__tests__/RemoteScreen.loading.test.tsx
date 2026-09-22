import { render, screen } from '@testing-library/react-native';
import RemoteScreen from '../RemoteScreen';

// Remote que nunca termina de cargar: deja el Suspense en el fallback.
jest.mock('catalog/App', () => {
  const { use } = require('react');
  const pending = new Promise<never>(() => {});
  return {
    __esModule: true,
    default: function PendingRemote() {
      use(pending);
      return null;
    },
  };
});

describe('RemoteScreen mientras carga el bundle', () => {
  it('muestra el loader con el nombre de la micro app y la ayuda', async () => {
    await render(<RemoteScreen remote="catalog" title="Catálogo" />);

    expect(screen.getByText('Cargando Catálogo…')).toBeOnTheScreen();
    expect(
      screen.getByText('Asegúrate de que el servidor de la mini app esté corriendo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('remote catalog (mock)')).not.toBeOnTheScreen();
  });
});
