import {describe, it, expect, vi, beforeAll, afterAll} from 'vitest';
import {mount} from '@vue/test-utils';
import {h, nextTick} from 'vue';
import ViewList from '@/components/ViewList.vue';
import type {ViewListExpose} from '@/type/ListExpose.ts';

type TestItem = {
    id: string;
    name: string;
};

const createTestItems = (count: number): TestItem[] => {
    return Array.from({length: count}, (_, i) => ({
        id: `id-${i}`,
        name: `item ${i}`,
    }));
};

const toKey = (item: TestItem): string => {
    return item.id;
};

const mountViewList = (
    props: {
        lines?: TestItem[];
        toKey?: (item: TestItem, index: number) => string;
        interactiveClassNames?: string[];
        beforeCopy?: (data: TestItem[]) => void;
        afterCopy?: () => void;
    } = {},
    slots?: {
        line?: any;
        head?: any;
        tail?: any;
    },
) => {
    const defaultSlots: any = {
        line: ({item, index}: {item: TestItem; index: number}) =>
            h('div', {class: 'line-content'}, `${item.name}-${index}`),
        ...slots,
    };

    return mount(ViewList, {
        props: {
            lines: props.lines ?? [],
            toKey: props.toKey ?? toKey,
            interactiveClassNames: props.interactiveClassNames,
            beforeCopy: props.beforeCopy,
            afterCopy: props.afterCopy,
        },
        slots: defaultSlots,
        attachTo: document.body,
    });
};

