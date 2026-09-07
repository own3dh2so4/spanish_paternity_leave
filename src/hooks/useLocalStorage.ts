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
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (options.override !== undefined) return options.override;
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) return initialValue;
            return options.validate(JSON.parse(item)) ?? initialValue;
        } catch {
            return initialValue;
        }
    });

    const skipFirstWrite = useRef(options.override === undefined);

    useEffect(() => {
        if (skipFirstWrite.current) {
            skipFirstWrite.current = false;
            return;
        }
        try {
            if (storedValue === null || storedValue === undefined) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}
