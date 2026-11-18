import { useEffect, useState } from 'preact/hooks';

/** Generic subscription hook for the small framework-free stores in this app. */
export function useExternal<T>(subscribe: (fn: () => void) => () => void, get: () => T): T {
  const [value, setValue] = useState(get);
  useEffect(() => {
    setValue(get);
    return subscribe(() => setValue(get));
  }, [subscribe, get]);
  return value;
}
