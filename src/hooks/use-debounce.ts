import { useEffect, useState } from "react";

/**
 * Returns `value` delayed by `delay` ms. Useful for feeding a text input into a
 * query key without firing a request per keystroke.
 */
export const useDebounce = <T>(value: T, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
};
