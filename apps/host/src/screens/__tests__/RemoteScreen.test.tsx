import { render, screen } from '@testing-library/react-native';
import RemoteScreen from '../RemoteScreen';

// `catalog/App` y `profile/App` se resuelven a test/mocks/*App.tsx (jest.config.js).

describe('RemoteScreen', () => {
  it.each([
    ['catalog', 'Catálogo'],
    ['profile', 'Perfil'],
  ] as const)('carga la micro app remota "%s"', async (remote, title) => {
    await render(<RemoteScreen remote={remote} title={title} />);

    expect(await screen.findByText(`remote ${remote} (mock)`)).toBeOnTheScreen();
    expect(screen.queryByText(`Cargando ${title}…`)).not.toBeOnTheScreen();
  });
});
