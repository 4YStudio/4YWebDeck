import { useMemo } from "react";
import katex from "katex";
import { t } from "../i18n";

interface FormulaDialogProps {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const FORMULA_PRESETS = [
  { label: "Fraction", latex: "\\frac{a}{b}" },
  { label: "Square Root", latex: "\\sqrt{x}" },
  { label: "Nth Root", latex: "\\sqrt[n]{x}" },
  { label: "Superscript", latex: "x^{n}" },
  { label: "Subscript", latex: "x_{n}" },
  { label: "Sum", latex: "\\sum_{i=1}^{n}" },
  { label: "Product", latex: "\\prod_{i=1}^{n}" },
  { label: "Integral", latex: "\\int_{a}^{b}" },
  { label: "Limit", latex: "\\lim_{x \\to \\infty}" },
  { label: "Infinity", latex: "\\infty" },
  { label: "Partial", latex: "\\partial" },
  { label: "Nabla", latex: "\\nabla" },
  { label: "Alpha-Omega", latex: "\\alpha, \\beta, \\gamma, \\delta, \\theta, \\lambda, \\mu, \\pi, \\sigma, \\omega" },
  { label: "Equation", latex: "E = mc^2" },
  { label: "Quadratic", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { label: "Matrix 2x2", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Matrix 3x3", latex: "\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}" },
  { label: "Cases", latex: "\\begin{cases} a & \\text{if } x > 0 \\\\ b & \\text{if } x \\leq 0 \\end{cases}" },
  { label: "Over/Underbrace", latex: "\\overbrace{a+b+c}^{n} + \\underbrace{d+e}_{m}" },
  { label: "Hat/Bar/Vec", latex: "\\hat{x}, \\bar{x}, \\vec{x}, \\dot{x}, \\ddot{x}" },
  { label: "Binomial", latex: "\\binom{n}{k}" },
  { label: "Arrow", latex: "\\rightarrow, \\leftarrow, \\Rightarrow, \\Leftrightarrow" },
  { label: "Set Notation", latex: "\\in, \\notin, \\subset, \\supset, \\cup, \\cap, \\emptyset" },
  { label: "Logic", latex: "\\forall, \\exists, \\neg, \\land, \\lor, \\implies" },
  { label: "Greek Uppercase", latex: "\\Gamma, \\Delta, \\Theta, \\Lambda, \\Pi, \\Sigma, \\Phi, \\Psi, \\Omega" },
];

function renderKatex(latex: string): { html: string; error: string | null } {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: true,
      displayMode: true,
      trust: true,
    });
    return { html, error: null };
  } catch (err: any) {
    return { html: "", error: err.message || "Render error" };
  }
}

export default function FormulaDialog({ value, onChange, onConfirm, onCancel }: FormulaDialogProps) {
  const preview = useMemo(() => renderKatex(value), [value]);

  const insertAtCursor = (latex: string) => {
    const input = document.getElementById("formula-input") as HTMLTextAreaElement;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newVal = before + latex + after;
      onChange(newVal);
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + latex.length;
        input.focus();
      }, 0);
    } else {
      onChange(value + latex);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" style={{ minWidth: 560, maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{t("ribbon.formula")}</div>
        <div className="dialog-body" style={{ maxHeight: 520, overflow: "auto" }}>
          <div style={{ marginBottom: 12 }}>
            <label className="dialog-label">LaTeX</label>
            <textarea
              id="formula-input"
              className="dialog-input"
              style={{ width: "100%", minHeight: 80, fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onConfirm();
                }
              }}
              placeholder="Type LaTeX formula here..."
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="dialog-label">{t("formula.preview")}</label>
            <div style={{
              minHeight: 60, padding: 16, border: "1px solid var(--color-border)", borderRadius: 6,
              background: "var(--color-background)", textAlign: "center", overflow: "auto",
            }}>
              {preview.error ? (
                <span style={{ color: "#EF4444", fontSize: 13 }}>{preview.error}</span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: preview.html }} />
              )}
            </div>
          </div>
          <div>
            <label className="dialog-label">{t("formula.presets")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 200, overflow: "auto" }}>
              {FORMULA_PRESETS.map((p, i) => {
                const miniPreview = renderKatex(p.latex);
                return (
                  <button
                    key={i}
                    className="ribbon-btn"
                    style={{ fontSize: 11, padding: "3px 6px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
                    onClick={() => insertAtCursor(p.latex)}
                    title={p.latex}
                  >
                    {miniPreview.error ? p.label : <span dangerouslySetInnerHTML={{ __html: miniPreview.html }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="dialog-actions">
          <button className="dialog-btn-cancel" onClick={onCancel}>{t("common.cancel")}</button>
          <button className="dialog-btn-ok" onClick={onConfirm} disabled={!value.trim()}>{t("common.ok")}</button>
        </div>
      </div>
    </div>
  );
}
