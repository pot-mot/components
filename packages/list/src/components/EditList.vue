<script setup lang="ts" generic="T">
import {nextTick, onBeforeUnmount, onMounted, toRaw, useTemplateRef} from 'vue';
import {useIndexSelection} from '@/utils/indexSelection.ts';
import {useClickOutside} from '@/utils/useClickOutside.ts';
import IconAdd from '@/components/icons/IconAdd.vue';
import '@/style/list-variables.css';
import json5 from 'json5';
import {readText, writeText} from 'clipboard-polyfill';
import {cloneDeep} from 'lodash-es';
import {isInteractiveElement, isTargetInteractive} from '@/utils/checkInteractive.ts';
import type {EditListExpose} from '@/type/ListExpose.ts';
import type {ErrorHandler} from '@/type/ErrorHandler.ts';

const lines = defineModel<T[]>('lines', {
    required: true,
});
const props = withDefaults(
    defineProps<{
        toKey: (line: T, index: number) => string;
        defaultLine: () => T | Promise<T>;
        interactiveClassNames?: string[];
        beforeCopy?: (data: T[]) => void;
        afterCopy?: () => void;
        beforePaste?: (data: T[]) => void;
        afterPaste?: () => void;
        jsonValidator?: (json: any, onError: ErrorHandler) => boolean | Promise<T>;
    }>(),
    {
        interactiveClassNames: () => [],
    },
);

const emits = defineEmits<{
    clickItem: [e: MouseEvent, item: T, index: number];
    clickOutside: [e: MouseEvent];
    selected: [item: T, index: number];
    unselected: [item: T, index: number];
    added: [added: T[]];
    deleted: [deleted: T[]];
    pasteError: [error: Map<number, Error[] | null | undefined> | any];
}>();

const listRef = useTemplateRef<HTMLDivElement>('listRef');
const bodyRef = useTemplateRef<HTMLDivElement>('bodyRef');
const lastAddButtonRef = useTemplateRef<HTMLButtonElement>('lastAddButtonRef');
const focusList = () => {
    if (
        document.activeElement &&
        isInteractiveElement(document.activeElement, props.interactiveClassNames)
    )
        return;
    listRef.value?.focus();
};

const indexSelection = useIndexSelection();
const onSelect = (index: number) => {
    const item = lines.value[index];
    if (item !== undefined) {
        emits('selected', item, index);
    }
};
const onUnselect = (index: number) => {
    const item = lines.value[index];
    if (item !== undefined) {
        emits('unselected', item, index);
    }
};
onMounted(() => {
    indexSelection.onSelect(onSelect);
    indexSelection.onUnselect(onUnselect);
});
onBeforeUnmount(() => {
    indexSelection.offSelect(onSelect);
});

const {
    current,
    setCurrent,
    selectedSet,
    isSelected,
    select,
    selectRange,
    unselect,
    unselectAll,
    resetSelection,
    resetSelectionRange,
} = indexSelection;
useClickOutside(
    () => bodyRef.value,
    (e) => {
        if (e.target instanceof Element && lastAddButtonRef.value?.contains(e.target)) return;
        unselectAll();
        emits('clickOutside', e);
    },
);

const handlePaste = async () => {
    if (props.jsonValidator === undefined) return;
    const jsonValidator = props.jsonValidator;

    const text = await readText();
    try {
        const value = json5.parse(text);
        const tempLines = [...lines.value];

        const insertIndex =
            selectedSet.value.size > 0
                ? Math.max(...selectedSet.value.values()) + 1
                : tempLines.length;

        let insertLength = 0;

        const validateErrorsMap = new Map<number, Error[] | null | undefined>();

        if (
            Array.isArray(value) &&
            value.filter((item, index) => {
                return jsonValidator(item, (e) => validateErrorsMap.set(index, e));
            }).length === value.length
        ) {
            props.beforePaste?.(value);
            tempLines.splice(insertIndex, 0, ...value);
            insertLength = value.length;
        } else if (jsonValidator(value, (e) => validateErrorsMap.set(0, e))) {
            props.beforePaste?.([value]);
            tempLines.splice(insertIndex, 0, value);
            insertLength = 1;
        } else {
            emits('pasteError', validateErrorsMap);
            return;
        }

        lines.value = tempLines;

        await nextTick();

        unselectAll();
        for (let i = insertIndex; i < insertIndex + insertLength; i++) {
            select(i);
        }
        props.afterPaste?.();
    } catch (e) {
        emits('pasteError', e);
    }
};

