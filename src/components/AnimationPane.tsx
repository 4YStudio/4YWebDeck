import { useState, useCallback } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";
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

export function AnimationPane() {
  const {
    showAnimationPane, setShowAnimationPane,
    project, activeSlideId,
    addAnimationStep, updateAnimationStep, removeAnimationStep, reorderAnimationStep,
    selectElement,
  } = useStore();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const activeSlide = project?.slides.find(s => s.id === activeSlideId);
  const sequence: AnimationStep[] = activeSlide?.animationSequence || [];
  const sorted = [...sequence].sort((a, b) => a.order - b.order);

  const getElementName = useCallback((elementId: string) => {
    if (!activeSlide) return elementId;
    const el = activeSlide.elements.find(e => e.id === elementId);
    if (!el) return elementId;
    const prefix = el.type === "text" || el.type === "title" || el.type === "subtitle"
      ? (el.content?.slice(0, 15) || el.type)
      : el.type;
    return prefix;
  }, [activeSlide]);

  const handleAdd = useCallback(() => {
    if (!activeSlideId || !activeSlide) return;
    const firstEl = activeSlide.elements[0];
    if (!firstEl) return;
    addAnimationStep(activeSlideId, {
      elementId: firstEl.id,
      category: "enter",
      style: "fade",
      trigger: "onClick",
      duration: 0.5,
      delay: 0,
      direction: "fromBottom",
    });
  }, [activeSlideId, activeSlide, addAnimationStep]);

  const handleMoveUp = useCallback((index: number) => {
    if (!activeSlideId || index <= 0) return;
    reorderAnimationStep(activeSlideId, index, index - 1);
  }, [activeSlideId, reorderAnimationStep]);

  const handleMoveDown = useCallback((index: number) => {
    if (!activeSlideId || index >= sorted.length - 1) return;
    reorderAnimationStep(activeSlideId, index, index + 1);
  }, [activeSlideId, sorted.length, reorderAnimationStep]);

  if (!showAnimationPane) return null;

  const selectedStep = sorted.find(s => s.id === selectedStepId);

  return (
    <div className="animation-pane">
      <style>{animationPaneStyles}</style>
      <div className="animation-pane-header">
        <span className="animation-pane-title">{t("ribbon.animPane")}</span>
        <button className="animation-pane-close" onClick={() => setShowAnimationPane(false)}>
          <X size={14} />
        </button>
      </div>
      <div className="animation-pane-toolbar">
        <button className="anim-pane-btn" onClick={handleAdd} title={t("ribbon.animAddStep")}>
          <Plus size={14} />
        </button>
        <button className="anim-pane-btn" onClick={() => selectedStepId && activeSlideId && removeAnimationStep(activeSlideId, selectedStepId)} title={t("ribbon.animRemove")} disabled={!selectedStepId}>
          <Trash2 size={14} />
        </button>
        <button className="anim-pane-btn" onClick={() => { const idx = sorted.findIndex(s => s.id === selectedStepId); handleMoveUp(idx); }} title={t("ribbon.animMoveUp")} disabled={!selectedStepId || sorted.findIndex(s => s.id === selectedStepId) <= 0}>
          <ChevronUp size={14} />
        </button>
        <button className="anim-pane-btn" onClick={() => { const idx = sorted.findIndex(s => s.id === selectedStepId); handleMoveDown(idx); }} title={t("ribbon.animMoveDown")} disabled={!selectedStepId || sorted.findIndex(s => s.id === selectedStepId) >= sorted.length - 1}>
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="animation-pane-list">
        {sorted.length === 0 && (
          <div className="animation-pane-empty">{t("ribbon.animNoSteps")}</div>
        )}
        {sorted.map((step, idx) => {
          const catInfo = CATEGORY_OPTIONS.find(c => c.id === step.category);
          const styleInfo = STYLE_OPTIONS.find(s => s.id === step.style);
          return (
            <div
              key={step.id}
              className={`animation-step-card ${selectedStepId === step.id ? "selected" : ""}`}
              onClick={() => { setSelectedStepId(step.id); selectElement(step.elementId); }}
            >
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
        <div className="animation-pane-editor">
          <div className="anim-editor-row">
            <label className="anim-editor-label">{t("ribbon.animTarget")}</label>
            <select
              className="anim-editor-select"
              value={selectedStep.elementId}
              onChange={(e) => updateAnimationStep(activeSlideId, selectedStep.id, { elementId: e.target.value })}
            >
              {activeSlide?.elements.map(el => (
                <option key={el.id} value={el.id}>{getElementName(el.id)}</option>
              ))}
            </select>
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

const animationPaneStyles = `
  .animation-pane {
    width: 260px;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    transition: background var(--transition-normal), border-color var(--transition-normal);
  }
  .animation-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);
    padding: 6px 8px;
    min-height: 32px;
    flex-shrink: 0;
  }
  .animation-pane-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }
  .animation-pane-close {
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
    transition: all 0.15s;
  }
  .animation-pane-close:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }
  .animation-pane-toolbar {
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
  .animation-pane-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }
  .animation-pane-empty {
    padding: 16px 8px;
    text-align: center;
    font-size: 11px;
    color: var(--color-text-secondary);
  }
  .animation-step-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
    margin-bottom: 2px;
  }
  .animation-step-card:hover {
    background: var(--color-hover);
  }
  .animation-step-card.selected {
    background: var(--color-primary-light, rgba(59,130,246,0.1));
    outline: 1px solid var(--color-primary);
  }
  .anim-step-indicator {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .anim-step-number {
    font-size: 11px;
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
    font-size: 12px;
    flex-shrink: 0;
  }
  .animation-pane-editor {
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
`;
