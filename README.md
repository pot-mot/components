# @potmot/list

基于 Vue 3 的通用列表组件库，提供可编辑和只读两种列表模式，支持键盘操作、多选、剪贴板等丰富功能。

## 特性

### EditList 组件
- 📝 **可编辑列表** - 支持添加、删除、移动列表项
- ⌨️ **键盘快捷键**
  - `Delete` / `Backspace` - 删除选中项
  - `Ctrl/Cmd + A` - 全选
  - `Ctrl/Cmd + C` - 复制选中项
  - `Ctrl/Cmd + X` - 剪切选中项
  - `Ctrl/Cmd + V` - 粘贴 JSON 数据
  - `Arrow Up` / `Arrow Down` - 上下移动选中项
  - `Enter` - 在选中项后插入新行
- 🖱️ **鼠标交互**
  - 点击选择单项
  - `Ctrl/Cmd + 点击` 多选
  - `Shift + 点击` 范围选择
- 📋 **剪贴板支持** - 复制/粘贴 JSON 格式数据
- ✅ **数据验证** - 支持自定义 JSON 验证器
- 🎯 **智能交互** - 自动识别交互式元素，避免冲突

### ViewList 组件
- 👁️ **只读列表** - 适用于展示场景
- ⌨️ **键盘快捷键**
  - `Ctrl/Cmd + A` - 全选
  - `Ctrl/Cmd + C` - 复制选中项
  - `Arrow Up` / `Arrow Down` - 切换选中项
- 🖱️ **鼠标交互** - 支持单选、多选、范围选择
- 📋 **剪贴板支持** - 复制 JSON 格式数据
- 🎯 **智能交互** - 自动识别交互式元素

### 通用特性
- 🎨 **完全可定制** - 支持自定义插槽（head、line、tail）
- 🔧 **TypeScript** - 完整的类型推导支持
- 🌐 **泛型支持** - 适用于任何数据类型
- 📦 **轻量级** - 依赖少，体积小
- ♿ **可访问性** - 支持键盘导航和焦点管理

## 安装

```bash
npm install @potmot/list
```

```bash
yarn add @potmot/list
```

```bash
pnpm add @potmot/list
```

## 使用示例

### EditList 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { EditList } from '@potmot/list';

interface TodoItem {
  id: number;
  text: string;
}

const todos = ref<TodoItem[]>([
  { id: 1, text: '学习 Vue 3' },
  { id: 2, text: '使用 TypeScript' },
]);

const handleAdded = (items: TodoItem[]) => {
  console.log('添加了:', items);
};

const handleDeleted = (items: TodoItem[]) => {
  console.log('删除了:', items);
};
</script>

<template>
  <EditList
    v-model:lines="todos"
    :default-line="{ id: 0, text: '' }"
    :to-key="(item) => String(item.id)"
    @added="handleAdded"
    @deleted="handleDeleted"
    @click-item="console.log"
  >
    <template #line="{ item }">
      <div>{{ item.text }}</div>
    </template>
  </EditList>
</template>
```

### ViewList 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ViewList } from '@potmot/list';

const items = ref([
  { id: 1, name: '项目 1' },
  { id: 2, name: '项目 2' },
  { id: 3, name: '项目 3' },
]);

const handleSelected = (item: any, index: number) => {
  console.log('选中:', item, index);
};
</script>

<template>
  <ViewList
    :lines="items"
    :to-key="(item) => String(item.id)"
    @selected="handleSelected"
    @unselected="handleSelected"
    @click-item="console.log"
  >
    <template #line="{ item }">
      <div>{{ item.name }}</div>
    </template>
  </ViewList>
</template>
```

### 高级用法 - JSON 验证粘贴

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { EditList, type ErrorHandler } from '@potmot/list';

interface DataItem {
  name: string;
  value: number;
}

const lines = ref<DataItem[]>([]);

// 验证函数
const jsonValidator = (json: any, onError: ErrorHandler): boolean => {
  const validate = (item: any): item is DataItem => {
    if (!item || typeof item !== 'object') {
      onError([new Error('必须是对象')]);
      return false;
    }
    if (typeof item.name !== 'string') {
      onError([new Error('name 必须是字符串')]);
      return false;
    }
    if (typeof item.value !== 'number') {
      onError([new Error('value 必须是数字')]);
      return false;
    }
    return true;
  };

  if (Array.isArray(json)) {
    return json.every(item => validate(item));
  }
  return validate(json);
};
</script>

<template>
  <EditList
    v-model:lines="lines"
    :default-line="{ name: '', value: 0 }"
    :to-key="(item, index) => `${item.name}-${index}`"
    :json-validator="jsonValidator"
    @paste-error="console.error"
  >
    <template #line="{ item }">
      <div>{{ item.name }}: {{ item.value }}</div>
    </template>
  </EditList>
