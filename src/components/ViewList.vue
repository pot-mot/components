<script setup lang="ts" generic="T">
import type {ViewListProps} from '@/type/ListProps.ts';
import type {ViewListEmits} from '@/type/ListEmits.ts';
import {useIndexSelection} from '@/utils/indexSelection.ts';
import {useClickOutside} from '@/utils/useClickOutside.ts';
import {onBeforeUnmount, onMounted, toRaw, useTemplateRef} from 'vue';
import '@/style/list-variables.css';
import {writeText} from 'clipboard-polyfill';
import {cloneDeep} from 'lodash-es';
import {isTargetInteractive} from '@/utils/checkInteractive.ts';
import type {ViewListExpose} from '@/type/ListExpose.ts';

const props = defineProps<ViewListProps<T>>();

const emits = defineEmits<ViewListEmits<T>>();

const listRef = useTemplateRef<HTMLDivElement>('listRef');
const bodyRef = useTemplateRef<HTMLDivElement>('bodyRef');
const focusList = () => {
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

    for (const [index, item] of props.lines.entries()) {
        if (selectedSet.value.has(index)) {
            selectedItems.push(item);
        }
    }

    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            resetSelection(Array.from(props.lines.keys()));
        } else if (e.key === 'c') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const copyData = cloneDeep(toRaw(selectedItems));
            props.beforeCopy?.(copyData);
            await writeText(JSON.stringify(copyData));
            props.afterCopy?.();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.shiftKey) {
            if (selectedSet.value.size > 0 && lastSelect.value !== undefined) {
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
        } else if (lastSelect.value !== undefined && lastSelect.value - 1 >= 0) {
            resetSelection([lastSelect.value - 1]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.shiftKey) {
            if (selectedSet.value.size > 0 && lastSelect.value !== undefined) {
                const minIndex = Math.min(...selectedSet.value);
                const maxIndex = Math.max(...selectedSet.value);
                if (minIndex === lastSelect.value) {
                    if (maxIndex + 1 < props.lines.length) {
                        select(maxIndex + 1);
                    }
                } else if (maxIndex === lastSelect.value) {
                    if (minIndex + 1 < props.lines.length) {
                        unselect(minIndex);
                    }
                }
            }
        } else if (lastSelect.value !== undefined && lastSelect.value + 1 < props.lines.length) {
            resetSelection([lastSelect.value + 1]);
        }
    }
};

defineExpose<ViewListExpose>({
    listRef,
    bodyRef,
    indexSelection,
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
.view-list > .view-list-body > .line-wrapper {
    background-color: var(--list-line-bg-color);
}

.view-list > .view-list-body > .line-wrapper:hover {
    background-color: var(--list-line-hover-bg-color);
}

.view-list > .view-list-body > .line-wrapper.selected {
    background-color: var(--list-line-selected-bg-color);
}

.view-list:focus {
    outline: 0;
}
</style>
