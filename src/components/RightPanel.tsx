import React, { useState, useCallback, useRef } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";
import { PropertiesPanel } from "./PropertiesPanel";
import type { AnimationCategory, AnimationType, AnimationTrigger, AnimationDirection, AnimationStep } from "../types";

const CATEGORY_OPTIONS: { id: AnimationCategory; label: string; color: string }[] = [
  { id: "enter", label: "animCatEnter", color: "#22C55E" },
  { id: "exit", label: "animCatExit", color: "#EF4444" },
  { id: "emphasis", label: "animCatEmphasis", color: "#F59E0B" },
  { id: "motion", label: "animCatMotion", color: "#3B82F6" },
];

const STYLE_OPTIONS: { id: AnimationType; label: string }[] = [
  { id: "appear", label: "ribbon.animAppear" },
  { id: "fade", label: "ribbon.animFade" },
  { id: "flyIn", label: "ribbon.animFlyIn" },
  { id: "float", label: "ribbon.animFloat" },
  { id: "split", label: "ribbon.animSplit" },
  { id: "wipe", label: "ribbon.animWipe" },
  { id: "shape", label: "ribbon.animShape" },
  { id: "wheel", label: "ribbon.animWheel" },
  { id: "randomBars", label: "ribbon.animRandomBars" },
  { id: "growTurn", label: "ribbon.animGrowTurn" },
  { id: "zoom", label: "ribbon.animZoom" },
  { id: "swivel", label: "ribbon.animSwivel" },
  { id: "bounce", label: "ribbon.animBounce" },
  { id: "blinds", label: "ribbon.animBlinds" },
];

const TRIGGER_OPTIONS: { id: AnimationTrigger; label: string }[] = [
  { id: "onClick", label: "ribbon.animOnClick" },
  { id: "withPrevious", label: "ribbon.animWithPrevious" },
  { id: "afterPrevious", label: "ribbon.animAfterPrevious" },
];

const DIRECTION_OPTIONS: { id: AnimationDirection; label: string }[] = [
  { id: "fromBottom", label: "ribbon.dirFromBottom" },
  { id: "fromRight", label: "ribbon.dirFromRight" },
  { id: "fromTop", label: "ribbon.dirFromTop" },
  { id: "fromLeft", label: "ribbon.dirFromLeft" },
  { id: "center", label: "ribbon.dirCenter" },
  { id: "horizontal", label: "ribbon.dirHorizontal" },
  { id: "vertical", label: "ribbon.dirVertical" },
];