</template>
```

### 使用组合式 API 控制列表

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { EditList } from '@potmot/list';
import type { EditListExpose } from '@potmot/list';

const listRef = ref<EditListExpose<any>>();
const items = ref([{ id: 1, text: '初始项' }]);

const addItem = async () => {
  const newItem = await listRef.value?.insert(0);
  console.log('在开头添加了:', newItem);
};

const removeFirst = async () => {
  const removed = await listRef.value?.remove(0);
  console.log('删除了:', removed);
};
</script>

<template>
  <div>
    <button @click="addItem">添加项</button>
    <button @click="removeFirst">删除第一项</button>
    <EditList
      ref="listRef"
      v-model:lines="items"
      :default-line="{ id: 0, text: '' }"
      :to-key="(item) => String(item.id)"
    >
      <template #line="{ item }">
        <div>{{ item.text }}</div>
      </template>
    </EditList>
  </div>
</template>
```

## API 文档

### EditList Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lines | `T[]` | ✅ | 列表数据（支持 v-model） |
| defaultLine | `T \| (() => T \| Promise<T>)` | ✅ | 默认新行数据或生成函数 |
| toKey | `(line: T, index: number) => string` | ✅ | 生成唯一键的函数 |
| jsonValidator | `(json: any, onError?: ErrorHandler) => boolean \| Promise<T>` | ❌ | JSON 验证函数 |
| interactiveClassNames | `string[]` | ❌ | 交互式元素的类名列表 |
| beforeCopy | `(data: T[]) => void` | ❌ | 复制前回调 |
| afterCopy | `() => void` | ❌ | 复制后回调 |
| beforePaste | `(data: T[]) => void` | ❌ | 粘贴前回调 |
| afterPaste | `() => void` | ❌ | 粘贴后回调 |

### ViewList Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lines | `T[]` | ✅ | 列表数据 |
| toKey | `(line: T, index: number) => string` | ✅ | 生成唯一键的函数 |
| interactiveClassNames | `string[]` | ❌ | 交互式元素的类名列表 |
| beforeCopy | `(data: T[]) => void` | ❌ | 复制前回调 |
| afterCopy | `() => void` | ❌ | 复制后回调 |

### EditList Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| click-item | `(e: MouseEvent, item: T, index: number)` | 点击列表项时触发 |
| selected | `(item: T, index: number)` | 选中项时触发 |
| unselected | `(item: T, index: number)` | 取消选中时触发 |
| added | `(added: T[])` | 添加项时触发 |
| deleted | `(deleted: T[])` | 删除项时触发 |
| paste-error | `(error: Map<number, Error[]> \| any)` | 粘贴验证失败时触发 |

### ViewList Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| click-item | `(e: MouseEvent, item: T, index: number)` | 点击列表项时触发 |
| selected | `(item: T, index: number)` | 选中项时触发 |
| unselected | `(item: T, index: number)` | 取消选中时触发 |

### Slots

#### EditList / ViewList

| 插槽名 | 作用域参数 | 说明 |
|--------|------------|------|
| head | `{ lines: T[] }` | 列表头部内容 |
| line | `{ item: T, index: number }` | 列表项渲染 |
| tail | `{ lines: T[] }` | 列表尾部内容（EditList 默认包含添加按钮） |

### Expose 方法

#### EditListExpose

| 方法             | 参数 | 返回值 | 说明 |
|----------------|------|--------|------|
| bodyRef        | `Ref<HTMLElement \| null>` | 列表主体引用 |
| indexSelection | `IndexSelection` | 选择状态管理对象 |
| insert         | `(index: number)` | `Promise<T>` | 在指定位置插入新行 |
| remove         | `(index: number)` | `Promise<T \| undefined>` | 删除指定位置的行 |

#### ViewListExpose

| 属性 | 类型 | 说明 |
|------|------|------|
| bodyRef | `Ref<HTMLElement \| null>` | 列表主体引用 |
| indexSelection | `IndexSelection` | 选择状态管理对象 |

### IndexSelection API

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| select | `(index: number) => void` | 选中指定索引 |
| unselect | `(index: number) => void` | 取消选中指定索引 |
| selectRange | `(start: number, end: number) => void` | 选中范围 |
| resetSelection | `(indexes: number[]) => void` | 重置选中状态 |
| isSelected | `(index: number) => boolean` | 判断是否选中 |
| unselectAll | `() => void` | 取消全部选中 |
| selectedSet | `Readonly<Ref<Readonly<Set<number>>>>` | 选中索引集合 |
| lastSelect | `Readonly<Ref<number \| undefined>>` | 最后选中的索引 |

## 样式变量

组件使用 CSS 变量进行样式定制：

```css
--list-line-bg-color: 列表项背景色
--list-line-hover-bg-color: 列表项悬停背景色
--list-line-selected-bg-color: 列表项选中背景色
```

## License

MIT