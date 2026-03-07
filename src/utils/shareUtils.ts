import LZString from 'lz-string';
import type { LeaveType, WizardData } from '../types';

export interface SharedPayload {
    data: WizardData;
    hiddenParents: number[];
}

// We need a minimal representation of UnifiedPeriod to avoid circular imports.
export interface SimpleUnifiedPeriod {
    isExtra: boolean;
    leaveType?: LeaveType;
    startDate: Date;
    extraItem?: { id: string };
}

export function compressWizardData(
    data: WizardData,
    hiddenParents: Set<number>,
    unifiedPeriodsMap: Map<number, SimpleUnifiedPeriod[]>
): string {
    // Clone data to avoid mutating original
    const exportData: WizardData = JSON.parse(JSON.stringify(data));

    // Determine which indices to keep
    const keepIndices = Array.from({ length: 2 })
        .map((_, i) => i)
        .filter((i) => i < data.parentCount && !hiddenParents.has(i));

    if (keepIndices.length === 1 && data.parentCount === 2) {
        const keptIndex = keepIndices[0];

        // Before down-sizing, we must freeze the calculated dates into customStartDates
        // so that removing the other parent doesn't collapse the layout.
        if (!exportData.customStartDates) {
            exportData.customStartDates = {};
        }
        if (!exportData.customStartDates[keptIndex]) {
            exportData.customStartDates[keptIndex] = {};
        }

        const periods = unifiedPeriodsMap.get(keptIndex) || [];
        for (const p of periods) {
            // Only freeze regular periods into customStartDates
            if (!p.isExtra && p.leaveType) {
                // Formatting date to internal timezone string YYYY-MM-DD
                const isoDate = p.startDate.toISOString().split('T')[0];
                exportData.customStartDates[keptIndex]![p.leaveType] = isoDate;
            } else if (p.isExtra && p.extraItem) {
                // For extra periods, bake the startDate directly into the item object
                if (exportData.extraPeriods && exportData.extraPeriods[keptIndex]) {
                    const itemIndex = exportData.extraPeriods[keptIndex].findIndex(
                        (item) => item.id === p.extraItem!.id
                    );
                    if (itemIndex >= 0) {
                        exportData.extraPeriods[keptIndex][itemIndex].startDate =
                            p.startDate.toISOString().split('T')[0];
                    }
                }
            }
        }

        // Downsize to 1 parent
        exportData.parentCount = 1;
        exportData.names = [data.names[keptIndex]];
        exportData.colors = [data.colors[keptIndex]];
        exportData.leaveMode = 'together'; // optimized doesn't make sense for 1 parent
        exportData.firstParent = 0;

        if (data.lactanciaFirst) {
            exportData.lactanciaFirst = [data.lactanciaFirst[keptIndex]];
        }
        if (data.cuidadoWeeks) {
            exportData.cuidadoWeeks = [data.cuidadoWeeks[keptIndex]];
        }
        if (data.extraPeriods) {
            exportData.extraPeriods = [data.extraPeriods[keptIndex]];
        }
        if (data.periodOrder) {
            exportData.periodOrder = [data.periodOrder[keptIndex]];
        }

        // Remap dictionary keys for custom properties (0-indexed)
        if (exportData.customDurations) {
            const mapped: typeof exportData.customDurations = {};
            if (exportData.customDurations[keptIndex]) {
                mapped[0] = exportData.customDurations[keptIndex];
            }
            exportData.customDurations = mapped;
        }

        if (exportData.customStartDates) {
            const mapped: typeof exportData.customStartDates = {};
            if (exportData.customStartDates[keptIndex]) {
                mapped[0] = exportData.customStartDates[keptIndex];
            }
            exportData.customStartDates = mapped;
        }
    }

    const payload: SharedPayload = {
        data: exportData,
        hiddenParents: [], // Array.from(hiddenParents), no longer needed for rendering since it's 1 parent natively
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decompressWizardData(compressed: string): SharedPayload | null {
    try {
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) return null;

        const parsed = JSON.parse(json);

        // Backwards compatibility check: if it doesn't have the 'data' wrapper, 
        // it might be an older format where just WizardData was serialized.
        if (parsed.data && Array.isArray(parsed.hiddenParents)) {
            return parsed as SharedPayload;
        } else {
            // Legacy link format where WizardData was the root object
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
