import {onBeforeUnmount, onMounted} from 'vue';

const clickOutsideHandlers = new Map<() => Element | null | undefined, (e: MouseEvent) => void>();

const handleClickOutside = (e: MouseEvent) => {
    if (e.target instanceof Element) {
        for (const [target, handler] of clickOutsideHandlers) {
            const targetElement = target();
            if (targetElement && !targetElement.contains(e.target)) {
                handler(e);
            }
        }
    }
};

export const useClickOutside = (
    _target: () => Element | null | undefined,
    callback: (e: MouseEvent) => void,
) => {
    onMounted(() => {
        clickOutsideHandlers.set(_target, callback);
        if (clickOutsideHandlers.size === 1) {
            document.documentElement.addEventListener('click', handleClickOutside, {capture: true});
        }
    });

    onBeforeUnmount(() => {
        clickOutsideHandlers.delete(_target);
        if (clickOutsideHandlers.size <= 0) {
            document.documentElement.removeEventListener('click', handleClickOutside);
        }
    });
};
