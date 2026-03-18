import type { ChangeEvent, MouseEvent } from 'react';
import type { ExpertType, Theme } from './types/types';
import styles from './styles/AddCommentModal.module.scss';

interface AddCommentModalProps {
    tk: Theme;
    isOpen: boolean;
    typeId: string;
    text: string;
    expertTypes: ExpertType[];
    onTypeChange: (typeId: string) => void;
    onTextChange: (text: string) => void;
    onClose: () => void;
    onSave: () => void;
    getType: (id: string) => ExpertType;
}

export function AddCommentModal({ tk, isOpen, typeId, text, expertTypes, onTypeChange, onTextChange, onClose, onSave }: AddCommentModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className={styles.modalOverlay}
            onClick={onClose}
            style={
                {
                    '--bg-surface': tk.bgSurface,
                    '--text': tk.text,
                    '--text-faint': tk.textFaint,
                    '--text-muted': tk.textMuted,
                    '--border': tk.border,
                    '--border-strong': tk.borderStrong,
                    '--bg-subtle': tk.bgSubtle,
                    '--bg-input': tk.bgInput,
                    '--gradient-main': tk.gradientMain,
                } as React.CSSProperties
            }
        >
            <div className={styles.modalContent} onClick={(e: MouseEvent) => e.stopPropagation()}>
                <div className={styles.modalTitle}>Добавить комментарий</div>

                {/* Type selector */}
                <div className={styles.typeSelector}>
                    <div className={styles.labelTitle}>Тип экспертизы</div>
                    <div className={styles.typeOptions}>
                        {expertTypes.map(t => {
                            const active = typeId === t.id;
                            return (
                                <label key={t.id} className={active ? 'active' : ''}>
                                    <input type='radio' name='expertType' value={t.id} checked={active} onChange={() => onTypeChange(t.id)} />
                                    <span className={active ? 'active' : ''}>{t.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Textarea */}
                <div className={styles.commentArea}>
                    <div className={styles.labelTitle}>Замечание / комментарий</div>
                    <textarea
                        autoFocus
                        value={text}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onTextChange(e.target.value)}
                        placeholder='Опишите замечание или ошибку...'
                    />
                </div>

                {/* Action buttons */}
                <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.base}`} onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className={`${styles.btn} ${styles.primary} ${!text.trim() ? styles.disabled : ''}`}
                        onClick={onSave}
                        disabled={!text.trim()}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