describe('ViewList 组件', () => {
    describe('基础渲染', () => {
        it('应该能渲染空列表', () => {
            const wrapper = mountViewList({lines: []});
            expect(wrapper.findAll('.line-wrapper').length).toBe(0);
        });

        it('应该能渲染单个项目', () => {
            const items = createTestItems(1);
            const wrapper = mountViewList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
            expect(wrapper.find('.line-content').text()).toBe('item 0-0');
        });

        it('应该能渲染多个项目', () => {
            const items = createTestItems(5);
            const wrapper = mountViewList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(5);
        });

        it('应该使用 toKey 函数生成 key', async () => {
            const items = createTestItems(3);
            const customToKey = vi.fn(
                (item: TestItem, index: number) => `custom-${item.id}-${index}`,
            );

            mountViewList({lines: items, toKey: customToKey});

            expect(customToKey).toHaveBeenCalledTimes(3);
            expect(customToKey).toHaveBeenCalledWith(items[0], 0);
            expect(customToKey).toHaveBeenCalledWith(items[1], 1);
            expect(customToKey).toHaveBeenCalledWith(items[2], 2);
        });
    });

    describe('Props 测试', () => {
        it('应该接收 lines prop', () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});
            expect(wrapper.props('lines')).toStrictEqual(items);
        });

        it('应该接收 toKey prop', () => {
            const customToKey = vi.fn((_: TestItem, index: number) => `key-${index}`);
            const wrapper = mountViewList({lines: createTestItems(1), toKey: customToKey});
            expect(wrapper.props('toKey')).toBe(customToKey);
        });

        it('应该接收 interactiveClassNames prop', () => {
            const wrapper = mountViewList({
                lines: createTestItems(1),
                interactiveClassNames: ['interactive'],
            });
            expect(wrapper.props('interactiveClassNames')).toStrictEqual(['interactive']);
        });

        it('lines prop 更新时应该重新渲染', async () => {
            const wrapper = mountViewList({lines: createTestItems(2)});
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);

            const newItems = createTestItems(5);
            await wrapper.setProps({lines: newItems});

            expect(wrapper.findAll('.line-wrapper').length).toBe(5);
        });
    });

    describe('Slots 测试', () => {
        it('应该渲染 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('应该支持自定义 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountViewList(
                {lines: items},
                {
                    line: ({item}: {item: TestItem}) =>
                        h('div', {class: 'custom-line'}, `Custom: ${item.name}`),
                },
            );

            const customLines = wrapper.findAll('.custom-line');
            expect(customLines.length).toBe(2);
            expect(customLines[0].text()).toBe('Custom: item 0');
            expect(customLines[1].text()).toBe('Custom: item 1');
        });

        it('应该渲染 head slot', () => {
            const wrapper = mountViewList(
                {lines: createTestItems(2)},
                {
                    head: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'head-slot'}, `Head: ${lines.length} items`),
                },
            );

            expect(wrapper.find('.head-slot').exists()).toBe(true);
            expect(wrapper.find('.head-slot').text()).toBe('Head: 2 items');
        });

        it('应该渲染 tail slot', () => {
            const wrapper = mountViewList(
                {lines: createTestItems(2)},
                {
                    tail: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'tail-slot'}, `Tail: ${lines.length} items`),
                },
            );

            expect(wrapper.find('.tail-slot').exists()).toBe(true);
            expect(wrapper.find('.tail-slot').text()).toBe('Tail: 2 items');
        });

        it('应该支持所有 slots 同时存在', () => {
            const wrapper = mountViewList(
                {lines: createTestItems(2)},
                {
                    head: () => h('div', {class: 'head'}, 'Head'),
                    line: ({item}: {item: TestItem}) => h('div', {class: 'line'}, item.name),
                    tail: () => h('div', {class: 'tail'}, 'Tail'),
                },
            );

            expect(wrapper.find('.head').exists()).toBe(true);
            expect(wrapper.findAll('.line').length).toBe(2);
            expect(wrapper.find('.tail').exists()).toBe(true);
        });
    });

    describe('Emits 测试', () => {
        it('应该在点击项目时触发 clickItem 事件', async () => {
            const items = createTestItems(1);
            const wrapper = mountViewList({lines: items});

            await wrapper.find('.line-wrapper').trigger('click');

            expect(wrapper.emitted('clickItem')).toBeDefined();
            expect(wrapper.emitted('clickItem')).toHaveLength(1);
        });

        it('应该在点击项目时传递正确的参数', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');

            const emitted = wrapper.emitted('clickItem')![0];
            expect(emitted[0]).toBeInstanceOf(MouseEvent);
            expect(emitted[1]).toStrictEqual(items[1]);
            expect(emitted[2]).toBe(1);
        });

        it('应该在使用 Ctrl/Cmd 键选择时触发 selected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('selected')).toBeDefined();
            expect(wrapper.emitted('selected')).toHaveLength(1);
            expect(wrapper.emitted('selected')![0][0]).toStrictEqual(items[0]);
            expect(wrapper.emitted('selected')![0][1]).toBe(0);
        });

        it('应该在使用 Ctrl/Cmd 键取消选择时触发 unselected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            // 先选中
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            expect(wrapper.findAll('.line-wrapper')[0].classes()).toContain('selected');

            // 再取消选中
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('unselected')).toBeDefined();
            expect(wrapper.emitted('unselected')![0][0]).toStrictEqual(items[0]);
            expect(wrapper.emitted('unselected')![0][1]).toBe(0);
        });

        it('应该在使用 Shift 键范围选择时触发 selected 事件', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});

            // 点击第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {shiftKey: true});
            // Shift+ 点击第三个
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {shiftKey: true});

            expect(wrapper.emitted('selected')).toBeDefined();
            expect(wrapper.emitted('selected')).toHaveLength(3); // 0, 1, 2 都被选中
        });

        it('普通点击应该重置选择并触发 selected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            // 先选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            expect(wrapper.emitted('selected')).toHaveLength(1);
            expect(wrapper.emitted('selected')![0][0]).toStrictEqual(items[0]);

            // 普通点击第二个，应该重置选择
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            expect(wrapper.emitted('selected')).toHaveLength(2);
            expect(wrapper.emitted('selected')![1][0]).toStrictEqual(items[1]);
        });
    });

    describe('键盘事件测试', () => {
        it('应该支持 Ctrl+A 全选', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});

            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(3);
        });

        it('应该支持方向键导航', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});

            // 先点击第一个获得焦点
            await wrapper.findAll('.line-wrapper')[0].trigger('click');

            // 按向下键
            await wrapper.trigger('keydown', {key: 'ArrowDown'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
        });

        it('应该支持 Shift+ 方向键扩展选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountViewList({lines: items});

            // 点击第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            // Shift+ 向下
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });

        it('应该在非交互元素上响应键盘事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({
                lines: items,
                interactiveClassNames: ['interactive'],
            });

            // 直接在组件上触发键盘事件（不在交互式元素上）
            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            // 应该触发全选
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });
    });

    describe('Expose API 测试', () => {
        it('应该能访问 bodyRef', async () => {
            const wrapper = mountViewList({lines: createTestItems(1)});
            await nextTick();
            const vm = wrapper.vm as ViewListExpose;
            expect(vm.bodyRef).toBeDefined();
        });

        it('应该能访问 indexSelection', async () => {
            const wrapper = mountViewList({lines: createTestItems(2)});
            await nextTick();
            const vm = wrapper.vm as ViewListExpose;
            expect(vm.indexSelection).toBeDefined();
            expect(typeof vm.indexSelection.select).toBe('function');
            expect(typeof vm.indexSelection.unselect).toBe('function');
        });

        it('应该能通过组件实例操作选择状态', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});
            await nextTick();

            const vm = wrapper.vm as ViewListExpose;
            vm.indexSelection.select(1);
            await nextTick();

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
        });
    });

    describe('beforeCopy 和 afterCopy 回调', () => {
        beforeAll(() => {
            // Mock clipboard module
            vi.mock('clipboard-polyfill', async (importOriginal) => {
                const actual = await importOriginal<any>();
                return {
                    ...actual,
                    writeText: vi.fn().mockResolvedValue(undefined),
                };
            });
        });

        afterAll(() => {
            vi.restoreAllMocks();
        });

        it('应该在复制前调用 beforeCopy', async () => {
            const beforeCopySpy = vi.fn();
            const items = createTestItems(2);
            const wrapper = mountViewList({
                lines: items,
                beforeCopy: beforeCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(beforeCopySpy).toHaveBeenCalled();
        });

        it('应该在复制后调用 afterCopy', async () => {
            const afterCopySpy = vi.fn();
            const items = createTestItems(2);
            const wrapper = mountViewList({
                lines: items,
                afterCopy: afterCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(afterCopySpy).toHaveBeenCalled();
        });

        it('beforeCopy 应该接收到深拷贝的数据', async () => {
            const items = createTestItems(2);
            let copiedData: TestItem[] | undefined;
            const beforeCopySpy = vi.fn((data) => {
                copiedData = data;
            });

            const wrapper = mountViewList({
                lines: items,
                beforeCopy: beforeCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});
            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(copiedData).toStrictEqual(items);
            expect(copiedData).not.toBe(items); // 应该是不同的引用
        });
    });

    describe('焦点管理', () => {
        it('应该能在鼠标悬停时聚焦列表', async () => {
            const wrapper = mountViewList({lines: createTestItems(2)});

            await wrapper.find('.view-list').trigger('mouseenter');

            expect(document.activeElement).toBe(wrapper.find('.view-list').element);
        });

        it('应该能通过 focusList 方法手动聚焦', async () => {
            const wrapper = mountViewList({lines: createTestItems(1)});
            await nextTick();

            const vm = wrapper.vm as any;
            vm.focusList();
            await nextTick();

            expect(document.activeElement).toBe(wrapper.find('.view-list').element);
        });
    });

    describe('键盘导航 - ArrowUp', () => {
        it('应该支持 ArrowUp 向上导航', async () => {
            const items = createTestItems(3);
            const wrapper = mountViewList({lines: items});

            // 先点击第三个获得焦点
            await wrapper.findAll('.line-wrapper')[2].trigger('click');

            // 按向上键
            await wrapper.trigger('keydown', {key: 'ArrowUp'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
        });

        it('应该处理 ArrowUp 在第一个项目时的边界情况', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            // 先点击第一个获得焦点
            await wrapper.findAll('.line-wrapper')[0].trigger('click');

            // 按向上键，应该保持在第一个
            await wrapper.trigger('keydown', {key: 'ArrowUp'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('应该支持 Shift+ArrowUp 扩展选择到上方', async () => {
            const items = createTestItems(4);
            const wrapper = mountViewList({lines: items});

            // 先点击第三个 (index 2) 作为 lastSelect
            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            // 现在 lastSelect = 2, selectedSet = {2}

            // Shift+ 按向上键，minIndex=2, maxIndex=2, lastSelect=2
            // minIndex === lastSelect, 所以如果 maxIndex-1 >= 0, unselect(maxIndex)
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            // 根据实现逻辑，应该会取消选择 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(0);
        });

        it('应该支持 Shift+ArrowUp 收缩选择从下方', async () => {
            const items = createTestItems(4);
            const wrapper = mountViewList({lines: items});

            // 选中第一个、第二个、第三个 (0, 1, 2)
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[1].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});

            // lastSelect 是 2 (maxIndex), Shift+ArrowUp 应该取消选择 maxIndex
            // minIndex=0, maxIndex=2, lastSelect=2
            // maxIndex === lastSelect, 所以如果 minIndex-1 >= 0, select(minIndex-1)
            // minIndex-1 = -1, 不满足条件，什么都不做
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(3);
        });
    });

    describe('键盘导航 - ArrowDown', () => {
        it('应该支持 Shift+ArrowDown 扩展选择到下方', async () => {
            const items = createTestItems(4);
            const wrapper = mountViewList({lines: items});

            // 先选中第二个 (index 1)
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // Shift+ 按向下键扩展到第三个
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-2');
        });

        it('应该支持 Shift+ArrowDown 收缩选择从上方', async () => {
            const items = createTestItems(4);
            const wrapper = mountViewList({lines: items});

            // 选中第一个、第二个、第三个 (0, 1, 2)
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[1].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});

            // lastSelect 是 2 (minIndex == maxIndex), Shift+ArrowDown 应该取消选择 minIndex
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-2');
        });

        it('应该处理 ArrowDown 在最后一个项目时的边界情况', async () => {
            const items = createTestItems(2);
            const wrapper = mountViewList({lines: items});

            // 先点击最后一个获得焦点
            await wrapper.findAll('.line-wrapper')[1].trigger('click');

            // 按向下键，应该保持在最后一个
            await wrapper.trigger('keydown', {key: 'ArrowDown'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
        });
    });

    describe('交互式元素处理', () => {
        it('应该忽略交互式元素上的键盘事件', async () => {
            const wrapper = mountViewList({
                lines: createTestItems(2),
                interactiveClassNames: ['interactive'],
            });

            // 直接在组件上触发键盘事件（不在交互式元素上）
            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            // 应该触发全选
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });
    });

    describe('生命周期钩子', () => {
        it('应该在组件卸载时清理事件监听', async () => {
            const wrapper = mountViewList({lines: createTestItems(2)});
            await nextTick();

            // 先选中一个项目
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            expect(wrapper.findAll('.line-wrapper.selected').length).toBe(1);

            // 卸载组件
            wrapper.unmount();

            // 不应该有错误，事件监听器已被清理
        });
    });
});
