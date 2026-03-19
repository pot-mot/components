export interface ViewListSlots<T> {
    line: {
        item: T;
        index: number;
    };
    head: {
        lines: T[];
    };
    tail: {
        lines: T[];
    };
}

export interface EditListSlots<T> {
    line: {
        item: T;
        index: number;
    };
    head: {
        lines: T[];
    };
    tail: {
        lines: T[];
    };
}
