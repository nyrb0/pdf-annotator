import type { ChangeEvent } from 'react';
import type { ExpertType, Theme } from './types/types';
import styles from './styles/Sidebar.module.scss';

interface SidebarProps {
    tk: Theme;
    pdfFileName: string | null;
    sidebarOpen: boolean;
    onCloseSidebar: () => void;
    activeTypeId: string;
    onActiveTypeChange: (typeId: string) => void;
    expertTypes: ExpertType[];
    visibleAnnotationTypes: Set<string>;
    onToggleAnnotationType: (typeId: string) => void;
    filterType: string;
    onFilterTypeChange: (typeId: string) => void;
    filteredAnnotationsCount: number;
    annotationsList: React.ReactNode;
    onExportJSON: () => void;
}

export function Sidebar({
    tk,
    pdfFileName,
    sidebarOpen,
    onCloseSidebar,
    activeTypeId,
    onActiveTypeChange,
    expertTypes,
    visibleAnnotationTypes,
    onToggleAnnotationType,
    filterType,
    onFilterTypeChange,
    filteredAnnotationsCount,
    annotationsList,
    onExportJSON,
}: SidebarProps) {
    if (!sidebarOpen) return null;

    return (
        <aside
            className={styles.sidebar}
            style={{
                background: tk.bgSurface,
                borderRight: `1px solid ${tk.border}`,

                // CSS variables для темы
                ['--border' as string]: tk.border,
                ['--border-strong' as string]: tk.borderStrong,
                ['--text' as string]: tk.text,
                ['--text-muted' as string]: tk.textMuted,
                ['--text-faint' as string]: tk.textFaint,
                ['--bg-subtle' as string]: tk.bgSubtle,
                ['--bg-input' as string]: tk.bgInput,
            }}
        >
            {/* ── Header ── */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <span className={styles.title}>АИС ЭКСПЕРТ</span>

                    <button onClick={onCloseSidebar} className={styles.closeBtn} aria-label='Закрыть панель'>
                        ✕
                    </button>
                </div>

                <label style={{ display: 'block', cursor: 'pointer' }}>
                    <div className={styles.uploadBox}>{pdfFileName ? `📄 ${pdfFileName}` : '📂 Загрузить PDF файл'}</div>
                    <input type='file' accept='application/pdf' style={{ display: 'none' }} />
                </label>
            </div>

            {/* ── Тип комментария ── */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Тип комментария</div>

                {expertTypes.map(t => {
                    const active = activeTypeId === t.id;

                    return (
                        <button
                            key={t.id}
                            onClick={() => onActiveTypeChange(t.id)}
                            className={`${styles.typeBtn} ${active ? styles.active : ''}`}
                            style={{
                                border: active ? `1.5px solid ${t.border}` : '1.5px solid transparent',
                                background: active ? t.bg : 'transparent',
                            }}
                        >
                            <span className={styles.dot} style={{ background: t.color }} />
                            <span
                                className={styles.label}
                                style={{
                                    color: active ? t.color : 'var(--text-muted)',
                                }}
                            >
                                {t.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Видимость на PDF ── */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Показывать на странице</div>

                {expertTypes.map(t => {
                    const isVisible = visibleAnnotationTypes.has(t.id);

                    return (
                        <label key={t.id} className={styles.checkboxRow}>
                            <input
                                type='checkbox'
                                checked={isVisible}
                                onChange={() => onToggleAnnotationType(t.id)}
                                style={{ accentColor: t.color }}
                            />

                            <span
                                className={styles.label}
                                style={{
                                    color: isVisible ? t.color : 'var(--text-muted)',
                                    fontWeight: isVisible ? 600 : 400,
                                }}
                            >
                                {t.label}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* ── Filter ── */}
            <div className={styles.filterRow}>
                <span className={styles.title}>Комментарии ({filteredAnnotationsCount})</span>

                <select
                    value={filterType}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => onFilterTypeChange(e.target.value)}
                    className={styles.select}
                >
                    <option value='all'>Все</option>
                    {expertTypes.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* ── Список ── */}
            <div className={styles.list}>{annotationsList}</div>

            {/* ── Footer ── */}
            <div className={styles.footer}>
                <button
                    onClick={onExportJSON}
                    className={styles.primaryBtn}
                    style={{
                        background: tk.gradientMain,
                        boxShadow: `0 4px 12px rgba(12,44,28,0.3)`,
                    }}
                >
                    ⬇ Экспорт JSON
                </button>
            </div>
        </aside>
    );
}
