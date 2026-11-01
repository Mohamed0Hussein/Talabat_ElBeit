import { startAlign } from './layout';

it('lets native apps flip left to right themselves', () => {
  expect(startAlign(true, 'ios')).toBe('left');
  expect(startAlign(true, 'android')).toBe('left');
  expect(startAlign(false, 'android')).toBe('left');
});

it('aligns Arabic to the right on web', () => {
  expect(startAlign(true, 'web')).toBe('right');
  expect(startAlign(false, 'web')).toBe('left');
});
