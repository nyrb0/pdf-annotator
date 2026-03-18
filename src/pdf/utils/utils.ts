import type { PdfJsLib, PageData, RelativeCoords, AnnotationRect, Annotation } from '../types/types';
import { PDF_JS_CDN, PDF_JS_WORKER, MAX_PAGE_W } from '../types/types';
import { MouseEvent as ReactMouseEvent } from 'react';
// ── Load pdf.js lazily ────────────────────────────────────────────────────
export const loadPdfJs = (): Promise<PdfJsLib> => {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise<PdfJsLib>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PDF_JS_CDN;
        s.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER;
            resolve(window.pdfjsLib);
        };
        s.onerror = reject;
        document.head.appendChild(s);
    });
};

// ── Load PDF file ────────────────────────────────────────────────────────
export const loadPDFFile = async (file: File): Promise<PageData[]> => {
    const lib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    const result: PageData[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const cv = document.createElement('canvas');
        cv.width = vp.width;
        cv.height = vp.height;
        const ctx = cv.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        result.push({
            pageNum: i,
            dataUrl: cv.toDataURL(),
            width: vp.width,
            height: vp.height,
        });
    }

    return result;
};

// ── Mouse coordinate conversion ───────────────────────────────────────────
export const getCoords = (
    e: ReactMouseEvent,
    imgElement: HTMLImageElement | null,
    pageWidth: number,
    pageHeight: number,
    zoom: number,
): RelativeCoords | null => {
    if (!imgElement) return null;

    const r = imgElement.getBoundingClientRect();
    const baseWidth = Math.min(pageWidth, MAX_PAGE_W);
    const displayWidth = baseWidth * zoom;

    const sx = pageWidth / displayWidth;
    const displayHeight = (pageHeight / pageWidth) * displayWidth;
    const sy = pageHeight / displayHeight; // ✅ ВЕРНО

    return {
        x: (e.clientX - r.left) * sx,
        y: (e.clientY - r.top) * sy,
    };
};

// ── Scale annotation rect from PDF coords → display px ─────────────────────
export const scaledRect = (rect: AnnotationRect, pageWidth: number, zoom: number): AnnotationRect => {
    const baseWidth = Math.min(pageWidth, MAX_PAGE_W);
    const finalScale = (baseWidth / pageWidth) * zoom;

    return {
        x: rect.x * finalScale,
        y: rect.y * finalScale,
        w: rect.w * finalScale,
        h: rect.h * finalScale,
    };
};

// ── Storage helpers ──────────────────────────────────────────────────────
export const downloadJSON = (list: Annotation[]): void => {
    const blob = new Blob([JSON.stringify(list, null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};
