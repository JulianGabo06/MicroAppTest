import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import HomeScreen from '../HomeScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

async function renderHomeScreen() {
  const navigate = jest.fn();
  const props = {
    navigation: { navigate },
    route: { key: 'Home', name: 'Home' },
  } as unknown as Props;

  await render(<HomeScreen {...props} />);
  return { navigate };
}

describe('HomeScreen', () => {
  it('muestra la marca, la descripción y el pie', async () => {
    await renderHomeScreen();

    expect(screen.getByText('MicroApps')).toBeOnTheScreen();
    expect(
      screen.getByText('Host con Re.Pack. Cada botón carga una mini app remota.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Los bundles remotos pueden publicarse en S3 local (Floci :4566).'),
    ).toBeOnTheScreen();
  });

  it('muestra un botón por cada micro app con su puerto', async () => {
    await renderHomeScreen();

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Abrir Catálogo/ })).toHaveTextContent(
      /micro app → catalog \(:9001\)/,
    );
    expect(screen.getByRole('button', { name: /Abrir Perfil/ })).toHaveTextContent(
      /micro app → profile \(:9002\)/,
    );
  });

  it.each([
    ['Abrir Catálogo', 'Catalog'],
    ['Abrir Perfil', 'Profile'],
  ])('al pulsar "%s" navega a %s', async (label, route) => {
    const { navigate } = await renderHomeScreen();
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: new RegExp(label) }));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(route);
  });
});
