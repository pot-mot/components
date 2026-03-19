export type ErrorHandler = (errors: Error[] | null | undefined) => void;

export interface ViewListProps<T> {
    lines: T[];
    toKey: (line: T, index: number) => string;
    beforeCopy?: (data: T[]) => void;
    afterCopy?: () => void;
    interactiveClassNames?: string[];
}

export interface EditListProps<T> extends Omit<ViewListProps<T>, 'lines'> {
    defaultLine: T | (() => T | Promise<T>);
    jsonValidator?: (json: any, onError?: ErrorHandler) => boolean | Promise<T>;
    beforePaste?: (data: T[]) => void;
    afterPaste?: () => void;
}
