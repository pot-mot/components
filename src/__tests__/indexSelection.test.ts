import {vitest, describe, it, expect, beforeEach} from 'vitest';
import {useIndexSelection} from '@/utils/indexSelection';
import {isReadonly} from 'vue';

describe('useIndexSelection', () => {
    let indexSelection: ReturnType<typeof useIndexSelection>;

    beforeEach(() => {
        indexSelection = useIndexSelection();
    });

    describe('select', () => {
        it('应该选中单个索引', () => {
            indexSelection.select(5);

            expect(indexSelection.isSelected(5)).toBe(true);
            expect(indexSelection.lastSelect.value).toBe(5);
        });

        it('应该选中多个索引', () => {
            indexSelection.select([1, 2, 3]);

            expect(indexSelection.isSelected(1)).toBe(true);
            expect(indexSelection.isSelected(2)).toBe(true);
            expect(indexSelection.isSelected(3)).toBe(true);
            expect(indexSelection.lastSelect.value).toBe(3);
        });

        it('重复选中同一索引不应重复添加', () => {
            indexSelection.select(5);
            const sizeBefore = indexSelection.selectedSet.value.size;

            indexSelection.select(5);
            const sizeAfter = indexSelection.selectedSet.value.size;

            expect(sizeBefore).toBe(sizeAfter);
            expect(sizeAfter).toBe(1);
        });
    });

    describe('unselect', () => {
        it('应该取消选中单个索引', () => {
            indexSelection.select([1, 2, 3]);
            indexSelection.unselect(2);

            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(1)).toBe(true);
            expect(indexSelection.isSelected(3)).toBe(true);
        });

        it('应该取消选中多个索引', () => {
            indexSelection.select([1, 2, 3, 4]);
            indexSelection.unselect([2, 3]);

            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(3)).toBe(false);
            expect(indexSelection.isSelected(1)).toBe(true);
            expect(indexSelection.isSelected(4)).toBe(true);
        });

        it('取消选中 lastSelect 应该将其设为 undefined', () => {
            indexSelection.select([1, 2, 3]);
            expect(indexSelection.lastSelect.value).toBe(3);

            indexSelection.unselect(3);
            expect(indexSelection.lastSelect.value).toBeUndefined();
        });

        it('取消未选中的索引不应报错', () => {
            expect(() => indexSelection.unselect(5)).not.toThrow();
        });
    });

    describe('selectRange', () => {
        it('应该选中范围内的所有索引（从小到大）', () => {
            indexSelection.selectRange(2, 5);

            expect(indexSelection.isSelected(2)).toBe(true);
            expect(indexSelection.isSelected(3)).toBe(true);
            expect(indexSelection.isSelected(4)).toBe(true);
            expect(indexSelection.isSelected(5)).toBe(true);
            expect(indexSelection.isSelected(1)).toBe(false);
            expect(indexSelection.isSelected(6)).toBe(false);
        });

        it('应该选中范围内的所有索引（从大到小）', () => {
            indexSelection.selectRange(5, 2);

            expect(indexSelection.isSelected(2)).toBe(true);
            expect(indexSelection.isSelected(3)).toBe(true);
            expect(indexSelection.isSelected(4)).toBe(true);
            expect(indexSelection.isSelected(5)).toBe(true);
        });

        it('应该处理单个索引的范围', () => {
            indexSelection.selectRange(3, 3);

            expect(indexSelection.isSelected(3)).toBe(true);
            expect(indexSelection.selectedSet.value.size).toBe(1);
        });
    });

    describe('unselectRange', () => {
        it('应该取消范围内选中的所有索引（从小到大）', () => {
            indexSelection.select([1, 2, 3, 4, 5]);
            indexSelection.unselectRange(2, 4);

            expect(indexSelection.isSelected(1)).toBe(true);
            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(3)).toBe(false);
            expect(indexSelection.isSelected(4)).toBe(false);
            expect(indexSelection.isSelected(5)).toBe(true);
        });

        it('应该取消范围内选中的所有索引（从大到小）', () => {
            indexSelection.select([1, 2, 3, 4, 5]);
            indexSelection.unselectRange(4, 2);

            expect(indexSelection.isSelected(1)).toBe(true);
            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(3)).toBe(false);
            expect(indexSelection.isSelected(4)).toBe(false);
            expect(indexSelection.isSelected(5)).toBe(true);
        });

        it('取消未选中的范围不应报错', () => {
            expect(() => indexSelection.unselectRange(1, 5)).not.toThrow();
        });
    });

    describe('unselectAll', () => {
        it('应该取消所有选中的索引', () => {
            indexSelection.select([1, 2, 3]);
            indexSelection.unselectAll();

            expect(indexSelection.selectedSet.value.size).toBe(0);
            expect(indexSelection.isSelected(1)).toBe(false);
            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(3)).toBe(false);
            expect(indexSelection.lastSelect.value).toBeUndefined();
        });

        it('在空选择上调用不应报错', () => {
            expect(() => indexSelection.unselectAll()).not.toThrow();
        });
    });

    describe('resetSelection', () => {
        it('应该重置为新的索引集合', () => {
            indexSelection.select([1, 2, 3]);
            indexSelection.resetSelection([4, 5, 6]);

            expect(indexSelection.isSelected(1)).toBe(false);
            expect(indexSelection.isSelected(2)).toBe(false);
            expect(indexSelection.isSelected(3)).toBe(false);
            expect(indexSelection.isSelected(4)).toBe(true);
            expect(indexSelection.isSelected(5)).toBe(true);
            expect(indexSelection.isSelected(6)).toBe(true);
            expect(indexSelection.lastSelect.value).toBe(6);
        });

        it('应该处理空数组', () => {
            indexSelection.select([1, 2, 3]);
            indexSelection.resetSelection([]);

            expect(indexSelection.selectedSet.value.size).toBe(0);
            expect(indexSelection.lastSelect.value).toBeUndefined();
        });

        it('最后一个选中的索引应该是数组的最后一个元素', () => {
            indexSelection.resetSelection([10, 20, 30]);
            expect(indexSelection.lastSelect.value).toBe(30);
        });
    });

    describe('isSelected', () => {
        it('应该正确检查索引是否被选中', () => {
            indexSelection.select(5);

            expect(indexSelection.isSelected(5)).toBe(true);
            expect(indexSelection.isSelected(3)).toBe(false);
        });
    });

    describe('事件回调', () => {
        it('应该触发 onSelect 回调', () => {
            const selectCallback = vitest.fn();
            indexSelection.onSelect(selectCallback);

            indexSelection.select(5);

            expect(selectCallback).toHaveBeenCalledTimes(1);
            expect(selectCallback).toHaveBeenCalledWith(5);
        });

        it('应该触发多次 onSelect 回调当选择多个索引时', () => {
            const selectCallback = vitest.fn();
            indexSelection.onSelect(selectCallback);

            indexSelection.select([1, 2, 3]);

            expect(selectCallback).toHaveBeenCalledTimes(3);
            expect(selectCallback).toHaveBeenCalledWith(1);
            expect(selectCallback).toHaveBeenCalledWith(2);
            expect(selectCallback).toHaveBeenCalledWith(3);
        });

        it('应该触发 onUnselect 回调', () => {
            const unselectCallback = vitest.fn();
            indexSelection.onUnselect(unselectCallback);

            indexSelection.select(5);
            indexSelection.unselect(5);

            expect(unselectCallback).toHaveBeenCalledTimes(1);
            expect(unselectCallback).toHaveBeenCalledWith(5);
        });

        it('应该移除 onSelect 回调', () => {
            const selectCallback = vitest.fn();
            indexSelection.onSelect(selectCallback);
            indexSelection.offSelect(selectCallback);

            indexSelection.select(5);

            expect(selectCallback).not.toHaveBeenCalled();
        });

        it('应该移除 onUnselect 回调', () => {
            const unselectCallback = vitest.fn();
            indexSelection.onUnselect(unselectCallback);
            indexSelection.offUnselect(unselectCallback);

            indexSelection.select(5);
            indexSelection.unselect(5);

            expect(unselectCallback).not.toHaveBeenCalled();
        });

        it('应该支持多个回调', () => {
            const callback1 = vitest.fn();
            const callback2 = vitest.fn();

            indexSelection.onSelect(callback1);
            indexSelection.onSelect(callback2);

            indexSelection.select(5);

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe('selectedSet, lastSelect 的只读性', () => {
        it('selectedSet 应该是只读的', () => {
            expect(isReadonly(indexSelection.selectedSet.value)).toBe(true);
        });
        it('lastSelect 应该是只读的', () => {
            expect(isReadonly(indexSelection.lastSelect)).toBe(true);
        });
    });
});