const getDefaultLine = async (): Promise<T> => {
    let defaultLine: T;

    const temp = props.defaultLine();
    if (temp instanceof Promise) {
        defaultLine = await temp;
    } else {
        defaultLine = temp;
    }

    return defaultLine;
};

const insert = async (index: number) => {
    const newItem = await getDefaultLine();

    lines.value.splice(index, 0, newItem);
    await nextTick();

    resetSelection([index]);
    emits('added', [newItem]);

    return newItem;
};

const remove = async (index: number): Promise<T | undefined> => {
    const line = lines.value[index];
    if (line === undefined) return undefined;
    lines.value = lines.value.filter((_, i) => i !== index);

    await nextTick();

    const newSelectedIndex: number[] = [];
    selectedSet.value.forEach((i) => {
        if (i > index) {
            newSelectedIndex.push(i - 1);
        } else if (i < index) {
            newSelectedIndex.push(i);
        }
    });
    resetSelection(newSelectedIndex);
    emits('deleted', [line]);
    return line;
};

// 向上扩充选中区间
const expandSelectionUpward = () => {
    if (current.value === undefined) return;
    if (selectedSet.value.size <= 0) return;

    const oldCurrent = current.value;
    const minIndex = Math.min(...selectedSet.value);
    const maxIndex = Math.max(...selectedSet.value);
    if (minIndex === oldCurrent) {
        if (maxIndex - 1 >= 0) resetSelectionRange(minIndex, maxIndex - 1);
    } else if (maxIndex === oldCurrent) {
        if (minIndex - 1 >= 0) resetSelectionRange(minIndex - 1, maxIndex);
    }
    setCurrent(oldCurrent);
};

// 向下扩充选中区间
const expandSelectionDownward = () => {
    if (current.value === undefined) return;
    if (selectedSet.value.size <= 0) return;

    const oldCurrent = current.value;
    const minIndex = Math.min(...selectedSet.value);
    const maxIndex = Math.max(...selectedSet.value);
    if (minIndex === oldCurrent) {
        if (maxIndex + 1 < lines.value.length) resetSelectionRange(minIndex, maxIndex + 1);
    } else if (maxIndex === oldCurrent) {
        if (minIndex + 1 < lines.value.length) resetSelectionRange(minIndex + 1, maxIndex);
    }
    setCurrent(oldCurrent);
};

// 将选中元素整体上移，并设置当前选中项为minIndex
const moveUpSelection = async () => {
    if (selectedSet.value.size <= 0) return;

    const tempLines = [...lines.value];
    const newSelectIndexes: Set<number> = new Set();

    for (let i = 0; i < tempLines.length; i++) {
        const value = tempLines[i];
        if (value === undefined) continue;
        if (selectedSet.value.has(i)) {
            if (i === 0 || newSelectIndexes.has(i - 1)) {
                newSelectIndexes.add(i);
            } else {
                const tempLine = tempLines[i - 1];
                if (tempLine === undefined) continue;
                tempLines[i] = tempLine;
                tempLines[i - 1] = value;
                newSelectIndexes.add(i - 1);
            }
        }
    }

    lines.value = tempLines;

    await nextTick();

    const minIndex = Math.min(...newSelectIndexes);
    resetSelection([...newSelectIndexes]);
    setCurrent(minIndex);
};

// 将选中元素整体下移，并设置当前选中项为maxIndex
const moveDownSelection = async () => {
    if (selectedSet.value.size <= 0) return;

    const tempLines = [...lines.value];
    const newSelectIndexes: Set<number> = new Set();

    for (let i = tempLines.length - 1; i >= 0; i--) {
        const value = tempLines[i];
        if (value === undefined) continue;
        if (selectedSet.value.has(i)) {
            if (i === tempLines.length - 1 || newSelectIndexes.has(i + 1)) {
                newSelectIndexes.add(i);
            } else {
                const tempLine = tempLines[i + 1];
                if (tempLine === undefined) continue;
                tempLines[i] = tempLine;
                tempLines[i + 1] = value;
                newSelectIndexes.add(i + 1);
            }
        }
    }

    lines.value = tempLines;

    await nextTick();

    const maxIndex = Math.max(...newSelectIndexes);
    resetSelection([...newSelectIndexes]);
    setCurrent(maxIndex);
};

const handleItemClick = (e: MouseEvent, item: T, index: number) => {
    emits('clickItem', e, item, index);

    e.stopPropagation();
    e.stopImmediatePropagation();

    if (e.ctrlKey || e.metaKey) {
        if (!isSelected(index)) {
            select(index);
        } else {
            unselect(index);
        }
    } else if (e.shiftKey) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        if (current.value == undefined) {
            select(index);
            return;
        }
        selectRange(index, current.value);
    } else {
        if (!isTargetInteractive(e, props.interactiveClassNames)) {
            resetSelection([index]);
        }
    }
};

