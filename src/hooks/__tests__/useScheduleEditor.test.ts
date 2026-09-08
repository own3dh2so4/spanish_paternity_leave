import { act, renderHook } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MAX_DURATION_VALUE } from '../../constants';
import { makeData } from '../../test-fixtures';
import type { ComputedPeriod, WizardData } from '../../types';
import { getPeriodKey, periodCalendarWeeks } from '../../utils/calendarHelpers';
import { parseLocalDate } from '../../utils/dates';
import { useScheduleEditor } from '../useScheduleEditor';
import { at, lastOf, parentAt } from '../../test-helpers';

beforeAll(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
    });
});

function setup(data: WizardData = makeData()) {
    const updates: WizardData[] = [];
    const { result } = renderHook(() =>
        useScheduleEditor(data, (next) => {
            updates.push(next);
        }),
    );
    return { result, updates, data };
}

const find = (data: WizardData, parentIndex: number, type: string): ComputedPeriod =>
    parentAt(data.schedule, parentIndex).periods.find((p) => p.type === type)!;

const keyOf = (data: WizardData, parentIndex: number, type: string) =>
    getPeriodKey(find(data, parentIndex, type));

const periodOf = (data: WizardData, parentIndex: number, type: string) =>
    parentAt(data.schedule, parentIndex).periods.find((p) => p.type === type);

describe('useScheduleEditor — duration editing', () => {
    it('seeds weeks for a flexible period', () => {
        const { result, data } = setup();
        act(() => result.current.startEditing(0, find(data, 0, 'flexible')));

        expect(result.current.editingPeriod).toEqual({
            parentIndex: 0,
            periodKey: keyOf(data, 0, 'flexible'),
        });
        expect(result.current.editUnit).toBe('weeks');
        expect(result.current.editValue).toBe('11');
    });

    it('seeds calendar days for convenio, which is granted in days', () => {
        const data = makeData({ convenioDays: [10, 0] });
        const { result } = setup(data);

        act(() => result.current.startEditing(0, find(data, 0, 'convenio')));

        expect(result.current.editUnit).toBe('days');
        expect(result.current.editValue).toBe('10');
    });

    it('seeds calendar days for lactancia expressed in natural days', () => {
        const data = makeData({ regimes: ['sermas', 'sermas'] });
        const { result } = setup(data);

        act(() => result.current.startEditing(0, find(data, 0, 'lactancia')));

        expect(result.current.editUnit).toBe('days');
        expect(result.current.editValue).toBe('30');
    });

    it('seeds the working-day count for an estimated lactancia', () => {
        const data = makeData();
        const { result } = setup(data);
        const lactancia = find(data, 0, 'lactancia');

        act(() => result.current.startEditing(0, lactancia));

        expect(result.current.editUnit).toBe('days');
        expect(result.current.editValue).toBe(String(lactancia.days));
    });

    it('prefers the stored duration when a period carries one', () => {
        const data = makeData();
        const lactancia = find(data, 0, 'lactancia');
        const withDuration: ComputedPeriod = {
            ...lactancia,
            durationValue: 3,
            durationUnit: 'weeks',
        };
        const { result } = setup(data);

        act(() => result.current.startEditing(0, withDuration));

        expect(result.current.editValue).toBe('3');
        expect(result.current.editUnit).toBe('weeks');
    });

    it('applies a resize and closes the editor', () => {
        const { result, updates, data } = setup();
        act(() => result.current.startEditing(0, find(data, 0, 'flexible')));
        act(() => result.current.setEditValue('4'));
        act(() => result.current.commitEdit());

        expect(updates).toHaveLength(1);
        const flexible = periodOf(at(updates, 0), 0, 'flexible')!;
        expect(
            (parseLocalDate(flexible.endDate).getTime() -
                parseLocalDate(flexible.startDate).getTime()) /
                (7 * 86_400_000),
        ).toBe(4);
        expect(result.current.editingPeriod).toBeNull();
    });

    it('clamps a resize to the maximum duration', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('vacation', parentAt(data.schedule, 0)));
        act(() => result.current.confirmAdd(0));

        const withExtra = at(updates, 0);
        const extra = parentAt(withExtra.schedule, 0).periods.find((p) => p.isExtra)!;
        const { result: resized, updates: resizedUpdates } = setup(withExtra);

        act(() => resized.current.startEditing(0, extra));
        act(() => resized.current.setEditValue('100000'));
        act(() => resized.current.commitEdit());

        const clamped = parentAt(at(resizedUpdates, 0).schedule, 0).periods.find(
            (p) => p.extraId === extra.extraId,
        )!;
        expect(resized.current.editUnit).toBe('weeks');
        expect(periodCalendarWeeks(clamped)).toBe(MAX_DURATION_VALUE);
    });

    it.each([['0'], ['-3'], ['abc'], ['']])('ignores the invalid duration %s', (value) => {
        const { result, updates, data } = setup();
        act(() => result.current.startEditing(0, find(data, 0, 'flexible')));
        act(() => result.current.setEditValue(value));
        act(() => result.current.commitEdit());

        expect(updates).toHaveLength(0);
        expect(result.current.editingPeriod).toBeNull();
    });

    it('does nothing when committing with no period open', () => {
        const { result, updates } = setup();
        act(() => result.current.commitEdit());
        expect(updates).toHaveLength(0);
    });

    it('cancelling leaves the schedule alone', () => {
        const { result, updates, data } = setup();
        act(() => result.current.startEditing(0, find(data, 0, 'flexible')));
        act(() => result.current.cancelEdit());

        expect(result.current.editingPeriod).toBeNull();
        expect(updates).toHaveLength(0);
    });
});

