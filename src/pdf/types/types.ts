// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpertType {
    id: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

export interface AnnotationRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Annotation {
    id: string;
    pageIndex: number;
    pageNum: number;
    typeId: string;
    rect: AnnotationRect;
    text: string;
    createdAt: string;
}

export interface PageData {
    pageNum: number;
    dataUrl: string;
    width: number;
    height: number;
}

export interface DrawingState {
    pageIndex: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export interface ModalData {
    pageIndex: number;
    rect: AnnotationRect;
    typeId: string;
    text: string;
}

export interface RelativeCoords {
    x: number;
    y: number;
}

// ── Minimal pdf.js types (avoids @types/pdfjs-dist) ─────────────────────────

export interface PdfViewport {
    width: number;
    height: number;
}

export interface PdfPage {
    getViewport(params: { scale: number }): PdfViewport;
    render(params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }): { promise: Promise<void> };
}

export interface PdfDocument {
    numPages: number;
    getPage(pageNum: number): Promise<PdfPage>;
}

export interface PdfJsLib {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDocument> };
}

declare global {
    interface Window {
        pdfjsLib: PdfJsLib;
    }
}

// ─── Design tokens ────────────────────────────────────────────────────────────

export interface Theme {
    bgPage: string;
    bgSurface: string;
    bgSubtle: string;
    bgInput: string;
    text: string;
    textMuted: string;
    textFaint: string;
    border: string;
    borderStrong: string;
    shadow: string;
    shadowModal: string;
    gradientMain: string;
    gradientSecondary: string;
    colorSecondary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const EXPERT_TYPES: ExpertType[] = [
    {
        id: 'scientific',
        label: 'Научная экспертиза',
        color: '#185FA5',
        bg: '#E6F1FB',
        border: '#378ADD',
    },
    {
        id: 'pedagogical',
        label: 'Научно-педагогическая',
        color: '#3B6D11',
        bg: '#EAF3DE',
        border: '#639922',
    },
    {
        id: 'antidiscrimination',
        label: 'Антидискриминационная и гендерная',
        color: '#993556',
        bg: '#FBEAF0',
        border: '#D4537E',
    },
    {
        id: 'practical',
        label: 'Практико-педагогическая',
        color: '#854F0B',
        bg: '#FAEEDA',
        border: '#BA7517',
    },
    {
        id: 'adapted',
        label: 'Адаптированная экспертиза',
        color: '#533AB7',
        bg: '#EEEDFE',
        border: '#7F77DD',
    },
];

export const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
export const PDF_JS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
export const MAX_PAGE_W = 900;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.1;
