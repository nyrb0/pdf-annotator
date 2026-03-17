import { useState, useRef, useEffect, useCallback } from "react";

// Импорты только для типов
import type { ChangeEvent, CSSProperties, MouseEvent } from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpertType {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface AnnotationRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Annotation {
  id: string;
  pageIndex: number;
  pageNum: number;
  typeId: string;
  rect: AnnotationRect;
  text: string;
  createdAt: string;
}

interface PageData {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface DrawingState {
  pageIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ModalData {
  pageIndex: number;
  rect: AnnotationRect;
  typeId: string;
  text: string;
}

interface RelativeCoords {
  x: number;
  y: number;
}

// ── Minimal pdf.js types (avoids @types/pdfjs-dist) ─────────────────────────

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfPage {
  getViewport(params: { scale: number }): PdfViewport;
  render(params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }): { promise: Promise<void> };
}

interface PdfDocument {
  numPages: number;
  getPage(pageNum: number): Promise<PdfPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDocument> };
}

declare global {
  interface Window {
    pdfjsLib: PdfJsLib;
  }
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Hardcoded hex values — no CSS variables, works in any React environment.

interface Theme {
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
}

const LIGHT: Theme = {
  bgPage: "#F5F4F1",
  bgSurface: "#FFFFFF",
  bgSubtle: "#F0EEE9",
  bgInput: "#F7F6F3",
  text: "#1A1916",
  textMuted: "#6B6863",
  textFaint: "#9B9790",
  border: "#E2DED7",
  borderStrong: "#C8C4BC",
  shadow: "0 2px 12px rgba(0,0,0,0.10)",
  shadowModal: "0 8px 32px rgba(0,0,0,0.18)",
};

const DARK: Theme = {
  bgPage: "#1A1916",
  bgSurface: "#242320",
  bgSubtle: "#2E2C29",
  bgInput: "#2A2826",
  text: "#F0EDE8",
  textMuted: "#A09C96",
  textFaint: "#6B6763",
  border: "#3A3834",
  borderStrong: "#4E4B46",
  shadow: "0 2px 12px rgba(0,0,0,0.40)",
  shadowModal: "0 8px 32px rgba(0,0,0,0.55)",
};

function useTheme(): Theme {
  const prefersDark = (): boolean =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

  const [dark, setDark] = useState<boolean>(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent): void => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return dark ? DARK : LIGHT;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPERT_TYPES: ExpertType[] = [
  {
    id: "scientific",
    label: "Научная экспертиза",
    color: "#185FA5",
    bg: "#E6F1FB",
    border: "#378ADD",
  },
  {
    id: "pedagogical",
    label: "Научно-педагогическая",
    color: "#3B6D11",
    bg: "#EAF3DE",
    border: "#639922",
  },
  {
    id: "antidiscrimination",
    label: "Антидискриминационная и гендерная",
    color: "#993556",
    bg: "#FBEAF0",
    border: "#D4537E",
  },
  {
    id: "practical",
    label: "Практико-педагогическая",
    color: "#854F0B",
    bg: "#FAEEDA",
    border: "#BA7517",
  },
  {
    id: "adapted",
    label: "Адаптированная экспертиза",
    color: "#533AB7",
    bg: "#EEEDFE",
    border: "#7F77DD",
  },
];

const PDF_JS_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_JS_WORKER =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MAX_PAGE_W = 900;

// ─── Storage helpers ──────────────────────────────────────────────────────────

function downloadJSON(list: Annotation[]): void {
  const blob = new Blob([JSON.stringify(list, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `annotations_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDFAnnotator() {
  const tk = useTheme();

  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [activeTypeId, setActiveTypeId] = useState<string>(EXPERT_TYPES[0].id);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<Record<number, HTMLImageElement | null>>({});

  // ── Load pdf.js lazily ────────────────────────────────────────────────────
  const loadPdfJs = useCallback((): Promise<PdfJsLib> => {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise<PdfJsLib>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDF_JS_CDN;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }, []);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file || file.type !== "application/pdf") return;

      setLoadingPdf(true);
      setPdfFileName(file.name);

      try {
        const lib = await loadPdfJs();
        const buf = await file.arrayBuffer();
        const doc = await lib.getDocument({ data: buf }).promise;
        const result: PageData[] = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1.5 });
          const cv = document.createElement("canvas");
          cv.width = vp.width;
          cv.height = vp.height;
          const ctx = cv.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          result.push({
            pageNum: i,
            dataUrl: cv.toDataURL(),
            width: vp.width,
            height: vp.height,
          });
        }

        setPages(result);
      } catch (err) {
        console.error("PDF load error:", err);
      } finally {
        setLoadingPdf(false);
      }
    },
    [loadPdfJs],
  );

  // ── Mouse coordinate conversion ───────────────────────────────────────────
  const getCoords = (
    e: MouseEvent,
    pageIndex: number,
  ): RelativeCoords | null => {
    const el = imgRefs.current[pageIndex];
    const page = pages[pageIndex];
    if (!el || !page) return null;
    const r = el.getBoundingClientRect();
    const sx = page.width / r.width;
    const sy = page.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  // ── Drawing handlers ──────────────────────────────────────────────────────
  const onMouseDown = (
    e: MouseEvent<HTMLImageElement>,
    pageIndex: number,
  ): void => {
    if (e.button !== 0) return;
    const c = getCoords(e, pageIndex);
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
    const c = getCoords(e, drawing.pageIndex);
    if (!c) return;
    setDrawing((d) => (d ? { ...d, currentX: c.x, currentY: c.y } : d));
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
      text: "",
    });
    setDrawing(null);
  };

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
    setAnnotations((prev) => [...prev, ann]);
    setModalData(null);
  };

  const deleteAnnotation = (id: string): void => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────
  const getType = (id: string): ExpertType =>
    EXPERT_TYPES.find((t) => t.id === id) ?? EXPERT_TYPES[0];

  const pageAnns = (pi: number): Annotation[] =>
    annotations.filter((a) => a.pageIndex === pi);

  const filteredAnns: Annotation[] =
    filterType === "all"
      ? annotations
      : annotations.filter((a) => a.typeId === filterType);

  // Scale annotation rect from PDF coords → display px
  const scaledRect = (
    rect: AnnotationRect,
    pageIndex: number,
  ): AnnotationRect => {
    const page = pages[pageIndex];
    if (!page) return rect;
    const sx = Math.min(page.width, MAX_PAGE_W) / page.width;
    return { x: rect.x * sx, y: rect.y * sx, w: rect.w * sx, h: rect.h * sx };
  };

  // Live drawing preview rect in display px
  const previewRect = (pageIndex: number): AnnotationRect | null => {
    if (!drawing || drawing.pageIndex !== pageIndex) return null;
    const page = pages[pageIndex];
    if (!page) return null;
    const sx = Math.min(page.width, MAX_PAGE_W) / page.width;
    return {
      x: Math.min(drawing.startX, drawing.currentX) * sx,
      y: Math.min(drawing.startY, drawing.currentY) * sx,
      w: Math.abs(drawing.currentX - drawing.startX) * sx,
      h: Math.abs(drawing.currentY - drawing.startY) * sx,
    };
  };

  // ─── Reusable inline style builders ──────────────────────────────────────

  const baseBtn = (overrides?: CSSProperties): CSSProperties => ({
    background: tk.bgSubtle,
    border: `1px solid ${tk.border}`,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    color: tk.text,
    fontFamily: "inherit",
    ...overrides,
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
        background: tk.bgPage,
        overflow: "hidden",
        color: tk.text,
        fontSize: 14,
      }}
    >
      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <aside
          style={{
            width: 296,
            minWidth: 260,
            background: tk.bgSurface,
            borderRight: `1px solid ${tk.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Header + upload ── */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${tk.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: tk.text }}>
                АИС ЭКСПЕРТ
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                style={baseBtn({
                  border: "none",
                  background: "transparent",
                  padding: "3px 7px",
                  fontSize: 16,
                  color: tk.textMuted,
                })}
                aria-label="Закрыть панель"
              >
                ✕
              </button>
            </div>

            <label style={{ display: "block", cursor: "pointer" }}>
              <div
                style={{
                  border: `1.5px dashed ${tk.borderStrong}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  textAlign: "center",
                  background: tk.bgSubtle,
                  fontSize: 13,
                  color: tk.textMuted,
                }}
              >
                {pdfFileName ? `📄 ${pdfFileName}` : "📂 Загрузить PDF файл"}
              </div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* ── Type selector ── */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${tk.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: tk.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Тип комментария
            </div>

            {EXPERT_TYPES.map((t) => {
              const active = activeTypeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTypeId(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 9px",
                    marginBottom: 3,
                    borderRadius: 6,
                    border: active
                      ? `1.5px solid ${t.border}`
                      : "1.5px solid transparent",
                    background: active ? t.bg : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: t.color,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12.5,
                      color: active ? t.color : tk.textMuted,
                      fontWeight: active ? 600 : 400,
                      lineHeight: 1.35,
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Filter row ── */}
          <div
            style={{
              padding: "10px 14px 8px",
              borderBottom: `1px solid ${tk.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: tk.textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Комментарии ({filteredAnns.length})
            </span>
            <select
              value={filterType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFilterType(e.target.value)
              }
              style={{
                fontSize: 11,
                padding: "3px 6px",
                borderRadius: 4,
                border: `1px solid ${tk.border}`,
                background: tk.bgInput,
                color: tk.textMuted,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="all">Все</option>
              {EXPERT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Annotation list ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
            {filteredAnns.length === 0 ? (
              <div
                style={{
                  padding: "28px 0",
                  textAlign: "center",
                  color: tk.textFaint,
                  fontSize: 13,
                }}
              >
                Нет комментариев
              </div>
            ) : (
              filteredAnns.map((ann) => {
                const t = getType(ann.typeId);
                const isSelected = selectedId === ann.id;
                return (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedId(isSelected ? null : ann.id)}
                    style={{
                      padding: "9px 11px",
                      marginBottom: 5,
                      borderRadius: 8,
                      border: isSelected
                        ? `1.5px solid ${t.border}`
                        : `1px solid ${tk.border}`,
                      background: isSelected ? t.bg : tk.bgSubtle,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: t.color,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: t.bg,
                          border: `1px solid ${t.border}`,
                          lineHeight: 1.4,
                        }}
                      >
                        {t.label}
                      </span>
                      <button
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        style={baseBtn({
                          border: "none",
                          background: "transparent",
                          padding: "0 2px",
                          fontSize: 13,
                          color: tk.textFaint,
                          marginLeft: 6,
                          flexShrink: 0,
                        })}
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: tk.text,
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}
                    >
                      {ann.text}
                    </div>
                    <div style={{ fontSize: 11, color: tk.textFaint }}>
                      Стр. {ann.pageNum} ·{" "}
                      {new Date(ann.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Export ── */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: `1px solid ${tk.border}`,
            }}
          >
            <button
              onClick={() => downloadJSON(annotations)}
              style={baseBtn({
                width: "100%",
                padding: "8px 0",
                fontWeight: 500,
              })}
            >
              ⬇ Экспорт JSON
            </button>
          </div>
        </aside>
      )}

      {/* ═══ MAIN AREA ═════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Topbar ── */}
        <div
          style={{
            padding: "9px 16px",
            background: tk.bgSurface,
            borderBottom: `1px solid ${tk.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: 44,
          }}
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={baseBtn({ padding: "5px 10px" })}
            >
              ☰ Панель
            </button>
          )}

          <span style={{ fontSize: 13, color: tk.textMuted }}>
            {pdfFileName
              ? `${pdfFileName} · ${pages.length} стр.`
              : "Загрузите PDF для начала работы"}
          </span>

          {pages.length > 0 && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getType(activeTypeId).color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: tk.textMuted }}>
                {getType(activeTypeId).label} · выделите область
              </span>
            </div>
          )}
        </div>

        {/* ── Scrollable PDF area ── */}
        <div
          ref={containerRef}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            userSelect: "none",
          }}
        >
          {/* Loading */}
          {loadingPdf && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 200,
                color: tk.textMuted,
                fontSize: 14,
              }}
            >
              ⏳ Загрузка PDF...
            </div>
          )}

          {/* Empty drop zone */}
          {!pdfFileName && !loadingPdf && (
            <label
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
                width: "100%",
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
              <div style={{ fontSize: 13, color: tk.textFaint }}>
                Нажмите или перетащите файл
              </div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          )}

          {/* ── Pages ── */}
          {pages.map((page, pageIndex) => {
            const anns = pageAnns(pageIndex);
            const preview = previewRect(pageIndex);
            const activeT = getType(activeTypeId);

            return (
              <div
                key={pageIndex}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Page wrapper */}
                <div
                  style={{
                    position: "relative",
                    boxShadow: tk.shadow,
                    borderRadius: 3,
                    lineHeight: 0,
                    border: `1px solid ${tk.border}`,
                  }}
                >
                  {/* PDF page image */}
                  <img
                    ref={(el) => {
                      imgRefs.current[pageIndex] = el;
                    }}
                    src={page.dataUrl}
                    alt={`Страница ${page.pageNum}`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      width: Math.min(page.width, MAX_PAGE_W),
                      cursor: "crosshair",
                    }}
                    draggable={false}
                    onMouseDown={(e: MouseEvent<HTMLImageElement>) =>
                      onMouseDown(e, pageIndex)
                    }
                  />

                  {/* ── Annotation overlays ── */}
                  {anns.map((ann) => {
                    const t = getType(ann.typeId);
                    const sr = scaledRect(ann.rect, pageIndex);
                    const isSelected = selectedId === ann.id;

                    return (
                      <div
                        key={ann.id}
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          setSelectedId(isSelected ? null : ann.id);
                        }}
                        title={ann.text}
                        style={{
                          position: "absolute",
                          left: sr.x,
                          top: sr.y,
                          width: sr.w,
                          height: sr.h,
                          border: `2px solid ${t.border}`,
                          background: `${t.bg}66`,
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        {/* Type chip */}
                        <div
                          style={{
                            position: "absolute",
                            top: -1,
                            left: -1,
                            background: t.color,
                            color: "#FFFFFF",
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: "0 0 4px 0",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1.5,
                          }}
                        >
                          {t.label}
                        </div>

                        {/* Selected tooltip */}
                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 5px)",
                              left: 0,
                              background: tk.bgSurface,
                              border: `1.5px solid ${t.border}`,
                              borderRadius: 10,
                              padding: "11px 13px",
                              zIndex: 100,
                              minWidth: 220,
                              maxWidth: 300,
                              boxShadow: tk.shadowModal,
                              color: tk.text,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: t.color,
                                fontWeight: 700,
                                marginBottom: 5,
                              }}
                            >
                              {t.label}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                lineHeight: 1.55,
                                marginBottom: 8,
                                color: tk.text,
                              }}
                            >
                              {ann.text}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{ fontSize: 11, color: tk.textFaint }}
                              >
                                {new Date(ann.createdAt).toLocaleString(
                                  "ru-RU",
                                )}
                              </span>
                              <button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  deleteAnnotation(ann.id);
                                }}
                                style={{
                                  background: "#FCEBEB",
                                  border: "1px solid #F09595",
                                  borderRadius: 5,
                                  cursor: "pointer",
                                  color: "#791F1F",
                                  fontSize: 11,
                                  padding: "2px 9px",
                                  fontWeight: 600,
                                  fontFamily: "inherit",
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

                  {/* ── Live draw preview ── */}
                  {preview !== null && (
                    <div
                      style={{
                        position: "absolute",
                        left: preview.x,
                        top: preview.y,
                        width: preview.w,
                        height: preview.h,
                        border: `2px dashed ${activeT.border}`,
                        background: `${activeT.bg}44`,
                        pointerEvents: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>

                {/* Page label */}
                <div
                  style={{ marginTop: 6, fontSize: 11, color: tk.textFaint }}
                >
                  Страница {page.pageNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ MODAL ══════════════════════════════════════════════════════════ */}
      {modalData !== null && (
        <div
          onClick={() => setModalData(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e: MouseEvent) => e.stopPropagation()}
            style={{
              background: tk.bgSurface,
              borderRadius: 14,
              padding: "22px 24px",
              width: "100%",
              maxWidth: 480,
              boxShadow: tk.shadowModal,
              border: `1px solid ${tk.border}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: tk.text,
                marginBottom: 16,
              }}
            >
              Добавить комментарий
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: tk.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Тип экспертизы
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {EXPERT_TYPES.map((t) => {
                  const active = modalData.typeId === t.id;
                  return (
                    <label
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        cursor: "pointer",
                        padding: "6px 10px",
                        borderRadius: 7,
                        border: active
                          ? `1.5px solid ${t.border}`
                          : `1.5px solid ${tk.border}`,
                        background: active ? t.bg : tk.bgSubtle,
                      }}
                    >
                      <input
                        type="radio"
                        name="expertType"
                        value={t.id}
                        checked={active}
                        onChange={() =>
                          setModalData((d) => (d ? { ...d, typeId: t.id } : d))
                        }
                        style={{
                          accentColor: t.color,
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: active ? t.color : tk.textMuted,
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {t.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 11,
                  color: tk.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 7,
                }}
              >
                Замечание / комментарий
              </div>
              <textarea
                autoFocus
                value={modalData.text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setModalData((d) => (d ? { ...d, text: e.target.value } : d))
                }
                placeholder="Опишите замечание или ошибку..."
                style={{
                  width: "100%",
                  minHeight: 96,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: `1px solid ${tk.borderStrong}`,
                  background: tk.bgInput,
                  color: tk.text,
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Action buttons */}
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setModalData(null)}
                style={baseBtn({ padding: "8px 18px" })}
              >
                Отмена
              </button>
              <button
                onClick={saveComment}
                disabled={!modalData.text.trim()}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: modalData.text.trim()
                    ? getType(modalData.typeId).color
                    : tk.borderStrong,
                  color: "#FFFFFF",
                  cursor: modalData.text.trim() ? "pointer" : "not-allowed",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  opacity: modalData.text.trim() ? 1 : 0.55,
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
