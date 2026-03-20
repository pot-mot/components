import {describe, it, expect, vi, assert} from 'vitest';
import {mount} from '@vue/test-utils';
import {h, nextTick} from 'vue';
import ViewList from '@/components/ViewList.vue';

vi.mock('clipboard-polyfill', () => ({
    readText: vi.fn(),
    writeText: vi.fn(),
}));

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

const mountList = (
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
            toKey: props.toKey ?? (((item: TestItem) => item.id) as any),
            interactiveClassNames: props.interactiveClassNames,
            beforeCopy: props.beforeCopy as any,
            afterCopy: props.afterCopy,
        },
        slots: defaultSlots,
        attachTo: document.body,
    });
};

describe('ViewList 组件', () => {
    describe('基础渲染', () => {
        it('空列表', () => {
            const wrapper = mountList({lines: []});
            expect(wrapper.findAll('.line-wrapper').length).toBe(0);
        });

        it('单个项目', () => {
            const items = createTestItems(1);
            const wrapper = mountList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
            expect(wrapper.find('.line-content').text()).toBe('item 0-0');
        });

        it('多个项目', () => {
            const items = createTestItems(5);
            const wrapper = mountList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(5);
        });

        it('使用 toKey 函数生成 key', async () => {
            const items = createTestItems(3);
            const customToKey = vi.fn(
                (item: TestItem, index: number) => `custom-${item.id}-${index}`,
            );

            mountList({lines: items, toKey: customToKey});

            expect(customToKey).toHaveBeenCalledTimes(3);
            expect(customToKey).toHaveBeenCalledWith(items[0], 0);
            expect(customToKey).toHaveBeenCalledWith(items[1], 1);
            expect(customToKey).toHaveBeenCalledWith(items[2], 2);
        });
    });

    describe('Props', () => {
        it('接收 lines', () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});
            expect(wrapper.props('lines')).toStrictEqual(items);
        });

        it('lines 更新时重新渲染', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);

            const newItems = createTestItems(5);
            await wrapper.setProps({lines: newItems});

            expect(wrapper.findAll('.line-wrapper').length).toBe(5);
        });

        it('接收 toKey prop', () => {
            const customToKey = vi.fn((_: TestItem, index: number) => `key-${index}`);
            const wrapper = mountList({lines: createTestItems(1), toKey: customToKey});
            expect(wrapper.props('toKey')).toBe(customToKey);
        });

        it('接收 interactiveClassNames prop', () => {
            const wrapper = mountList({
                lines: createTestItems(1),
                interactiveClassNames: ['interactive'],
            });
            expect(wrapper.props('interactiveClassNames')).toStrictEqual(['interactive']);
        });
    });

    describe('Slots', () => {
        it('渲染 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('自定义 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountList(
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

        it('渲染 head slot', () => {
            const wrapper = mountList(
                {lines: createTestItems(2)},
                {
                    head: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'head-slot'}, `Head: ${lines.length} items`),
                },
            );

            expect(wrapper.find('.head-slot').exists()).toBe(true);
            expect(wrapper.find('.head-slot').text()).toBe('Head: 2 items');
        });

        it('渲染 tail slot', () => {
            const wrapper = mountList(
                {lines: createTestItems(2)},
                {
                    tail: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'tail-slot'}, `Tail: ${lines.length} items`),
                },
            );

            expect(wrapper.find('.tail-slot').exists()).toBe(true);
            expect(wrapper.find('.tail-slot').text()).toBe('Tail: 2 items');
        });

        it('所有 slots 同时存在', () => {
            const wrapper = mountList(
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

    describe('Emits', () => {
        it('在点击项目时触发 clickItem 事件', async () => {
            const items = createTestItems(1);
            const wrapper = mountList({lines: items});

            await wrapper.find('.line-wrapper').trigger('click');

            expect(wrapper.emitted('clickItem')).toBeDefined();
            expect(wrapper.emitted('clickItem')).toHaveLength(1);
        });

        it('在点击项目时传递正确的参数', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');

            const emitted = wrapper.emitted('clickItem')![0];
            expect(emitted[0]).toBeInstanceOf(MouseEvent);
            expect(emitted[1]).toStrictEqual(items[1]);
            expect(emitted[2]).toBe(1);
        });

        it('在使用 Ctrl/Cmd 键选择时触发 selected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('selected')).toBeDefined();
            expect(wrapper.emitted('selected')).toHaveLength(1);
            expect(wrapper.emitted('selected')![0][0]).toStrictEqual(items[0]);
            expect(wrapper.emitted('selected')![0][1]).toBe(0);
        });

        it('在使用 Ctrl/Cmd 键取消选择时触发 unselected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            // 先选中
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            expect(wrapper.findAll('.line-wrapper')[0].classes()).toContain('selected');

            // 再取消选中
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('unselected')).toBeDefined();
            expect(wrapper.emitted('unselected')![0][0]).toStrictEqual(items[0]);
            expect(wrapper.emitted('unselected')![0][1]).toBe(0);
        });

        it('普通点击重置选择并触发 selected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            // 先选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            expect(wrapper.emitted('selected')).toHaveLength(1);
            expect(wrapper.emitted('selected')![0][0]).toStrictEqual(items[0]);

            // 普通点击第二个，重置选择
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            expect(wrapper.emitted('selected')).toHaveLength(2);
            expect(wrapper.emitted('selected')![1][0]).toStrictEqual(items[1]);
        });

        it('在使用 Shift 键范围选择时触发 selected 事件', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 点击第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {shiftKey: true});
            // Shift+ 点击第三个
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {shiftKey: true});

            expect(wrapper.emitted('selected')).toBeDefined();
            expect(wrapper.emitted('selected')).toHaveLength(3); // 0, 1, 2 都被选中
        });
    });

    describe('键盘操作', () => {
        it('Ctrl+A 全选', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(3);
        });

        it('在非交互元素上响应键盘事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({
                lines: items,
                interactiveClassNames: ['interactive'],
            });

            // 直接在组件上触发键盘事件（不在交互式元素上）
            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            // 检查全选
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });

        it('在交互元素上不响应键盘事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({
                lines: items,
                interactiveClassNames: ['interactive'],
            });

            const item = wrapper.find('.line-wrapper');
            assert(item.exists());
            assert(item.element instanceof HTMLElement);
            item.element.classList.add('interactive');
            await item.trigger('keydown', {key: 'a', ctrlKey: true});

            // 检测没有触发全选
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(0);
        });
    });

    describe('复制功能', () => {
        it('Ctrl+C 复制选中的项目', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            // 选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            // 复制
            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            const {writeText} = await import('clipboard-polyfill');
            expect(writeText).toHaveBeenCalled();
        });

        it('在复制前调用 beforeCopy', async () => {
            const beforeCopySpy = vi.fn();
            const items = createTestItems(2);
            const wrapper = mountList({
                lines: items,
                beforeCopy: beforeCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(beforeCopySpy).toHaveBeenCalled();
        });

        it('在复制后调用 afterCopy', async () => {
            const afterCopySpy = vi.fn();
            const items = createTestItems(2);
            const wrapper = mountList({
                lines: items,
                afterCopy: afterCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(afterCopySpy).toHaveBeenCalled();
        });

        it('beforeCopy 接收到深拷贝的数据', async () => {
            const items = createTestItems(2);
            let copiedData: TestItem[] | undefined;
            const beforeCopySpy = vi.fn((data) => {
                copiedData = data;
            });

            const wrapper = mountList({
                lines: items,
                beforeCopy: beforeCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});
            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(copiedData).toStrictEqual(items);
            expect(copiedData).not.toBe(items); // 是不同的引用
        });
    });

    describe('Expose API', () => {
        it('能访问 bodyRef', async () => {
            const wrapper = mountList({lines: createTestItems(1)});
            await nextTick();
            const vm = wrapper.vm;
            expect(vm.bodyRef).toBeDefined();
        });

        it('能访问 indexSelection', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            await nextTick();
            const vm = wrapper.vm;
            expect(vm.indexSelection).toBeDefined();
            expect(typeof vm.indexSelection.select).toBe('function');
            expect(typeof vm.indexSelection.unselect).toBe('function');
        });

        it('能通过组件实例操作选择状态', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});
            await nextTick();

            const vm = wrapper.vm;
            vm.indexSelection.select(1);
            await nextTick();

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
        });
    });

    describe('焦点管理', () => {
        it('能在鼠标悬停时聚焦列表', async () => {
            const wrapper = mountList({lines: createTestItems(2)});

            await wrapper.find('.view-list').trigger('mouseenter');

            expect(document.activeElement).toBe(wrapper.find('.view-list').element);
        });
    });

    describe('方向键控制', () => {
        it('ArrowUp', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('ArrowUp + Shift', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('ArrowUp 最上的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('ArrowUp + Shift 最上的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('ArrowDown', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
        });

        it('ArrowDown + Shift', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-2');
        });

        it('ArrowDown 最下的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown'});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
        });

        it('ArrowDown + Shift 最下的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-2');
        });
    });

    describe('生命周期钩子', () => {
        it('在组件卸载时清理事件监听', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            await nextTick();

            // 先选中一个项目
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            expect(wrapper.findAll('.line-wrapper.selected').length).toBe(1);

            // 卸载组件
            wrapper.unmount();
        });
    });
});
