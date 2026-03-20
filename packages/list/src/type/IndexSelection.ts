import type {DeepReadonly, Ref} from 'vue';

export type IndexSelection = {
    /**
     * 当前选中项
     */
    readonly current: DeepReadonly<Ref<number | undefined>>;
    readonly setCurrent: (index: number | undefined) => void;

    /**
     * 已选中的项集合
     */
    readonly selectedSet: DeepReadonly<Ref<Set<number>>>;

    /**
     * 事件监听
     */
    readonly onSelect: (callback: (index: number) => void) => void;
    readonly offSelect: (callback: (index: number) => void) => void;
    readonly onUnselect: (callback: (index: number) => void) => void;
    readonly offUnselect: (callback: (index: number) => void) => void;

    /**
     * 判断指定项是否被选中
     * @param index 要检查的项
     * @returns 是否选中
     */
    readonly isSelected: (index: number) => boolean;

    /**
     * 选中指定项
     * @param index 要选中的项，传入多个时，current为最后一项
     */
    readonly select: (index: number | number[]) => void;
    readonly selectRange: (start: number, end: number) => void;

    /**
     * 取消选中指定项
     * @param index 要取消选中的项，如果取消选中包括current，current将变为undefined
     */
    readonly unselect: (index: number | number[]) => void;
    readonly unselectRange: (start: number, end: number) => void;
    readonly unselectAll: () => void;

    /**
     * 重置选中项为指定的项集合
     * @param indexes 新的选中项下标数组
     */
    readonly resetSelection: (indexes: number[]) => void;
    readonly resetSelectionRange: (start: number, end: number) => void;
};