const prepareKeyboardEvent = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
};

const handleKeyboardEvent = async (e: KeyboardEvent) => {
    if (isTargetInteractive(e, props.interactiveClassNames)) {
        return;
    }

    const selectedItems: T[] = [];
    const unselectedItems: T[] = [];

    for (const [index, item] of lines.value.entries()) {
        if (selectedSet.value.has(index)) {
            selectedItems.push(item);
        } else {
            unselectedItems.push(item);
        }
    }

    if (e.key === 'Enter') {
        if (selectedItems.length === 1 && current.value !== undefined) {
            prepareKeyboardEvent(e);

            const index = current.value;
            await insert(index + 1);
            resetSelection([index + 1]);
        }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        prepareKeyboardEvent(e);

        unselectAll();
        lines.value = unselectedItems;
        emits('deleted', selectedItems);
    } else if (e.key === 'ArrowUp') {
        prepareKeyboardEvent(e);

        if (e.shiftKey) {
            expandSelectionUpward();
        } else if (e.ctrlKey || e.metaKey) {
            await moveUpSelection();
        } else if (current.value !== undefined && current.value - 1 >= 0) {
            resetSelection([current.value - 1]);
        }
    } else if (e.key === 'ArrowDown') {
        prepareKeyboardEvent(e);

        if (e.shiftKey) {
            expandSelectionDownward();
        } else if (e.ctrlKey || e.metaKey) {
            await moveDownSelection();
        } else if (current.value !== undefined && current.value + 1 < lines.value.length) {
            resetSelection([current.value + 1]);
        }
    } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
            prepareKeyboardEvent(e);

            resetSelection(Array.from(lines.value.keys()));
        } else if (e.key === 'c') {
            prepareKeyboardEvent(e);

            const copyData = cloneDeep(toRaw(selectedItems));
            props.beforeCopy?.(copyData);
            await writeText(JSON.stringify(copyData));
            props.afterCopy?.();
        } else if (e.key === 'x') {
            prepareKeyboardEvent(e);

            await writeText(JSON.stringify(selectedItems));
            unselectAll();
            lines.value = unselectedItems;
            emits('deleted', selectedItems);
        } else if (e.key === 'v') {
            prepareKeyboardEvent(e);

            await handlePaste();
        }
    }
};

defineExpose<EditListExpose<T>>({
    listRef,
    bodyRef,
    indexSelection,
    expandSelectionUpward,
    expandSelectionDownward,
    insert,
    remove,
    moveUpSelection,
    moveDownSelection,
});
</script>

<template>
    <div
        ref="listRef"
        class="edit-list"
        tabindex="-1"
        @keydown="handleKeyboardEvent"
        @mouseenter="focusList"
    >
        <slot
            name="head"
            :lines="lines"
        />

        <div
            ref="bodyRef"
            class="edit-list-body"
        >
            <div
                v-for="(item, index) in lines"
                :key="toKey(item, index)"
                @click="(e: MouseEvent) => handleItemClick(e, item, index)"
                class="line-wrapper"
                :class="isSelected(index) ? 'selected' : ''"
            >
                <slot
                    name="line"
                    :item="item"
                    :index="index"
                />
            </div>
        </div>

        <slot
            name="tail"
            :lines="lines"
        >
            <div
                ref="lastAddButtonRef"
                class="tail-add-button"
            >
                <button @click="() => insert(lines.length)">
                    <IconAdd />
                </button>
            </div>
        </slot>
    </div>
</template>

<style scoped>
.edit-list {
    color: var(--potmot-list--text-color);
    background-color: var(--potmot-list--bg-color);
}

.edit-list > .edit-list-body > .line-wrapper:hover {
    background-color: var(--potmot-list--bg-color--hover);
}

.edit-list > .edit-list-body > .line-wrapper.selected {
    background-color: var(--potmot-list--bg-color--selected);
}

.edit-list:focus {
    outline: 0;
}

.edit-list .tail-add-button {
    margin: auto;
    width: min(40%, 6em);
}

.edit-list .tail-add-button > button {
    cursor: pointer;
    width: 100%;
    outline: none;
    border: 1px solid var(--potmot-list--bg-color--hover);
    border-radius: 0.25rem;
    background-color: var(--potmot-list--bg-color);
}

.edit-list .tail-add-button > button:hover {
    background-color: var(--potmot-list--bg-color--hover);
}
</style>
