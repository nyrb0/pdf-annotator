import type { Theme, ExpertType } from './types/types';
import styles from './styles/Topbar.module.scss';
import { FaUserAlt } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
interface TopbarProps {
    tk: Theme;
    pdfFileName: string | null;
    pagesCount: number;
    sidebarOpen: boolean;
    onOpenSidebar: () => void;
    activeType: ExpertType;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    isDark: boolean;
    onToggleDarkMode: () => void;
    minZoom: number;
    maxZoom: number;
}

export function Topbar({
    tk,
    pdfFileName,
    pagesCount,
    sidebarOpen,
    onOpenSidebar,
    activeType,
    zoom,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    isDark,
    onToggleDarkMode,
    minZoom,
    maxZoom,
}: TopbarProps) {
    const { user } = useAuthStore();
    return (
        <div
            className={styles.topbar}
            style={{
                ['--border' as string]: tk.border,
                ['--bg-surface' as string]: tk.bgSurface,
                ['--bg-subtle' as string]: tk.bgSubtle,
                ['--bg-hover' as string]: tk.bgSubtle,
                ['--text' as string]: tk.text,
                ['--text-muted' as string]: tk.textMuted,
            }}
        >
            {!sidebarOpen && (
                <button onClick={onOpenSidebar} className={styles.btn}>
                    ☰ Панель
                </button>
            )}
            <span className={styles.fileInfo}>{pdfFileName ? `${pdfFileName} · ${pagesCount} стр.` : 'Загрузите PDF для начала работы'}</span>
            {pagesCount > 0 && (
                <div className={styles.right}>
                    <div className={styles.activeType}>
                        <span className={styles.dot} style={{ background: tk.colorSecondary }} />
                        <span className={styles.label}>{activeType.label} · выделите область</span>
                    </div>

                    {/* Zoom */}
                    <div className={styles.zoom}>
                        <button onClick={onZoomOut} disabled={zoom <= minZoom} className={styles.btn} title='Уменьшить'>
                            −
                        </button>

                        <div className={styles.zoomValue}>{Math.round(zoom * 100)}%</div>

                        <button onClick={onZoomIn} disabled={zoom >= maxZoom} className={styles.btn} title='Увеличить'>
                            +
                        </button>

                        <button onClick={onZoomReset} disabled={zoom === 1} className={`${styles.btn} ${styles.reset}`} title='Сбросить масштаб'>
                            100%
                        </button>
                    </div>
                </div>
            )}
            <button
                onClick={onToggleDarkMode}
                className={`${styles.btn} ${styles.themeBtn}`}
                style={{ marginLeft: pagesCount > 0 ? 0 : 'auto' }}
                title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
                {isDark ? '☀️' : '🌙'}
            </button>
            <div className={styles.profile}>
                <p>
                    {user?.surname} {user?.name}
                </p>

                <img
                    onClick={() => window.open(`http://localhost:5173/${user?.role}/profile`, '_blank')}
                    src='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoKZ5ev0ls_lfr-UBnDRwp5-Jh2u3INVeJig&s'
                    alt=''
                />
            </div>
        </div>
    );
}
