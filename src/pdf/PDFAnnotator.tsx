import { useState, useRef, useCallback, ChangeEvent, MouseEvent } from 'react';

// Компоненты
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PDFPage } from './PDFPage';
import { AddCommentModal } from './AddCommentModal';
import { AnnotationList } from './AnnotationList';

// Типы и константы
import {
    EXPERT_TYPES,
    MAX_PAGE_W,
    MIN_ZOOM,
    MAX_ZOOM,
    ZOOM_STEP,
    type Annotation,
    type DrawingState,
    type ModalData,
    type PageData,
    type AnnotationRect,
    type RelativeCoords,
} from './types/types';

// Утилиты и хуки
import { useTheme } from './utils//useTheme';
import { loadPDFFile, getCoords, scaledRect, downloadJSON } from './utils/utils';

export default function PDFAnnotator() {
    const [tk, isDark, setIsDark] = useTheme();

    // State
    const [pdfFileName, setPdfFileName] = useState<string | null>(null);
    const [pages, setPages] = useState<PageData[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [drawing, setDrawing] = useState<DrawingState | null>(null);
    const [activeTypeId, setActiveTypeId] = useState<string>(EXPERT_TYPES[0].id);
    const [modalData, setModalData] = useState<ModalData | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [zoom, setZoom] = useState<number>(1);
    const [visibleAnnotationTypes, setVisibleAnnotationTypes] = useState<Set<string>>(new Set(EXPERT_TYPES.map(t => t.id)));

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRefs = useRef<Record<number, HTMLImageElement | null>>({});
    const annotationRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // ── File upload ───────────────────────────────────────────────────────────
    const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setLoadingPdf(true);
        setPdfFileName(file.name);

        try {
            const result = await loadPDFFile(file);
            setPages(result);
            setZoom(1);
        } catch (err) {
            console.error('PDF load error:', err);
        } finally {
            setLoadingPdf(false);
        }
    }, []);

    // ── Mouse coordinate conversion ───────────────────────────────────────────
    const getPageCoords = (e: MouseEvent, pageIndex: number): RelativeCoords | null => {
        const el = imgRefs.current[pageIndex];
        const page = pages[pageIndex];
        if (!el || !page) return null;
        return getCoords(e, el, page.width, page.height, zoom);
    };

    // ── Drawing handlers ──────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent<HTMLImageElement>, pageIndex: number): void => {
        if (e.button !== 0) return;
        const c = getPageCoords(e as MouseEvent, pageIndex);
        if (!c) return;
        setDrawing({
            pageIndex,
            startX: c.x,
            startY: c.y,
            currentX: c.x,
            currentY: c.y,
        });
    };

    const onMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
        if (!drawing) return;
        const c = getPageCoords(e as MouseEvent, drawing.pageIndex);
        if (!c) return;
        setDrawing(d => (d ? { ...d, currentX: c.x, currentY: c.y } : d));
    };

    const onMouseUp = (): void => {
        if (!drawing) return;
        const { pageIndex, startX, startY, currentX, currentY } = drawing;
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        if (w < 10 || h < 10) {
            setDrawing(null);
            return;
        }
        setModalData({
            pageIndex,
            rect: {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                w,
                h,
            },
            typeId: activeTypeId,
            text: '',
        });
        setDrawing(null);
    };

    // ── Scroll to annotation ──────────────────────────────────────────────────
    const scrollToAnnotation = useCallback((annotationId: string): void => {
        const element = annotationRefs.current[annotationId];
        const container = containerRef.current;

        if (!element || !container) return;

        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const scrollOffset = container.scrollTop + (elementRect.top - containerRect.top) - 100;

        container.scrollTo({
            top: scrollOffset,
            behavior: 'smooth',
        });
    }, []);

    // ── Annotation CRUD ───────────────────────────────────────────────────────
    const saveComment = (): void => {
        if (!modalData?.text.trim()) return;
        const ann: Annotation = {
            id: `ann_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            pageIndex: modalData.pageIndex,
            pageNum: modalData.pageIndex + 1,
            typeId: modalData.typeId,
            rect: modalData.rect,
            text: modalData.text,
            createdAt: new Date().toISOString(),
        };
        setAnnotations(prev => [...prev, ann]);
        setModalData(null);
    };

    const deleteAnnotation = (id: string): void => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    // ── Zoom handlers ────────────────────────────────────────────────────────
    const handleZoom = (delta: number): void => {
        setZoom(prev => {
            const newZoom = prev + delta;
            return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        });
    };

    // ── Toggle annotation type visibility ────────────────────────────────────
    const toggleAnnotationType = (typeId: string): void => {
        setVisibleAnnotationTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(typeId)) {
                newSet.delete(typeId);
            } else {
                newSet.add(typeId);
            }
            return newSet;
        });
    };

    // ── Derived helpers ───────────────────────────────────────────────────────
    const getType = (id: string) => EXPERT_TYPES.find(t => t.id === id) ?? EXPERT_TYPES[0];

    const pageAnns = (pi: number): Annotation[] => annotations.filter(a => a.pageIndex === pi).filter(a => visibleAnnotationTypes.has(a.typeId));

    const filteredAnns: Annotation[] = filterType === 'all' ? annotations : annotations.filter(a => a.typeId === filterType);

    const getScaledRect = (rect: AnnotationRect, pageIndex: number) => {
        const page = pages[pageIndex];
        if (!page) return rect;
        return scaledRect(rect, page.width, zoom);
    };

    const previewRect = (pageIndex: number): AnnotationRect | null => {
        if (!drawing || drawing.pageIndex !== pageIndex) return null;
        const page = pages[pageIndex];
        if (!page) return null;

        const baseWidth = Math.min(page.width, MAX_PAGE_W);
        const finalScale = (baseWidth / page.width) * zoom;

        return {
            x: Math.min(drawing.startX, drawing.currentX) * finalScale,
            y: Math.min(drawing.startY, drawing.currentY) * finalScale,
            w: Math.abs(drawing.currentX - drawing.startX) * finalScale,
            h: Math.abs(drawing.currentY - drawing.startY) * finalScale,
        };
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
                background: tk.bgPage,
                overflow: 'hidden',
                color: tk.text,
                fontSize: 14,
            }}
        >
            {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════ */}
            <Sidebar
                tk={tk}
                pdfFileName={pdfFileName}
                sidebarOpen={sidebarOpen}
                onCloseSidebar={() => setSidebarOpen(false)}
                activeTypeId={activeTypeId}
                onActiveTypeChange={setActiveTypeId}
                expertTypes={EXPERT_TYPES}
                visibleAnnotationTypes={visibleAnnotationTypes}
                onToggleAnnotationType={toggleAnnotationType}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                filteredAnnotationsCount={filteredAnns.length}
                annotationsList={
                    <AnnotationList
                        tk={tk}
                        annotations={filteredAnns}
                        expertTypes={EXPERT_TYPES}
                        selectedId={selectedId}
                        onSelectAnnotation={setSelectedId}
                        onScrollToAnnotation={scrollToAnnotation}
                        onDeleteAnnotation={deleteAnnotation}
                        getType={getType}
                    />
                }
                onExportJSON={() => downloadJSON(annotations)}
            />

            {/* ═══ MAIN AREA ═════════════════════════════════════════════════════ */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* ── Topbar ── */}
                <Topbar
                    tk={tk}
                    pdfFileName={pdfFileName}
                    pagesCount={pages.length}
                    sidebarOpen={sidebarOpen}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    activeType={getType(activeTypeId)}
                    zoom={zoom}
                    onZoomIn={() => handleZoom(ZOOM_STEP)}
                    onZoomOut={() => handleZoom(-ZOOM_STEP)}
                    onZoomReset={() => setZoom(1)}
                    isDark={isDark}
                    onToggleDarkMode={() => setIsDark(!isDark)}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                />

                {/* ── Scrollable PDF area ── */}
                <div
                    ref={containerRef}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 24,
                        userSelect: 'none',
                    }}
                >
                    {/* Loading */}
                    {loadingPdf && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                height: 200,
                                color: tk.textMuted,
                                fontSize: 16,
                            }}
                        >
                            <AnimatedLogo />
                            Загрузка PDF...
                        </div>
                    )}

                    {/* Empty drop zone */}
                    {!pdfFileName && !loadingPdf && (
                        <label
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 300,
                                width: '100%',
                                maxWidth: 560,
                                border: `2px dashed ${tk.borderStrong}`,
                                borderRadius: 14,
                                background: tk.bgSurface,
                                color: tk.textMuted,
                            }}
                        >
                            <div style={{ fontSize: 42, marginBottom: 14 }}>📄</div>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: tk.text,
                                    marginBottom: 5,
                                }}
                            >
                                Загрузите PDF файл
                            </div>
                            <div style={{ fontSize: 13, color: tk.textFaint }}>Нажмите или перетащите файл</div>
                            <input type='file' accept='application/pdf' onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    )}

                    {/* ── Pages ── */}
                    {pages.map((page, pageIndex) => {
                        const anns = pageAnns(pageIndex);
                        const preview = previewRect(pageIndex);

                        return (
                            <PDFPage
                                key={pageIndex}
                                tk={tk}
                                page={page}
                                pageIndex={pageIndex}
                                annotations={anns}
                                previewRect={preview}
                                selectedId={selectedId}
                                zoom={zoom}
                                expertTypes={EXPERT_TYPES}
                                getType={getType}
                                onAnnotationClick={(id, isSelected) => {
                                    setSelectedId(isSelected ? null : id);
                                }}
                                onMouseDown={e => onMouseDown(e, pageIndex)}
                                onDeleteAnnotation={deleteAnnotation}
                                scaledRect={rect => getScaledRect(rect, pageIndex)}
                                imgRef={el => {
                                    imgRefs.current[pageIndex] = el;
                                }}
                                annotationRef={(id, el) => {
                                    annotationRefs.current[id] = el;
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ═══ MODAL ══════════════════════════════════════════════════════════ */}
            <AddCommentModal
                tk={tk}
                isOpen={modalData !== null}
                typeId={modalData?.typeId ?? activeTypeId}
                text={modalData?.text ?? ''}
                expertTypes={EXPERT_TYPES}
                onTypeChange={typeId => setModalData(d => (d ? { ...d, typeId } : d))}
                onTextChange={text => setModalData(d => (d ? { ...d, text } : d))}
                onClose={() => setModalData(null)}
                onSave={saveComment}
                getType={getType}
            />
        </div>
    );
}

function AnimatedLogo() {
    return (
        <>
            <style>
                {`
          @keyframes floatMove {
            0%   { transform: translate(0px, 0px); }
            25%  { transform: translate(5px, -5px); }
            50%  { transform: translate(0px, -10px); }
            75%  { transform: translate(-5px, -5px); }
            100% { transform: translate(0px, 0px); }
          }
        `}
            </style>
            <img
                src='/logo.png'
                alt=''
                style={{
                    width: 50,
                    animation: 'floatMove 3s ease-in-out infinite',
                }}
            />
        </>
    );
}
