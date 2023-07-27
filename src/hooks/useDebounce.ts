import { useEffect, useRef, DependencyList } from 'react';

type Func = (...args: any[]) => any;

const useDebounce = (fn: Func, ms: number = 30, deps: DependencyList = []): [Func, () => void] => {
    const timeout = useRef<number | null>(null);
    const functionArgs = useRef<any[]>([]);

    const debouncedFunction = (...args: any[]) => {
        functionArgs.current = args;
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => {
            fn(...functionArgs.current);
        }, ms);
    }

    const cancel = () => {
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = null;
    }

    useEffect(() => {
        return cancel;
    }, deps);

    return [debouncedFunction, cancel];
}

export default useDebounce;
