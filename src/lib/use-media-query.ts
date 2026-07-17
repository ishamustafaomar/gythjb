import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query]
  );
  return React.useSyncExternalStore(subscribe, () =>
    window.matchMedia(query).matches
  );
}
