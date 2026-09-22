import { NavigationContainer } from '@react-navigation/native';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import RootNavigator from '../RootNavigator';

function NavigationProvider({ children }: { children: ReactNode }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

describe('RootNavigator', () => {
  it('arranca en Home', async () => {
    await render(<RootNavigator />, { wrapper: NavigationProvider });

    expect(screen.getByText('MicroApps')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Abrir Catálogo/ })).toBeOnTheScreen();
  });

  it.each([
    ['Abrir Catálogo', 'catalog'],
    ['Abrir Perfil', 'profile'],
  ])('"%s" abre la micro app remota %s', async (label, remote) => {
    await render(<RootNavigator />, { wrapper: NavigationProvider });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: new RegExp(label) }));

    expect(await screen.findByText(`remote ${remote} (mock)`)).toBeOnTheScreen();
  });
});
