import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AddItemSheet } from './AddItemSheet';

jest.mock('@/i18n/LanguageProvider', () => ({
  useLanguage: () => ({ lang: 'en', isRTL: false, setLang: jest.fn() }),
}));
// jest.mock factories run before imports, so the library's mock has to be required here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

function renderSheet(onAdd: jest.Mock) {
  return render(
    <ThemeProvider>
      <AddItemSheet visible onClose={() => undefined} onAdd={onAdd} />
    </ThemeProvider>,
  );
}

it('shows what was added inside the sheet and clears the name for the next item', async () => {
  const onAdd = jest.fn().mockResolvedValue(undefined);
  renderSheet(onAdd);
  fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Milk');
  fireEvent.press(screen.getByRole('button', { name: 'L' }));
  fireEvent.press(screen.getByText('Add to list'));
  await waitFor(() => expect(screen.getByText('Added "Milk"')).toBeTruthy());
  expect(onAdd).toHaveBeenCalledWith({ name: 'Milk', quantity: 1, unit: 'L', dueAt: null });
  expect(screen.getByLabelText('What do you need?').props.value).toBe('');
});

it('asks for a name instead of adding an empty item', () => {
  const onAdd = jest.fn();
  renderSheet(onAdd);
  fireEvent.press(screen.getByText('Add to list'));
  expect(screen.getByText('Write what you need first.')).toBeTruthy();
  expect(onAdd).not.toHaveBeenCalled();
});

it('goes back to "No rush" after each added item', async () => {
  const onAdd = jest.fn().mockResolvedValue(undefined);
  renderSheet(onAdd);
  fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Tomatoes');
  fireEvent.press(screen.getByRole('button', { name: 'Today' }));
  fireEvent.press(screen.getByText('Add to list'));
  await waitFor(() => expect(screen.getByText('Added "Tomatoes"')).toBeTruthy());
  expect(onAdd.mock.calls[0][0].dueAt).toBeInstanceOf(Date);

  expect(screen.getByRole('button', { name: 'No rush' }).props.accessibilityState.selected).toBe(true);
  fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Milk');
  fireEvent.press(screen.getByText('Add to list'));
  await waitFor(() => expect(screen.getByText('Added "Milk"')).toBeTruthy());
  expect(onAdd.mock.calls[1][0].dueAt).toBeNull();
});
