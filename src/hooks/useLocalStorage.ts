import { useEffect, useRef, useState } from 'react';

interface Options<T> {
    /** Turns the raw parsed JSON into a T, or null when it is unusable. */
    validate: (raw: unknown) => T | null;
    /** When defined, becomes the initial state (and is persisted) instead of the stored value. */
    override?: T;
}

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options: Options<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const { validate } = options;

    const [storedValue, setStoredValue] = useState<T>(() => {
        if (options.override !== undefined) return options.override;
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) return initialValue;
            return validate(JSON.parse(item)) ?? initialValue;
        } catch {
            return initialValue;
        }
    });

    const skipFirstWriteRef = useRef(options.override === undefined);

    useEffect(() => {
        if (skipFirstWriteRef.current) {
            skipFirstWriteRef.current = false;
            return;
        }
        try {
            const serialized =
                storedValue === null || storedValue === undefined
                    ? null
                    : JSON.stringify(storedValue);
            if (serialized === window.localStorage.getItem(key)) return;
            if (serialized === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, serialized);
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    useEffect(() => {
        const adoptOtherTabValue = (event: StorageEvent) => {
            if (event.key !== key || event.storageArea !== window.localStorage) return;
            if (event.newValue === null) {
                setStoredValue(initialValue);
                return;
            }
            try {
                const next = validate(JSON.parse(event.newValue));
                if (next !== null) setStoredValue(next);
            } catch {
                /* keep the value this tab already has */
            }
        };
        window.addEventListener('storage', adoptOtherTabValue);
        return () => window.removeEventListener('storage', adoptOtherTabValue);
    }, [key, validate, initialValue]);

    return [storedValue, setStoredValue];
}
