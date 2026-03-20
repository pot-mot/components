<script setup lang="ts" generic="T">
import {useIndexSelection} from '@/utils/indexSelection.ts';
import {useClickOutside} from '@/utils/useClickOutside.ts';
import {onBeforeUnmount, onMounted, toRaw, useTemplateRef} from 'vue';
import '@/style/list-variables.css';
import {writeText} from 'clipboard-polyfill';
import {cloneDeep} from 'lodash-es';
import {isInteractiveElement, isTargetInteractive} from '@/utils/checkInteractive.ts';
import type {ViewListExpose} from '@/type/ListExpose.ts';

const props = withDefaults(
    defineProps<{
        lines: T[];
        toKey: (line: T, index: number) => string;
        interactiveClassNames?: string[];
        beforeCopy?: (data: T[]) => void;
        afterCopy?: () => void;
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
}>();

const listRef = useTemplateRef<HTMLDivElement>('listRef');
const bodyRef = useTemplateRef<HTMLDivElement>('bodyRef');
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
    const item = props.lines[index];
    if (item !== undefined) {
        emits('selected', item, index);
    }
};
const onUnselect = (index: number) => {
    const item = props.lines[index];
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
        unselectAll();
        emits('clickOutside', e);
    },
);

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
        if (maxIndex + 1 < props.lines.length) resetSelectionRange(minIndex, maxIndex + 1);
    } else if (maxIndex === oldCurrent) {
        if (minIndex + 1 < props.lines.length) resetSelectionRange(minIndex + 1, maxIndex);
    }
    setCurrent(oldCurrent);
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

    for (const [index, item] of props.lines.entries()) {
        if (selectedSet.value.has(index)) {
            selectedItems.push(item);
        }
    }

    if (e.key === 'ArrowUp') {
        prepareKeyboardEvent(e);

        if (e.shiftKey) {
            expandSelectionUpward();
        } else if (current.value !== undefined && current.value - 1 >= 0) {
            resetSelection([current.value - 1]);
        }
    } else if (e.key === 'ArrowDown') {
        prepareKeyboardEvent(e);

        if (e.shiftKey) {
            expandSelectionDownward();
        } else if (current.value !== undefined && current.value + 1 < props.lines.length) {
            resetSelection([current.value + 1]);
        }
    } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
            prepareKeyboardEvent(e);

            resetSelection(Array.from(props.lines.keys()));
        } else if (e.key === 'c') {
            prepareKeyboardEvent(e);

            const copyData = cloneDeep(toRaw(selectedItems));
            props.beforeCopy?.(copyData);
            await writeText(JSON.stringify(copyData));
            props.afterCopy?.();
        }
    }
};

defineExpose<ViewListExpose>({
    listRef,
    bodyRef,
    indexSelection,
    expandSelectionUpward,
    expandSelectionDownward,
});
</script>

<template>
    <div
        ref="listRef"
        class="view-list"
        tabindex="-1"
        @keydown="handleKeyboardEvent"
        @mouseenter="focusList"
    >
        <div
            ref="bodyRef"
            class="view-list-body"
        >
            <slot
                name="head"
                :lines="lines"
            />

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

            <slot
                name="tail"
                :lines="lines"
            />
        </div>
    </div>
</template>

<style scoped>
.view-list {
    color: var(--potmot-list--text-color);
    background-color: var(--potmot-list--bg-color);
}

.view-list > .view-list-body > .line-wrapper:hover {
    background-color: var(--potmot-list--bg-color--hover);
}

.view-list > .view-list-body > .line-wrapper.selected {
    background-color: var(--potmot-list--bg-color--selected);
}

.view-list:focus {
    outline: 0;
}
</style>
