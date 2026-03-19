import type {DeepReadonly, Ref} from 'vue';

export type IndexSelection = {
    readonly onSelect: (callback: (index: number) => void) => void;
    readonly offSelect: (callback: (index: number) => void) => void;
    readonly onUnselect: (callback: (index: number) => void) => void;
    readonly offUnselect: (callback: (index: number) => void) => void;

    /**
     * 最后一次选中的项索引
     */
    readonly lastSelect: DeepReadonly<Ref<number | undefined>>;

    /**
     * 已选中的项集合
     */
    readonly selectedSet: DeepReadonly<Ref<Set<number>>>;

    /**
     * 选中指定项
     * @param index 要选中的项
     */
    readonly select: (index: number | number[]) => void;
    readonly selectRange: (start: number, end: number) => void;

    /**
     * 取消选中指定项
     * @param index 要取消选中的项
     */
    readonly unselect: (index: number | number[]) => void;
    readonly unselectRange: (start: number, end: number) => void;
    readonly unselectAll: () => void;

    /**
     * 重置选中项为指定的项集合
     * @param indexes 新的选中项下标数组
     */
    readonly resetSelection: (indexes: number[]) => void;

    /**
     * 判断指定项是否被选中
     * @param index 要检查的项
     * @returns 是否选中
     */
    readonly isSelected: (index: number) => boolean;
};
