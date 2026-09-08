import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StepNames from '../StepNames';
import { COLOR_PALETTES } from '../../../constants';
import type { ColorPaletteId } from '../../../types';

function renderStep(
    names: string[],
    colors: ColorPaletteId[],
    parentCount: 1 | 2 = names.length as 1 | 2,
) {
    const onChangeNames = vi.fn();
    const onChangeColors = vi.fn();
    render(
        <StepNames
            names={names}
            colors={colors}
            parentCount={parentCount}
            onChangeNames={onChangeNames}
            onChangeColors={onChangeColors}
        />,
    );
    return { onChangeNames, onChangeColors };
}

const swatchesFor = (parentIndex: number) => within(screen.getAllByRole('radiogroup')[parentIndex]);

describe('StepNames', () => {
    it('renders one name field and colour picker per parent', () => {
        renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        expect(screen.getAllByRole('textbox')).toHaveLength(2);
        expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
        expect(swatchesFor(0).getAllByRole('radio')).toHaveLength(
            Object.keys(COLOR_PALETTES).length,
        );
    });

    it('shows only one parent for a single-parent family', () => {
        renderStep(['Ana'], ['indigo'], 1);
        expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('reports a typed name without disturbing the other parent', () => {
        const { onChangeNames } = renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        fireEvent.change(screen.getByTestId('parent-name-input-1'), { target: { value: 'Marta' } });

        expect(onChangeNames).toHaveBeenCalledWith(['Ana', 'Marta']);
    });

    it('marks the selected colour for assistive tech', () => {
        renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        expect(swatchesFor(0).getByRole('radio', { name: 'Indigo' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(swatchesFor(0).getByRole('radio', { name: 'Pink' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
    });

    it('assigns a free colour directly', () => {
        const { onChangeColors } = renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        fireEvent.click(swatchesFor(0).getByRole('radio', { name: 'Teal' }));

        expect(onChangeColors).toHaveBeenCalledWith(['teal', 'pink']);
    });

    it('swaps colours when a parent picks the one the other already has', () => {
        const { onChangeColors } = renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        fireEvent.click(swatchesFor(0).getByRole('radio', { name: 'Pink' }));

        expect(onChangeColors).toHaveBeenCalledWith(['pink', 'indigo']);
    });

    it('picking the colour a parent already has changes nothing', () => {
        const { onChangeColors } = renderStep(['Ana', 'Luis'], ['indigo', 'pink']);

        fireEvent.click(swatchesFor(1).getByRole('radio', { name: 'Pink' }));

        expect(onChangeColors).toHaveBeenCalledWith(['indigo', 'pink']);
    });

    it('labels the picker with the parent it belongs to', () => {
        renderStep(['Ana', ''], ['indigo', 'pink']);

        expect(screen.getByRole('radiogroup', { name: /Ana/ })).toBeInTheDocument();
        expect(screen.getByRole('radiogroup', { name: /Parent 2/ })).toBeInTheDocument();
    });
});
