import { useCallback, useState, useRef, useEffect } from "react";
import { Trash2, GripVertical, Pencil, Plus, EyeOff, Eye, Copy } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";
import type { SlideElement } from "../types";

const THUMB_W = 96;
const CANVAS_W = 960;
const THUMB_SCALE = THUMB_W / CANVAS_W;

function renderThumbElement(el: SlideElement): React.ReactNode {
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x * THUMB_SCALE,
    top: el.y * THUMB_SCALE,
    width: el.width * THUMB_SCALE,
    height: el.height * THUMB_SCALE,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
    overflow: "hidden",
  };

  switch (el.type) {
    case "text":
    case "title":
    case "subtitle":
      return <div key={el.id} style={{ ...style, color: el.textColor, fontSize: Math.max(4, el.fontSize * THUMB_SCALE), fontWeight: el.fontWeight, fontFamily: el.fontFamily, textAlign: el.textAlign, lineHeight: `${el.lineHeight || 1.4}`, padding: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{el.content}</div>;
    case "image":
      return <div key={el.id} style={{ ...style, borderRadius: (el.borderRadius || 0) * THUMB_SCALE }}><img src={el.content} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} /></div>;
    case "rect":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: (el.borderRadius || 0) * THUMB_SCALE, border: el.borderWidth ? `${el.borderWidth * THUMB_SCALE}px solid ${el.borderColor}` : undefined }} />;
    case "circle":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: "50%", border: el.borderWidth ? `${el.borderWidth * THUMB_SCALE}px solid ${el.borderColor}` : undefined }} />;
    case "line":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, height: Math.max(el.height * THUMB_SCALE, 1) }} />;
    case "arrow":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(0% 20%, 70% 20%, 70% 0%, 100% 50%, 70% 100%, 70% 80%, 0% 80%)" }} />;
    case "triangle":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />;
    case "diamond":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />;
    case "star":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />;
    case "table":
      const tData: string[][] = el.content ? JSON.parse(el.content) : Array.from({ length: el.rows || 3 }, () => Array(el.cols || 3).fill(""));
      return <div key={el.id} style={{ ...style, border: "1px solid #CBD5E1", display: "grid", gridTemplateColumns: `repeat(${el.cols || 3}, 1fr)`, gridTemplateRows: `repeat(${el.rows || 3}, 1fr)` }}>{Array.from({ length: (el.cols || 3) * (el.rows || 3) }).map((_, i) => { const r = Math.floor(i / (el.cols || 3)); const c = i % (el.cols || 3); return <div key={i} style={{ borderRight: c < (el.cols || 3) - 1 ? "1px solid #E2E8F0" : "none", borderBottom: r < (el.rows || 3) - 1 ? "1px solid #E2E8F0" : "none", fontSize: 3, padding: 0, overflow: "hidden", color: el.textColor }}>{tData[r]?.[c] || ""}</div>; })}</div>;
    case "chart":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: 4, border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 1, padding: 2 }}>{[40, 65, 35, 80, 55].map((h, i) => <div key={i} style={{ width: "14%", height: `${h}%`, background: ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"][i], borderRadius: "1px 1px 0 0" }} />)}</div>;
    case "comment":
      return <div key={el.id} style={{ ...style, backgroundColor: "#FEF3C7", borderRadius: 4, border: "1px solid #F59E0B", fontSize: 4, padding: 1, color: "#92400E" }}>💬</div>;
    default:
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill !== "transparent" ? el.fill : "#E2E8F0", borderRadius: 4 }} />;
  }
}

