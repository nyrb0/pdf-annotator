import type { MouseEvent } from 'react';
import type { PageData, AnnotationRect, Annotation, Theme, ExpertType } from './types/types';
import styles from './styles/PDFPage.module.scss';

interface PDFPageProps {
    tk: Theme;
    page: PageData;
    pageIndex: number;
    annotations: Annotation[];
    previewRect: AnnotationRect | null;
    selectedId: string | null;
    zoom: number;
    expertTypes: ExpertType[];
    getType: (id: string) => ExpertType;
    onAnnotationClick: (id: string, isSelected: boolean) => void;
    onMouseDown: (e: MouseEvent<HTMLImageElement>) => void;
    onDeleteAnnotation: (id: string) => void;
    scaledRect: (rect: AnnotationRect) => AnnotationRect;
    imgRef: (el: HTMLImageElement | null) => void;
    annotationRef: (id: string, el: HTMLDivElement | null) => void;
}

export function PDFPage({
    tk,
    page,
    pageIndex,
    annotations,
    previewRect,
    selectedId,
    zoom,
    expertTypes,
    getType,
    onAnnotationClick,
    onMouseDown,
    onDeleteAnnotation,
    scaledRect,
    imgRef,
    annotationRef,
}: PDFPageProps) {
    const MAX_PAGE_W = 900;
    const activeType = expertTypes[0];

    return (
        <div
            className={styles.pdfPage}
            style={{
                ['--border' as string]: tk.border,
                ['--shadow' as string]: tk.shadow,
                ['--shadow-modal' as string]: tk.shadowModal,
                ['--text-faint' as string]: tk.textFaint,
            }}
        >
            <div className={styles.pageWrapper}>
                <img
                    ref={imgRef}
                    src={page.dataUrl}
                    alt={`Страница ${page.pageNum}`}
                    style={{ width: Math.min(page.width, MAX_PAGE_W) * zoom }}
                    draggable={false}
                    onMouseDown={onMouseDown}
                />

                {annotations.map(ann => {
                    const t = getType(ann.typeId);
                    const sr = scaledRect(ann.rect);
                    const isSelected = selectedId === ann.id;

                    return (
                        <div
                            key={ann.id}
                            ref={el => annotationRef(ann.id, el)}
                            onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onAnnotationClick(ann.id, isSelected);
                            }}
                            title={ann.text}
                            className={styles.annotation}
                            style={{
                                left: sr.x,
                                top: sr.y,
                                width: sr.w,
                                height: sr.h,
                                border: `2px solid ${t.border}`,
                                background: `${t.bg}66`,
                                boxShadow: isSelected ? `0 0 0 3px ${t.bg}` : undefined,
                            }}
                        >
                            <div className={styles.chip} style={{ background: t.color }}>
                                {t.label}
                            </div>

                            {isSelected && (
                                <div
                                    className={styles.tooltip}
                                    style={{
                                        background: tk.bgSurface,
                                        border: `1.5px solid ${t.border}`,
                                        color: tk.text,
                                    }}
                                >
                                    <div className={styles.tooltipLabel} style={{ color: t.color }}>
                                        {t.label}
                                    </div>
                                    <div className={styles.tooltipText}>{ann.text}</div>
                                    <div className={styles.tooltipFooter}>
                                        <span className='date'>{new Date(ann.createdAt).toLocaleString('ru-RU')}</span>
                                        <button
                                            onClick={(e: MouseEvent) => {
                                                e.stopPropagation();
                                                onDeleteAnnotation(ann.id);
                                            }}
                                            className={styles.deleteBtn}
                                            style={{
                                                background: '#FCEBEB',
                                                border: '1px solid #F09595',
                                                color: '#791F1F',
                                            }}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {previewRect && (
                    <div
                        className={styles.previewRect}
                        style={{
                            left: previewRect.x,
                            top: previewRect.y,
                            width: previewRect.w,
                            height: previewRect.h,
                            border: `2px dashed ${activeType.border}`,
                            background: `${activeType.bg}44`,
                        }}
                    />
                )}
            </div>

            <div className={styles.pageLabel}>Страница {page.pageNum}</div>
        </div>
    );
}
