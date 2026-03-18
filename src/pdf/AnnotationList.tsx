import { MouseEvent } from 'react';
import type { Annotation, ExpertType, Theme } from './types/types';
import styles from './styles/AnnotationList.module.scss';

interface AnnotationListProps {
    tk: Theme;
    annotations: Annotation[];
    expertTypes: ExpertType[];
    selectedId: string | null;
    onSelectAnnotation: (id: string | null) => void;
    onScrollToAnnotation: (id: string) => void;
    onDeleteAnnotation: (id: string) => void;
    getType: (id: string) => ExpertType;
}

export function AnnotationList({
    tk,
    annotations,
    expertTypes,
    selectedId,
    onSelectAnnotation,
    onScrollToAnnotation,
    onDeleteAnnotation,
    getType,
}: AnnotationListProps) {
    if (annotations.length === 0) {
        return <div className={styles.annotationList__empty}>Нет комментариев</div>;
    }

    return (
        <>
            {annotations.map(ann => {
                const t = getType(ann.typeId);
                const isSelected = selectedId === ann.id;

                return (
                    <div
                        key={ann.id}
                        className={`${styles.annotationList__item} ${isSelected ? styles.selected : ''}`}
                        style={
                            {
                                '--selected-bg': t.bg,
                                '--selected-border': t.border,
                                '--type-bg': t.bg,
                                '--type-color': t.color,
                                '--type-border': t.border,
                                '--text': tk.text,
                                '--text-faint': tk.textFaint,
                                '--border': tk.border,
                                '--bg-subtle': tk.bgSubtle,
                            } as React.CSSProperties
                        }
                        onClick={() => {
                            onSelectAnnotation(isSelected ? null : ann.id);
                            if (!isSelected) {
                                setTimeout(() => onScrollToAnnotation(ann.id), 0);
                            }
                        }}
                    >
                        <div className={styles.annotationList__item__header}>
                            <span className={styles.annotationList__item__type}>{t.label}</span>
                            <button
                                className={styles.annotationList__item__delete}
                                onClick={(e: MouseEvent) => {
                                    e.stopPropagation();
                                    onDeleteAnnotation(ann.id);
                                }}
                                title='Удалить'
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.annotationList__item__text}>{ann.text}</div>
                        <div className={styles.annotationList__item__footer}>
                            Стр. {ann.pageNum} · {new Date(ann.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
