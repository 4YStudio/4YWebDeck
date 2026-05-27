import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "./store";
import logoUrl from "./assets/image/logo.png";
import type { SlideElement } from "./types";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { Canvas } from "./components/Canvas";
import { RightPanel } from "./components/RightPanel";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { Presentation } from "./components/Presentation";
import { Save, Undo2, Redo2, Play } from "lucide-react";
import { saveProject, presentInBrowser, openProjectFromDir, applyMediaUrlUpdates, getBlobSize } from "./utils/fileIO";
import { t } from "./i18n";

function ContextMenu() {
  const {
    contextMenu, setContextMenu, project, activeSlideId,
    copyElement, cutElement, pasteElement, duplicateElement,
    bringToFront, sendToBack, bringForward, sendBackward,
    updateElement, deleteElement, groupElements, ungroupElements,
    selectedElementIds, clipboard, addAnimationStep,
    duplicateSlide, deleteSlide, updateSlide,
    addSlide, setRightPanelTab, selectElement,
    setEditingSlideId,
  } = useStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const rightClickElementId = useRef<string | null>(null);
  const close = useCallback(() => setContextMenu(null), [setContextMenu]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setContextMenu(null); };
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setContextMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    const onRightMouseDown = (e: MouseEvent) => {
      rightClickElementId.current = null;
      if (e.button !== 2) return;
      const target = e.target as HTMLElement;
      const elDiv = target.closest("[data-element-id]");
      if (elDiv) {
        rightClickElementId.current = elDiv.getAttribute("data-element-id");
      }
    };
    document.addEventListener("mousedown", onRightMouseDown, true);

    const onNativeCtx = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;

      const sidebarDiv = target.closest(".sidebar");
      if (sidebarDiv) {
        const slideDiv = target.closest("[data-slide-id]");
        if (slideDiv) {
          const slideId = slideDiv.getAttribute("data-slide-id")!;
          setContextMenu({ x: e.clientX, y: e.clientY, type: "sidebar", targetId: slideId });
          return;
        }
        setContextMenu({ x: e.clientX, y: e.clientY, type: "sidebarBlank", targetId: "" });
        return;
      }

      const canvasCtr = target.closest(".canvas-container");
      if (canvasCtr) {
        let elementId: string | null = rightClickElementId.current;
        if (!elementId) {
          const elDiv = target.closest("[data-element-id]");
          if (elDiv) elementId = elDiv.getAttribute("data-element-id");
        }
        if (!elementId) {
          const els = document.elementsFromPoint(e.clientX, e.clientY);
          for (const el of els) {
            const found = (el as HTMLElement).closest("[data-element-id]");
            if (found) { elementId = found.getAttribute("data-element-id"); break; }
          }
        }
        if (elementId) {
          selectElement(elementId);
          const currentProject = useStore.getState().project;
          const currentSlideId = useStore.getState().activeSlideId;
          const currentSlide = currentProject?.slides.find(s => s.id === currentSlideId);
          const el = currentSlide?.elements.find(e => e.id === elementId);
          if (el?.groupId && currentSlide) {
            currentSlide.elements
              .filter(e => e.groupId === el.groupId && e.id !== elementId)
              .forEach(e => selectElement(e.id, true));
          }
          setContextMenu({ x: e.clientX, y: e.clientY, type: "element", targetId: elementId });
          return;
        }
        setContextMenu({ x: e.clientX, y: e.clientY, type: "canvas", targetId: "" });
        return;
      }

      setContextMenu(null);
    };

    document.addEventListener("contextmenu", onNativeCtx);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousedown", onRightMouseDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("contextmenu", onNativeCtx);
    };
  }, [setContextMenu, selectElement]);

  if (!contextMenu) return null;

  const { x, y, type, targetId } = contextMenu;

  const vw = window.innerWidth, vh = window.innerHeight;
  let lx = x, ly = y;
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (lx + rect.width > vw) lx = vw - rect.width - 8;
    if (ly + rect.height > vh) ly = vh - rect.height - 8;
  } else {
    if (lx + 200 > vw) lx = vw - 208;
    if (ly + 200 > vh) ly = vh - 208;
  }
  if (lx < 8) lx = 8;
  if (ly < 8) ly = 8;
  const maxH = vh - ly - 8;

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: lx,
    top: ly,
    zIndex: 10000,
    minWidth: 180,
    maxHeight: maxH,
    overflowY: "auto",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    padding: 4,
    animation: "ctxMenuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
    transformOrigin: "top left",
  };

  if (type === "element") {
    const el = project?.slides.reduce<SlideElement | undefined>((found, s) => found || s.elements.find(e => e.id === targetId), undefined);
    if (!el) return null;
    return createPortal(
      <div ref={menuRef} style={menuStyle}>
        <button className="ctx-item" onClick={() => { copyElement(el.id); close(); }}>{t("ribbon.copy")}</button>
        <button className="ctx-item" onClick={() => { cutElement(el.id); close(); }}>{t("ribbon.cut")}</button>
        {clipboard && <button className="ctx-item" onClick={() => { pasteElement(); close(); }}>{t("ribbon.paste")}</button>}
        <button className="ctx-item" onClick={() => { duplicateElement(el.id); close(); }}>{t("properties.duplicate")}</button>
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={() => { bringToFront(el.id); close(); }}>{t("properties.bringFront")}</button>
        <button className="ctx-item" onClick={() => { sendToBack(el.id); close(); }}>{t("properties.sendBack")}</button>
        <button className="ctx-item" onClick={() => { bringForward(el.id); close(); }}>{t("properties.bringForward")}</button>
        <button className="ctx-item" onClick={() => { sendBackward(el.id); close(); }}>{t("properties.sendBackward")}</button>
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={() => { setRightPanelTab("animation"); close(); }}>{t("ribbon.animPane")}</button>
        <button className="ctx-item" onClick={() => { if (activeSlideId) { addAnimationStep(activeSlideId, { elementId: el.id, category: "enter", style: "fade", trigger: "onClick", duration: 0.5, delay: 0, direction: "fromBottom" }); setRightPanelTab("animation"); } close(); }}>{t("ribbon.animAddEnter")}</button>
        <button className="ctx-item" onClick={() => { if (activeSlideId) { addAnimationStep(activeSlideId, { elementId: el.id, category: "exit", style: "fade", trigger: "onClick", duration: 0.5, delay: 0, direction: "fromBottom" }); setRightPanelTab("animation"); } close(); }}>{t("ribbon.animAddExit")}</button>
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={() => { updateElement(el.id, { locked: !el.locked }); close(); }}>{el.locked ? t("ribbon.unlock") : t("ribbon.lock")}</button>
        {selectedElementIds.length > 1 && <button className="ctx-item" onClick={() => { groupElements(selectedElementIds); close(); }}>{t("ribbon.group")}</button>}
        {el.groupId && <button className="ctx-item" onClick={() => { ungroupElements(el.groupId!); close(); }}>{t("ribbon.ungroup")}</button>}
        {el.hyperlink && <button className="ctx-item" onClick={() => { window.open(el.hyperlink!); close(); }}>{t("insert.hyperlink")}</button>}
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={() => { setRightPanelTab("properties"); close(); }}>{t("properties.panel")}</button>
        <div className="ctx-sep" />
        <button className="ctx-item danger" onClick={() => { deleteElement(el.id); close(); }}>{t("properties.delete")}</button>
      </div>,
      document.body
    );
  }

  if (type === "sidebar") {
    const slide = project?.slides.find(s => s.id === targetId);
    if (!slide) return null;
    return createPortal(
      <div ref={menuRef} style={menuStyle}>
        <button className="ctx-item" onClick={() => { addSlide(); close(); }}>{t("sidebar.addSlide")}</button>
        <div className="ctx-sep" />
        <button className="ctx-item" onClick={() => { duplicateSlide(slide.id); close(); }}>{t("sidebar.duplicateSlide")}</button>
        <button className="ctx-item" onClick={() => { setEditingSlideId(slide.id); close(); }}>{t("sidebar.renameSlide")}</button>
        <button className="ctx-item" onClick={() => { updateSlide(slide.id, { hidden: !slide.hidden }); close(); }}>{slide.hidden ? t("sidebar.showSlide") : t("sidebar.hideSlide")}</button>
        {(project?.slides.length ?? 0) > 1 && <button className="ctx-item danger" onClick={() => { deleteSlide(slide.id); close(); }}>{t("sidebar.deleteSlide")}</button>}
      </div>,
      document.body
    );
  }

  if (type === "sidebarBlank") {
    return createPortal(
      <div ref={menuRef} style={menuStyle}>
        <button className="ctx-item" onClick={() => { addSlide(); close(); }}>{t("sidebar.addSlide")}</button>
      </div>,
      document.body
    );
  }

  if (type === "canvas") {
    return createPortal(
      <div ref={menuRef} style={menuStyle}>
        {clipboard && <button className="ctx-item" onClick={() => { pasteElement(); close(); }}>{t("ribbon.paste")}</button>}
        <button className="ctx-item" onClick={() => { setRightPanelTab("animation"); close(); }}>{t("ribbon.animPane")}</button>
      </div>,
      document.body
    );
  }

  return null;
}

