import type {Ref} from 'vue';
import type {IndexSelection} from '@/type/IndexSelection.ts';

/**
 * ViewList 组件暴露的 API
 */
export interface ViewListExpose {
    listRef: Ref<HTMLDivElement | null>;
    bodyRef: Ref<HTMLDivElement | null>;

    indexSelection: IndexSelection;

    /**
     * 向上扩充选中区间
     */
    expandSelectionUpward: () => void;
    /**
     * 向下扩充选中区间
     */
    expandSelectionDownward: () => void;
}

/**
 * EditList 组件暴露的 API
 */
export interface EditListExpose<T> extends ViewListExpose {
    /**
     * 在指定位置添加新行
     * @param index 插入位置的索引
     * @returns 新行的索引
     */
    insert: (index: number) => Promise<T>;

    /**
     * 删除指定位置的行
     * @param index 要删除的行索引
     */
    remove: (index: number) => Promise<T | undefined>;

    /**
     * 向上移动选中项
     */
    moveUpSelection: () => Promise<void>;

    /**
     * 向下移动选中项
     */
    moveDownSelection: () => Promise<void>;
}
