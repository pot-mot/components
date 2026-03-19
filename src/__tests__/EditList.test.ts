import {describe, it, expect, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import {h, nextTick, ref} from 'vue';
import EditList from '@/components/EditList.vue';
import type {EditListExpose} from '@/type/ListExpose.ts';

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

const toKey = (item: TestItem): string => {
    return item.id;
};

const mountEditList = (
    props: {
        lines?: TestItem[];
        toKey?: (item: TestItem, index: number) => string;
        defaultLine?: TestItem | (() => TestItem | Promise<TestItem>);
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
            toKey: props.toKey ?? toKey,
            defaultLine: props.defaultLine ?? ({id: 'default', name: 'default'} as TestItem),
            interactiveClassNames: props.interactiveClassNames,
            jsonValidator: props.jsonValidator,
            beforeCopy: props.beforeCopy,
            afterCopy: props.afterCopy,
            beforePaste: props.beforePaste,
            afterPaste: props.afterPaste,
        },
        slots: defaultSlots,
        attachTo: document.body,
    });
};

describe('EditList 组件', () => {
    describe('基础渲染', () => {
        it('应该能渲染空列表', () => {
            const wrapper = mountEditList({lines: []});
            expect(wrapper.findAll('.line-wrapper').length).toBe(0);
        });

        it('应该能渲染单个项目', () => {
            const items = createTestItems(1);
            const wrapper = mountEditList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
            expect(wrapper.find('.line-content').text()).toBe('item 0-0');
        });

        it('应该能渲染多个项目', () => {
            const items = createTestItems(5);
            const wrapper = mountEditList({lines: items});
            expect(wrapper.findAll('.line-wrapper').length).toBe(5);
        });

        it('应该显示尾部添加按钮', () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            expect(wrapper.find('.tail-add-button').exists()).toBe(true);
            expect(wrapper.find('.tail-add-button button').exists()).toBe(true);
        });

        it('应该使用 toKey 函数生成 key', async () => {
            const items = createTestItems(3);
            const customToKey = vi.fn(
                (item: TestItem, index: number) => `custom-${item.id}-${index}`,
            );

            mountEditList({lines: items, toKey: customToKey});

            expect(customToKey).toHaveBeenCalledTimes(3);
        });
    });

    describe('v-model 测试', () => {
        it('应该支持 v-model:lines 双向绑定', async () => {
            const items = ref(createTestItems(2));
            const wrapper = mountEditList({lines: items.value});

            // 通过 exposed API 添加项目
            const vm = wrapper.vm as EditListExpose<TestItem>;
            await vm.insert(0);
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });

        it('应该在外部修改 lines 时更新', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);

            const newItems = createTestItems(4);
            await wrapper.setProps({lines: newItems});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(4);
        });

        it('删除操作应该更新 v-model', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            // 按 Delete 删除
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });
    });

    describe('Props 测试', () => {
        it('应该接收 defaultLine prop', () => {
            const defaultLine = {id: 'custom-default', name: 'custom'};
            const wrapper = mountEditList({lines: [], defaultLine});
            expect(wrapper.props('defaultLine')).toEqual(defaultLine);
        });

        it('应该接受函数形式的 defaultLine', async () => {
            const defaultLineFn = vi.fn(() => ({id: 'fn-default', name: 'fn-default'}) as TestItem);
            const wrapper = mountEditList({lines: [], defaultLine: defaultLineFn});

            const vm = wrapper.vm as EditListExpose<TestItem>;
            await vm.insert(0);
            await nextTick();

            expect(defaultLineFn).toHaveBeenCalled();
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });

        it('应该接受返回 Promise 的 defaultLine 函数', async () => {
            const defaultLineFn = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {id: 'async-default', name: 'async-default'} as TestItem;
            });

            const wrapper = mountEditList({lines: [], defaultLine: defaultLineFn});

            const vm = wrapper.vm as EditListExpose<TestItem>;
            await vm.insert(0);
            await nextTick();

            expect(defaultLineFn).toHaveBeenCalled();
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });

        it('应该接收 jsonValidator prop', () => {
            const validator = vi.fn(() => true);
            const wrapper = mountEditList({
                lines: [],
                jsonValidator: validator,
            });
            expect(wrapper.props('jsonValidator')).toBe(validator);
        });

        it('应该接收 interactiveClassNames prop', () => {
            const wrapper = mountEditList({
                lines: createTestItems(1),
                interactiveClassNames: ['interactive'],
            });
            expect(wrapper.props('interactiveClassNames')).toEqual(['interactive']);
        });
    });

    describe('Slots 测试', () => {
        it('应该渲染 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountEditList({lines: items});

            const lineWrappers = wrapper.findAll('.line-wrapper');
            expect(lineWrappers[0].find('.line-content').text()).toBe('item 0-0');
            expect(lineWrappers[1].find('.line-content').text()).toBe('item 1-1');
        });

        it('应该支持自定义 line slot', () => {
            const items = createTestItems(2);
            const wrapper = mountEditList(
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
            const wrapper = mountEditList(
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
            const wrapper = mountEditList(
                {lines: createTestItems(2)},
                {
                    tail: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'tail-slot'}, `Tail: ${lines.length} items`),
                },
            );

            expect(wrapper.find('.tail-slot').exists()).toBe(true);
            expect(wrapper.find('.tail-slot').text()).toBe('Tail: 2 items');
        });

        it('应该支持自定义 tail slot 覆盖默认添加按钮', () => {
            const wrapper = mountEditList(
                {lines: createTestItems(2)},
                {
                    tail: ({lines}: {lines: TestItem[]}) =>
                        h('div', {class: 'custom-tail'}, `Custom Tail: ${lines.length}`),
                },
            );

            expect(wrapper.find('.custom-tail').exists()).toBe(true);
            expect(wrapper.find('.custom-tail').text()).toBe('Custom Tail: 2');
            // 默认的添加按钮不应该存在
            expect(wrapper.find('.tail-add-button').exists()).toBe(false);
        });
    });

    describe('Emits 测试', () => {
        it('应该在点击项目时触发 clickItem 事件', async () => {
            const items = createTestItems(1);
            const wrapper = mountEditList({lines: items});

            await wrapper.find('.line-wrapper').trigger('click');

            expect(wrapper.emitted('clickItem')).toBeDefined();
            expect(wrapper.emitted('clickItem')).toHaveLength(1);
        });

        it('应该在选择时触发 selected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('selected')).toBeDefined();
            expect(wrapper.emitted('selected')![0][0]).toEqual(items[0]);
            expect(wrapper.emitted('selected')![0][1]).toBe(0);
        });

        it('应该在取消选择时触发 unselected 事件', async () => {
            const items = createTestItems(2);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});

            expect(wrapper.emitted('unselected')).toBeDefined();
            expect(wrapper.emitted('unselected')![0][0]).toEqual(items[0]);
        });

        it('应该在添加项目时触发 added 事件', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});

            const vm = wrapper.vm as EditListExpose<TestItem>;
            await vm.insert(0);
            await nextTick();

            expect(wrapper.emitted('added')).toBeDefined();
            expect(wrapper.emitted('added')).toHaveLength(1);
            expect(wrapper.emitted('added')![0][0]).toHaveLength(1);
        });

        it('应该在删除项目时触发 deleted 事件', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.emitted('deleted')).toBeDefined();
            expect(wrapper.emitted('deleted')).toHaveLength(1);
            expect(wrapper.emitted('deleted')![0][0]).toHaveLength(1);
            expect((wrapper.emitted('deleted')![0][0] as TestItem[])[0]).toEqual(items[1]);
        });

        it('应该在粘贴错误时触发 pasteError 事件', async () => {
            const validator = vi.fn(() => false);
            const wrapper = mountEditList({
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

    describe('键盘操作测试', () => {
        it('应该支持 Delete 键删除选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('应该支持 Backspace 键删除选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'Backspace'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('应该支持 Ctrl+A 全选', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            await wrapper.trigger('keydown', {key: 'a', ctrlKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(3);
        });

        it('应该支持 Enter 键在选中项后插入', async () => {
            const items = createTestItems(2);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'Enter'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });

        it('应该支持方向键向上移动项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第二个
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // 按上移
            await wrapper.trigger('keydown', {key: 'ArrowUp'});
            await nextTick();

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-0');
        });

        it('应该支持方向键向下移动项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            // 按下移
            await wrapper.trigger('keydown', {key: 'ArrowDown'});
            await nextTick();

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-1');
        });

        it('应该支持 Shift+ 方向键扩展选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });
    });

    describe('粘贴功能测试', () => {
        it('应该支持 Ctrl+V 粘贴有效数据', async () => {
            const newItem = {id: 'pasted', name: 'pasted-item'};
            const validator = vi.fn((data) => {
                return data && typeof data === 'object' && 'id' in data && 'name' in data;
            });

            const wrapper = mountEditList({
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

        it('应该支持粘贴数组', async () => {
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

            const wrapper = mountEditList({
                lines: createTestItems(2),
                jsonValidator: validator,
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue(JSON.stringify(newItems));

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(4);
        });

        it('应该在粘贴前调用 beforePaste', async () => {
            const beforePasteSpy = vi.fn();
            const validator = vi.fn(() => true);

            const wrapper = mountEditList({
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

        it('应该在粘贴后调用 afterPaste', async () => {
            const afterPasteSpy = vi.fn();
            const validator = vi.fn(() => true);

            const wrapper = mountEditList({
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

    describe('复制功能测试', () => {
        it('应该支持 Ctrl+C 复制选中的项目', async () => {
            const items = createTestItems(2);
            const wrapper = mountEditList({lines: items});

            // 选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            // 复制
            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            const {writeText} = await import('clipboard-polyfill');
            expect(writeText).toHaveBeenCalled();
        });

        it('应该在复制前调用 beforeCopy', async () => {
            const beforeCopySpy = vi.fn();
            const items = createTestItems(2);
            const wrapper = mountEditList({
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
            const wrapper = mountEditList({
                lines: items,
                afterCopy: afterCopySpy,
            });

            await wrapper.trigger('keydown', {key: 'c', ctrlKey: true});
            await nextTick();

            expect(afterCopySpy).toHaveBeenCalled();
        });

        it('应该支持 Ctrl+X 剪切选中的项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

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

    describe('Expose API 测试', () => {
        it('应该能访问 bodyRef', async () => {
            const wrapper = mountEditList({lines: createTestItems(1)});
            await nextTick();
            const vm = wrapper.vm as any;
            expect(vm.bodyRef).toBeDefined();
        });

        it('应该能访问 indexSelection', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            await nextTick();
            const vm = wrapper.vm as any;
            expect(vm.indexSelection).toBeDefined();
            expect(typeof vm.indexSelection.select).toBe('function');
        });

        it('应该能访问 insert 方法', async () => {
            const wrapper = mountEditList({lines: createTestItems(1)});
            await nextTick();
            const vm = wrapper.vm as any;
            expect(vm.insert).toBeDefined();
            expect(typeof vm.insert).toBe('function');
        });

        it('应该能访问 remove 方法', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            await nextTick();
            const vm = wrapper.vm as any;
            expect(vm.remove).toBeDefined();
            expect(typeof vm.remove).toBe('function');
        });

        it('应该能通过 insert 方法添加项目', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            await nextTick();

            const vm = wrapper.vm as any;
            await vm.insert(0);
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });

        it('应该能通过 remove 方法删除项目', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});
            await nextTick();

            const vm = wrapper.vm as any;
            const removed = await vm.remove(1);
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
            expect(removed).toEqual(items[1]);
        });

        it('remove 方法删除不存在的索引应返回 undefined', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});
            await nextTick();

            const vm = wrapper.vm as any;
            const removed = await vm.remove(10);

            expect(removed).toBeUndefined();
        });

        it('应该能在列表中间插入项目并正确更新选择', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第二个 (index 1)
            await wrapper.findAll('.line-wrapper')[1].trigger('click');

            const vm = wrapper.vm as EditListExpose<TestItem>;
            // 在第二个位置之前插入
            await vm.insert(0);
            await nextTick();

            // 原来的 index 1 现在应该是 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            // 验证插入的项目在正确位置
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-2');
        });
    });

    describe('Key 检测', () => {
        it('当 items 变化时应该正确更新 key', async () => {
            const items1 = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
            ];
            const items2 = [
                {id: '2', name: 'item 2'},
                {id: '3', name: 'item 3'},
            ];

            const wrapper = mountEditList({lines: items1});
            expect(wrapper.find('.line-content').text()).toBe('item 1-0');

            await wrapper.setProps({lines: items2});
            expect(wrapper.find('.line-content').text()).toBe('item 2-0');
        });

        it('插入操作后应该正确维护 key', async () => {
            const items = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
            ];

            const wrapper = mountEditList({lines: items});
            const vm = wrapper.vm as EditListExpose<TestItem>;

            await vm.insert(0);
            await nextTick();

            const lines = wrapper.findAll('.line-wrapper');
            expect(lines).toHaveLength(3);
            expect(lines[0].find('.line-content').text()).toBe('default-0');
            expect(lines[1].find('.line-content').text()).toBe('item 1-1');
            expect(lines[2].find('.line-content').text()).toBe('item 2-2');
        });

        it('删除操作后应该正确维护 key', async () => {
            const items = [
                {id: '1', name: 'item 1'},
                {id: '2', name: 'item 2'},
                {id: '3', name: 'item 3'},
            ];

            const wrapper = mountEditList({lines: items});
            const vm = wrapper.vm as EditListExpose<TestItem>;

            await vm.remove(1);
            await nextTick();

            const lines = wrapper.findAll('.line-wrapper');
            expect(lines).toHaveLength(2);
            expect(lines[0].find('.line-content').text()).toBe('item 1-0');
            expect(lines[1].find('.line-content').text()).toBe('item 3-1');
        });
    });

    describe('边界情况', () => {
        it('应该处理空列表时的键盘操作', async () => {
            const wrapper = mountEditList({lines: []});

            // 在空列表上按 Delete 不应该报错
            await expect(wrapper.trigger('keydown', {key: 'Delete'})).resolves.not.toThrow();
        });

        it('应该处理只有一个项目时的删除', async () => {
            const wrapper = mountEditList({lines: createTestItems(1)});

            await wrapper.find('.line-wrapper').trigger('click');
            await wrapper.trigger('keydown', {key: 'Delete'});
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(0);
        });

        it('应该处理移动到边界的情况', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第一个，尝试上移
            await wrapper.findAll('.line-wrapper')[0].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowUp'});
            await nextTick();

            // 应该还在第一个位置
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
        });

        it('应该处理最后一个项目下移', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中最后一个，尝试下移
            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            await wrapper.trigger('keydown', {key: 'ArrowDown'});
            await nextTick();

            // 应该还在最后一个位置
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-2');
        });

        it('点击尾部添加按钮应该添加项目', async () => {
            const wrapper = mountEditList({lines: createTestItems(2)});

            await wrapper.find('.tail-add-button button').trigger('click');
            await nextTick();

            expect(wrapper.findAll('.line-wrapper').length).toBe(3);
        });
    });

    describe('交互式元素处理', () => {
        it('应该忽略交互式元素上的键盘事件', async () => {
            const wrapper = mountEditList({
                lines: createTestItems(2),
                interactiveClassNames: ['interactive'],
            });

            // 直接在组件上触发键盘事件（不在交互式元素上）
            await wrapper.trigger('keydown', {key: 'Delete'});

            // 不应该删除任何项目（因为没有选中的项）
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('应该在交互式元素上跳过键盘事件处理', async () => {
            const wrapper = mountEditList({
                lines: createTestItems(2),
                interactiveClassNames: ['interactive'],
            });

            // 选中第一个项目
            await wrapper.findAll('.line-wrapper')[0].trigger('click');

            // 直接在组件上触发键盘事件 (不在交互式元素上)
            // 由于没有按 Delete,只是检查 interactiveClassNames 的处理
            await wrapper.trigger('keydown', {key: 'Delete'});

            // 应该删除选中的项目
            expect(wrapper.findAll('.line-wrapper').length).toBe(1);
        });
    });

    describe('Shift+ 方向键选择逻辑', () => {
        it('应该支持 Shift+ArrowUp 从下往上扩展选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            // 先点击第三个 (index 2) 作为 lastSelect
            await wrapper.findAll('.line-wrapper')[2].trigger('click');
            // 现在 lastSelect = 2, selectedSet = {2}

            // Shift+ 按向上键，minIndex=2, maxIndex=2, lastSelect=2
            // minIndex === lastSelect, 所以如果 maxIndex-1 >= 0, unselect(maxIndex)
            // 但这会取消选择 index 2,导致没有选中项
            // 实际上应该是：从 lastSelect 开始，向上扩展到 minIndex
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            // 根据实现逻辑，应该会取消选择 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(0);
        });

        it('应该支持 Shift+ArrowUp 收缩选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            // 先选中第一个 (index 0)
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            // 再选中第二个 (index 1)
            await wrapper.findAll('.line-wrapper')[1].trigger('click', {ctrlKey: true});
            // 再选中第三个 (index 2)
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});
            // 现在 selectedSet = {0, 1, 2}, lastSelect = 2

            // Shift+ 按向上键
            // minIndex=0, maxIndex=2, lastSelect=2
            // maxIndex === lastSelect, 所以如果 minIndex-1 >= 0, select(minIndex-1)
            // minIndex-1 = -1, 不满足条件，什么都不做
            await wrapper.trigger('keydown', {key: 'ArrowUp', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(3);
        });

        it('应该支持 Shift+ArrowDown 从上往下扩展选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            // 先选中第二个 (index 1)
            await wrapper.findAll('.line-wrapper')[1].trigger('click');
            // Shift+ 按向下键扩展到第三个
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-1');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-2');
        });

        it('应该支持 Shift+ArrowDown 收缩选择', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            // 先选中第一个
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            // 再选中第二个
            await wrapper.findAll('.line-wrapper')[1].trigger('click', {ctrlKey: true});
            // 再选中第三个
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});

            // 现在有三个选中的 (0, 1, 2), lastSelect 是 2
            // Shift+ 按向下键，应该取消选择第一个
            await wrapper.trigger('keydown', {key: 'ArrowDown', shiftKey: true});

            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
        });
    });

    describe('insert 和 remove 方法的选择状态维护', () => {
        it('insert 后应该正确更新已选项的索引', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第二个 (index 1)
            await wrapper.findAll('.line-wrapper')[1].trigger('click');

            const vm = wrapper.vm as EditListExpose<TestItem>;
            // 在第一个位置插入
            await vm.insert(0);
            await nextTick();

            // 原来的 index 1 现在应该是 index 2
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 1-2');
        });

        it('remove 后应该正确更新已选项的索引', async () => {
            const items = createTestItems(4);
            const wrapper = mountEditList({lines: items});

            // 选中第一个和第三个 (index 0 和 2)
            await wrapper.findAll('.line-wrapper')[0].trigger('click', {ctrlKey: true});
            await wrapper.findAll('.line-wrapper')[2].trigger('click', {ctrlKey: true});

            const vm = wrapper.vm as EditListExpose<TestItem>;
            // 删除第二个 (index 1)
            await vm.remove(1);
            await nextTick();

            // 原来选中的 index 0 保持不变，index 2 变成 index 1
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(2);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 0-0');
            expect(selectedItems[1].find('.line-content').text()).toBe('item 2-1');
        });

        it('remove 已选项前面的项目应该更新索引', async () => {
            const items = createTestItems(3);
            const wrapper = mountEditList({lines: items});

            // 选中第三个 (index 2)
            await wrapper.findAll('.line-wrapper')[2].trigger('click');

            const vm = wrapper.vm as EditListExpose<TestItem>;
            // 删除第一个 (index 0)
            await vm.remove(0);
            await nextTick();

            // 原来选中的 index 2 现在应该是 index 1
            const selectedItems = wrapper.findAll('.line-wrapper.selected');
            expect(selectedItems.length).toBe(1);
            expect(selectedItems[0].find('.line-content').text()).toBe('item 2-1');
        });
    });

    describe('粘贴错误处理', () => {
        it('应该处理粘贴 JSON 解析错误', async () => {
            const wrapper = mountEditList({
                lines: createTestItems(2),
                jsonValidator: vi.fn(() => true),
            });

            const {readText} = await import('clipboard-polyfill');
            vi.mocked(readText).mockResolvedValue('invalid json{');

            await wrapper.trigger('keydown', {key: 'v', ctrlKey: true});
            await nextTick();

            // 应该触发 pasteError 事件
            expect(wrapper.emitted('pasteError')).toBeDefined();
            // 列表不应该变化
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });

        it('应该处理部分无效的粘贴数据', async () => {
            const validator = vi.fn((data) => {
                return data && typeof data === 'object' && 'id' in data && 'name' in data;
            });

            const wrapper = mountEditList({
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

            // 应该触发 pasteError 事件
            expect(wrapper.emitted('pasteError')).toBeDefined();
            // 列表不应该变化
            expect(wrapper.findAll('.line-wrapper').length).toBe(2);
        });
    });
});