describe('useScheduleEditor — start date editing', () => {
    it('opens with the current value and closes the duration editor', () => {
        const { result, data } = setup();
        const key = keyOf(data, 0, 'flexible');
        act(() => result.current.startEditing(0, find(data, 0, 'flexible')));

        act(() =>
            result.current.openStartDateEdit(
                0,
                key,
                parseLocalDate('2026-12-01'),
                parseLocalDate('2026-11-12'),
            ),
        );

        expect(result.current.editingPeriod).toBeNull();
        expect(result.current.editingStartDate).toEqual({ parentIndex: 0, periodKey: key });
        expect(result.current.editStartDateValue).toEqual(parseLocalDate('2026-12-01'));
        expect(result.current.minEditStartDate).toEqual(parseLocalDate('2026-11-12'));
    });

    it('clamps a chosen date to the minimum', () => {
        const { result, updates, data } = setup();
        const min = find(data, 0, 'mandatory').endDate;

        act(() =>
            result.current.openStartDateEdit(
                0,
                keyOf(data, 0, 'flexible'),
                parseLocalDate(min),
                parseLocalDate(min),
            ),
        );
        act(() => result.current.commitStartDate(parseLocalDate('2020-01-01')));

        expect(updates).toHaveLength(1);
        expect(periodOf(at(updates, 0), 0, 'flexible')!.startDate).toBe(min);
    });

    it('accepts a date after the minimum and closes the picker', () => {
        const { result, updates, data } = setup();
        const min = find(data, 0, 'mandatory').endDate;

        act(() =>
            result.current.openStartDateEdit(
                0,
                keyOf(data, 0, 'flexible'),
                parseLocalDate(min),
                parseLocalDate(min),
            ),
        );
        act(() => result.current.commitStartDate(parseLocalDate('2027-02-01')));

        expect(periodOf(at(updates, 0), 0, 'flexible')!.startDate).toBe('2027-02-01');
        expect(result.current.editingStartDate).toBeNull();
        expect(result.current.editStartDateValue).toBeNull();
    });

    it('does nothing when committing with no picker open', () => {
        const { result, updates } = setup();
        act(() => result.current.commitStartDate(parseLocalDate('2027-02-01')));
        expect(updates).toHaveLength(0);
    });

    it('cancelling clears the picker state', () => {
        const { result, data } = setup();
        act(() =>
            result.current.openStartDateEdit(
                0,
                keyOf(data, 0, 'flexible'),
                parseLocalDate('2027-01-01'),
                parseLocalDate('2026-11-12'),
            ),
        );
        act(() => result.current.cancelStartDate());

        expect(result.current.editingStartDate).toBeNull();
        expect(result.current.minEditStartDate).toBeNull();
    });
});

