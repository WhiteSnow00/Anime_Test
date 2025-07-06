"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fp } from '@/lib/advanced-utils';

export interface UseLocalStorageOptions<T> {
  defaultValue?: T;
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
  validator?: (value: any) => value is T;
  syncAcrossTabs?: boolean;
  debounceMs?: number;
}

export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
) {
  const {
    defaultValue,
    serializer = {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    validator,
    syncAcrossTabs = true,
    debounceMs = 100,
  } = options;

  // Initialize state
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue as T;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue as T;
      }

      const parsed = serializer.deserialize(item);
      
      // Validate the parsed value if validator is provided
      if (validator && !validator(parsed)) {
        console.warn(`Invalid data in localStorage for key "${key}":`, parsed);
        return defaultValue as T;
      }

      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue as T;
    }
  });

  // Debounced setter to avoid excessive writes
  const debouncedSetItem = useMemo(
    () => fp.debounce((key: string, value: string) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }, debounceMs),
    [debounceMs]
  );

  // Enhanced setValue function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Validate before storing if validator is provided
      if (validator && !validator(valueToStore)) {
        console.warn(`Attempted to store invalid value for key "${key}":`, valueToStore);
        return;
      }

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        const serializedValue = serializer.serialize(valueToStore);
        debouncedSetItem(key, serializedValue);
      }
    } catch (error) {
      console.error(`Error setting value for key "${key}":`, error);
    }
  }, [key, storedValue, validator, serializer, debouncedSetItem]);

  // Remove value
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue as T);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Check if key exists
  const hasValue = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) !== null;
  }, [key]);

  // Get raw value without parsing
  const getRawValue = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }, [key]);

  // Sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;

      try {
        if (e.newValue === null) {
          setStoredValue(defaultValue as T);
        } else {
          const parsed = serializer.deserialize(e.newValue);
          
          if (validator && !validator(parsed)) {
            console.warn(`Invalid synced data for key "${key}":`, parsed);
            return;
          }

          setStoredValue(parsed);
        }
      } catch (error) {
        console.error(`Error syncing localStorage key "${key}":`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, serializer, validator, syncAcrossTabs]);

  // Advanced operations
  const operations = useMemo(() => ({
    // Update specific nested property
    updateProperty: <K extends keyof T>(property: K, value: T[K]) => {
      setValue(prev => ({
        ...prev,
        [property]: value,
      }));
    },

    // Merge with existing value (for objects)
    merge: (updates: Partial<T>) => {
      setValue(prev => ({
        ...prev,
        ...updates,
      }));
    },

    // Toggle boolean value
    toggle: () => {
      if (typeof storedValue === 'boolean') {
        setValue(!storedValue as any);
      }
    },

    // Increment/decrement numeric value
    increment: (amount: number = 1) => {
      if (typeof storedValue === 'number') {
        setValue((storedValue + amount) as any);
      }
    },

    decrement: (amount: number = 1) => {
      if (typeof storedValue === 'number') {
        setValue((storedValue - amount) as any);
      }
    },

    // Array operations
    push: (...items: any[]) => {
      if (Array.isArray(storedValue)) {
        setValue([...storedValue, ...items] as any);
      }
    },

    filter: (predicate: (item: any) => boolean) => {
      if (Array.isArray(storedValue)) {
        setValue(storedValue.filter(predicate) as any);
      }
    },

    // Reset to default
    reset: () => setValue(defaultValue as T),
  }), [storedValue, setValue, defaultValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    hasValue,
    getRawValue,
    ...operations,
  };
}
