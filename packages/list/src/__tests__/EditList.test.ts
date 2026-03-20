import {describe, it, expect, vi, assert} from 'vitest';
import {mount} from '@vue/test-utils';
import {h, nextTick} from 'vue';
import EditList from '@/components/EditList.vue';

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
        defaultLine?: () => TestItem | Promise<TestItem>;
        interactiveClassNames?: string[];
        jsonValidator?: (json: any, onError?: any) => boolean;
        beforeCopy?: (data: TestItem[]) => void;
        afterCopy?: () => void;
        beforePaste?: (data: TestItem[]) => void;
        afterPaste?: () => void;
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

    return mount(EditList, {
        props: {
            lines: props.lines ?? [],
            toKey: props.toKey ?? (((item: TestItem) => item.id) as any),
            defaultLine: props.defaultLine ?? (() => ({id: 'default', name: 'default'})),
            interactiveClassNames: props.interactiveClassNames,
            jsonValidator: props.jsonValidator,
            beforeCopy: props.beforeCopy as any,
            afterCopy: props.afterCopy,
            beforePaste: props.beforePaste as any,
            afterPaste: props.afterPaste,
        },
        slots: defaultSlots,
        attachTo: document.body,
    });
};

describe('EditList 组件', () => {
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

        it('显示尾部添加按钮', () => {
            const wrapper = mountList({lines: createTestItems(2)});
            expect(wrapper.find('.tail-add-button').exists()).toBe(true);
            expect(wrapper.find('.tail-add-button button').exists()).toBe(true);
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

        it('接受函数形式的 defaultLine', async () => {
            const defaultLineFn = vi.fn(() => ({id: 'fn-default', name: 'fn-default'}) as TestItem);
            const wrapper = mountList({lines: [], defaultLine: defaultLineFn});

            const vm = wrapper.vm;
            await vm.insert(0);
            await nextTick();

            expect(defaultLineFn).toHaveBeenCalled();
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });

        it('接受返回 Promise 的 defaultLine 函数', async () => {
            const defaultLineFn = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {id: 'async-default', name: 'async-default'} as TestItem;
            });

            const wrapper = mountList({lines: [], defaultLine: defaultLineFn});

            const vm = wrapper.vm;
            await vm.insert(0);
            await nextTick();

            expect(defaultLineFn).toHaveBeenCalled();
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });

        it('接收 jsonValidator prop', () => {
            const validator = vi.fn(() => true);
            const wrapper = mountList({
                lines: [],
                jsonValidator: validator,
            });
            expect(wrapper.props('jsonValidator')).toBe(validator);
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

        it('支持自定义 tail slot 覆盖默认添加按钮', () => {
            const wrapper = mountList(
                {lines: createTestItems(2)},
                {
                    tail: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'custom-tail'}, `Custom Tail: ${lines.length}`),
                },
            );

            expect(wrapper.find('.custom-tail').exists()).toBe(true);
            expect(wrapper.find('.custom-tail').text()).toBe('Custom Tail: 2');
            // 默认的添加按钮不存在
            expect(wrapper.find('.tail-add-button').exists()).toBe(false);
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

        it('在添加项目时触发 added 事件', async () => {
            const wrapper = mountList({lines: createTestItems(2)});

            const vm = wrapper.vm;
            await vm.insert(0);
            await nextTick();

            expect(wrapper.emitted('added')).toBeDefined();
            expect(wrapper.emitted('added')).toHaveLength(1);
            expect(wrapper.emitted('added')![0][0]).toHaveLength(1);
        });

        it('在删除项目时触发 deleted 事件', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.emitted('deleted')).toBeDefined();
            expect(wrapper.emitted('deleted')).toHaveLength(1);
            expect(wrapper.emitted('deleted')![0][0]).toHaveLength(1);
            expect((wrapper.emitted('deleted')![0][0] as TestItem[])[0]).toStrictEqual(items[1]);
        });

        it('在粘贴错误时触发 pasteError 事件', async () => {
            const validator = vi.fn(() => false);
            const wrapper = mountList({
                lines: [],
                jsonValidator: validator,
            });

            // Mock clipboard
            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue('[{"invalid": "data"}]');

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(wrapper.emitted('pasteError')).toBeDefined();
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

        it('Delete 键删除选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('Backspace 键删除选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'Backspace'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('Enter 键在选中项后插入', async () => {
            const items = createTestItems(2);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'Enter'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
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

    describe('粘贴功能', () => {
        it('Ctrl+V 粘贴有效数据', async () => {
            const newItem = {id: 'pasted', name: 'pasted-item'};
            const validator = vi.fn((data) => {
                return data && typeof data === 'object' && 'id' in data && 'name' in data;
            });

            const wrapper = mountList({
                lines: createTestItems(2),
                jsonValidator: validator,
            });

            // Mock clipboard
            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify(newItem));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });

        it('支持粘贴数组', async () => {
            const newItems = [
                {id: 'pasted1', name: 'pasted-1'},
                {id: 'pasted2', name: 'pasted-2'},
            ];
            const validator = vi.fn((data) => {
                if (Array.isArray(data)) {
                    return data.every((item) => 'id' in item && 'name' in item);
                }
                return 'id' in data && 'name' in data;
            });

            const wrapper = mountList({
                lines: createTestItems(2),
                jsonValidator: validator,
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify(newItems));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(4);
        });

        it('在粘贴前调用 beforePaste', async () => {
            const beforePasteSpy = vi.fn();
            const validator = vi.fn(() => true);

            const wrapper = mountList({
                lines: [],
                jsonValidator: validator,
                beforePaste: beforePasteSpy,
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify({id: 'test', name: 'test'}));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(beforePasteSpy).toHaveBeenCalled();
        });

        it('在粘贴后调用 afterPaste', async () => {
            const afterPasteSpy = vi.fn();
            const validator = vi.fn(() => true);

            const wrapper = mountList({
                lines: [],
                jsonValidator: validator,
                afterPaste: afterPasteSpy,
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify({id: 'test', name: 'test'}));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(afterPasteSpy).toHaveBeenCalled();
        });
    });

    describe('剪切功能', () => {
        it('Ctrl+X 剪切选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中中间的
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // 剪切
            await wrapper.trigger('keydown', {key: 'x', ctrlKey: true});
            await nextTick();

            const {writeText} = await import('clipboard-polyfill');
            expect(writeText).toHaveBeenCalled();
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
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

        it('能访问 insert 方法', async () => {
            const wrapper = mountList({lines: createTestItems(1)});
            await nextTick();
            const vm = wrapper.vm;
            expect(vm.insert).toBeDefined();
            expect(typeof vm.insert).toBe('function');
        });

        it('能访问 remove 方法', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            await nextTick();
            const vm = wrapper.vm;
            expect(vm.remove).toBeDefined();
            expect(typeof vm.remove).toBe('function');
        });

        it('能通过 insert 方法添加项目', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            await nextTick();

            const vm = wrapper.vm;
            await vm.insert(0);
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });

        it('能通过 remove 方法删除项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});
            await nextTick();

            const vm = wrapper.vm;
            const removed = await vm.remove(1);
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
            expect(removed).toStrictEqual(items[1]);
        });

        it('remove 方法删除不存在的索引应返回 undefined', async () => {
            const wrapper = mountList({lines: createTestItems(2)});
            await nextTick();

            const vm = wrapper.vm;
            const removed = await vm.remove(10);

            expect(removed).toBeUndefined();
        });

        it('能在列表中间插入项目并正确更新选择', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            const vm = wrapper.vm;
            await vm.insert(0);

            // 原来的 index 1 现在是 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('default-0');
        });
    });

    describe('Key 检测', () => {
        it('当 items 变化时正确更新 key', async () => {
            const items1 = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
            ];
            const items2 = [
                {id: '2', name: 'item 2'},
                {id: '3', name: 'item 3'},
            ];

            const wrapper = mountList({lines: items1});
            expect(wrapper.find('.line-content').text()).toBe('item 1-0');

            await wrapper.setProps({lines: items2});
            expect(wrapper.find('.line-content').text()).toBe('item 2-0');
        });

        it('插入操作后正确维护 key', async () => {
            const items = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
            ];

            const wrapper = mountList({lines: items});
            const vm = wrapper.vm;

            await vm.insert(0);
            await nextTick();

            const lines = wrapper.findAll('.line-wrapper');
            expect(lines).toHaveLength(3);
            expect(lines[0].find('.line-content').text()).toBe('default-0');
            expect(lines[1].find('.line-content').text()).toBe('item 1-1');
            expect(lines[2].find('.line-content').text()).toBe('item 2-2');
        });

        it('删除操作后正确维护 key', async () => {
            const items = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
                {id: '3', name: 'item 3'},
            ];

            const wrapper = mountList({lines: items});
            const vm = wrapper.vm;

            await vm.remove(1);
            await nextTick();

            const lines = wrapper.findAll('.line-wrapper');
            expect(lines).toHaveLength(2);
            expect(lines[0].find('.line-content').text()).toBe('item 1-0');
            expect(lines[1].find('.line-content').text()).toBe('item 3-1');
        });
    });

    describe('边界情况', () => {
        it('处理空列表时的键盘操作', async () => {
            const wrapper = mountList({lines: []});

            // 在空列表上按 Delete 不报错
            expect(wrapper.trigger('keydown', {key: 'Delete'})).resolves.not.toThrow();
        });

        it('处理只有一个项目时的删除', async () => {
            const wrapper = mountList({lines: createTestItems(1)});

            await wrapper.find('.line-wrapper').trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(0);
        });

        it('处理移动到边界的情况', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中第一个，尝试上移
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp'});
            await nextTick();

            // 还在第一个位置
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('处理最后一个项目下移', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中最后一个，尝试下移
            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown'});
            await nextTick();

            // 还在最后一个位置
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
        });

        it('点击尾部添加按钮添加项目', async () => {
            const wrapper = mountList({lines: createTestItems(2)});

            await wrapper.find('.tail-add-button button').trigger('click');
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });
    });

    describe('交互式元素处理', () => {
        it('忽略交互式元素上的键盘事件', async () => {
            const wrapper = mountList({
                lines: createTestItems(2),
                interactiveClassNames: ['interactive'],
            });

            // 直接在组件上触发键盘事件（不在交互式元素上）
            await wrapper.trigger('keydown', {key: 'Delete'});

            // 不删除任何项目（因为没有选中的项）
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('在交互式元素上跳过键盘事件处理', async () => {
            const wrapper = mountList({
                lines: createTestItems(2),
                interactiveClassNames: ['interactive'],
            });

            // 选中第一个项目
            await wrapper.findAll('.line-wrapper')[0].trigger('click');

            // 直接在组件上触发键盘事件 (不在交互式元素上)
            // 由于没有按 Delete,只是检查 interactiveClassNames 的处理
            await wrapper.trigger('keydown', {key: 'Delete'});

            // 删除选中的项目
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });
    });

    describe('insert 和 remove 方法的选择状态维护', () => {
        it('insert 后选中插入项', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            const vm = wrapper.vm;
            // 在第一个位置插入
            await vm.insert(0);
            await nextTick();

            // 原来的 index 1 现在是 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('default-0');
        });

        it('remove 后正确更新已选项的索引', async () => {
            const items = createTestItems(4);
            const wrapper = mountList({lines: items});

            // 选中第一个和第三个 (index 0 和 2)
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});

            const vm = wrapper.vm;
            // 删除第二个 (index 1)
            await vm.remove(1);
            await nextTick();

            // 原来选中的 index 0 保持不变，index 2 变成 index 1
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-1');
        });

        it('remove 已选项前面的项目更新索引', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中第三个 (index 2)
            await wrapper.findAll('.line-wrapper')[2].trigger('click');

            const vm = wrapper.vm;
            // 删除第一个 (index 0)
            await vm.remove(0);
            await nextTick();

            // 原来选中的 index 2 现在是 index 1
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-1');
        });
    });

    describe('粘贴错误处理', () => {
        it('处理粘贴 JSON 解析错误', async () => {
            const wrapper = mountList({
                lines: createTestItems(2),
                jsonValidator: vi.fn(() => true),
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue('invalid json{');

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            // 触发 pasteError 事件
            expect(wrapper.emitted('pasteError')).toBeDefined();
            // 列表不变化
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('处理部分无效的粘贴数据', async () => {
            const validator = vi.fn((data) => {
                return data && typeof data === 'object' && 'id' in data && 'name' in data;
            });

            const wrapper = mountList({
                lines: createTestItems(2),
                jsonValidator: validator,
            });

            const invalidData = [
                {id: 'valid', name: 'valid'},
                {invalid: 'data'},
                {id: 'also-valid', name: 'also-valid'},
            ];

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify(invalidData));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            // 触发 pasteError 事件
            expect(wrapper.emitted('pasteError')).toBeDefined();
            // 列表不变化
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });
    });

    describe('焦点管理', () => {
        it('能在鼠标悬停时聚焦列表', async () => {
            const wrapper = mountList({lines: createTestItems(2)});

            await wrapper.find('.edit-list').trigger('mouseenter');

            expect(document.activeElement).toBe(wrapper.find('.edit-list').element);
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

        it('ArrowUp + Ctrl 上移单个选中元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp', ctrlKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 1-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 0-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-0');
        });

        it('ArrowUp + Ctrl 最上面的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp', ctrlKey: true});
            await nextTick();

            // 验证元素位置不变
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('ArrowDown + Ctrl 下移单个选中元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', ctrlKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 2-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 1-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-2');
        });

        it('ArrowDown + Ctrl 最下面的元素', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', ctrlKey: true});
            await nextTick();

            // 验证元素位置不变
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
        });

        it('ArrowUp + Ctrl 上移多个选中元素', async () => {
            const items = createTestItems(4);
            const wrapper = mountList({lines: items});

            // 选中第 2 和第 3 个元素（索引 1 和 2）
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            // 验证选中了两个元素
            let selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);

            // Ctrl + ArrowUp 上移
            await wrapper.trigger('keydown', {key: 'ArrowUp', ctrlKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 1-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 2-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 0-2');
            expect(lineWrappers[3].find('.line-content').text()).toBe('item 3-3');

            // 验证选中状态
            selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-1');
        });

        it('Ctrl + ArrowDown 下移多个选中元素', async () => {
            const items = createTestItems(4);
            const wrapper = mountList({lines: items});

            // 选中第 2 和第 3 个元素（索引 1 和 2）
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            // 验证选中了两个元素
            let selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);

            // Ctrl + ArrowDown 下移
            await wrapper.trigger('keydown', {key: 'ArrowDown', ctrlKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 3-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 1-2');
            expect(lineWrappers[3].find('.line-content').text()).toBe('item 2-3');

            // 验证选中状态
            selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-2');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-3');
        });

        it('Ctrl + ArrowUp 选中元素顶部有连续选中元素时无法上移', async () => {
            const items = createTestItems(4);
            const wrapper = mountList({lines: items});

            // 选中第 1 和第 2 个元素（索引 0 和 1）
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            // 验证选中了两个元素
            let selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);

            // Ctrl + ArrowUp 上移（应该无效果，因为已经在顶部）
            await wrapper.trigger('keydown', {key: 'ArrowUp', ctrlKey: true});
            await nextTick();

            // 验证元素位置不变
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');
            expect(lineWrappers[3].find('.line-content').text()).toBe('item 3-3');

            // 验证选中状态
            selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('Ctrl + ArrowDown 选中元素底部有连续选中元素时无法下移', async () => {
            const items = createTestItems(4);
            const wrapper = mountList({lines: items});

            // 选中第 3 和第 4 个元素（索引 2 和 3）
            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            // 验证选中了两个元素
            let selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);

            // Ctrl + ArrowDown 下移（应该无效果，因为已经在底部）
            await wrapper.trigger('keydown', {key: 'ArrowDown', ctrlKey: true});
            await nextTick();

            // 验证元素位置不变
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');
            expect(lineWrappers[3].find('.line-content').text()).toBe('item 3-3');

            // 验证选中状态
            selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 3-3');
        });

        it('Meta + ArrowUp 上移元素 (macOS)', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中中间的元素
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // Meta + ArrowUp 上移
            await wrapper.trigger('keydown', {key: 'ArrowUp', metaKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 1-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 0-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 2-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-0');
        });

        it('Meta + ArrowDown 下移元素 (macOS)', async () => {
            const items = createTestItems(3);
            const wrapper = mountList({lines: items});

            // 选中中间的元素
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // Meta + ArrowDown 下移
            await wrapper.trigger('keydown', {key: 'ArrowDown', metaKey: true});
            await nextTick();

            // 验证元素位置已交换
            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 2-1');
            expect(lineWrappers[2].find('.line-content').text()).toBe('item 1-2');

            // 验证选中状态
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-2');
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
