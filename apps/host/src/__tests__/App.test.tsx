import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../App';

// Los plugins de Rozenite están mockeados en test/setup.js.

describe('App (host)', () => {
  it('registra los paneles de Rozenite con la referencia de navegación', async () => {
    await render(<App />);

    expect(useReactNavigationDevTools).toHaveBeenCalledWith({
      ref: expect.objectContaining({ current: expect.anything() }),
    });
    expect(useNetworkActivityDevTools).toHaveBeenCalled();
  });

  it('renderiza el shell con la pantalla Home', async () => {
    await render(<App />);

    expect(screen.getByText('MicroApps')).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('navega del Home a una micro app remota', async () => {
    await render(<App />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: /Abrir Perfil/ }));

    expect(await screen.findByText('remote profile (mock)')).toBeOnTheScreen();
  });
});
