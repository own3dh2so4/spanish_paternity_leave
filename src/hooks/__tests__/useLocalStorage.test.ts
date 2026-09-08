import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorage } from '../useLocalStorage';

interface Plan {
    id: number;
}

const isPlan = (raw: unknown): Plan | null =>
    typeof raw === 'object' && raw !== null && typeof (raw as Plan).id === 'number'
        ? (raw as Plan)
        : null;

const KEY = 'test-plan';

const emitStorage = (key: string | null, newValue: string | null) =>
    act(() => {
        window.dispatchEvent(
            new StorageEvent('storage', { key, newValue, storageArea: window.localStorage }),
        );
    });

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('useLocalStorage', () => {
    it('hydrates from a stored value without writing it back', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ id: 7 }));
        const setItem = vi.spyOn(Storage.prototype, 'setItem');

        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );

        expect(result.current[0]).toEqual({ id: 7 });
        expect(setItem).not.toHaveBeenCalled();
    });

    it('falls back to the initial value when the stored value is unusable', () => {
        window.localStorage.setItem(KEY, '{"id":"not-a-number"}');
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );
        expect(result.current[0]).toBeNull();
    });

    it('falls back to the initial value when the stored value is not JSON', () => {
        window.localStorage.setItem(KEY, 'not-json');
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );
        expect(result.current[0]).toBeNull();
    });

    it('persists updates and removes the key when set back to null', () => {
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );

        act(() => result.current[1]({ id: 1 }));
        expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify({ id: 1 }));

        act(() => result.current[1](null));
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('persists the override immediately so a share link survives a reload', () => {
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan, override: { id: 42 } }),
        );

        expect(result.current[0]).toEqual({ id: 42 });
        expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify({ id: 42 }));
    });

    it('adopts a value written by another tab', () => {
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );

        emitStorage(KEY, JSON.stringify({ id: 99 }));

        expect(result.current[0]).toEqual({ id: 99 });
    });

    it('resets to the initial value when another tab clears the key', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ id: 3 }));
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );

        emitStorage(KEY, null);

        expect(result.current[0]).toBeNull();
    });

    it('ignores storage events for other keys and unusable payloads', () => {
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );
        act(() => result.current[1]({ id: 5 }));

        emitStorage('another-key', JSON.stringify({ id: 6 }));
        expect(result.current[0]).toEqual({ id: 5 });

        emitStorage(KEY, 'not-json');
        expect(result.current[0]).toEqual({ id: 5 });

        emitStorage(KEY, JSON.stringify({ id: 'nope' }));
        expect(result.current[0]).toEqual({ id: 5 });
    });

    it('does not echo a value back to storage after adopting it from another tab', () => {
        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );
        act(() => result.current[1]({ id: 1 }));

        window.localStorage.setItem(KEY, JSON.stringify({ id: 2 }));
        const setItem = vi.spyOn(Storage.prototype, 'setItem');
        emitStorage(KEY, JSON.stringify({ id: 2 }));

        expect(result.current[0]).toEqual({ id: 2 });
        expect(setItem).not.toHaveBeenCalled();
    });

    it('survives a storage backend that throws on write', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded');
        });

        const { result } = renderHook(() =>
            useLocalStorage<Plan | null>(KEY, null, { validate: isPlan }),
        );
        act(() => result.current[1]({ id: 1 }));

        expect(result.current[0]).toEqual({ id: 1 });
        expect(warn).toHaveBeenCalled();
    });
});
