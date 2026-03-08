import LZString from 'lz-string';
import type { WizardData } from '../types';

export interface SharedPayload {
    data: WizardData;
    hiddenParents: number[];
}

/**
 * Compresses `WizardData` (plus the set of hidden parents) into a URL-safe string.
 *
 * When one parent is hidden, the exported data contains only the visible parent's
 * schedule — preserving the concrete date intervals that were already computed.
 * No leave-law recalculation happens here.
 */
export function compressWizardData(
    data: WizardData,
    hiddenParents: Set<number>,
): string {
    const exportData: WizardData = structuredClone(data);

    if (hiddenParents.size > 0 && exportData.schedule) {
        exportData.schedule = exportData.schedule.filter(
            (_, i) => !hiddenParents.has(i),
        );
        exportData.parentCount = exportData.schedule.length as 1 | 2;
        exportData.names = exportData.names.filter((_, i) => !hiddenParents.has(i));
        exportData.colors = exportData.colors.filter((_, i) => !hiddenParents.has(i));
        exportData.leaveMode = 'together';
        if (exportData.lactanciaFirst) {
            exportData.lactanciaFirst = exportData.lactanciaFirst.filter(
                (_, i) => !hiddenParents.has(i),
            );
        }
        if (exportData.cuidadoWeeks) {
            exportData.cuidadoWeeks = exportData.cuidadoWeeks.filter(
                (_, i) => !hiddenParents.has(i),
            );
        }
    }

    const payload: SharedPayload = {
        data: exportData,
        hiddenParents: [],
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decompressWizardData(compressed: string): SharedPayload | null {
    try {
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) return null;

        const parsed = JSON.parse(json);

        if (parsed.data && Array.isArray(parsed.hiddenParents)) {
            return parsed as SharedPayload;
        } else {
            // Legacy format where WizardData was the root object
            return {
                data: parsed as WizardData,
                hiddenParents: [],
            };
        }
    } catch (e) {
        console.error('Failed to parse shared data', e);
        return null;
    }
}
