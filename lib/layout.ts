/**
 * Text alignment for "start of the line". Native apps flip left/right themselves once RTL is forced,
 * so "left" already means start there. On web only the page's dir changes, so pick the side.
 */
export function startAlign(isRTL: boolean, platform: string): 'left' | 'right' {
  return platform === 'web' && isRTL ? 'right' : 'left';
}
