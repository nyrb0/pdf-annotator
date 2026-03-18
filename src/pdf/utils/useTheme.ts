import { useState, useEffect } from 'react';
import type { Theme } from '../types/types';
import { LIGHT, DARK } from './theme';

export function useTheme(): [Theme, boolean, (dark: boolean) => void] {
    const prefersDark = (): boolean => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

    const [dark, setDark] = useState<boolean>(() => {
        const saved = localStorage.getItem('pdfAnnotatorDark');
        if (saved !== null) return saved === 'true';
        return prefersDark();
    });

    useEffect(() => {
        localStorage.setItem('pdfAnnotatorDark', dark.toString());
    }, [dark]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent): void => {
            const saved = localStorage.getItem('pdfAnnotatorDark');
            if (saved === null) setDark(e.matches);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return [dark ? DARK : LIGHT, dark, setDark];
}