describe('useScheduleEditor — drag and drop', () => {
    const dragEvent = () => {
        const dataTransfer = { dropEffect: 'none' };
        return {
            preventDefault: vi.fn(),
            dataTransfer,
        } as unknown as React.DragEvent & { preventDefault: ReturnType<typeof vi.fn> };
    };

    it('tracks the dragged and hovered period', () => {
        const { result, data } = setup();
        const from = keyOf(data, 0, 'flexible');
        const over = keyOf(data, 0, 'cuidado');
        const event = dragEvent();

        act(() => result.current.onDragStart(0, from));
        act(() => result.current.onDragOver(event, 0, over));

        expect(result.current.draggingKey).toEqual({ parentIndex: 0, periodKey: from });
        expect(result.current.dragOverKey).toEqual({ parentIndex: 0, periodKey: over });
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.dataTransfer.dropEffect).toBe('move');
    });

    it('ignores dragging over another parent', () => {
        const { result, data } = setup();
        const event = dragEvent();

        act(() => result.current.onDragStart(0, keyOf(data, 0, 'flexible')));
        act(() => result.current.onDragOver(event, 1, keyOf(data, 1, 'flexible')));

        expect(result.current.dragOverKey).toBeNull();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('ignores dragging over anything before a drag starts', () => {
        const { result, data } = setup();
        const event = dragEvent();

        act(() => result.current.onDragOver(event, 0, keyOf(data, 0, 'flexible')));

        expect(result.current.dragOverKey).toBeNull();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('reorders on drop within the same parent', () => {
        const { result, updates, data } = setup();
        const before = parentAt(data.schedule, 0).periods.map((p) => p.type);

        act(() => result.current.onDragStart(0, keyOf(data, 0, 'cuidado')));
        act(() => result.current.onDrop(dragEvent(), 0, keyOf(data, 0, 'flexible')));

        expect(updates).toHaveLength(1);
        expect(parentAt(at(updates, 0).schedule, 0).periods.map((p) => p.type)).not.toEqual(before);
        expect(result.current.draggingKey).toBeNull();
        expect(result.current.dragOverKey).toBeNull();
    });

    it('does not reorder when dropped on itself', () => {
        const { result, updates, data } = setup();
        const key = keyOf(data, 0, 'flexible');

        act(() => result.current.onDragStart(0, key));
        act(() => result.current.onDrop(dragEvent(), 0, key));

        expect(updates).toHaveLength(0);
    });

    it('does not reorder across parents', () => {
        const { result, updates, data } = setup();

        act(() => result.current.onDragStart(0, keyOf(data, 0, 'flexible')));
        act(() => result.current.onDrop(dragEvent(), 1, keyOf(data, 1, 'flexible')));

        expect(updates).toHaveLength(0);
    });

    it('clears the drag state on drag end', () => {
        const { result, data } = setup();
        act(() => result.current.onDragStart(0, keyOf(data, 0, 'flexible')));
        act(() => result.current.onDragEnd());

        expect(result.current.draggingKey).toBeNull();
        expect(result.current.dragOverKey).toBeNull();
    });

    it('moves a period with the keyboard alternative', () => {
        const { result, updates, data } = setup();

        act(() => result.current.move(0, keyOf(data, 0, 'cuidado'), -1));

        expect(updates).toHaveLength(1);
        expect(parentAt(at(updates, 0).schedule, 0).periods.map((p) => p.type)).not.toEqual(
            parentAt(data.schedule, 0).periods.map((p) => p.type),
        );
    });
});

describe('useScheduleEditor — extra periods', () => {
    it('opens the form with the default preset', () => {
        const { result } = setup();
        act(() => result.current.openAddForm(1));

        expect(result.current.addingForParent).toBe(1);
        expect(result.current.form).toEqual({
            presetKey: 'vacation',
            customName: '',
            durationValue: 2,
            durationUnit: 'weeks',
        });
    });

    it('seeds a preset with its own default duration', () => {
        const { result, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('parental', parentAt(data.schedule, 0)));

        expect(result.current.form.presetKey).toBe('parental');
        expect(result.current.form.durationValue).toBeGreaterThan(0);
    });

    it('seeds flexible-extra with the weeks still available', () => {
        const data = makeData({ useExtraWeeks: [false, false] });
        const { result } = setup(data);
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('flexible-extra', parentAt(data.schedule, 0)));

        expect(result.current.form.durationUnit).toBe('weeks');
        expect(result.current.form.durationValue).toBeGreaterThanOrEqual(1);
    });

    it('adds an extra period and resets the form', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('vacation', parentAt(data.schedule, 0)));
        act(() => result.current.setDurationValue(3));
        act(() => result.current.setDurationUnit('days'));
        act(() => result.current.confirmAdd(0));

        const added = parentAt(at(updates, 0).schedule, 0).periods.find((p) => p.isExtra)!;
        expect(added.extraPresetKey).toBe('vacation');
        expect(
            (parseLocalDate(added.endDate).getTime() - parseLocalDate(added.startDate).getTime()) /
                86_400_000,
        ).toBe(3);
        expect(result.current.addingForParent).toBeNull();
        expect(result.current.form).toEqual({
            presetKey: 'vacation',
            customName: '',
            durationValue: 2,
            durationUnit: 'weeks',
        });
    });

    it('keeps the typed name for a custom period', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('custom', parentAt(data.schedule, 0)));
        act(() => result.current.setCustomName('  Sabbatical  '));
        act(() => result.current.confirmAdd(0));

        const added = parentAt(at(updates, 0).schedule, 0).periods.filter((p) => p.isExtra);
        expect(lastOf(added, 'extra period').extraName).toBe('Sabbatical');
    });

    it('drops a blank custom name instead of storing whitespace', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('custom', parentAt(data.schedule, 0)));
        act(() => result.current.setCustomName('   '));
        act(() => result.current.confirmAdd(0));

        const added = parentAt(at(updates, 0).schedule, 0).periods.filter((p) => p.isExtra);
        expect(lastOf(added, 'extra period').extraName).toBeUndefined();
    });

    it('refuses flexible-extra when no flexible weeks are left', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('flexible-extra', parentAt(data.schedule, 0)));
        act(() => result.current.setDurationValue(5));
        act(() => result.current.confirmAdd(0));

        expect(updates).toHaveLength(0);
    });

    it('ignores a confirm for a parent that does not exist', () => {
        const { result, updates } = setup();
        act(() => result.current.confirmAdd(9));
        expect(updates).toHaveLength(0);
    });

    it('closing the form leaves the schedule alone', () => {
        const { result, updates } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.closeAddForm());

        expect(result.current.addingForParent).toBeNull();
        expect(updates).toHaveLength(0);
    });

    it('removes an extra period by id', () => {
        const { result, updates, data } = setup();
        act(() => result.current.openAddForm(0));
        act(() => result.current.setPreset('vacation', parentAt(data.schedule, 0)));
        act(() => result.current.confirmAdd(0));

        const added = parentAt(at(updates, 0).schedule, 0).periods.find((p) => p.isExtra)!;
        const { result: second, updates: secondUpdates } = setup(at(updates, 0));
        act(() => second.current.removeExtra(0, added.extraId!));

        expect(
            parentAt(at(secondUpdates, 0).schedule, 0).periods.some(
                (p) => p.extraId === added.extraId,
            ),
        ).toBe(false);
    });
});
