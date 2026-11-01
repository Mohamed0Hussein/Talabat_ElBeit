import { act, renderHook } from '@testing-library/react-native';
import { useNow } from './useNow';

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 1, 10, 0) }));
afterEach(() => jest.useRealTimers());

it('moves forward every minute', () => {
  const { result } = renderHook(() => useNow());
  const first = result.current.getTime();
  act(() => {
    jest.advanceTimersByTime(60_000);
  });
  expect(result.current.getTime() - first).toBe(60_000);
});

it('stops its timer when the screen goes away', () => {
  const { unmount } = renderHook(() => useNow());
  expect(jest.getTimerCount()).toBe(1);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
