const interactionTagNames: string[] = [
    'input',
    'textarea',
    'button',
    'select',
    'option',
    'video',
    'audio',
    'details',
    'summary',
    'dialog',
] as const satisfies (keyof HTMLElementTagNameMap)[];

const checkElementUpward = (el: Element | null, check: (el: Element) => boolean): boolean => {
    let current: Element | null = el;

    while (current) {
        const result = check(current);
        if (result) return result;
        current = current.parentElement;
    }
    return false;
};

/**
 * 判断元素是否是一个交互用元素
 */
export const isInteractiveElement = (el: Element, interactiveClassNames: string[]): boolean => {
    if ('contenteditable' in el) {
        return true;
    }
    if (interactionTagNames.includes(el.tagName.toLowerCase())) {
        return true;
    }
    for (const className of interactiveClassNames) {
        if (el.classList.contains(className)) {
            return true;
        }
    }
    return false;
};

export const isTargetInteractive = (e: UIEvent, interactiveClassNames: string[]): boolean => {
    let target = e.target;
    if (!(target instanceof Element)) return false;
    return checkElementUpward(target, (el) => isInteractiveElement(el, interactiveClassNames));
};