export function Sidebar() {
  const { project, activeSlideId, setActiveSlide, deleteSlide, duplicateSlide, reorderSlides, updateSlide, addSlideWithLayout, moveElementToSlide, setContextMenu, editingSlideId, setEditingSlideId } = useStore();
  const slides = project?.slides ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("before");
  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (editingSlideId) {
      const slide = slides.find(s => s.id === editingSlideId);
      if (slide) {
        setEditingId(editingSlideId);
        setEditValue(slide.title);
      }
      setEditingSlideId(null);
    }
  }, [editingSlideId, slides, setEditingSlideId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
        if (activeSlideId && slides.length > 1) {
          const idx = slides.findIndex(s => s.id === activeSlideId);
          if (idx >= 0) {
            deleteSlide(activeSlideId);
            const next = slides[idx + 1] || slides[idx - 1];
            if (next) setActiveSlide(next.id);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingId, activeSlideId, slides, deleteSlide, setActiveSlide]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
    setDropIndex(null);

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ghost = target.cloneNode(true) as HTMLElement;
    ghost.style.width = `${rect.width}px`;
    ghost.style.opacity = "0.85";
    ghost.style.transform = "rotate(1.5deg) scale(1.02)";
    ghost.style.boxShadow = "0 12px 28px rgba(0,0,0,0.25)";
    ghost.style.pointerEvents = "none";
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    ghost.style.left = "-9999px";
    ghost.style.zIndex = "99999";
    ghost.classList.add("sidebar-slide-dragging-ghost");
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) {
      setDropIndex(null);
      return;
    }
    const slideEl = slideRefs.current.get(slides[index].id);
    if (slideEl) {
      const rect = slideEl.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDropPosition(e.clientY < midY ? "before" : "after");
    }
    setDropIndex(index);
  }, [dragIndex, slides]);

  const handleDragLeave = useCallback(() => {
    setDropIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const elementId = e.dataTransfer.getData("application/element-id");
    if (elementId) {
      e.stopPropagation();
      moveElementToSlide(elementId, slides[index].id);
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      let targetIndex = index;
      if (dropPosition === "after" && fromIndex < index) {
        targetIndex = index;
      } else if (dropPosition === "before" && fromIndex > index) {
        targetIndex = index;
      } else if (dropPosition === "after") {
        targetIndex = index;
      } else {
        targetIndex = index;
      }
      reorderSlides(fromIndex, targetIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  }, [dropPosition, moveElementToSlide, reorderSlides, slides]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  const startEditing = useCallback((slideId: string, currentTitle: string) => {
    setEditingId(slideId);
    setEditValue(currentTitle);
  }, []);

  const finishEditing = useCallback(() => {
    if (editingId && editValue.trim()) {
      updateSlide(editingId, { title: editValue.trim() });
    }
    setEditingId(null);
  }, [editingId, editValue, updateSlide]);

  return (
    <div className="sidebar" onClick={() => setContextMenu(null)}>
      <div className="sidebar-header">
        <span className="sidebar-label">{t("sidebar.slides")}</span>
        <span className="sidebar-count">{slides.length}</span>
      </div>
      <div className="sidebar-list"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDragLeave={() => { setDropIndex(null); }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="sidebar-slide-container">
            {dropIndex === index && dropPosition === "before" && dragIndex !== null && dragIndex !== index && (
              <div className="slide-drop-indicator slide-drop-indicator-before" />
            )}
            <div
              ref={(el) => { if (el) slideRefs.current.set(slide.id, el); else slideRefs.current.delete(slide.id); }}
              className={`sidebar-slide ${slide.id === activeSlideId ? "active" : ""} ${dragIndex === index ? "dragging" : ""} ${dropIndex === index && dragIndex !== null && dragIndex !== index ? "drop-target" : ""}`}
              onClick={() => setActiveSlide(slide.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{ animationDelay: `${index * 40}ms` }}
            data-slide-id={slide.id}
          >
            <div className="slide-drag-handle">
              <GripVertical size={14} />
            </div>
            <div className="slide-number">{index + 1}</div>
            <div className="slide-thumbnail-wrapper">
              <div className="slide-thumbnail" style={{ background: slide.background }}>
                {slide.elements.length === 0 ? (
                  <div className="slide-thumbnail-empty"></div>
                ) : (
                  [...slide.elements].sort((a, b) => a.zIndex - b.zIndex).map(renderThumbElement)
                )}
              </div>
              <div className="slide-title-wrapper">
                {editingId === slide.id ? (
                  <input
                    className="slide-title-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishEditing();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div className="slide-title-row">
                    <span className="slide-title">{slide.title}</span>
                    <button
                      className="slide-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(slide.id, slide.title);
                      }}
                      title={t("sidebar.renameSlide")}
                    >
                      <Pencil size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {slides.length > 1 && (
              <button
                className="slide-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(slide.id);
                }}
                title={t("sidebar.deleteSlide")}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              className="slide-duplicate"
              onClick={(e) => {
                e.stopPropagation();
                duplicateSlide(slide.id);
              }}
              title={t("sidebar.duplicateSlide")}
            >
              <Copy size={12} />
            </button>
            <button
              className={`slide-toggle-hidden ${slide.hidden ? "hidden" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                updateSlide(slide.id, { hidden: !slide.hidden });
              }}
              title={slide.hidden ? t("sidebar.showSlide") : t("sidebar.hideSlide")}
            >
              {slide.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            </div>
            {dropIndex === index && dropPosition === "after" && dragIndex !== null && dragIndex !== index && (
              <div className="slide-drop-indicator slide-drop-indicator-after" />
            )}
          </div>
        ))}
      </div>
      <button className="sidebar-add-btn" onClick={() => setLayoutPickerOpen(true)} title={t("sidebar.addSlide")}>
        <Plus size={14} />
        <span>{t("sidebar.addSlide")}</span>
      </button>
      {layoutPickerOpen && (
        <div className="layout-picker-overlay" onClick={() => setLayoutPickerOpen(false)}>
          <div className="layout-picker" onClick={(e) => e.stopPropagation()}>
            <div className="layout-picker-title">{t("sidebar.selectLayout")}</div>
            <div className="layout-picker-grid">
              {([
                { key: "blank" as const, label: t("sidebar.layoutBlank") },
                { key: "title" as const, label: t("sidebar.layoutTitle") },
                { key: "titleContent" as const, label: t("sidebar.layoutTitleContent") },
                { key: "twoContent" as const, label: t("sidebar.layoutTwoCol") },
                { key: "sectionHeader" as const, label: t("sidebar.layoutSectionHeader") },
                { key: "comparison" as const, label: t("sidebar.layoutComparison") },
                { key: "contentCaption" as const, label: t("sidebar.layoutContentCaption") },
                { key: "pictureCaption" as const, label: t("sidebar.layoutPictureCaption") },
              ]).map((layout) => (
                <button
                  key={layout.key}
                  className="layout-picker-item"
                  onClick={() => {
                    addSlideWithLayout(layout.key);
                    setLayoutPickerOpen(false);
                  }}
                >
                  <div className="layout-preview">
                    {layout.key === "blank" && <div className="layout-preview-blank" />}
                    {layout.key === "title" && (
                      <div style={{ position: "absolute", left: "10%", top: "30%", width: "80%", height: "20%", background: "#CBD5E1", borderRadius: 2 }} />
                    )}
                    {layout.key === "titleContent" && (<>
                      <div style={{ position: "absolute", left: "10%", top: "8%", width: "80%", height: "12%", background: "#CBD5E1", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "10%", top: "25%", width: "80%", height: "65%", background: "#E2E8F0", borderRadius: 2 }} />
                    </>)}
                    {layout.key === "twoContent" && (<>
                      <div style={{ position: "absolute", left: "10%", top: "8%", width: "80%", height: "12%", background: "#CBD5E1", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "5%", top: "25%", width: "42%", height: "65%", background: "#E2E8F0", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "53%", top: "25%", width: "42%", height: "65%", background: "#E2E8F0", borderRadius: 2 }} />
                    </>)}
                    {layout.key === "sectionHeader" && (<>
                      <div style={{ position: "absolute", left: "10%", top: "25%", width: "70%", height: "18%", background: "#CBD5E1", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "10%", top: "48%", width: "40%", height: "4%", background: "#22C55E", borderRadius: 1 }} />
                      <div style={{ position: "absolute", left: "10%", top: "56%", width: "60%", height: "10%", background: "#E2E8F0", borderRadius: 2 }} />
                    </>)}
                    {layout.key === "comparison" && (<>
                      <div style={{ position: "absolute", left: "10%", top: "8%", width: "80%", height: "12%", background: "#CBD5E1", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "5%", top: "25%", width: "42%", height: "30%", background: "#E2E8F0", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "53%", top: "25%", width: "42%", height: "30%", background: "#E2E8F0", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "5%", top: "60%", width: "42%", height: "30%", background: "#F1F5F9", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "53%", top: "60%", width: "42%", height: "30%", background: "#F1F5F9", borderRadius: 2 }} />
                    </>)}
                    {layout.key === "contentCaption" && (<>
                      <div style={{ position: "absolute", left: "10%", top: "8%", width: "80%", height: "65%", background: "#E2E8F0", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "10%", top: "78%", width: "80%", height: "12%", background: "#CBD5E1", borderRadius: 2 }} />
                    </>)}
                    {layout.key === "pictureCaption" && (<>
                      <div style={{ position: "absolute", left: "15%", top: "8%", width: "70%", height: "60%", background: "#94A3B8", borderRadius: 2 }} />
                      <div style={{ position: "absolute", left: "10%", top: "75%", width: "80%", height: "15%", background: "#CBD5E1", borderRadius: 2 }} />
                    </>)}
                  </div>
                  <span className="layout-label">{layout.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{sidebarStyles}</style>
    </div>
  );
}

const sidebarStyles = `
  .sidebar {
    width: var(--sidebar-width);
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: background var(--transition-normal), border-color var(--transition-normal);
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }
  .sidebar-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }
  .sidebar-count {
    font-size: 11px;
    font-weight: 600;
    background: var(--color-surface-hover);
    color: var(--color-text-secondary);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sidebar-slide-container {
    position: relative;
  }
  .slide-drop-indicator {
    height: 3px;
    border-radius: 2px;
    background: var(--color-cta);
    margin: 2px 8px;
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
    transition: opacity 0.15s;
    animation: dropIndicatorPulse 1s ease-in-out infinite;
  }
  .slide-drop-indicator-before {
    margin-bottom: 2px;
  }
  .slide-drop-indicator-after {
    margin-top: 2px;
  }
  @keyframes dropIndicatorPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .sidebar-slide {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
    animation: sidebarSlideIn 0.2s ease both;
  }
  @keyframes sidebarSlideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .sidebar-slide:hover {
    background: var(--color-surface-hover);
  }
  .sidebar-slide.active {
    background: var(--color-surface-hover);
    border-color: var(--color-cta);
  }
  .sidebar-slide.dragging {
    opacity: 0.35;
    transform: scale(0.97);
    border-style: dashed;
    border-color: var(--color-text-muted);
  }
  .sidebar-slide.drop-target {
    border-color: var(--color-cta);
    background: rgba(34, 197, 94, 0.05);
  }
  .sidebar-slide:has(.slide-toggle-hidden.hidden) {
    opacity: 0.5;
  }
  .slide-drag-handle {
    color: var(--color-text-muted);
    cursor: grab;
    opacity: 0;
    transition: opacity var(--transition-fast);
    flex-shrink: 0;
    margin-top: 12px;
  }
  .sidebar-slide:hover .slide-drag-handle,
  .sidebar-slide.dragging .slide-drag-handle {
    opacity: 1;
  }
  .slide-drag-handle:active {
    cursor: grabbing;
  }
  .slide-number {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    flex-shrink: 0;
    min-width: 20px;
    margin-top: 12px;
  }
  .slide-thumbnail-wrapper {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .slide-thumbnail {
    width: 100%;
    max-width: 160px;
    aspect-ratio: 16/9;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
  }
  [data-theme="light"] .slide-thumbnail {
    border: 1px solid #CBD5E1;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .slide-thumbnail-empty {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-muted);
    opacity: 0.5;
  }
  .slide-title-wrapper {
    width: 100%;
    max-width: 160px;
  }
  .slide-title-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .slide-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .slide-title-input {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text);
    background: var(--color-background);
    border: 1px solid var(--color-cta);
    border-radius: 4px;
    padding: 1px 4px;
    outline: none;
    width: 100%;
  }
  .slide-edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }
  .sidebar-slide:hover .slide-edit-btn {
    opacity: 1;
  }
  .slide-edit-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  .slide-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-fast);
  }
  .sidebar-slide:hover .slide-delete {
    opacity: 1;
  }
  .slide-delete:hover {
    background: #EF4444;
    color: white;
  }
  .slide-toggle-hidden {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    font-size: 10px;
  }
  .sidebar-slide:hover .slide-toggle-hidden {
    opacity: 1;
  }
  .slide-toggle-hidden.hidden {
    opacity: 1;
    color: #F59E0B;
  }
  .slide-duplicate {
    position: absolute;
    top: 4px;
    right: 24px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .sidebar-slide:hover .slide-duplicate {
    opacity: 1;
  }
  .slide-duplicate:hover {
    background: var(--color-surface-hover);
    color: var(--color-cta);
  }
  .sidebar-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    margin: var(--space-sm);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }
  .sidebar-add-btn:hover {
    border-color: var(--color-cta);
    color: var(--color-cta);
    background: rgba(34, 197, 94, 0.05);
  }
  .layout-picker-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }
  .layout-picker {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 20px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .layout-picker-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--color-text);
  }
  .layout-picker-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .layout-picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .layout-picker-item:hover {
    border-color: var(--color-cta);
    background: rgba(34, 197, 94, 0.05);
  }
  .layout-preview {
    width: 100%;
    aspect-ratio: 16/9;
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }
  .layout-preview-blank {
    width: 100%;
    height: 100%;
  }
  .layout-label {
    font-size: 10px;
    color: var(--color-text-secondary);
    text-align: center;
    line-height: 1.2;
  }
`;
