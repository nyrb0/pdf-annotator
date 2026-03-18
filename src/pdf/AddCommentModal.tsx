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

export function AddCommentModal({
    tk,
    isOpen,
    typeId,
    text,
    expertTypes,
    onTypeChange,
    onTextChange,
    onClose,
    onSave,
    getType,
}: AddCommentModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                style={{
                    background: tk.bgSurface,
                    border: `1px solid ${tk.border}`,
                    boxShadow: tk.shadowModal,
                }}
            >
                <div className={styles.modalHeader} style={{ color: tk.text }}>
                    Добавить комментарий
                </div>

                {/* Type selector */}
                <div style={{ marginBottom: 14 }}>
                    <div className={styles.typeLabel} style={{ color: tk.textFaint }}>
                        Тип экспертизы
                    </div>
                    <div className={styles.typeList}>
                        {expertTypes.map(t => {
                            const active = typeId === t.id;
                            return (
                                <label
                                    key={t.id}
                                    className={styles.typeItem}
                                    style={{
                                        border: active ? `1.5px solid ${t.border}` : `1.5px solid ${tk.border}`,
                                        background: active ? t.bg : tk.bgSubtle,
                                    }}
                                >
                                    <input
                                        type='radio'
                                        name='expertType'
                                        value={t.id}
                                        checked={active}
                                        onChange={() => onTypeChange(t.id)}
                                        style={{ accentColor: t.color }}
                                    />
                                    <span style={{ color: active ? t.color : tk.textMuted, fontWeight: active ? 600 : 400 }}>{t.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Textarea */}
                <div style={{ marginBottom: 18 }}>
                    <div className={styles.textareaLabel} style={{ color: tk.textFaint }}>
                        Замечание / комментарий
                    </div>
                    <textarea
                        autoFocus
                        value={text}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onTextChange(e.target.value)}
                        placeholder='Опишите замечание или ошибку...'
                        className={styles.textarea}
                        style={{
                            background: tk.bgInput,
                            border: `1px solid ${tk.borderStrong}`,
                            color: tk.text,
                        }}
                    />
                </div>

                {/* Action buttons */}
                <div className={styles.actions}>
                    <button
                        onClick={onClose}
                        className={`${styles.btn} ${styles.btnBase}`}
                        style={{ background: tk.bgSubtle, borderColor: tk.border, color: tk.text }}
                    >
                        Отмена
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!text.trim()}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{
                            background: tk.gradientMain,
                            opacity: text.trim() ? 1 : 0.55,
                            cursor: text.trim() ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
