import { useEffect, useState } from 'react';

/** True once `active` has stayed true for `delayMs`; false again as soon as it isn't. */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    setElapsed(false);
    if (!active) return;
    const id = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);
  return active && elapsed;
}
