import {readonly, ref} from 'vue';
import type {IndexSelection} from '@/type/IndexSelection.ts';

export const useIndexSelection = (): IndexSelection => {
    const current = ref<number>();
    const setCurrent = (index: number | undefined): void => {
        current.value = index;
    };

    const selectedSet = ref(new Set<number>());

    const selectCallbacks = new Set<(index: number) => void>();
    const onSelect = (callback: (index: number) => void): void => {
        selectCallbacks.add(callback);
    };
    const offSelect = (callback: (index: number) => void): void => {
        selectCallbacks.delete(callback);
    };

    const unselectCallbacks = new Set<(index: number) => void>();
    const onUnselect = (callback: (index: number) => void): void => {
        unselectCallbacks.add(callback);
    };
    const offUnselect = (callback: (index: number) => void): void => {
        unselectCallbacks.delete(callback);
    };

    const createSelectionRange = (start: number, end: number): number[] => {
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        const indexes: number[] = [];
        for (let i = from; i <= to; i++) {
            indexes.push(i);
        }
        return indexes;
    };

    const select = (index: number | number[]): void => {
        const indexes = Array.isArray(index) ? index : [index];
        for (const index of indexes) {
            if (!selectedSet.value.has(index)) {
                selectedSet.value.add(index);
                current.value = index;
                for (const callback of selectCallbacks) {
                    callback(index);
                }
            }
        }
    };
    const selectRange = (start: number, end: number): void => {
        select(createSelectionRange(start, end));
    };

    const unselect = (index: number | number[]): void => {
        const indexes = Array.isArray(index) ? index : [index];
        for (const index of indexes) {
            if (selectedSet.value.has(index)) {
                selectedSet.value.delete(index);
                if (index === current.value) {
                    current.value = undefined;
                }
                for (const callback of unselectCallbacks) {
                    callback(index);
                }
            }
        }
    };
    const unselectRange = (start: number, end: number): void => {
        unselect(createSelectionRange(start, end));
    };
    const unselectAll = (): void => {
        const indexes = Array.from(selectedSet.value);
        unselect(indexes);
    };

    const isSelected = (index: number): boolean => {
        return selectedSet.value.has(index);
    };

    const resetSelection = (indexes: number[]): void => {
        unselectAll();
        select(indexes);
    };
    const resetSelectionRange = (start: number, end: number): void => {
        resetSelection(createSelectionRange(start, end));
    };

    return Object.freeze({
        current: readonly(current),
        setCurrent,
        selectedSet: readonly(selectedSet),

        onSelect,
        offSelect,
        onUnselect,
        offUnselect,

        isSelected,

        select,
        selectRange,
        unselect,
        unselectRange,
        unselectAll,
        resetSelection,
        resetSelectionRange,
    });
};
