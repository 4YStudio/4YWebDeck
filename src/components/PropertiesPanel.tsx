import { useCallback } from "react";
import { Trash2, Copy, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Lock, Unlock, BarChart3, Workflow, Image, Video, Music, Table2, Pi, Type, Shapes } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";

export function PropertiesPanel() {
  const { project, activeSlideId, selectedElementId, selectedElementIds, updateElement, deleteElement, duplicateElement, bringToFront, sendToBack, bringForward, sendBackward, fontFamilies } = useStore();
  const activeSlide = project?.slides.find((s) => s.id === activeSlideId);
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedElementId);
  const isMultiSelect = selectedElementIds.length > 1;

  const update = useCallback(
    (field: string, value: string | number | boolean) => {
      if (isMultiSelect && selectedElementIds.length > 0) {
        selectedElementIds.forEach(id => updateElement(id, { [field]: value }));
      } else if (selectedElementId) {
        updateElement(selectedElementId, { [field]: value });
      }
    },
    [selectedElementId, selectedElementIds, updateElement, isMultiSelect]
  );

  if (!activeSlide || !selectedElement) {
    return (
      <div className="properties-panel">
        <div className="properties-empty">{t("properties.title")}</div>
        <style>{propertiesStyles}</style>
      </div>
    );
  }

  const el = selectedElement;
  const isText = el.type === "text" || el.type === "title" || el.type === "subtitle" || el.type === "wordart";
  const isShape = el.type === "rect" || el.type === "circle" || el.type === "line" || el.type === "arrow" || el.type === "triangle" || el.type === "diamond" || el.type === "star";
  const isImage = el.type === "image";
  const isVideo = el.type === "video";
  const isAudio = el.type === "audio";
  const isTable = el.type === "table";
  const isFormula = el.type === "formula";
  const isChart = el.type === "chart";
  const isSmartArt = el.type === "smartart";

  const typeLabel: Record<string, string> = {
    text: t("properties.typeText"),
    title: t("properties.typeTitle"),
    subtitle: t("properties.typeSubtitle"),
    image: t("properties.typeImage"),
    rect: t("properties.typeRect"),
    circle: t("properties.typeCircle"),
    line: t("properties.typeLine"),
    arrow: t("properties.typeArrow"),
    triangle: t("properties.typeTriangle"),
    diamond: t("properties.typeDiamond"),
    star: t("properties.typeStar"),
    video: t("properties.typeVideo"),
    audio: t("properties.typeAudio"),
    table: t("properties.typeTable"),
    formula: t("properties.typeFormula"),
    chart: t("properties.typeChart"),
    smartart: t("properties.typeSmartart"),
    wordart: t("properties.typeWordart"),
  };

  const TypeIcon = isImage ? Image : isVideo ? Video : isAudio ? Music : isTable ? Table2 : isFormula ? Pi : isChart ? BarChart3 : isSmartArt ? Workflow : isText ? Type : Shapes;

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <TypeIcon size={13} style={{ marginRight: 6, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{typeLabel[el.type] || el.type}</span>
        {isMultiSelect && <span className="multi-select-badge">{selectedElementIds.length}</span>}
      </div>

      <div className="properties-section">
        <div className="prop-section-title">{t("properties.position")}</div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.x")}</label>
          <input type="number" className="prop-input" value={el.x} onChange={(e) => update("x", parseInt(e.target.value) || 0)} />
        </div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.y")}</label>
          <input type="number" className="prop-input" value={el.y} onChange={(e) => update("y", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div className="properties-section">
        <div className="prop-section-title">{t("properties.size")}</div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.width")}</label>
          <input type="number" className="prop-input" value={el.width} onChange={(e) => update("width", Math.max(10, parseInt(e.target.value) || 10))} />
        </div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.height")}</label>
          <input type="number" className="prop-input" value={el.height} onChange={(e) => update("height", Math.max(10, parseInt(e.target.value) || 10))} />
        </div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.rotation")}</label>
          <input type="number" className="prop-input" value={el.rotation} onChange={(e) => update("rotation", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div className="properties-section">
        <div className="prop-section-title">{t("properties.style")}</div>
        <div className="prop-row">
          <label className="prop-label">{t("properties.opacity")}</label>
          <input type="range" min="0" max="1" step="0.05" className="prop-range" value={el.opacity} onChange={(e) => update("opacity", parseFloat(e.target.value))} />
          <span className="prop-value">{Math.round(el.opacity * 100)}%</span>
        </div>
        {(isShape || isImage || isVideo) && (
          <>
            <div className="prop-row">
              <label className="prop-label">{t("properties.fill")}</label>
              <input type="color" className="prop-color" value={el.fill === "transparent" ? "#ffffff" : el.fill} onChange={(e) => update("fill", e.target.value)} />
            </div>
            <div className="prop-row">
              <label className="prop-label">{t("properties.borderRadius")}</label>
              <input type="number" className="prop-input" value={el.borderRadius} onChange={(e) => update("borderRadius", Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
          </>
        )}
        {(isShape || isImage || isVideo || isAudio || isTable || isFormula) && (
          <>
            <div className="prop-row">
              <label className="prop-label">{t("properties.borderWidth")}</label>
              <input type="number" className="prop-input" value={el.borderWidth} onChange={(e) => update("borderWidth", Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            {el.borderWidth > 0 && (
              <div className="prop-row">
                <label className="prop-label">{t("properties.borderColor")}</label>
                <input type="color" className="prop-color" value={el.borderColor} onChange={(e) => update("borderColor", e.target.value)} />
              </div>
            )}
          </>
        )}
      </div>

      {isText && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.text")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("ribbon.fontFamily")}</label>
            <select className="prop-select" value={el.fontFamily || "system-ui"} onChange={(e) => update("fontFamily", e.target.value)}>
              {fontFamilies.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.textColor")}</label>
            <input type="color" className="prop-color" value={el.textColor} onChange={(e) => update("textColor", e.target.value)} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fontSize")}</label>
            <input type="number" className="prop-input" value={el.fontSize} onChange={(e) => update("fontSize", Math.max(8, parseInt(e.target.value) || 16))} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fontWeight")}</label>
            <select className="prop-select" value={el.fontWeight} onChange={(e) => update("fontWeight", parseInt(e.target.value))}>
              <option value={400}>{t("fontWeight.normal")}</option>
              <option value={700}>{t("fontWeight.bold")}</option>
            </select>
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.textAlign")}</label>
            <div className="prop-align-group">
              <button className={`prop-align-btn ${el.textAlign === "left" ? "active" : ""}`} onClick={() => update("textAlign", "left")}>{t("align.left")}</button>
              <button className={`prop-align-btn ${el.textAlign === "center" ? "active" : ""}`} onClick={() => update("textAlign", "center")}>{t("align.center")}</button>
              <button className={`prop-align-btn ${el.textAlign === "right" ? "active" : ""}`} onClick={() => update("textAlign", "right")}>{t("align.right")}</button>
            </div>
          </div>
          {el.type === "wordart" && (
            <div className="prop-row">
              <label className="prop-label">{t("properties.textShadow")}</label>
              <select className="prop-select" value={el.shapeEffect || "none"} onChange={(e) => update("shapeEffect", e.target.value)}>
                <option value="none">{t("properties.none")}</option>
                <option value="shadow">{t("properties.shadow")}</option>
                <option value="glow">{t("properties.glow")}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {isFormula && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.formula")}</div>
          <div className="prop-row" style={{ marginBottom: 8 }}>
            <label className="prop-label">LaTeX</label>
            <textarea
              className="prop-input"
              style={{ width: "100%", minHeight: 60, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
              value={el.content}
              onChange={(e) => update("content", e.target.value)}
            />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.textColor")}</label>
            <input type="color" className="prop-color" value={el.textColor} onChange={(e) => update("textColor", e.target.value)} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fontSize")}</label>
            <input type="number" className="prop-input" value={el.fontSize} onChange={(e) => update("fontSize", Math.max(8, parseInt(e.target.value) || 16))} />
          </div>
        </div>
      )}

      {isTable && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.table")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.textColor")}</label>
            <input type="color" className="prop-color" value={el.textColor} onChange={(e) => update("textColor", e.target.value)} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fontSize")}</label>
            <input type="number" className="prop-input" value={el.fontSize} onChange={(e) => update("fontSize", Math.max(8, parseInt(e.target.value) || 16))} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("ribbon.fontFamily")}</label>
            <select className="prop-select" value={el.fontFamily || "system-ui"} onChange={(e) => update("fontFamily", e.target.value)}>
              {fontFamilies.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isImage && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.image")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.objectFit")}</label>
            <select className="prop-select" value={el.objectFit || "cover"} onChange={(e) => update("objectFit", e.target.value)}>
              <option value="cover">{t("properties.fitCover")}</option>
              <option value="contain">{t("properties.fitContain")}</option>
              <option value="fill">{t("properties.fitFill")}</option>
            </select>
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.clipShape")}</label>
            <select className="prop-select" value={el.clipShape || "none"} onChange={(e) => update("clipShape", e.target.value)}>
              <option value="none">{t("properties.clipNone")}</option>
              <option value="circle">{t("properties.clipCircle")}</option>
              <option value="ellipse">{t("properties.clipEllipse")}</option>
              <option value="triangle">{t("properties.clipTriangle")}</option>
              <option value="diamond">{t("properties.clipDiamond")}</option>
              <option value="star">{t("properties.clipStar")}</option>
              <option value="hexagon">{t("properties.clipHexagon")}</option>
              <option value="pentagon">{t("properties.clipPentagon")}</option>
              <option value="heart">{t("properties.clipHeart")}</option>
              <option value="arrow">{t("properties.clipArrow")}</option>
              <option value="cross">{t("properties.clipCross")}</option>
              <option value="roundedRect">{t("properties.clipRoundedRect")}</option>
            </select>
          </div>
        </div>
      )}

      {isVideo && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.video")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.objectFit")}</label>
            <select className="prop-select" value={el.objectFit || "contain"} onChange={(e) => update("objectFit", e.target.value)}>
              <option value="contain">{t("properties.fitContain")}</option>
              <option value="cover">{t("properties.fitCover")}</option>
              <option value="fill">{t("properties.fitFill")}</option>
            </select>
          </div>
        </div>
      )}

      {isAudio && (
        <div className="properties-section">
          <div className="prop-section-title">{t("properties.audio")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fill")}</label>
            <input type="color" className="prop-color" value={el.fill === "transparent" ? "#ffffff" : el.fill} onChange={(e) => update("fill", e.target.value)} />
          </div>
        </div>
      )}

      {isChart && (
        <div className="properties-section">
          <div className="prop-section-title">{t("ribbon.chart")}</div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fill")}</label>
            <input type="color" className="prop-color" value={el.fill === "transparent" ? "#ffffff" : el.fill} onChange={(e) => update("fill", e.target.value)} />
          </div>
          <div className="prop-row">
            <label className="prop-label">{t("properties.fillOpacity")}</label>
            <input type="range" min="0" max="1" step="0.05" className="prop-range" value={el.fillOpacity ?? 1} onChange={(e) => update("fillOpacity", parseFloat(e.target.value))} />
            <span className="prop-value">{Math.round((el.fillOpacity ?? 1) * 100)}%</span>
          </div>
          <div className="prop-actions" style={{ flexDirection: "column", gap: 6 }}>
            <button className="prop-action-btn" style={{ width: "100%" }} onClick={() => { try { const d = JSON.parse(el.content); window.dispatchEvent(new CustomEvent("editChart", { detail: d })); } catch {} }} title={t("ribbon.editData")}>
              <BarChart3 size={14} />
              <span>{t("ribbon.editData")}</span>
            </button>
          </div>
        </div>
      )}

      {isSmartArt && (
        <div className="properties-section">
          <div className="prop-section-title">{t("ribbon.smartArt")}</div>
          <div className="prop-actions" style={{ flexDirection: "column", gap: 6 }}>
            <button className="prop-action-btn" style={{ width: "100%" }} onClick={() => { try { const d = JSON.parse(el.content); window.dispatchEvent(new CustomEvent("editSmartArt", { detail: d })); } catch {} }} title={t("ribbon.editData")}>
              <Workflow size={14} />
              <span>{t("ribbon.editData")}</span>
            </button>
          </div>
        </div>
      )}

      <div className="properties-section">
        <div className="prop-section-title">{t("properties.layer")}</div>
        <div className="prop-actions">
          <button className="prop-action-btn" onClick={() => bringToFront(el.id)} title={t("properties.bringFront")}>
            <ArrowUpToLine size={14} />
          </button>
          <button className="prop-action-btn" onClick={() => bringForward(el.id)} title={t("properties.bringForward")}>
            <ArrowUp size={14} />
          </button>
          <button className="prop-action-btn" onClick={() => sendBackward(el.id)} title={t("properties.sendBackward")}>
            <ArrowDown size={14} />
          </button>
          <button className="prop-action-btn" onClick={() => sendToBack(el.id)} title={t("properties.sendBack")}>
            <ArrowDownToLine size={14} />
          </button>
          <button className={`prop-action-btn ${el.locked ? "active" : ""}`} onClick={() => update("locked", !el.locked)} title={el.locked ? t("ribbon.unlock") : t("ribbon.lock")}>
            {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
      </div>

      <div className="properties-section">
        <div className="prop-actions">
          <button className="prop-action-btn danger" onClick={() => duplicateElement(el.id)} title={t("properties.duplicate")}>
            <Copy size={14} />
            <span>{t("properties.duplicate")}</span>
          </button>
          <button className="prop-action-btn danger" onClick={() => deleteElement(el.id)} title={t("properties.delete")}>
            <Trash2 size={14} />
            <span>{t("properties.delete")}</span>
          </button>
        </div>
      </div>

      <style>{propertiesStyles}</style>
    </div>
  );
}

const propertiesStyles = `
  .properties-panel {
    width: 100%;
    background: var(--color-surface);
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;
    transition: background var(--transition-normal), border-color var(--transition-normal);
  }
  .properties-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-size: 13px;
  }
  .properties-header {
    padding: var(--space-sm) var(--space-md);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
  }
  .properties-section {
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }
  .prop-section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: var(--space-sm);
  }
  .prop-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: 6px;
    min-width: 0;
  }
  .prop-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    min-width: 48px;
    flex-shrink: 0;
  }
  .prop-input {
    flex: 1;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    color: var(--color-text);
    font-size: 12px;
    width: 0;
    min-width: 0;
    box-sizing: border-box;
    transition: border-color var(--transition-fast);
  }
  .prop-input:focus {
    outline: none;
    border-color: var(--color-cta);
  }
  .prop-color {
    width: 32px;
    height: 24px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
    background: none;
  }
  .prop-color::-webkit-color-swatch-wrapper { padding: 2px; }
  .prop-color::-webkit-color-swatch { border: none; border-radius: 2px; }
  .prop-range {
    flex: 1;
    accent-color: var(--color-cta);
  }
  .prop-value {
    font-size: 11px;
    color: var(--color-text-muted);
    min-width: 36px;
    text-align: right;
  }
  .prop-select {
    flex: 1;
    min-width: 0;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
    box-sizing: border-box;
  }
  .prop-select option {
    background: var(--color-surface);
    color: var(--color-text);
  }
  .prop-select:focus {
    outline: none;
    border-color: var(--color-cta);
  }
  .prop-align-group {
    display: flex;
    gap: 2px;
    flex: 1;
  }
  .prop-align-btn {
    flex: 1;
    padding: 4px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    color: var(--color-text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .prop-align-btn:hover {
    background: var(--color-surface-hover);
  }
  .prop-align-btn.active {
    background: var(--color-cta);
    color: white;
    border-color: var(--color-cta);
  }
  .prop-actions {
    display: flex;
    gap: var(--space-xs);
  }
  .prop-action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex: 1;
    justify-content: center;
  }
  .prop-action-btn:hover {
    background: var(--color-surface-hover);
  }
  .prop-action-btn.danger:hover {
    background: #FEE2E2;
    color: #DC2626;
    border-color: #FECACA;
  }
  .prop-action-btn.active {
    background: var(--color-cta);
    color: white;
    border-color: var(--color-cta);
  }
  .prop-textarea {
    width: 100%;
    min-height: 80px;
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    color: var(--color-text);
    font-size: 12px;
    font-family: system-ui, sans-serif;
    resize: vertical;
    line-height: 1.5;
    box-sizing: border-box;
  }
  .prop-textarea:focus {
    outline: none;
    border-color: var(--color-cta);
  }
  .multi-select-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    margin-left: 6px;
    background: var(--color-cta);
    color: white;
    font-size: 10px;
    font-weight: 700;
    border-radius: 9px;
  }
`;
