<script setup lang="ts" generic="T">
import {nextTick, onBeforeUnmount, onMounted, toRaw, useTemplateRef} from 'vue';
import type {EditListProps} from '@/type/ListProps.ts';
import type {EditListEmits} from '@/type/ListEmits.ts';
import {useIndexSelection} from '@/utils/indexSelection.ts';
import {useClickOutside} from '@/utils/useClickOutside.ts';
import IconAdd from '@/components/icons/IconAdd.vue';
import '@/style/list-variables.css';
import json5 from 'json5';
import {readText, writeText} from 'clipboard-polyfill';
import {cloneDeep} from 'lodash-es';
import {isTargetInteractive} from '@/utils/checkInteractive.ts';
import type {EditListExpose} from '@/type/ListExpose.ts';

const lines = defineModel<T[]>('lines', {
    required: true,
});
const props = defineProps<EditListProps<T>>();

const emits = defineEmits<EditListEmits<T>>();

const listRef = useTemplateRef<HTMLDivElement>('listRef');
const bodyRef = useTemplateRef<HTMLDivElement>('bodyRef');
const focusList = () => {
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
    lastSelect,
    selectedSet,
    isSelected,
    select,
    selectRange,
    unselect,
    unselectAll,
    resetSelection,
} = indexSelection;
useClickOutside(
    () => bodyRef.value,
    () => unselectAll(),
);

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
        if (lastSelect.value == undefined) {
            select(index);
            return;
        }
        selectRange(index, lastSelect.value);
    } else {
        if (!isTargetInteractive(e, props.interactiveClassNames ?? [])) {
            resetSelection([index]);
        }
    }
};

const handleKeyboardEvent = async (e: KeyboardEvent) => {
    if (isTargetInteractive(e, props.interactiveClassNames ?? [])) {
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

    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        unselectAll();
        lines.value = unselectedItems;
        emits('deleted', selectedItems);
    } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            resetSelection(Array.from(lines.value.keys()));
        } else if (e.key === 'c') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const copyData = cloneDeep(toRaw(selectedItems));
            props.beforeCopy?.(copyData);
            await writeText(JSON.stringify(copyData));
            props.afterCopy?.();
        } else if (e.key === 'x') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await writeText(JSON.stringify(selectedItems));
            unselectAll();
            lines.value = unselectedItems;
            emits('deleted', selectedItems);
        } else if (e.key === 'v') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

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
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (selectedSet.value.size === 0) return;

        if (e.shiftKey) {
            if (lastSelect.value !== undefined) {
                const minIndex = Math.min(...selectedSet.value);
                const maxIndex = Math.max(...selectedSet.value);
                if (minIndex === lastSelect.value) {
                    if (maxIndex - 1 >= 0) {
                        unselect(maxIndex);
                    }
                } else if (maxIndex === lastSelect.value) {
                    if (minIndex - 1 >= 0) {
                        select(minIndex - 1);
                    }
                }
            }
        } else {
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
            resetSelection([...newSelectIndexes, minIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (selectedSet.value.size === 0) return;

        if (e.shiftKey) {
            if (lastSelect.value !== undefined) {
                const minIndex = Math.min(...selectedSet.value);
                const maxIndex = Math.max(...selectedSet.value);
                if (minIndex === lastSelect.value) {
                    if (maxIndex + 1 < lines.value.length) {
                        select(maxIndex + 1);
                    }
                } else if (maxIndex === lastSelect.value) {
                    if (minIndex + 1 < lines.value.length) {
                        unselect(minIndex);
                    }
                }
            }
        } else {
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
            resetSelection([...newSelectIndexes, maxIndex]);
        }
    } else if (e.key === 'Enter' && selectedItems.length === 1 && lastSelect.value !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const index = lastSelect.value;
        await insert(index);
        resetSelection([index + 1]);
    }
};

const getDefaultLine = async (): Promise<T> => {
    let defaultLine: T;

    if (props.defaultLine instanceof Function) {
        const temp = props.defaultLine();
        if (temp instanceof Promise) {
            defaultLine = await temp;
        } else {
            defaultLine = temp;
        }
    } else {
        defaultLine = <T>props.defaultLine;
    }

    return cloneDeep(defaultLine);
};

const insert = async (index: number) => {
    const newItem = await getDefaultLine();

    lines.value.splice(index, 0, newItem);

    await nextTick();

    const newSelectedIndex: number[] = [];
    for (const i of selectedSet.value) {
        if (i >= index) {
            newSelectedIndex.push(i + 1);
        } else {
            newSelectedIndex.push(i);
        }
    }
    resetSelection(newSelectedIndex);

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

defineExpose<EditListExpose<T>>({
    listRef,
    bodyRef,
    indexSelection,
    insert,
    remove,
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
            <div class="tail-add-button">
                <button @click="insert(lines.length - 1)">
                    <IconAdd />
                </button>
            </div>
        </slot>
    </div>
</template>

<style scoped>
.edit-list > .edit-list-body > .line-wrapper {
    background-color: var(--list-line-bg-color);
}

.edit-list > .edit-list-body > .line-wrapper:hover {
    background-color: var(--list-line-hover-bg-color);
}

.edit-list > .edit-list-body > .line-wrapper.selected {
    background-color: var(--list-line-selected-bg-color);
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
    border-radius: 0.25rem;
    transition: border-color 0.2s ease;
}
</style>
