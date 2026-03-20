# @potmot/list

基于 Vue 3 的通用列表组件库，提供可编辑和只读两种列表模式，支持键盘操作、多选、剪贴板等丰富功能。

## 特性
- 🎨 **完全可定制** - 支持自定义插槽（head、line、tail）
- 🔧 **TypeScript** - 完整的类型推导支持
- 🌐 **泛型支持** - 适用于任何数据类型
- 📦 **轻量级** - 依赖少，体积小
- ♿ **可访问性** - 支持键盘导航和焦点管理

### ViewList 组件
- ⌨️ **键盘快捷键**
  - `Ctrl/Cmd + A` - 全选
  - `Ctrl/Cmd + C` - 复制选中项
  - `Arrow Up` / `Arrow Down` - 切换选中项
- 🖱️ **鼠标交互** - 支持单选、多选、范围选择
- 📋 **剪贴板支持** - 复制 JSON 格式数据
- 🎯 **智能交互** - 自动识别交互式元素

### EditList 组件
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

## API 文档

### EditList Props

| 属性                    | 类型                                                             | 必填 | 说明               |
|-----------------------|----------------------------------------------------------------|----|------------------|
| lines                 | `T[]`                                                          | ✅  | 列表数据（支持 v-model） |
| defaultLine           | `T \| (() => T \| Promise<T>)`                                 | ✅  | 默认新行数据或生成函数      |
| toKey                 | `(line: T, index: number) => string`                           | ✅  | 生成唯一键的函数         |
| jsonValidator         | `(json: any, onError?: ErrorHandler) => boolean \| Promise<T>` | ❌  | JSON 验证函数        |
| interactiveClassNames | `string[]`                                                     | ❌  | 交互式元素的类名列表       |
| beforeCopy            | `(data: T[]) => void`                                          | ❌  | 复制前回调            |
| afterCopy             | `() => void`                                                   | ❌  | 复制后回调            |
| beforePaste           | `(data: T[]) => void`                                          | ❌  | 粘贴前回调            |
| afterPaste            | `() => void`                                                   | ❌  | 粘贴后回调            |

### ViewList Props

| 属性                    | 类型                                   | 必填 | 说明         |
|-----------------------|--------------------------------------|----|------------|
| lines                 | `T[]`                                | ✅  | 列表数据       |
| toKey                 | `(line: T, index: number) => string` | ✅  | 生成唯一键的函数   |
| interactiveClassNames | `string[]`                           | ❌  | 交互式元素的类名列表 |
| beforeCopy            | `(data: T[]) => void`                | ❌  | 复制前回调      |
| afterCopy             | `() => void`                         | ❌  | 复制后回调      |

### EditList Events

| 事件名         | 参数                                        | 说明        |
|-------------|-------------------------------------------|-----------|
| click-item  | `(e: MouseEvent, item: T, index: number)` | 点击列表项时触发  |
| selected    | `(item: T, index: number)`                | 选中项时触发    |
| unselected  | `(item: T, index: number)`                | 取消选中时触发   |
| added       | `(added: T[])`                            | 添加项时触发    |
| deleted     | `(deleted: T[])`                          | 删除项时触发    |
| paste-error | `(error: Map<number, Error[]> \| any)`    | 粘贴验证失败时触发 |

### ViewList Events

| 事件名        | 参数                                        | 说明       |
|------------|-------------------------------------------|----------|
| click-item | `(e: MouseEvent, item: T, index: number)` | 点击列表项时触发 |
| selected   | `(item: T, index: number)`                | 选中项时触发   |
| unselected | `(item: T, index: number)`                | 取消选中时触发  |

### Slots

#### EditList / ViewList

| 插槽名  | 作用域参数                        | 说明                        |
|------|------------------------------|---------------------------|
| head | `{ lines: T[] }`             | 列表头部内容                    |
| line | `{ item: T, index: number }` | 列表项渲染                     |
| tail | `{ lines: T[] }`             | 列表尾部内容（EditList 默认包含添加按钮） |

### Expose

#### ViewListExpose

| 属性                      | 类型                         | 说明       |
|-------------------------|----------------------------|----------|
| listRef                 | `Ref<HTMLElement \| null>` | 列表容器引用   |
| bodyRef                 | `Ref<HTMLElement \| null>` | 列表主体引用   |
| focusList               | `() => void`               | 聚焦列表     |
| indexSelection          | `IndexSelection`           | 选择状态管理对象 |
| expandSelectionUpward   | `() => void`               | 向上扩充选中区间 |
| expandSelectionDownward | `() => void`               | 向下扩充选中区间 |

#### EditListExpose

| 属性                      | 类型                                           | 说明        |
|-------------------------|----------------------------------------------|-----------|
| listRef                 | `Ref<HTMLElement \| null>`                   | 列表容器引用    |
| bodyRef                 | `Ref<HTMLElement \| null>`                   | 列表主体引用    |
| focusList               | `() => void`                                 | 聚焦列表      |
| indexSelection          | `IndexSelection`                             | 选择状态管理对象  |
| expandSelectionUpward   | `() => void`                                 | 向上扩充选中区间  |
| expandSelectionDownward | `() => void`                                 | 向下扩充选中区间  |
| insert                  | `(index: number) => Promise<T>`              | 在指定位置插入新行 |
| remove                  | `(index: number) => Promise<T \| undefined>` | 删除指定位置的行  |
| moveUpSelection         | `() => Promise<void>`                        | 上移选中项     |
| moveDownSelection       | `() => Promise<void>`                        | 下移选中项     |

### IndexSelection API

| 方法/属性               | 类型                                       | 说明       |
|---------------------|------------------------------------------|----------|
| current             | `DeepReadonly<Ref<number \| undefined>>` | 当前选中项索引  |
| setCurrent          | `(index: number \| undefined) => void`   | 设置当前选中项  |
| selectedSet         | `DeepReadonly<Ref<Set<number>>>`         | 已选中的项集合  |
| isSelected          | `(index: number) => boolean`             | 判断是否选中   |
| select              | `(index: number \| number[]) => void`    | 选中指定索引   |
| selectRange         | `(start: number, end: number) => void`   | 选中范围     |
| unselect            | `(index: number \| number[]) => void`    | 取消选中指定索引 |
| unselectRange       | `(start: number, end: number) => void`   | 取消选中范围   |
| unselectAll         | `() => void`                             | 取消全部选中   |
| resetSelection      | `(indexes: number[]) => void`            | 重置选中状态   |
| resetSelectionRange | `(start: number, end: number) => void`   | 重置为范围选中  |

## License

MIT