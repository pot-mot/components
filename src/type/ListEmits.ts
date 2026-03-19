export interface ViewListEmits<T> {
    (event: 'clickItem', e: MouseEvent, item: T, index: number): void;
    (event: 'selected', item: T, index: number): void;
    (event: 'unselected', item: T, index: number): void;
}

export interface EditListEmits<T> extends ViewListEmits<T> {
    (event: 'added', added: T[]): void;
    (event: 'deleted', deleted: T[]): void;
    (event: 'pasteError', error: Map<number, Error[] | null | undefined> | any): void;
}