export default function App() {
  const { project, theme, newProject, loadProject, presenting, fontsLoaded, loadFonts, selectedElementId, setRightPanelOpen, activeSlideId, undo, redo, historyIndex, history, lastProjectDir, lastSaveDir, setLastSaveDir, setLastProjectDir, lastSaveTime, setLastSaveTime, isSaving, setIsSaving } = useStore();
  const [splashFade, setSplashFade] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const handleStatusBarSave = useCallback(async () => {
    if (!project) return;
    if (!lastSaveDir && project.name === "Untitled Presentation") {
      setRenameValue("");
      setRenameOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const result = lastSaveDir
        ? await saveProject(project, lastSaveDir)
        : await saveProject(project);
      if (result) {
        setLastSaveDir(result.dir);
        setLastProjectDir(result.dir);
        setLastSaveTime(Date.now());
        if (result.assetUpdates.size > 0) {
          const updated = await applyMediaUrlUpdates(project, result.assetUpdates, result.dir);
          loadProject(updated);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [project, lastSaveDir, setLastSaveDir, setLastProjectDir, setLastSaveTime, setIsSaving, loadProject]);

  const activeSlideIdx = useMemo(() => {
    if (!project || !activeSlideId) return 0;
    return project.slides.findIndex(s => s.id === activeSlideId) + 1;
  }, [project, activeSlideId]);

  const docSize = useMemo(() => {
    if (!project) return "0 B";
    let bytes = 0;
    for (const slide of project.slides) {
      for (const el of slide.elements) {
        if ((el.type === "image" || el.type === "video" || el.type === "audio") && el.content.startsWith("data:")) {
          const commaIdx = el.content.indexOf(";base64,");
          if (commaIdx !== -1) {
            const base64Len = el.content.length - commaIdx - 8;
            bytes += Math.ceil(base64Len * 3 / 4);
          }
        } else if ((el.type === "image" || el.type === "video" || el.type === "audio") && el.content.startsWith("blob:")) {
          bytes += getBlobSize(el.content);
        } else {
          bytes += new TextEncoder().encode(JSON.stringify(el)).length;
        }
      }
    }
    bytes += new TextEncoder().encode(JSON.stringify(project.slides.map(s => ({ id: s.id, title: s.title, background: s.background, order: s.order, hidden: s.hidden, transition: s.transition, layout: s.layout, animationSequence: s.animationSequence })))).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [project]);

  const lastSaveTimeStr = useMemo(() => {
    if (!lastSaveTime) return "";
    const d = new Date(lastSaveTime);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }, [lastSaveTime]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!project) {
      if (lastProjectDir) {
        openProjectFromDir(lastProjectDir).then((result) => {
          if (result) {
            loadProject(result.project);
            setLastSaveDir(result.dir);
            setLastSaveTime(Date.now());
          } else {
            setLastProjectDir(null);
            newProject("Untitled Presentation");
          }
        });
      } else {
        newProject("Untitled Presentation");
      }
    }
  }, []);

  useEffect(() => {
    loadFonts();
    const timeout = setTimeout(() => setSplashFade(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (fontsLoaded && project) {
      setSplashFade(true);
    }
  }, [fontsLoaded, project]);

  useEffect(() => {
    if (splashFade) {
      const timer = setTimeout(() => setSplashGone(true), 500);
      return () => clearTimeout(timer);
    }
  }, [splashFade]);

  useEffect(() => {
    if (selectedElementId) {
      setRightPanelOpen(true);
    }
  }, [selectedElementId]);

  if (presenting) {
    return <Presentation />;
  }

  return (
    <>
      {!splashGone ? (
        <div
          className="splash-screen"
          style={{ opacity: splashFade ? 0 : 1 }}
        >
          <div className="splash-logo">
            <img src={logoUrl} alt="4YWebDeck" width="48" height="48" />
          </div>
          <div className="splash-title">4YWebDeck</div>
          <div className="splash-loading">
            <div className="splash-spinner" />
          </div>
        </div>
      ) : (
      <div className="app-layout">
        <TitleBar />
        <div className="app-body">
          {project ? (
            <>
              <Sidebar />
              <Canvas />
              <RightPanel />
            </>
          ) : (
            <WelcomeScreen />
          )}
        </div>
        {project && (
          <div className="status-bar">
            <div className="status-bar-left">
              <span>{t("statusbar.slides")}: {project.slides.length}</span>
              <span className="status-bar-sep">|</span>
              <span>{t("statusbar.currentSlide")}: {activeSlideIdx}</span>
              <span className="status-bar-sep">|</span>
              <span>{t("statusbar.size")}: {docSize}</span>
              {lastSaveTimeStr && (<><span className="status-bar-sep">|</span><span>{t("statusbar.lastSaved")}: {lastSaveTimeStr}</span></>)}
              {isSaving && (<><span className="status-bar-sep">|</span><span style={{ color: "var(--color-primary)" }}>{t("statusbar.saving")}</span></>)}
            </div>
            <div className="status-bar-right">
              <button className={`status-bar-btn ${isSaving ? "saving" : ""}`} title={t("toolbar.save")} onClick={handleStatusBarSave} disabled={isSaving}><Save size={13} /></button>
              <button className="status-bar-btn" title={t("ribbon.undo")} onClick={undo} disabled={historyIndex <= 0}><Undo2 size={13} /></button>
              <button className="status-bar-btn" title={t("ribbon.redo")} onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 size={13} /></button>
              <button className="status-bar-btn" title={t("toolbar.present")} onClick={() => presentInBrowser(project)}><Play size={13} /></button>
            </div>
          </div>
        )}
      </div>
      )}
      <ContextMenu />
      {renameOpen && (
        <div className="dialog-overlay" onClick={() => setRenameOpen(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{t("toolbar.renameProject")}</div>
            <div className="dialog-body">
              <label className="dialog-label">{t("toolbar.projectName")}</label>
              <input className="dialog-input" type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder={t("toolbar.projectNamePlaceholder")} autoFocus onKeyDown={async (e) => {
                if (e.key === "Enter" && renameValue.trim() && project) {
                  const renamed = { ...project, name: renameValue.trim(), updatedAt: Date.now() };
                  loadProject(renamed);
                  setRenameOpen(false);
                  setIsSaving(true);
                  try {
                    const result = await saveProject(renamed);
                    if (result) {
                      setLastSaveDir(result.dir);
                      setLastProjectDir(result.dir);
                      setLastSaveTime(Date.now());
                    }
                  } finally {
                    setIsSaving(false);
                  }
                }
              }} />
            </div>
            <div className="dialog-actions">
              <button className="dialog-btn-cancel" onClick={() => setRenameOpen(false)}>{t("common.cancel")}</button>
              <button className="dialog-btn-ok" disabled={!renameValue.trim()} onClick={async () => {
                if (!renameValue.trim() || !project) return;
                const renamed = { ...project, name: renameValue.trim(), updatedAt: Date.now() };
                loadProject(renamed);
                setRenameOpen(false);
                setIsSaving(true);
                try {
                  const result = await saveProject(renamed);
                  if (result) {
                    setLastSaveDir(result.dir);
                    setLastProjectDir(result.dir);
                    setLastSaveTime(Date.now());
                  }
                } finally {
                  setIsSaving(false);
                }
              }}>{t("common.ok")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
