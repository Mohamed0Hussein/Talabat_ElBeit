import { act, renderHook } from '@testing-library/react-native';
import { useDelayedFlag } from './useDelayedFlag';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('turns on once the condition has held for the delay', () => {
  const { result } = renderHook(() => useDelayedFlag(true, 6000));
  expect(result.current).toBe(false);
  act(() => {
    jest.advanceTimersByTime(5999);
  });
  expect(result.current).toBe(false);
  act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(result.current).toBe(true);
});

it('turns off and starts over when the condition stops holding', () => {
  const { result, rerender } = renderHook(({ on }: { on: boolean }) => useDelayedFlag(on, 6000), {
    initialProps: { on: true },
  });
  act(() => {
    jest.advanceTimersByTime(6000);
  });
  expect(result.current).toBe(true);
  rerender({ on: false });
  expect(result.current).toBe(false);
  rerender({ on: true });
  act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current).toBe(false);
});

it('leaves no timer behind', () => {
  const { unmount } = renderHook(() => useDelayedFlag(true, 6000));
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