function AnimationPanel() {
  const {
    project, activeSlideId,
    addAnimationStep, updateAnimationStep, removeAnimationStep, reorderAnimationStep,
    selectElement, selectedElementId,
  } = useStore();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [pickingTarget, setPickingTarget] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  const activeSlide = project?.slides.find(s => s.id === activeSlideId);
  const sequence: AnimationStep[] = activeSlide?.animationSequence || [];
  const sorted = [...sequence].sort((a, b) => a.order - b.order);

  const getElementName = useCallback((elementId: string) => {
    if (!activeSlide) return elementId;
    const el = activeSlide.elements.find(e => e.id === elementId);
    if (!el) return elementId;
    if (el.type === "text" || el.type === "title" || el.type === "subtitle") {
      return el.content?.slice(0, 15) || el.type;
    }
    return el.type;
  }, [activeSlide]);

  const handleAdd = useCallback(() => {
    if (!activeSlideId || !activeSlide) return;
    const targetId = selectedElementId || activeSlide.elements[0]?.id;
    if (!targetId) return;
    addAnimationStep(activeSlideId, {
      elementId: targetId,
      category: "enter",
      style: "fade",
      trigger: "onClick",
      duration: 0.5,
      delay: 0,
      direction: "fromBottom",
    });
  }, [activeSlideId, activeSlide, addAnimationStep, selectedElementId]);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    if (activeSlideId) {
      reorderAnimationStep(activeSlideId, dragIndexRef.current, index);
    }
    dragIndexRef.current = null;
  }, [activeSlideId, reorderAnimationStep]);

  const handleCanvasClick = useCallback(() => {
    if (!pickingTarget || !selectedStepId || !activeSlideId) return;
    const elId = selectedElementId;
    if (elId) {
      updateAnimationStep(activeSlideId, selectedStepId, { elementId: elId });
    }
    setPickingTarget(false);
  }, [pickingTarget, selectedStepId, activeSlideId, selectedElementId, updateAnimationStep]);

  React.useEffect(() => {
    if (pickingTarget) {
      window.addEventListener("click", handleCanvasClick, true);
      return () => window.removeEventListener("click", handleCanvasClick, true);
    }
  }, [pickingTarget, handleCanvasClick]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedStepId && activeSlideId) {
        e.preventDefault();
        removeAnimationStep(activeSlideId, selectedStepId);
        setSelectedStepId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStepId, activeSlideId, removeAnimationStep]);

  const selectedStep = sorted.find(s => s.id === selectedStepId);

  return (
    <div className="anim-panel">
      <div className="anim-panel-toolbar">
        <button className="anim-pane-btn" onClick={handleAdd} title={t("ribbon.animAddStep")}>
          <Plus size={14} />
        </button>
        <button className="anim-pane-btn" onClick={() => selectedStepId && activeSlideId && removeAnimationStep(activeSlideId, selectedStepId)} title={t("ribbon.animRemove")} disabled={!selectedStepId}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="anim-panel-list">
        {sorted.length === 0 && (
          <div className="anim-panel-empty">{t("ribbon.animNoSteps")}</div>
        )}
        {sorted.map((step, idx) => {
          const catInfo = CATEGORY_OPTIONS.find(c => c.id === step.category);
          const styleInfo = STYLE_OPTIONS.find(s => s.id === step.style);
          return (
            <div
              key={step.id}
              className={`anim-step-card ${selectedStepId === step.id ? "selected" : ""}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onClick={() => { setSelectedStepId(step.id); selectElement(step.elementId); }}
            >
              <div className="anim-step-grip"><GripVertical size={12} /></div>
              <div className="anim-step-indicator" style={{ background: catInfo?.color || "#888" }}>
                <span className="anim-step-number">{idx + 1}</span>
              </div>
              <div className="anim-step-info">
                <div className="anim-step-element">{getElementName(step.elementId)}</div>
                <div className="anim-step-detail">
                  <span className="anim-step-cat" style={{ color: catInfo?.color }}>{t(catInfo?.label || step.category)}</span>
                  <span className="anim-step-sep">·</span>
                  <span>{t(styleInfo?.label || step.style)}</span>
                </div>
              </div>
              <div className="anim-step-trigger">
                {step.trigger === "onClick" ? "🖱" : step.trigger === "withPrevious" ? "⏩" : "⏭"}
              </div>
            </div>
          );
        })}
      </div>
      {selectedStep && activeSlideId && (
        <div className="anim-panel-editor">
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animTarget")}</label>
            <button
              className={`anim-pick-btn ${pickingTarget ? "picking" : ""}`}
              onClick={() => setPickingTarget(!pickingTarget)}
            >
              {pickingTarget ? t("ribbon.animPicking") : getElementName(selectedStep.elementId)}
            </button>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animCategory")}</label>
            <select
              className="anim-editor-select"
              value={selectedStep.category}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { category: e.target.value as AnimationCategory })}
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{t(c.label)}</option>
              ))}
            </select>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animStyle")}</label>
            <select
              className="anim-editor-select"
              value={selectedStep.style}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { style: e.target.value as AnimationType })}
            >
              {STYLE_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>{t(s.label)}</option>
              ))}
            </select>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animTrigger")}</label>
            <select
              className="anim-editor-select"
              value={selectedStep.trigger}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { trigger: e.target.value as AnimationTrigger })}
            >
              {TRIGGER_OPTIONS.map(tr => (
                <option key={tr.id} value={tr.id}>{t(tr.label)}</option>
              ))}
            </select>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animDirection")}</label>
            <select
              className="anim-editor-select"
              value={selectedStep.direction}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { direction: e.target.value as AnimationDirection })}
            >
              {DIRECTION_OPTIONS.map(d => (
                <option key={d.id} value={d.id}>{t(d.label)}</option>
              ))}
            </select>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animDuration")}</label>
            <input
              type="number"
              className="anim-editor-input"
              min={0.1}
              max={5}
              step={0.1}
              value={selectedStep.duration}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { duration: parseFloat(e.target.value) || 0.5 })}
            />
            <span className="anim-editor-unit">s</span>
          </div>
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animDelay")}</label>
            <input
              type="number"
              className="anim-editor-input"
              min={0}
              max={10}
              step={0.1}
              value={selectedStep.delay}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { delay: parseFloat(e.target.value) || 0 })}
            />
            <span className="anim-editor-unit">s</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { rightPanelTab, rightPanelOpen, setRightPanelOpen, project, updateElement, activeSlideId, setSearchHighlight } = useStore();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [findResults, setFindResults] = useState<{ slideId: string; elementId: string }[]>([]);
  const [findIndex, setFindIndex] = useState(0);
  const [searchScope, setSearchScope] = useState<"all" | "current">("all");

  const performFind = useCallback(() => {
    if (!project || !findText) {
      setFindResults([]);
      setSearchHighlight(null);
      return;
    }
    const results: { slideId: string; elementId: string }[] = [];
    const slides = searchScope === "current"
      ? project.slides.filter((s) => s.id === activeSlideId)
      : project.slides;
    slides.forEach((slide) => {
      slide.elements.forEach((el) => {
        if ("content" in el && typeof el.content === "string" && el.content.includes(findText)) {
          results.push({ slideId: slide.id, elementId: el.id });
        }
      });
    });
    setFindResults(results);
    setFindIndex(0);
    if (results.length > 0) {
      const elementIds = results.map((r) => r.elementId);
      setSearchHighlight({ keyword: findText, elementIds, activeId: results[0].elementId });
      useStore.getState().setActiveSlide(results[0].slideId);
      useStore.getState().selectElement(results[0].elementId);
    } else {
      setSearchHighlight(null);
    }
  }, [project, findText, searchScope, activeSlideId, setSearchHighlight]);

  const goToFindResult = useCallback((dir: "prev" | "next") => {
    if (findResults.length === 0) return;
    const next = dir === "next"
      ? (findIndex + 1) % findResults.length
      : (findIndex - 1 + findResults.length) % findResults.length;
    setFindIndex(next);
    const r = findResults[next];
    useStore.getState().setActiveSlide(r.slideId);
    useStore.getState().selectElement(r.elementId);
    setSearchHighlight({ keyword: findText, elementIds: findResults.map((f) => f.elementId), activeId: r.elementId });
  }, [findResults, findIndex, findText, setSearchHighlight]);

  const performReplace = useCallback(() => {
    if (!project || !findText || findResults.length === 0) return;
    const r = findResults[findIndex];
    const slide = project.slides.find((s) => s.id === r.slideId);
    const el = slide?.elements.find((e) => e.id === r.elementId);
    if (el && "content" in el && typeof el.content === "string") {
      updateElement(el.id, { content: (el.content as string).replace(findText, replaceText) });
    }
    performFind();
  }, [project, findText, replaceText, findResults, findIndex, updateElement, performFind]);

  const performReplaceAll = useCallback(() => {
    if (!project || !findText) return;
    const slides = searchScope === "current"
      ? project.slides.filter((s) => s.id === activeSlideId)
      : project.slides;
    slides.forEach((slide) => {
      slide.elements.forEach((el) => {
        if ("content" in el && typeof el.content === "string" && (el.content as string).includes(findText)) {
          updateElement(el.id, { content: (el.content as string).replaceAll(findText, replaceText) });
        }
      });
    });
    setFindResults([]);
    setFindIndex(0);
    setSearchHighlight(null);
  }, [project, findText, replaceText, updateElement, searchScope, activeSlideId, setSearchHighlight]);

  if (!rightPanelOpen) return null;

  const title = rightPanelTab === "properties" ? t("properties.title")
    : rightPanelTab === "animation" ? t("ribbon.animPane")
    : t("ribbon.findReplace");

  return (
    <div className="right-panel">
      <style>{rightPanelStyles}</style>
      <div className="right-panel-header">
        <span className="right-panel-title">{title}</span>
        <button className="right-panel-close" onClick={() => { setRightPanelOpen(false); setSearchHighlight(null); }}>
          <X size={14} />
        </button>
      </div>
      <div className="right-panel-content">
        {rightPanelTab === "properties" ? (
          <PropertiesPanel />
        ) : rightPanelTab === "animation" ? (
          <AnimationPanel />
        ) : (
          <div className="search-panel">
            <div className="search-panel-field">
              <label className="search-panel-label">{t("ribbon.findWhat")}</label>
              <input
                className="search-panel-input"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performFind()}
                autoFocus
              />
            </div>
            <div className="search-panel-field">
              <label className="search-panel-label">{t("ribbon.replaceWith")}</label>
              <input
                className="search-panel-input"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>
            <div className="search-panel-field">
              <label className="search-panel-label">{t("search.scope")}</label>
              <div className="search-scope-row">
                <button className={`search-scope-btn ${searchScope === "all" ? "active" : ""}`} onClick={() => setSearchScope("all")}>{t("search.allSlides")}</button>
                <button className={`search-scope-btn ${searchScope === "current" ? "active" : ""}`} onClick={() => setSearchScope("current")}>{t("search.currentSlide")}</button>
              </div>
            </div>
            {findResults.length > 0 && (
              <div className="search-panel-info">
                {findIndex + 1} / {findResults.length} {t("ribbon.results")}
              </div>
            )}
            {findResults.length === 0 && findText && (
              <div className="search-panel-info">{t("ribbon.noResults")}</div>
            )}
            <div className="search-panel-actions">
              <button className="dialog-btn-ok" onClick={performFind}>{t("ribbon.findNext")}</button>
              <button className="dialog-btn-ok" onClick={() => goToFindResult("prev")} disabled={findResults.length === 0}>↑</button>
              <button className="dialog-btn-ok" onClick={() => goToFindResult("next")} disabled={findResults.length === 0}>↓</button>
              <button className="dialog-btn-ok" onClick={performReplace} disabled={findResults.length === 0}>{t("ribbon.replace")}</button>
              <button className="dialog-btn-ok" onClick={performReplaceAll} disabled={!findText}>{t("ribbon.replaceAll")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const rightPanelStyles = `
  .right-panel {
    width: 260px;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    animation: rightPanelIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    transition: background var(--transition-normal), border-color var(--transition-normal);
  }
  @keyframes rightPanelIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .right-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);
    padding: 6px 8px;
    min-height: 32px;
    flex-shrink: 0;
  }
  .right-panel-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .right-panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .right-panel-close:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }
  .right-panel-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  .right-panel-content > * {
    animation: panelContentFadeIn 0.2s ease;
  }
  @keyframes panelContentFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .search-panel {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .search-panel-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .search-panel-label {
    font-size: 11px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .search-panel-input {
    width: 100%;
    padding: 6px 8px;
    font-size: 12px;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    outline: none;
    box-sizing: border-box;
  }
  .search-panel-input:focus {
    border-color: var(--color-primary);
  }
  .search-panel-info {
    font-size: 11px;
    color: var(--color-text-secondary);
    padding: 4px 0;
  }
  .search-panel-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .search-panel-actions .dialog-btn-ok {
    font-size: 11px;
    padding: 4px 8px;
  }
  .search-scope-row {
    display: flex;
    gap: 4px;
  }
  .search-scope-btn {
    flex: 1;
    padding: 4px 6px;
    font-size: 11px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }
  .search-scope-btn.active {
    background: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
  }
  .search-scope-btn:hover:not(.active) {
    background: var(--color-hover);
  }

  /* Animation panel styles */
  .anim-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .anim-panel-toolbar {
    display: flex;
    gap: 2px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .anim-pane-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }
  .anim-pane-btn:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .anim-pane-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .anim-panel-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
    min-height: 80px;
  }
  .anim-panel-empty {
    padding: 16px 8px;
    text-align: center;
    font-size: 11px;
    color: var(--color-text-secondary);
  }
  .anim-step-card {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
    margin-bottom: 2px;
    user-select: none;
  }
  .anim-step-card:hover {
    background: var(--color-hover);
  }
  .anim-step-card.selected {
    background: var(--color-primary-light, rgba(59,130,246,0.1));
    outline: 1px solid var(--color-primary);
  }
  .anim-step-grip {
    color: var(--color-text-secondary);
    opacity: 0.4;
    cursor: grab;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .anim-step-grip:active {
    cursor: grabbing;
  }
  .anim-step-indicator {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .anim-step-number {
    font-size: 10px;
    font-weight: 700;
    color: #fff;
  }
  .anim-step-info {
    flex: 1;
    min-width: 0;
  }
  .anim-step-element {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .anim-step-detail {
    font-size: 10px;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .anim-step-cat {
    font-weight: 600;
  }
  .anim-step-sep {
    color: var(--color-border);
  }
  .anim-step-trigger {
    font-size: 11px;
    flex-shrink: 0;
  }
  .anim-panel-editor {
    border-top: 1px solid var(--color-border);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    max-height: 280px;
    overflow-y: auto;
  }
  .anim-editor-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .anim-editor-label {
    font-size: 11px;
    color: var(--color-text-secondary);
    width: 52px;
    flex-shrink: 0;
  }
  .anim-editor-select {
    flex: 1;
    padding: 3px 6px;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    outline: none;
  }
  .anim-editor-select:focus {
    border-color: var(--color-primary);
  }
  .anim-editor-input {
    flex: 1;
    padding: 3px 6px;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    outline: none;
    width: 60px;
  }
  .anim-editor-input:focus {
    border-color: var(--color-primary);
  }
  .anim-editor-unit {
    font-size: 10px;
    color: var(--color-text-secondary);
  }
  .anim-pick-btn {
    flex: 1;
    padding: 3px 8px;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .anim-pick-btn.picking {
    border-color: var(--color-primary);
    background: var(--color-primary-light, rgba(59,130,246,0.1));
    animation: pick-pulse 1s ease infinite;
  }
  @keyframes pick-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
    50% { box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  }
`;
