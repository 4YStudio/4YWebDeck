import { useCallback, useRef, useState, useEffect } from "react";
import logoUrl from "../assets/image/logo.png";
import { APP_VERSION } from "../version";
import {
  Minus, X, Square, Sun, Moon, Type, Image, Square as RectIcon, Circle,
  Minus as LineIcon, Play, Plus, FileText,
  Scissors, Copy, ClipboardPaste, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, ChevronDown,
  ArrowUpToLine, ArrowDownToLine, Trash2, Monitor,
  Paintbrush, RemoveFormatting,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  Table, Link, Hash,
  MessageSquare, Eye, EyeOff, Grid3X3, Ruler,
  ZoomIn, ZoomOut, Maximize, LayoutGrid,
  Shield, ArrowRightLeft, RotateCcw,
  Triangle, Diamond, Star, ArrowRight,
  Undo2, Redo2, Search,
  Group, Ungroup,
  Superscript, Subscript, CaseSensitive,
  BarChart3, Workflow, Music, VideoIcon, Pi, Wand2,
  Timer, Clock, Settings2,
  PanelRight, Lock, Columns2, BookOpen,
  FlipVertical2, FlipHorizontal2,
} from "lucide-react";
import { useStore } from "../store";
import type { SlideElement, TransitionType, SlideLayout, TransitionSound } from "../types";
import { t } from "../i18n";
import { saveProject, saveAsProject, openProject, presentInBrowser, createMediaBlobUrl, applyMediaUrlUpdates } from "../utils/fileIO";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FormulaDialog from "./FormulaDialog";

type RibbonTab = "home" | "insert" | "design" | "transitions" | "show" | "review" | "view";
type MenuId = "file";

interface MenuItem {
  label: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
}

function FontDropdown({ fonts, current, onSelect }: { fonts: string[]; current: string | undefined; onSelect: (f: string) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [search, setSearch] = useState("");
  const ITEM_H = 28;
  const VISIBLE_H = 240;
  const filtered = search ? fonts.filter(f => f.toLowerCase().includes(search.toLowerCase())) : fonts;
  const startIdx = Math.floor(scrollTop / ITEM_H);
  const endIdx = Math.min(startIdx + Math.ceil(VISIBLE_H / ITEM_H) + 2, filtered.length);
  const visibleFonts = filtered.slice(startIdx, endIdx);

  useEffect(() => {
    if (current && listRef.current && !search) {
      const idx = filtered.indexOf(current);
      if (idx >= 0) {
        listRef.current.scrollTop = idx * ITEM_H - VISIBLE_H / 2 + ITEM_H / 2;
      }
    }
  }, []);

  return (
    <div className="font-dropdown" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <input
        className="font-search-input"
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setScrollTop(0); if (listRef.current) listRef.current.scrollTop = 0; }}
        autoFocus
      />
      <div
        ref={listRef}
        style={{ overflowY: "auto", flex: 1, maxHeight: VISIBLE_H }}
        onScroll={() => { if (listRef.current) setScrollTop(listRef.current.scrollTop); }}
      >
        <div style={{ height: filtered.length * ITEM_H, position: "relative" }}>
          {visibleFonts.map((f) => {
            const idx = filtered.indexOf(f);
            return (
              <button
                key={f}
                className={`font-dropdown-item ${current === f ? "active" : ""}`}
                style={{ fontFamily: f, position: "absolute", top: idx * ITEM_H, left: 0, right: 0, height: ITEM_H, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                onClick={() => onSelect(f)}
                title={f}
              >{f}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];
const LINE_HEIGHTS = [1, 1.15, 1.2, 1.4, 1.5, 1.8, 2, 2.5, 3];

const TRANSITION_TYPES: { id: TransitionType; label: string }[] = [
  { id: "none", label: "ribbon.transitionNone" },
  { id: "smooth", label: "ribbon.transitionSmooth" },
  { id: "fade", label: "ribbon.transitionFade" },
  { id: "cut", label: "ribbon.transitionCut" },
  { id: "slide", label: "ribbon.transitionSlide" },
  { id: "push", label: "ribbon.transitionPush" },
  { id: "wipe", label: "ribbon.transitionWipe" },
  { id: "shape", label: "ribbon.transitionShape" },
  { id: "dissolve", label: "ribbon.transitionDissolve" },
  { id: "newsflash", label: "ribbon.transitionNewsflash" },
  { id: "spokes", label: "ribbon.transitionSpokes" },
  { id: "blinds", label: "ribbon.transitionBlinds" },
  { id: "comb", label: "ribbon.transitionComb" },
  { id: "zoom", label: "ribbon.transitionZoom" },
  { id: "flip", label: "ribbon.transitionFlip" },
];

const TRANSITION_SOUNDS: { id: TransitionSound; label: string }[] = [
  { id: "none", label: "ribbon.soundNone" },
  { id: "applause", label: "ribbon.soundApplause" },
  { id: "windChime", label: "ribbon.soundWindChime" },
  { id: "whoosh", label: "ribbon.soundWhoosh" },
  { id: "click", label: "ribbon.soundClick" },
  { id: "drumroll", label: "ribbon.soundDrumroll" },
];

const THEME_PRESETS = [
  { name: "ribbon.themeWhite", bg: "#FFFFFF" },
  { name: "ribbon.themeLightGray", bg: "#F8FAFC" },
  { name: "ribbon.themeDark", bg: "#1E293B" },
  { name: "ribbon.themeDeepBlue", bg: "#1E3A5F" },
  { name: "ribbon.themeWine", bg: "#3B1F2B" },
  { name: "ribbon.themeForest", bg: "#1A3C34" },
  { name: "ribbon.themeMint", bg: "#F0FDF4" },
  { name: "ribbon.themeCream", bg: "#FEF9C3" },
  { name: "ribbon.themeCoral", bg: "#FFF1F2" },
  { name: "ribbon.themeLavender", bg: "#F5F3FF" },
  { name: "ribbon.themeSky", bg: "#F0F9FF" },
  { name: "ribbon.themeCharcoal", bg: "#0F172A" },
];

const COLOR_SCHEMES = [
  { name: "ribbon.schemeDefault", colors: [] },
  { name: "ribbon.schemeOffice", colors: ["#1F497D", "#4F81BD", "#C0504D", "#9BBB59", "#8064A2"] },
  { name: "ribbon.schemeElegant", colors: ["#1E293B", "#64748B", "#EF4444", "#22C55E", "#3B82F6"] },
  { name: "ribbon.schemeWarm", colors: ["#92400E", "#D97706", "#DC2626", "#F59E0B", "#B45309"] },
  { name: "ribbon.schemeCool", colors: ["#1E40AF", "#0891B2", "#7C3AED", "#2563EB", "#0D9488"] },
  { name: "ribbon.schemeVivid", colors: ["#7C3AED", "#EC4899", "#F97316", "#14B8A6", "#6366F1"] },
  { name: "ribbon.schemePastel", colors: ["#93C5FD", "#FCA5A5", "#86EFAC", "#FDE68A", "#C4B5FD"] },
];

const SLIDE_LAYOUTS: { id: SlideLayout; label: string }[] = [
  { id: "title", label: "ribbon.layoutTitle" },
  { id: "titleContent", label: "ribbon.layoutTitleContent" },
  { id: "twoContent", label: "ribbon.layoutTwoContent" },
  { id: "sectionHeader", label: "ribbon.layoutSectionHeader" },
  { id: "comparison", label: "ribbon.layoutComparison" },
  { id: "blank", label: "ribbon.layoutBlank" },
  { id: "contentCaption", label: "ribbon.layoutContentCaption" },
  { id: "pictureCaption", label: "ribbon.layoutPictureCaption" },
];

export function TitleBar() {
  const {
    project, theme, setTheme, addSlide,
    addElement, locale, setLocale, loadProject: loadProj,
    newProject, selectedElementId, updateElement, deleteElement,
    copyElement, cutElement, pasteElement, clipboard,
    bringToFront, sendToBack, activeSlideId, updateSlide,
    formatPainter, setFormatPainter,
    showGrid, showGuides, setShowGrid, setShowGuides,
    zoom, setZoom, viewMode, setViewMode,
    applyTransitionToAll, applyThemeToAll, applyFontToAll,
    undo, redo, history, historyIndex,
    showComments, setShowComments, showTaskPane, setShowTaskPane,
    slideSize, setSlideSize,
    groupElements, ungroupElements,
    alignElements, distributeElements,
    rehearseMode, startRehearse, stopRehearse, recordRehearseTiming,
    rehearseTimings,
    fontFamilies,
    lastSaveDir, setLastSaveDir,
    setLastProjectDir,
    setLastSaveTime, setIsSaving,
    formulaEditOpen, formulaEditElementId, setFormulaEditOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [fontOpen, setFontOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [lineHeightOpen, setLineHeightOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [slideSizeOpen, setSlideSizeOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [effectOpen, setEffectOpen] = useState(false);
  const [hyperlinkOpen, setHyperlinkOpen] = useState(false);
  const [hyperlinkUrl, setHyperlinkUrl] = useState("");
  const [headerFooterOpen, setHeaderFooterOpen] = useState(false);
  const [headerFooter, setHeaderFooter] = useState({ showSlideNumber: true, showTitle: true, showDate: true, headerText: "", footerText: "", slideNumberStart: 1 });
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [masterOpen, setMasterOpen] = useState(false);
  const [masterBg, setMasterBg] = useState("#FFFFFF");
  const [masterFont, setMasterFont] = useState("system-ui");
  const [encryptOpen, setEncryptOpen] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [customShowOpen, setCustomShowOpen] = useState(false);
  const [customShowSlides, setCustomShowSlides] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(300);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(300);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [chartEditOpen, setChartEditOpen] = useState(false);
  const [chartEditData, setChartEditData] = useState<{ type: "bar" | "line" | "pie"; labels: string[]; series: { name: string; data: number[]; color: string }[] }>({ type: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Series 1", data: [40, 65, 35, 80], color: "#3B82F6" }] });
  const [smartEditOpen, setSmartEditOpen] = useState(false);
  const [formulaEditValue, setFormulaEditValue] = useState("E = mc^2");
  const [smartEditData, setSmartEditData] = useState<{ layout: "process" | "cycle" | "hierarchy" | "pyramid"; items: { text: string; color: string }[] }>({ layout: "process", items: [{ text: "Step 1", color: "#3B82F6" }, { text: "Step 2", color: "#22C55E" }, { text: "Step 3", color: "#F59E0B" }] });
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d) { setChartEditData(d); setChartEditOpen(true); }
    };
    window.addEventListener("editChart", handler);
    return () => window.removeEventListener("editChart", handler);
  }, []);
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d) { setSmartEditData(d); setSmartEditOpen(true); }
    };
    window.addEventListener("editSmartArt", handler);
    return () => window.removeEventListener("editSmartArt", handler);
  }, []);

  useEffect(() => {
    if (formulaEditOpen && formulaEditElementId) {
      const el = project?.slides.flatMap(s => s.elements).find(e => e.id === formulaEditElementId);
      if (el && el.type === "formula") {
        setFormulaEditValue(el.content || "E = mc^2");
      }
    }
  }, [formulaEditOpen, formulaEditElementId, project]);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const appWindow = getCurrentWindow();

  const selectedElement = project?.slides
    .find(s => s.id === activeSlideId)
    ?.elements.find(e => e.id === selectedElementId) ?? null;

  const activeSlide = project?.slides.find(s => s.id === activeSlideId) ?? null;

  const handleMinimize = useCallback(() => { appWindow.minimize(); }, [appWindow]);
  const handleMaximize = useCallback(() => { appWindow.toggleMaximize(); }, [appWindow]);
  const handleClose = useCallback(() => { appWindow.close(); }, [appWindow]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".menu-dropdown")) return;
    appWindow.startDragging();
  }, [appWindow]);

  const handleNewProject = useCallback(async () => { setOpenMenu(null); newProject("Untitled Presentation"); setLastSaveDir(null); setLastProjectDir(null); setLastSaveTime(null); }, [newProject, setLastSaveDir, setLastProjectDir, setLastSaveTime]);
  const handleOpen = useCallback(async () => {
    setOpenMenu(null);
    try {
      const result = await openProject();
      if (result) {
        loadProj(result.project);
        setLastSaveDir(result.dir);
        setLastProjectDir(result.dir);
        setLastSaveTime(Date.now());
      }
    } catch (err) {
      console.error("Failed to open project:", err);
    }
  }, [loadProj, setLastSaveDir, setLastProjectDir, setLastSaveTime]);
  const handleSave = useCallback(async () => {
    setOpenMenu(null);
    if (!project) return;
    setIsSaving(true);
    try {
      let result: { dir: string; assetUpdates: Map<string, string> } | null = null;
      if (lastSaveDir) {
        result = await saveProject(project, lastSaveDir);
      } else if (project.name === "Untitled Presentation") {
        setRenameValue("");
        setRenameOpen(true);
        return;
      } else {
        result = await saveProject(project);
      }
      if (result) {
        setLastSaveDir(result.dir);
        setLastProjectDir(result.dir);
        setLastSaveTime(Date.now());
        if (result.assetUpdates.size > 0) {
          const updated = await applyMediaUrlUpdates(project, result.assetUpdates, result.dir);
          loadProj(updated);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [project, lastSaveDir, setLastSaveDir, setLastProjectDir, setLastSaveTime, setIsSaving, loadProj]);
  const handleSaveAs = useCallback(async () => {
    setOpenMenu(null);
    if (!project) return;
    setIsSaving(true);
    try {
      const result = await saveAsProject(project);
      if (result) {
        setLastSaveDir(result.dir);
        setLastProjectDir(result.dir);
        setLastSaveTime(Date.now());
        if (result.assetUpdates.size > 0) {
          const updated = await applyMediaUrlUpdates(project, result.assetUpdates, result.dir);
          loadProj(updated);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [project, setLastSaveDir, setLastProjectDir, setLastSaveTime, setIsSaving, loadProj]);
  const handlePresent = useCallback(() => { if (!project) return; presentInBrowser(project); }, [project]);
  const handlePresentFromCurrent = useCallback(() => {
    if (!project || !activeSlideId) return;
    presentInBrowser(project);
  }, [project, activeSlideId]);

  const defaultElement = useCallback(
    (type: SlideElement["type"]): Omit<SlideElement, "id" | "zIndex"> => {
      const base: Omit<SlideElement, "id" | "zIndex"> = {
        type, x: 100, y: 100, width: 300, height: 60,
        rotation: 0, content: "", fill: "transparent",
        textColor: "#1E293B", fontSize: 16, fontWeight: 400,
        fontFamily: "system-ui", fontStyle: "normal" as const, textDecoration: "none" as const,
        textAlign: "left" as const, borderRadius: 0, opacity: 1,
        fillOpacity: 1, borderWidth: 0, borderColor: "#1E293B",
        lineHeight: 1.4, letterSpacing: 0, paddingLeft: 0,
        listStyle: "none" as const, verticalAlign: "top" as const,
        shadow: "", cols: 0, rows: 0,
        groupId: null, animation: null, hyperlink: null, locked: false,
        textDirection: "horizontal" as const, superscript: false, subscript: false,
        textCase: "none" as const, shapeEffect: "none" as const, clipShape: "none" as const, objectFit: "cover" as const,
      };
      switch (type) {
        case "text": return { ...base, content: t("insert.text"), width: 300, height: 60 };
        case "title": return { ...base, type: "title", content: t("insert.title"), fontSize: 36, fontWeight: 700, textAlign: "center", width: 600, height: 60, x: 180, y: 80 };
        case "subtitle": return { ...base, type: "subtitle", content: t("insert.subtitle"), fontSize: 20, fontWeight: 400, textAlign: "center", textColor: "#64748B", width: 500, height: 40, x: 230, y: 160 };
        case "image": return { ...base, content: "", width: 300, height: 200, borderRadius: 8 };
        case "rect": return { ...base, fill: "#22C55E", width: 200, height: 150, borderRadius: 8 };
        case "circle": return { ...base, fill: "#3B82F6", width: 150, height: 150 };
        case "line": return { ...base, fill: "#1E293B", width: 400, height: 3, y: 270 };
        case "arrow": return { ...base, fill: "#3B82F6", width: 200, height: 40 };
        case "star": return { ...base, fill: "#F59E0B", width: 120, height: 120 };
        case "diamond": return { ...base, fill: "#8B5CF6", width: 120, height: 120 };
        case "triangle": return { ...base, fill: "#EF4444", width: 120, height: 120 };
        case "table": return { ...base, fill: "transparent", width: 400, height: 200, cols: 3, rows: 3, borderWidth: 1, borderColor: "#CBD5E1" };
        case "wordart": return { ...base, content: t("ribbon.wordArt"), fontSize: 36, fontWeight: 700, fill: "#3B82F6", textColor: "#FFFFFF", width: 400, height: 60, textAlign: "center" };
        case "chart": return { ...base, fill: "#F8FAFC", width: 400, height: 300, borderWidth: 1, borderColor: "#E2E8F0", content: JSON.stringify({ type: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Series 1", data: [40, 65, 35, 80], color: "#3B82F6" }, { name: "Series 2", data: [55, 30, 70, 45], color: "#22C55E" }] }) };
        case "smartart": return { ...base, fill: "#F0F9FF", width: 400, height: 250, borderWidth: 1, borderColor: "#BAE6FD", content: JSON.stringify({ layout: "process", items: [{ text: "Step 1", color: "#3B82F6" }, { text: "Step 2", color: "#22C55E" }, { text: "Step 3", color: "#F59E0B" }] }) };
        case "formula": return { ...base, content: "E=mc²", fontSize: 24, width: 200, height: 50, textAlign: "center" };
        case "video": return { ...base, fill: "#1E293B", width: 400, height: 300, borderRadius: 8, content: "video" };
        case "audio": return { ...base, fill: "#F1F5F9", width: 300, height: 60, borderRadius: 30, borderWidth: 1, borderColor: "#CBD5E1", content: "audio" };
        case "action": return { ...base, fill: "#3B82F6", width: 100, height: 50, borderRadius: 8, content: "▶", textColor: "#FFFFFF", textAlign: "center" };
        case "comment": return { ...base, fill: "#FEF3C7", width: 200, height: 100, borderRadius: 8, borderWidth: 1, borderColor: "#F59E0B", content: t("ribbon.insertComment"), fontSize: 12 };
        default: return base;
      }
    }, []
  );

  const insertElement = useCallback((type: SlideElement["type"]) => addElement(defaultElement(type)), [addElement, defaultElement]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imgSrc = reader.result as string;
        const img = document.createElement("img");
        img.onload = () => {
          const maxW = 400;
          const ratio = img.width / img.height;
          const w = Math.min(img.width, maxW);
          const h = w / ratio;
          addElement({
            ...defaultElement("image"),
            content: imgSrc,
            width: Math.round(w),
            height: Math.round(h),
          });
        };
        img.src = imgSrc;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addElement, defaultElement]);

  const handleVideoUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const blobUrl = await createMediaBlobUrl(file, "video");
        addElement({ ...defaultElement("video"), content: blobUrl });
      } catch (err) {
        console.error("Failed to create video blob URL, falling back to data URL:", err);
        const reader = new FileReader();
        reader.onload = () => {
          addElement({ ...defaultElement("video"), content: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [addElement, defaultElement]);

  const handleAudioUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "audio/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const blobUrl = await createMediaBlobUrl(file, "audio");
        addElement({ ...defaultElement("audio"), content: blobUrl });
      } catch (err) {
        console.error("Failed to create audio blob URL, falling back to data URL:", err);
        const reader = new FileReader();
        reader.onload = () => {
          addElement({ ...defaultElement("audio"), content: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [addElement, defaultElement]);

  const updateSelected = useCallback((updates: Partial<SlideElement>) => { if (selectedElementId) updateElement(selectedElementId, updates); }, [selectedElementId, updateElement]);

  const handleFormatPainter = useCallback(() => {
    if (!selectedElement) return;
    setFormatPainter(formatPainter ? null : selectedElement);
  }, [selectedElement, formatPainter, setFormatPainter]);

  const fileMenuItems: MenuItem[] = [
    { label: t("toolbar.new"), action: handleNewProject, shortcut: "Ctrl+N" },
    { label: t("toolbar.open"), action: handleOpen, shortcut: "Ctrl+O" },
    { label: t("toolbar.save"), action: handleSave, shortcut: "Ctrl+S" },
    { label: t("toolbar.saveAs"), action: handleSaveAs, shortcut: "Ctrl+Shift+S" },
    { separator: true, label: "" },
    { label: t("ribbon.print"), action: () => { setOpenMenu(null); window.print(); }, shortcut: "Ctrl+P" },
    { separator: true, label: "" },
    { label: t("ribbon.undo"), action: () => { setOpenMenu(null); undo(); }, shortcut: "Ctrl+Z" },
    { label: t("ribbon.redo"), action: () => { setOpenMenu(null); redo(); }, shortcut: "Ctrl+Y" },
    { separator: true, label: "" },
    { label: t("ribbon.find"), action: () => { setOpenMenu(null); useStore.getState().setRightPanelTab("search"); }, shortcut: "Ctrl+F" },
    { separator: true, label: "" },
    { label: t("ribbon.settings"), action: () => { setOpenMenu(null); setSettingsOpen(true); } },
    { separator: true, label: "" },
    { label: t("ribbon.about"), action: () => { setOpenMenu(null); setAboutOpen(true); } },
  ];

  const toggleMenu = useCallback((id: MenuId) => { setOpenMenu((prev) => (prev === id ? null : id)); }, []);
  const handleMenuBlur = useCallback((e: React.FocusEvent) => { if (!menuRef.current?.contains(e.relatedTarget as Node)) setOpenMenu(null); }, []);

  const isTextSelected = selectedElement && ["text", "title", "subtitle", "wordart", "formula"].includes(selectedElement.type);
  const isShapeSelected = selectedElement && ["rect", "circle", "arrow", "star", "diamond", "triangle", "line"].includes(selectedElement.type);

  const closeAllDropdowns = () => { setFontOpen(false); setFontSizeOpen(false); setLineHeightOpen(false); setLayoutOpen(false); setSlideSizeOpen(false); setSoundOpen(false); setCaseOpen(false); setEffectOpen(false); };

  const openHyperlinkDialog = () => {
    if (!selectedElementId) return;
    setHyperlinkUrl(selectedElement?.hyperlink || "");
    setHyperlinkOpen(true);
  };

  const applyHyperlink = () => {
    if (!selectedElementId) return;
    updateElement(selectedElementId, { hyperlink: hyperlinkUrl || null });
    setHyperlinkOpen(false);
  };

  const applyHeaderFooter = () => {
    if (!project) return;
    const { addElement, activeSlideId: curSlideId } = useStore.getState();
    for (const slide of project.slides) {
      useStore.getState().setActiveSlide(slide.id);
      if (headerFooter.showSlideNumber) {
        addElement({ ...defaultElement("text"), content: `${project.slides.indexOf(slide) + headerFooter.slideNumberStart}`, x: 880, y: 510, width: 60, height: 20, fontSize: 10, textColor: "#94A3B8", textAlign: "right" as const, locked: true });
      }
      if (headerFooter.showDate) {
        addElement({ ...defaultElement("text"), content: new Date().toLocaleDateString(), x: 700, y: 510, width: 160, height: 20, fontSize: 10, textColor: "#94A3B8", textAlign: "center" as const, locked: true });
      }
      if (headerFooter.footerText) {
        addElement({ ...defaultElement("text"), content: headerFooter.footerText, x: 300, y: 510, width: 400, height: 20, fontSize: 10, textColor: "#94A3B8", textAlign: "center" as const, locked: true });
      }
    }
    if (curSlideId) useStore.getState().setActiveSlide(curSlideId);
    setHeaderFooterOpen(false);
  };

  const applyMasterTheme = () => {
    if (!project) return;
    const updatedSlides = project.slides.map(slide => ({
      ...slide,
      background: masterBg,
      elements: slide.elements.map(el => ({
        ...el,
        fontFamily: masterFont,
      })),
    }));
    useStore.getState().loadProject({ ...project, slides: updatedSlides, updatedAt: Date.now() });
    setMasterOpen(false);
  };

  const applyColorScheme = (colors: string[]) => {
    if (!project || !activeSlideId) return;
    const slide = project.slides.find(s => s.id === activeSlideId);
    if (!slide) return;
    if (colors.length === 0) {
      const updatedElements = slide.elements.map(el => {
        const updates: Partial<SlideElement> = {};
        const isText = el.type === "text" || el.type === "title" || el.type === "subtitle" || el.type === "wordart" || el.type === "formula" || el.type === "table";
        if (isText) { updates.fill = "transparent"; updates.textColor = "#000000"; }
        else if (el.type === "image") { updates.fill = "transparent"; }
        else { updates.fill = "#3B82F6"; }
        return Object.keys(updates).length > 0 ? { ...el, ...updates } : el;
      });
      useStore.getState().loadProject({
        ...project,
        slides: project.slides.map(s => s.id === activeSlideId ? { ...s, elements: updatedElements } : s),
        updatedAt: Date.now(),
      });
      return;
    }
    const colorMap = new Map<string, string>();
    const uniqueColors = [...new Set(slide.elements.map(el => el.fill || el.textColor || "").filter(Boolean))];
    uniqueColors.forEach((c, i) => { colorMap.set(c, colors[i % colors.length]); });
    const updatedElements = slide.elements.map(el => {
      const updates: Partial<SlideElement> = {};
      if (el.fill && colorMap.has(el.fill)) updates.fill = colorMap.get(el.fill);
      if (el.textColor && colorMap.has(el.textColor)) updates.textColor = colorMap.get(el.textColor);
      return Object.keys(updates).length > 0 ? { ...el, ...updates } : el;
    });
    useStore.getState().loadProject({
      ...project,
      slides: project.slides.map(s => s.id === activeSlideId ? { ...s, elements: updatedElements } : s),
      updatedAt: Date.now(),
    });
  };

  const startCountdown = () => {
    setCountdownRemaining(countdownSeconds);
    setCountdownRunning(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCountdownRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdownRunning(false);
  };

  const resetCountdown = () => {
    stopCountdown();
    setCountdownRemaining(countdownSeconds);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const renderHomeTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.clipboard")}</div>
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn" onClick={() => selectedElementId && cutElement(selectedElementId)} title={t("ribbon.cut")} disabled={!selectedElementId}><Scissors size={16} /><span>{t("ribbon.cut")}</span></button>
          <button className="ribbon-btn" onClick={() => selectedElementId && copyElement(selectedElementId)} title={t("ribbon.copy")} disabled={!selectedElementId}><Copy size={16} /><span>{t("ribbon.copy")}</span></button>
          <button className="ribbon-btn" onClick={pasteElement} title={t("ribbon.paste")} disabled={!clipboard}><ClipboardPaste size={16} /><span>{t("ribbon.paste")}</span></button>
          <button className={`ribbon-icon-btn ${formatPainter ? "active" : ""}`} onClick={handleFormatPainter} title={t("ribbon.formatPainter")} disabled={!selectedElementId}><Paintbrush size={15} /></button>
        </div>
      </div>
      <div className="ribbon-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.slides")}</div>
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn" onClick={() => addSlide()} title={t("sidebar.addSlide")}><Plus size={16} /><span>{t("sidebar.addSlide")}</span></button>
          <div className="font-select-wrapper">
            <button className="font-select-btn" onClick={() => { closeAllDropdowns(); setLayoutOpen(!layoutOpen); }} title={t("ribbon.layout")}><span className="font-select-text">{t("ribbon.layout")}</span><ChevronDown size={12} /></button>
            {layoutOpen && (<div className="font-dropdown">{SLIDE_LAYOUTS.map(l => (<button key={l.id} className={`font-dropdown-item ${activeSlide?.layout === l.id ? "active" : ""}`} onClick={() => {
              if (activeSlideId) {
                updateSlide(activeSlideId, { layout: l.id });
                const slide = project?.slides.find(s => s.id === activeSlideId);
                if (slide && slide.elements.length === 0) {
                  switch (l.id) {
                    case "title":
                      addElement({ ...defaultElement("title"), x: 180, y: 200, width: 600, height: 80 });
                      break;
                    case "titleContent":
                      addElement({ ...defaultElement("title"), x: 60, y: 40, width: 840, height: 60 });
                      addElement({ ...defaultElement("text"), x: 60, y: 120, width: 840, height: 380 });
                      break;
                    case "twoContent":
                      addElement({ ...defaultElement("title"), x: 60, y: 40, width: 840, height: 60 });
                      addElement({ ...defaultElement("text"), x: 60, y: 120, width: 400, height: 380 });
                      addElement({ ...defaultElement("text"), x: 500, y: 120, width: 400, height: 380 });
                      break;
                    case "sectionHeader":
                      addElement({ ...defaultElement("title"), x: 60, y: 180, width: 840, height: 80 });
                      addElement({ ...defaultElement("subtitle"), x: 60, y: 280, width: 840, height: 40 });
                      break;
                    case "comparison":
                      addElement({ ...defaultElement("title"), x: 60, y: 40, width: 840, height: 60 });
                      addElement({ ...defaultElement("text"), x: 60, y: 120, width: 400, height: 180 });
                      addElement({ ...defaultElement("text"), x: 500, y: 120, width: 400, height: 180 });
                      addElement({ ...defaultElement("text"), x: 60, y: 320, width: 400, height: 180 });
                      addElement({ ...defaultElement("text"), x: 500, y: 320, width: 400, height: 180 });
                      break;
                    case "contentCaption":
                      addElement({ ...defaultElement("text"), x: 60, y: 40, width: 840, height: 400 });
                      addElement({ ...defaultElement("text"), x: 60, y: 460, width: 840, height: 40, fontSize: 12, textColor: "#64748B" });
                      break;
                    case "pictureCaption":
                      addElement({ ...defaultElement("image"), x: 60, y: 40, width: 840, height: 400 });
                      addElement({ ...defaultElement("text"), x: 60, y: 460, width: 840, height: 40, fontSize: 12, textColor: "#64748B" });
                      break;
                    case "blank":
                    default:
                      break;
                  }
                }
              }
              setLayoutOpen(false);
            }}>{t(l.label)}</button>))}</div>)}
          </div>
          <button className="ribbon-icon-btn" onClick={() => { if (selectedElementId) updateElement(selectedElementId, { fontWeight: 400, fontStyle: "normal" as const, textDecoration: "none" as const, textColor: "#1E293B", fontSize: 16, lineHeight: 1.4, letterSpacing: 0, superscript: false, subscript: false, textCase: "none" as const }); }} title={t("ribbon.reset")} disabled={!selectedElementId}><RotateCcw size={15} /></button>
        </div>
      </div>
      <div className="ribbon-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.font")}</div>
        <div className="ribbon-group-buttons font-group">
          <div className="font-select-wrapper">
            <button className="font-select-btn" onClick={() => { closeAllDropdowns(); setFontOpen(!fontOpen); }} disabled={!isTextSelected} title={t("ribbon.fontFamily")}><span className="font-select-text">{selectedElement?.fontFamily?.replace(/"/g, "") || "System"}</span><ChevronDown size={12} /></button>
            {fontOpen && isTextSelected && (<FontDropdown fonts={fontFamilies} current={selectedElement?.fontFamily} onSelect={(f) => { updateSelected({ fontFamily: f }); setFontOpen(false); }} />)}
          </div>
          <div className="font-select-wrapper">
            <button className="font-select-btn font-size-btn" onClick={() => { closeAllDropdowns(); setFontSizeOpen(!fontSizeOpen); }} disabled={!isTextSelected} title={t("ribbon.fontSize")}><span>{selectedElement?.fontSize || 16}</span><ChevronDown size={12} /></button>
            {fontSizeOpen && isTextSelected && (<div className="font-dropdown font-size-dropdown">{FONT_SIZES.map(s => (<button key={s} className={`font-dropdown-item ${selectedElement?.fontSize === s ? "active" : ""}`} onClick={() => { updateSelected({ fontSize: s }); setFontSizeOpen(false); }}>{s}</button>))}</div>)}
          </div>
          <button className="ribbon-icon-btn" onClick={() => isTextSelected && updateSelected({ fontSize: Math.min(96, (selectedElement?.fontSize || 16) + 2) })} disabled={!isTextSelected} title={t("ribbon.increaseFontSize")}><span style={{ fontWeight: 700, fontSize: 14 }}>A+</span></button>
          <button className="ribbon-icon-btn" onClick={() => isTextSelected && updateSelected({ fontSize: Math.max(8, (selectedElement?.fontSize || 16) - 2) })} disabled={!isTextSelected} title={t("ribbon.decreaseFontSize")}><span style={{ fontWeight: 400, fontSize: 11 }}>A-</span></button>
          <button className={`ribbon-icon-btn ${selectedElement?.fontWeight === 700 ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ fontWeight: selectedElement?.fontWeight === 700 ? 400 : 700 })} disabled={!isTextSelected} title={t("ribbon.bold")}><Bold size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.fontStyle === "italic" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ fontStyle: selectedElement?.fontStyle === "italic" ? "normal" : "italic" })} disabled={!isTextSelected} title={t("ribbon.italic")}><Italic size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textDecoration === "underline" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textDecoration: selectedElement?.textDecoration === "underline" ? "none" : "underline" })} disabled={!isTextSelected} title={t("ribbon.underline")}><Underline size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textDecoration === "line-through" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textDecoration: selectedElement?.textDecoration === "line-through" ? "none" : "line-through" })} disabled={!isTextSelected} title={t("ribbon.strikethrough")}><Strikethrough size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.superscript ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ superscript: !selectedElement?.superscript, subscript: false })} disabled={!isTextSelected} title={t("ribbon.superscript")}><Superscript size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.subscript ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ subscript: !selectedElement?.subscript, superscript: false })} disabled={!isTextSelected} title={t("ribbon.subscript")}><Subscript size={15} /></button>
          <div className="font-select-wrapper">
            <button className="ribbon-icon-btn" onClick={() => { closeAllDropdowns(); setCaseOpen(!caseOpen); }} disabled={!isTextSelected} title={t("ribbon.textCase")}><CaseSensitive size={15} /></button>
            {caseOpen && isTextSelected && (<div className="font-dropdown">{(["none", "uppercase", "lowercase", "capitalize", "sentence"] as const).map(c => (<button key={c} className={`font-dropdown-item ${selectedElement?.textCase === c ? "active" : ""}`} onClick={() => { updateSelected({ textCase: c }); setCaseOpen(false); }}>{t(`ribbon.case${c.charAt(0).toUpperCase() + c.slice(1)}`)}</button>))}</div>)}
          </div>
          <button className="ribbon-icon-btn" onClick={() => isTextSelected && updateSelected({ fontSize: 16, fontWeight: 400, fontStyle: "normal" as const, textDecoration: "none" as const, textColor: "#1E293B", superscript: false, subscript: false, textCase: "none" as const })} disabled={!isTextSelected} title={t("ribbon.clearFormat")}><RemoveFormatting size={15} /></button>
          <div className="color-picker-wrapper">
            <button className="ribbon-icon-btn" disabled={!isTextSelected} title={t("ribbon.fontColor")}><Palette size={15} /></button>
            {isTextSelected && (<input type="color" className="color-input-hidden" value={selectedElement?.textColor || "#1E293B"} onChange={(e) => updateSelected({ textColor: e.target.value })} />)}
          </div>
        </div>
      </div>
      <div className="ribbon-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.paragraph")}</div>
        <div className="ribbon-group-buttons">
          <button className={`ribbon-icon-btn ${selectedElement?.listStyle === "disc" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ listStyle: selectedElement?.listStyle === "disc" ? "none" : "disc" })} disabled={!isTextSelected} title={t("ribbon.bulletList")}><List size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.listStyle === "decimal" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ listStyle: selectedElement?.listStyle === "decimal" ? "none" : "decimal" })} disabled={!isTextSelected} title={t("ribbon.numberList")}><ListOrdered size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => isTextSelected && updateSelected({ paddingLeft: Math.min(80, (selectedElement?.paddingLeft || 0) + 20) })} disabled={!isTextSelected} title={t("ribbon.increaseIndent")}><IndentIncrease size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => isTextSelected && updateSelected({ paddingLeft: Math.max(0, (selectedElement?.paddingLeft || 0) - 20) })} disabled={!isTextSelected} title={t("ribbon.decreaseIndent")}><IndentDecrease size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textAlign === "left" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textAlign: "left" })} disabled={!isTextSelected} title={t("align.left")}><AlignLeft size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textAlign === "center" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textAlign: "center" })} disabled={!isTextSelected} title={t("align.center")}><AlignCenter size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textAlign === "right" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textAlign: "right" })} disabled={!isTextSelected} title={t("align.right")}><AlignRight size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.textAlign === "justify" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ textAlign: "justify" })} disabled={!isTextSelected} title={t("align.justify")}><AlignJustify size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.verticalAlign === "top" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ verticalAlign: "top" })} disabled={!isTextSelected} title={t("ribbon.verticalTop")}><ArrowUpToLine size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.verticalAlign === "middle" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ verticalAlign: "middle" })} disabled={!isTextSelected} title={t("ribbon.verticalMiddle")}><FlipVertical2 size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.verticalAlign === "bottom" ? "active" : ""}`} onClick={() => isTextSelected && updateSelected({ verticalAlign: "bottom" })} disabled={!isTextSelected} title={t("ribbon.verticalBottom")}><ArrowDownToLine size={15} /></button>
          <div className="font-select-wrapper">
            <button className="ribbon-icon-btn" disabled={!isTextSelected} onClick={() => { closeAllDropdowns(); setLineHeightOpen(!lineHeightOpen); }} title={t("ribbon.lineHeight")}><span style={{ fontSize: 10 }}>1.0x</span></button>
            {lineHeightOpen && isTextSelected && (<div className="font-dropdown font-size-dropdown">{LINE_HEIGHTS.map(lh => (<button key={lh} className={`font-dropdown-item ${selectedElement?.lineHeight === lh ? "active" : ""}`} onClick={() => { updateSelected({ lineHeight: lh }); setLineHeightOpen(false); }}>{lh}</button>))}</div>)}
          </div>
        </div>
      </div>
      <div className="ribbon-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.drawing")}</div>
        <div className="ribbon-group-buttons">
          {isShapeSelected && (<>
            <div className="color-picker-wrapper"><button className="ribbon-icon-btn" title={t("ribbon.shapeFill")}><Palette size={15} /></button><input type="color" className="color-input-hidden" value={selectedElement?.fill === "transparent" ? "#22C55E" : selectedElement?.fill || "#22C55E"} onChange={(e) => updateSelected({ fill: e.target.value })} /></div>
            <div className="color-picker-wrapper"><button className="ribbon-icon-btn" title={t("ribbon.shapeOutline")}><Square size={15} /></button><input type="color" className="color-input-hidden" value={selectedElement?.borderColor || "#1E293B"} onChange={(e) => updateSelected({ borderColor: e.target.value, borderWidth: selectedElement?.borderWidth || 1 })} /></div>
            <div className="font-select-wrapper"><button className="ribbon-icon-btn" onClick={() => { closeAllDropdowns(); setEffectOpen(!effectOpen); }} title={t("ribbon.shapeEffect")}><Wand2 size={15} /></button>
              {effectOpen && (<div className="font-dropdown">{(["none", "shadow", "reflection", "glow", "softEdge", "bevel", "3dRotation"] as const).map(eff => (<button key={eff} className={`font-dropdown-item ${selectedElement?.shapeEffect === eff ? "active" : ""}`} onClick={() => { updateSelected({ shapeEffect: eff }); setEffectOpen(false); }}>{t(`ribbon.effect${eff === "none" ? "None" : eff === "shadow" ? "Shadow" : eff === "reflection" ? "Reflection" : eff === "glow" ? "Glow" : eff === "softEdge" ? "SoftEdge" : eff === "bevel" ? "Bevel" : "3d"}`)}</button>))}</div>)}
            </div>
          </>)}
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && bringToFront(selectedElementId)} disabled={!selectedElementId} title={t("properties.bringFront")}><ArrowUpToLine size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && sendToBack(selectedElementId)} disabled={!selectedElementId} title={t("properties.sendBack")}><ArrowDownToLine size={15} /></button>
          <button className={`ribbon-icon-btn ${selectedElement?.locked ? "active" : ""}`} onClick={() => selectedElementId && updateSelected({ locked: !selectedElement?.locked })} disabled={!selectedElementId} title={selectedElement?.locked ? t("ribbon.unlock") : t("ribbon.lock")}><Lock size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && groupElements([selectedElementId])} disabled={!selectedElementId} title={t("ribbon.group")}><Group size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElement?.groupId && ungroupElements(selectedElement.groupId)} disabled={!selectedElement?.groupId} title={t("ribbon.ungroup")}><Ungroup size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && alignElements("left")} disabled={!selectedElementId} title={t("align.left")}><AlignLeft size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && alignElements("center")} disabled={!selectedElementId} title={t("align.center")}><AlignCenter size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && distributeElements("horizontal")} disabled={!selectedElementId} title={t("ribbon.distributeHoriz")}><FlipHorizontal2 size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && distributeElements("vertical")} disabled={!selectedElementId} title={t("ribbon.distributeVert")}><FlipVertical2 size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => selectedElementId && deleteElement(selectedElementId)} disabled={!selectedElementId} title={t("properties.delete")}><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="ribbon-sep" />
      <div className="ribbon-group">
        <div className="ribbon-group-label">{t("ribbon.editing")}</div>
        <div className="ribbon-group-buttons">
          <button className="ribbon-icon-btn" onClick={undo} disabled={historyIndex <= 0} title={t("ribbon.undo")}><Undo2 size={15} /></button>
          <button className="ribbon-icon-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title={t("ribbon.redo")}><Redo2 size={15} /></button>
          <button className="ribbon-icon-btn" onClick={() => useStore.getState().setRightPanelTab("search")} title={t("ribbon.find")}><Search size={15} /></button>
          <button className={`ribbon-icon-btn ${showTaskPane ? "active" : ""}`} onClick={() => setShowTaskPane(!showTaskPane)} title={t("ribbon.selectPane")}><PanelRight size={15} /></button>
        </div>
      </div>
    </div>
  );

  const renderInsertTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.slides")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => addSlide()} title={t("sidebar.addSlide")}><Plus size={16} /><span>{t("sidebar.addSlide")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.tableGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => setTableOpen(true)} title={t("insert.table")}><Table size={16} /><span>{t("insert.table")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.imageGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={handleImageUpload} title={t("insert.image")}><Image size={16} /><span>{t("insert.image")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.chartGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => { const el = defaultElement("chart"); addElement(el); setChartEditData(JSON.parse(el.content)); setChartEditOpen(true); }} title={t("ribbon.chart")}><BarChart3 size={16} /><span>{t("ribbon.chart")}</span></button><button className="ribbon-btn" onClick={() => { const el = defaultElement("smartart"); addElement(el); setSmartEditData(JSON.parse(el.content)); setSmartEditOpen(true); }} title={t("ribbon.smartArt")}><Workflow size={16} /><span>{t("ribbon.smartArt")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.shapeGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-icon-btn" onClick={() => insertElement("rect")} title={t("insert.rect")}><RectIcon size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("circle")} title={t("insert.circle")}><Circle size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("line")} title={t("insert.line")}><LineIcon size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("arrow")} title={t("insert.arrow")}><ArrowRight size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("triangle")} title={t("insert.triangle")}><Triangle size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("diamond")} title={t("insert.diamond")}><Diamond size={15} /></button><button className="ribbon-icon-btn" onClick={() => insertElement("star")} title={t("insert.star")}><Star size={15} /></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.textGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => insertElement("title")} title={t("insert.title")}><Type size={18} /><span>{t("insert.title")}</span></button><button className="ribbon-btn" onClick={() => insertElement("subtitle")} title={t("insert.subtitle")}><Type size={16} /><span>{t("insert.subtitle")}</span></button><button className="ribbon-btn" onClick={() => insertElement("text")} title={t("insert.text")}><FileText size={16} /><span>{t("insert.text")}</span></button><button className="ribbon-btn" onClick={() => insertElement("wordart")} title={t("ribbon.wordArt")}><Wand2 size={16} /><span>{t("ribbon.wordArt")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.mediaGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={handleVideoUpload} title={t("ribbon.video")}><VideoIcon size={16} /><span>{t("ribbon.video")}</span></button><button className="ribbon-btn" onClick={handleAudioUpload} title={t("ribbon.audio")}><Music size={16} /><span>{t("ribbon.audio")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.linkGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={openHyperlinkDialog} title={t("insert.hyperlink")} disabled={!selectedElementId}><Link size={16} /><span>{t("insert.hyperlink")}</span></button><button className="ribbon-btn" onClick={() => insertElement("action")} title={t("ribbon.actionButton")}><Play size={16} /><span>{t("ribbon.actionButton")}</span></button><button className="ribbon-btn" onClick={() => setHeaderFooterOpen(true)} title={t("ribbon.headerFooter")}><FileText size={16} /><span>{t("ribbon.headerFooter")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.symbolGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => { setFormulaEditValue("E = mc^2"); setFormulaEditOpen(true, null); }} title={t("ribbon.formula")}><Pi size={16} /><span>{t("ribbon.formula")}</span></button><button className="ribbon-btn" onClick={() => setSymbolOpen(true)} title={t("insert.symbol")}><Hash size={16} /><span>{t("insert.symbol")}</span></button></div></div>
    </div>
  );

  const renderDesignTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.themeLibrary")}</div><div className="ribbon-group-buttons"><div className="theme-scroll-container"><div className="theme-grid">{THEME_PRESETS.map(tp => (<button key={tp.bg} className={`theme-card ${activeSlide?.background === tp.bg ? "active" : ""}`} style={{ background: tp.bg }} onClick={() => activeSlideId && updateSlide(activeSlideId, { background: tp.bg })} title={t(tp.name)}><span className="theme-card-label" style={{ color: tp.bg === "#FFFFFF" || tp.bg === "#F8FAFC" || tp.bg.startsWith("#F0") || tp.bg.startsWith("#FE") || tp.bg.startsWith("#F5") || tp.bg.startsWith("#FF") ? "#1E293B" : "#FFFFFF" }}>{t(tp.name)}</span></button>))}</div></div></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.colorScheme")}</div><div className="ribbon-group-buttons"><div className="scheme-scroll-container"><div className="scheme-list">{COLOR_SCHEMES.map((cs, i) => (<button key={i} className="scheme-row" onClick={() => applyColorScheme(cs.colors)} title={t(cs.name)}><div className="scheme-colors">{cs.colors.map((c, j) => (<div key={j} className="scheme-dot" style={{ background: c }} />))}</div><span className="scheme-label">{t(cs.name)}</span></button>))}</div></div></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.unifiedFont")}</div><div className="ribbon-group-buttons"><div className="font-select-wrapper"><button className="font-select-btn" onClick={() => { closeAllDropdowns(); setFontOpen(!fontOpen); }} title={t("ribbon.unifiedFont")}><span className="font-select-text">{t("ribbon.selectFont")}</span><ChevronDown size={12} /></button>{fontOpen && (<FontDropdown fonts={fontFamilies} current={undefined} onSelect={(f) => { applyFontToAll(f); setFontOpen(false); }} />)}</div></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.background")}</div><div className="ribbon-group-buttons">{["#FFFFFF", "#F8FAFC", "#1E293B", "#0F172A", "#1E3A5F", "#3B1F2B", "#F0FDF4", "#FEF9C3"].map(c => (<button key={c} className={`ribbon-color-swatch ${activeSlide?.background === c ? "active" : ""}`} style={{ background: c, border: c === "#FFFFFF" || c === "#F8FAFC" || c === "#F0FDF4" || c === "#FEF9C3" ? "1px solid var(--color-border)" : "1px solid transparent" }} onClick={() => activeSlideId && updateSlide(activeSlideId, { background: c })} title={c} />))}<div className="color-picker-wrapper"><button className="ribbon-icon-btn" title={t("ribbon.customBg")}><Palette size={15} /></button>{activeSlideId && (<input type="color" className="color-input-hidden" value={activeSlide?.background || "#FFFFFF"} onChange={(e) => updateSlide(activeSlideId, { background: e.target.value })} />)}</div><button className="ribbon-icon-btn" onClick={() => activeSlide?.background && applyThemeToAll(activeSlide.background)} title={t("ribbon.applyToAll")} disabled={!activeSlide}><span style={{ fontSize: 10 }}>{t("ribbon.applyToAll")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.slideSize")}</div><div className="ribbon-group-buttons"><div className="font-select-wrapper"><button className="font-select-btn" onClick={() => { closeAllDropdowns(); setSlideSizeOpen(!slideSizeOpen); }} title={t("ribbon.slideSize")}><span className="font-select-text">{slideSize}</span><ChevronDown size={12} /></button>{slideSizeOpen && (<div className="font-dropdown">{(["16:9", "4:3", "16:10", "custom"] as const).map(s => (<button key={s} className={`font-dropdown-item ${slideSize === s ? "active" : ""}`} onClick={() => { setSlideSize(s); setSlideSizeOpen(false); }}>{t(`ribbon.size${s === "16:9" ? "169" : s === "4:3" ? "43" : s === "16:10" ? "1610" : "Custom"}`)}</button>))}</div>)}</div></div></div>
    </div>
  );

  const renderTransitionsTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.enterAnimation")}</div><div className="ribbon-group-buttons"><div className="transition-scroll-container"><div className="transition-grid">{TRANSITION_TYPES.map(tt => (<button key={`enter-${tt.id}`} className={`transition-card ${activeSlide?.transition?.enterType === tt.id ? "active" : ""}`} onClick={() => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, enterType: tt.id } })} title={t(tt.label)}><span>{t(tt.label)}</span></button>))}</div></div></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.exitAnimation")}</div><div className="ribbon-group-buttons"><div className="transition-scroll-container"><div className="transition-grid">{TRANSITION_TYPES.map(tt => (<button key={`exit-${tt.id}`} className={`transition-card ${activeSlide?.transition?.exitType === tt.id ? "active" : ""}`} onClick={() => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, exitType: tt.id } })} title={t(tt.label)}><span>{t(tt.label)}</span></button>))}</div></div></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.effectOption")}</div><div className="ribbon-group-buttons ribbon-group-buttons-col">
        <div className="prop-row-compact"><label className="prop-label-sm">{t("ribbon.direction")}</label><select className="prop-input-sm" style={{ width: 90 }} value={activeSlide?.transition?.direction ?? "fromLeft"} onChange={(e) => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, direction: e.target.value as any } })}><option value="fromLeft">{t("ribbon.dirFromLeft")}</option><option value="fromRight">{t("ribbon.dirFromRight")}</option><option value="fromTop">{t("ribbon.dirFromTop")}</option><option value="fromBottom">{t("ribbon.dirFromBottom")}</option></select></div>
        <div className="prop-row-compact"><label className="prop-label-sm">{t("ribbon.duration")}</label><input type="number" className="prop-input-sm" min={0.1} max={5} step={0.1} value={activeSlide?.transition?.duration ?? 0.5} onChange={(e) => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, duration: parseFloat(e.target.value) || 0.5 } })} /><span className="prop-unit">s</span></div>
        <div className="prop-row-compact"><label className="prop-label-sm">{t("ribbon.sound")}</label><div className="font-select-wrapper"><button className="font-select-btn font-size-btn" style={{ minWidth: 70 }} onClick={() => { closeAllDropdowns(); setSoundOpen(!soundOpen); }}><span>{t(TRANSITION_SOUNDS.find(s => s.id === (activeSlide?.transition?.sound ?? "none"))?.label ?? "ribbon.soundNone")}</span><ChevronDown size={10} /></button>{soundOpen && (<div className="font-dropdown font-size-dropdown">{TRANSITION_SOUNDS.map(s => (<button key={s.id} className={`font-dropdown-item ${activeSlide?.transition?.sound === s.id ? "active" : ""}`} onClick={() => { if (activeSlideId) updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, sound: s.id } }); setSoundOpen(false); }}>{t(s.label)}</button>))}</div>)}</div></div>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.transitionSettings")}</div><div className="ribbon-group-buttons ribbon-group-buttons-col">
        <div className="prop-row-compact"><label className="prop-label-sm">{t("ribbon.advanceOnClick")}</label><input type="checkbox" checked={activeSlide?.transition?.advanceOnClick ?? true} onChange={(e) => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, advanceOnClick: e.target.checked } })} /></div>
        <div className="prop-row-compact"><label className="prop-label-sm">{t("ribbon.advanceAfter")}</label><input type="number" className="prop-input-sm" min={0} step={1} value={activeSlide?.transition?.advanceAfterTime ?? 0} onChange={(e) => activeSlideId && updateSlide(activeSlideId, { transition: { ...activeSlide!.transition, advanceAfterTime: parseInt(e.target.value) || 0 } })} /><span className="prop-unit">s</span></div>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.transitionApply")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={applyTransitionToAll} title={t("ribbon.applyToAll")}><Copy size={16} /><span>{t("ribbon.applyToAll")}</span></button></div></div>
    </div>
  );

  const renderShowTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.slideshow")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn present-ribbon-btn" onClick={handlePresent} title={t("ribbon.fromStart")} disabled={!project}><Play size={16} /><span>{t("ribbon.fromStart")}</span></button><button className="ribbon-btn" onClick={handlePresentFromCurrent} title={t("ribbon.fromCurrent")} disabled={!project || !activeSlideId}><Monitor size={16} /><span>{t("ribbon.fromCurrent")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.showSettings")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => { setCustomShowSlides(project?.slides.map(s => s.id) || []); setCustomShowOpen(true); }} title={t("ribbon.customShow")}><Settings2 size={16} /><span>{t("ribbon.customShow")}</span></button><button className={`ribbon-icon-btn ${activeSlide?.hidden ? "active" : ""}`} onClick={() => activeSlideId && updateSlide(activeSlideId, { hidden: !activeSlide?.hidden })} disabled={!activeSlideId} title={t("ribbon.hideSlide")}>{activeSlide?.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.showTools")}</div><div className="ribbon-group-buttons"><button className={`ribbon-btn ${rehearseMode ? "active" : ""}`} onClick={() => rehearseMode ? stopRehearse() : startRehearse()} title={t("ribbon.rehearse")}><Timer size={16} /><span>{rehearseMode ? t("ribbon.stopRehearse") : t("ribbon.rehearse")}</span></button><button className="ribbon-btn" onClick={() => { resetCountdown(); setCountdownOpen(true); }} title={t("ribbon.countdown")}><Clock size={16} /><span>{t("ribbon.countdown")}</span></button></div></div>
    </div>
  );

  const renderReviewTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.comments")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => insertElement("comment")} title={t("ribbon.insertComment")}><MessageSquare size={16} /><span>{t("ribbon.insertComment")}</span></button><button className="ribbon-btn" onClick={() => { if (selectedElementId) { const el = activeSlide?.elements.find(e => e.id === selectedElementId); if (el?.type === "comment") deleteElement(selectedElementId); } }} title={t("ribbon.deleteComment")} disabled={!selectedElementId || activeSlide?.elements.find(e => e.id === selectedElementId)?.type !== "comment"}><Trash2 size={16} /><span>{t("ribbon.deleteComment")}</span></button><button className="ribbon-icon-btn" onClick={() => { if (!project) return; const allComments: {slideId: string; elementId: string}[] = []; project.slides.forEach(s => s.elements.forEach(e => { if (e.type === "comment") allComments.push({slideId: s.id, elementId: e.id}); })); if (allComments.length === 0) return; const curIdx = allComments.findIndex(c => c.elementId === selectedElementId); const prevIdx = curIdx > 0 ? curIdx - 1 : allComments.length - 1; useStore.getState().setActiveSlide(allComments[prevIdx].slideId); useStore.getState().selectElement(allComments[prevIdx].elementId); }} title={t("ribbon.prevComment")}><ChevronDown size={15} style={{ transform: "rotate(180deg)" }} /></button><button className="ribbon-icon-btn" onClick={() => { if (!project) return; const allComments: {slideId: string; elementId: string}[] = []; project.slides.forEach(s => s.elements.forEach(e => { if (e.type === "comment") allComments.push({slideId: s.id, elementId: e.id}); })); if (allComments.length === 0) return; const curIdx = allComments.findIndex(c => c.elementId === selectedElementId); const nextIdx = curIdx < allComments.length - 1 ? curIdx + 1 : 0; useStore.getState().setActiveSlide(allComments[nextIdx].slideId); useStore.getState().selectElement(allComments[nextIdx].elementId); }} title={t("ribbon.nextComment")}><ChevronDown size={15} /></button><button className={`ribbon-icon-btn ${showComments ? "active" : ""}`} onClick={() => setShowComments(!showComments)} title={t("ribbon.showHideComments")}>{showComments ? <Eye size={15} /> : <EyeOff size={15} />}</button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.languageGroup")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => { if (!selectedElementId) return; const el = activeSlide?.elements.find(e => e.id === selectedElementId); if (el && "content" in el && typeof el.content === "string") { const converted = el.content.replace(/[\u4e00-\u9fff]/g, (ch: string) => { const code = ch.charCodeAt(0); return code >= 0x4E00 && code <= 0x9FFF ? String.fromCharCode(code + (code < 0x7F00 ? 0x7F00 - 0x4E00 : 0)) : ch; }); updateElement(el.id, { content: converted }); } }} title={t("ribbon.simpToTrad")} disabled={!selectedElementId}><ArrowRightLeft size={16} /><span>{t("ribbon.simpToTrad")}</span></button><button className="ribbon-btn" onClick={() => { if (!selectedElementId) return; const el = activeSlide?.elements.find(e => e.id === selectedElementId); if (el && "content" in el && typeof el.content === "string") { const converted = el.content.replace(/[\u4e00-\u9fff]/g, (ch: string) => { const code = ch.charCodeAt(0); return code >= 0x7F00 ? String.fromCharCode(code - (0x7F00 - 0x4E00)) : ch; }); updateElement(el.id, { content: converted }); } }} title={t("ribbon.tradToSimp")} disabled={!selectedElementId}><RotateCcw size={16} /><span>{t("ribbon.tradToSimp")}</span></button></div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.protect")}</div><div className="ribbon-group-buttons"><button className="ribbon-btn" onClick={() => setEncryptOpen(true)} title={t("ribbon.encrypt")}><Shield size={16} /><span>{t("ribbon.encrypt")}</span></button><button className="ribbon-btn" onClick={() => setEncryptOpen(true)} title={t("ribbon.finalize")}><Lock size={16} /><span>{t("ribbon.finalize")}</span></button></div></div>
    </div>
  );

  const renderViewTab = () => (
    <div className="ribbon-content">
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.viewModes")}</div><div className="ribbon-group-buttons">
        <button className={`ribbon-icon-btn ${viewMode === "normal" ? "active" : ""}`} onClick={() => setViewMode("normal")} title={t("ribbon.normalView")}><FileText size={15} /></button>
        <button className={`ribbon-icon-btn ${viewMode === "browser" ? "active" : ""}`} onClick={() => setViewMode("browser")} title={t("ribbon.slideBrowser")}><LayoutGrid size={15} /></button>
        <button className={`ribbon-icon-btn ${viewMode === "reading" ? "active" : ""}`} onClick={() => setViewMode("reading")} title={t("ribbon.readingView")}><BookOpen size={15} /></button>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.masterViews")}</div><div className="ribbon-group-buttons">
        <button className="ribbon-icon-btn" onClick={() => setMasterOpen(true)} title={t("ribbon.slideMaster")}><Columns2 size={15} /></button>
        <button className="ribbon-icon-btn" onClick={() => setViewMode("handout")} title={t("ribbon.handoutMaster")}><LayoutGrid size={15} /></button>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.guides")}</div><div className="ribbon-group-buttons">
        <button className={`ribbon-icon-btn ${showGrid ? "active" : ""}`} onClick={() => setShowGrid(!showGrid)} title={t("ribbon.showGrid")}><Grid3X3 size={15} /></button>
        <button className={`ribbon-icon-btn ${showGuides ? "active" : ""}`} onClick={() => setShowGuides(!showGuides)} title={t("ribbon.showGuides")}><Ruler size={15} /></button>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.zoomGroup")}</div><div className="ribbon-group-buttons">
        <button className="ribbon-icon-btn" onClick={() => setZoom(zoom - 10)} title={t("ribbon.zoomOut")}><ZoomOut size={15} /></button>
        <span className="zoom-value">{zoom}%</span>
        <button className="ribbon-icon-btn" onClick={() => setZoom(zoom + 10)} title={t("ribbon.zoomIn")}><ZoomIn size={15} /></button>
        <button className="ribbon-icon-btn" onClick={() => setZoom(100)} title={t("ribbon.zoomReset")}><Maximize size={15} /></button>
      </div></div>
      <div className="ribbon-sep" />
      <div className="ribbon-group"><div className="ribbon-group-label">{t("ribbon.panes")}</div><div className="ribbon-group-buttons">
        <button className={`ribbon-icon-btn ${showTaskPane ? "active" : ""}`} onClick={() => setShowTaskPane(!showTaskPane)} title={t("ribbon.taskPane")}><PanelRight size={15} /></button>
      </div></div>
    </div>
  );

  const tabs: { id: RibbonTab; label: string }[] = [
    { id: "home", label: t("ribbon.home") },
    { id: "insert", label: t("ribbon.insert") },
    { id: "design", label: t("ribbon.design") },
    { id: "transitions", label: t("ribbon.transitions") },
    { id: "show", label: t("ribbon.show") },
    { id: "review", label: t("ribbon.review") },
    { id: "view", label: t("ribbon.view") },
  ];

  const tabRenderers: Record<RibbonTab, () => JSX.Element> = {
    home: renderHomeTab,
    insert: renderInsertTab,
    design: renderDesignTab,
    transitions: renderTransitionsTab,
    show: renderShowTab,
    review: renderReviewTab,
    view: renderViewTab,
  };

  return (
    <>
      <style>{styles}</style>
      <div className="titlebar-wrapper">
        <div className="titlebar" onMouseDown={handleDragStart}>
          <div className="titlebar-left" ref={menuRef} onBlur={handleMenuBlur}>
            <button className={`menu-btn ${openMenu === "file" ? "active" : ""}`} onClick={() => toggleMenu("file")}>{t("toolbar.file")}</button>
            {openMenu === "file" && (
              <div className="menu-dropdown">
                {fileMenuItems.map((item, i) =>
                  item.separator ? <div key={i} className="menu-sep" /> : (
                    <button key={i} className="menu-item" onClick={item.action}>
                      <span>{item.label}</span>
                      {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
          <div className="titlebar-tabs">
            {tabs.map(tab => (
              <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
            ))}
          </div>
          <div className="titlebar-center">
            <span className="titlebar-title">{project?.name || "4YWebDeck"}</span>
          </div>
          <div className="titlebar-right">
            <button className="win-btn" onClick={handleMinimize}><Minus size={14} /></button>
            <button className="win-btn" onClick={handleMaximize}><Square size={12} /></button>
            <button className="win-btn win-btn-close" onClick={handleClose}><X size={14} /></button>
          </div>
        </div>
        <div className="ribbon-bar">{tabRenderers[activeTab]()}</div>
        {hyperlinkOpen && (
          <div className="dialog-overlay" onClick={() => setHyperlinkOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("insert.hyperlink")}</div>
              <div className="dialog-body">
                <label className="dialog-label">URL</label>
                <input className="dialog-input" type="url" value={hyperlinkUrl} onChange={(e) => setHyperlinkUrl(e.target.value)} placeholder="https://" autoFocus onKeyDown={(e) => e.key === "Enter" && applyHyperlink()} />
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setHyperlinkOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={applyHyperlink}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {headerFooterOpen && (
          <div className="dialog-overlay" onClick={() => setHeaderFooterOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.headerFooter")}</div>
              <div className="dialog-body">
                <label className="dialog-check"><input type="checkbox" checked={headerFooter.showSlideNumber} onChange={(e) => setHeaderFooter({ ...headerFooter, showSlideNumber: e.target.checked })} />{t("ribbon.showSlideNumber")}</label>
                <label className="dialog-check"><input type="checkbox" checked={headerFooter.showDate} onChange={(e) => setHeaderFooter({ ...headerFooter, showDate: e.target.checked })} />{t("ribbon.showDate")}</label>
                <label className="dialog-label">{t("ribbon.footerText")}</label>
                <input className="dialog-input" value={headerFooter.footerText} onChange={(e) => setHeaderFooter({ ...headerFooter, footerText: e.target.value })} />
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setHeaderFooterOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={applyHeaderFooter}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {masterOpen && (
          <div className="dialog-overlay" onClick={() => setMasterOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.slideMaster")}</div>
              <div className="dialog-body">
                <label className="dialog-label">{t("ribbon.background")}</label>
                <div className="dialog-color-row"><input type="color" value={masterBg} onChange={(e) => setMasterBg(e.target.value)} /><span className="dialog-color-val">{masterBg}</span></div>
                <label className="dialog-label">{t("ribbon.unifiedFont")}</label>
                <select className="dialog-select" value={masterFont} onChange={(e) => setMasterFont(e.target.value)}>{fontFamilies.map((f: string) => <option key={f} value={f}>{f}</option>)}</select>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setMasterOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={applyMasterTheme}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {tableOpen && (
          <div className="dialog-overlay" onClick={() => setTableOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("insert.table")}</div>
              <div className="dialog-body">
                <label className="dialog-label">{t("ribbon.tableRows")}</label>
                <input className="dialog-input" type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
                <label className="dialog-label">{t("ribbon.tableCols")}</label>
                <input className="dialog-input" type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setTableOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={() => {
                  const data = Array.from({ length: tableRows }, (_, r) =>
                    Array.from({ length: tableCols }, (_, c) => r === 0 ? `${t("ribbon.tableHeader")} ${c + 1}` : "")
                  );
                  addElement({
                    ...defaultElement("table"),
                    type: "table",
                    cols: tableCols,
                    rows: tableRows,
                    content: JSON.stringify(data),
                    width: Math.min(700, tableCols * 100),
                    height: Math.min(400, tableRows * 40),
                  });
                  setTableOpen(false);
                }}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {encryptOpen && (
          <div className="dialog-overlay" onClick={() => setEncryptOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.encrypt")}</div>
              <div className="dialog-body">
                <label className="dialog-label">{t("ribbon.encrypt")}</label>
                <input className="dialog-input" type="password" value={encryptPassword} onChange={(e) => setEncryptPassword(e.target.value)} placeholder="********" autoFocus />
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setEncryptOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={() => { setEncryptOpen(false); }}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {renameOpen && (
          <div className="dialog-overlay" onClick={() => setRenameOpen(false)}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("toolbar.renameProject")}</div>
              <div className="dialog-body">
                <label className="dialog-label">{t("toolbar.projectName")}</label>
                <input className="dialog-input" type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder={t("toolbar.projectNamePlaceholder")} autoFocus onKeyDown={(e) => {
                  if (e.key === "Enter" && renameValue.trim()) {
                    const renamed = { ...project!, name: renameValue.trim(), updatedAt: Date.now() };
                    useStore.getState().loadProject(renamed);
                    setRenameOpen(false);
                    saveProject(renamed, useStore.getState().lastSaveDir ?? undefined);
                  }
                }} />
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setRenameOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" disabled={!renameValue.trim()} onClick={() => {
                  if (!renameValue.trim() || !project) return;
                  const renamed = { ...project, name: renameValue.trim(), updatedAt: Date.now() };
                  useStore.getState().loadProject(renamed);
                  setRenameOpen(false);
                  saveProject(renamed, useStore.getState().lastSaveDir ?? undefined);
                }}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {rehearseMode && (
          <div className="dialog-overlay" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="dialog-box" style={{ minWidth: 400 }}>
              <div className="dialog-title">{t("ribbon.rehearseTimer")}</div>
              <div className="dialog-body" style={{ alignItems: "center", padding: 24 }}>
                <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "monospace", color: "var(--color-text)" }}>
                  {(() => {
                    const ms = rehearseTimings.length > 0 ? rehearseTimings[rehearseTimings.length - 1] : Date.now() - useStore.getState().rehearseStartTime;
                    const s = Math.floor(ms / 1000);
                    const m = Math.floor(s / 60);
                    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
                  })()}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  {t("ribbon.elapsedTime")}: {rehearseTimings.length > 0 ? `${(rehearseTimings.reduce((a: number, b: number) => a + b, 0) / 1000).toFixed(1)}s` : "0s"}
                </div>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => stopRehearse()}>{t("ribbon.stopRehearse")}</button>
                <button className="dialog-btn-ok" onClick={() => recordRehearseTiming()}>{t("ribbon.nextSlide")}</button>
              </div>
            </div>
          </div>
        )}
        {customShowOpen && project && (
          <div className="dialog-overlay" onClick={() => setCustomShowOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.customShow")}</div>
              <div className="dialog-body">
                <label className="dialog-label">{t("ribbon.selectSlides")}</label>
                <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {project.slides.map((slide, i) => (
                    <label key={slide.id} className="dialog-check">
                      <input type="checkbox" checked={customShowSlides.includes(slide.id)} onChange={(e) => {
                        if (e.target.checked) setCustomShowSlides([...customShowSlides, slide.id]);
                        else setCustomShowSlides(customShowSlides.filter(id => id !== slide.id));
                      }} />
                      {i + 1}. {slide.title}
                    </label>
                  ))}
                </div>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setCustomShowOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={() => {
                  if (customShowSlides.length > 0) {
                    setCustomShowOpen(false);
                    useStore.getState().setActiveSlide(customShowSlides[0]);
                    setViewMode("browser");
                  }
                }} disabled={customShowSlides.length === 0}>{t("ribbon.playCustom")}</button>
              </div>
            </div>
          </div>
        )}
        {countdownOpen && (
          <div className="dialog-overlay" onClick={() => { stopCountdown(); setCountdownOpen(false); }}>
            <div className="dialog-box" style={{ minWidth: 360 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.countdown")}</div>
              <div className="dialog-body" style={{ alignItems: "center", padding: 24 }}>
                <div style={{ fontSize: 56, fontWeight: 700, fontFamily: "monospace", color: countdownRemaining === 0 ? "#EF4444" : "var(--color-text)" }}>
                  {formatCountdown(countdownRemaining)}
                </div>
                {!countdownRunning && countdownRemaining === countdownSeconds && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <label className="dialog-label">{t("ribbon.setMinutes")}</label>
                    <input className="dialog-input" style={{ width: 60, textAlign: "center" }} type="number" min={1} max={120} value={Math.floor(countdownSeconds / 60)} onChange={(e) => {
                      const mins = Math.max(1, Math.min(120, parseInt(e.target.value) || 5));
                      setCountdownSeconds(mins * 60);
                      setCountdownRemaining(mins * 60);
                    }} />
                  </div>
                )}
                {countdownRemaining === 0 && (
                  <div style={{ fontSize: 14, color: "#EF4444", fontWeight: 600, marginTop: 8 }}>{t("ribbon.timeUp")}</div>
                )}
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => { stopCountdown(); setCountdownOpen(false); }}>{t("common.cancel")}</button>
                {!countdownRunning && countdownRemaining > 0 && (
                  <button className="dialog-btn-ok" onClick={startCountdown}>{t("ribbon.start")}</button>
                )}
                {countdownRunning && (
                  <button className="dialog-btn-ok" onClick={stopCountdown}>{t("ribbon.pause")}</button>
                )}
                <button className="dialog-btn-ok" onClick={resetCountdown} disabled={countdownRunning}>{t("ribbon.reset")}</button>
              </div>
            </div>
          </div>
        )}
        {symbolOpen && (
          <div className="dialog-overlay" onClick={() => setSymbolOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 400 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("insert.symbol")}</div>
              <div className="dialog-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                  {["©","®","™","°","±","×","÷","≠","≤","≥","∞","∑","∏","√","∫","∂","∇","≈","≡","∈","∉","⊂","⊃","∪","∩","∀","∃","¬","∧","∨","←","→","↑","↓","↔","⇒","⇔","⇐","⇑","⇓","α","β","γ","δ","ε","ζ","η","θ","λ","μ","π","ρ","σ","τ","φ","ψ","ω","Ω","★","☆","♠","♣","♥","♦","●","○","■","□","▲","△","◆","◇","♪","♫","✓","✗","✦","✧","❤","☀","☁","☂","☃","⚡","✿","❀","❁","❂"].map((sym, i) => (
                    <button key={i} style={{ width: 32, height: 32, fontSize: 16, border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { if (selectedElementId) { const el = activeSlide?.elements.find(e => e.id === selectedElementId); if (el && "content" in el && typeof el.content === "string") { updateElement(el.id, { content: el.content + sym }); } } else { addElement({ ...defaultElement("text"), content: sym }); } setSymbolOpen(false); }} title={sym}>{sym}</button>
                  ))}
                </div>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setSymbolOpen(false)}>{t("common.cancel")}</button>
              </div>
            </div>
          </div>
        )}
        {settingsOpen && (
          <div className="dialog-overlay" onClick={() => setSettingsOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 360 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.settings")}</div>
              <div className="dialog-body">
                <div className="settings-row">
                  <span className="settings-label">{t("ribbon.appearance")}</span>
                  <div className="settings-toggle-group">
                    <button className={`settings-toggle-btn ${theme === "light" ? "active" : ""}`} onClick={() => { setTheme("light"); }}><Sun size={14} /> {t("toolbar.lightMode")}</button>
                    <button className={`settings-toggle-btn ${theme === "dark" ? "active" : ""}`} onClick={() => { setTheme("dark"); }}><Moon size={14} /> {t("toolbar.darkMode")}</button>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-label">{t("ribbon.language")}</span>
                  <div className="settings-toggle-group">
                    <button className={`settings-toggle-btn ${locale === "zh" ? "active" : ""}`} onClick={() => { setLocale("zh"); }}>中文</button>
                    <button className={`settings-toggle-btn ${locale === "en" ? "active" : ""}`} onClick={() => { setLocale("en"); }}>English</button>
                  </div>
                </div>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-ok" onClick={() => setSettingsOpen(false)}>{t("common.close")}</button>
              </div>
            </div>
          </div>
        )}
        {aboutOpen && (
          <div className="dialog-overlay" onClick={() => setAboutOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 340, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ marginTop: 16, marginBottom: 12 }}>
                <img src={logoUrl} alt="4YWebDeck" width="64" height="64" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>4YWebDeck</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>v{APP_VERSION}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 12, lineHeight: 1.6 }}>
                A web-based presentation editor<br />
                Built with React + Tauri
              </div>
              <div className="dialog-actions" style={{ marginTop: 20 }}>
                <button className="dialog-btn-ok" onClick={() => setAboutOpen(false)}>{t("common.close")}</button>
              </div>
            </div>
          </div>
        )}
        {chartEditOpen && (
          <div className="dialog-overlay" onClick={() => setChartEditOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 520, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.editData")}</div>
              <div className="dialog-body" style={{ maxHeight: 420, overflow: "auto" }}>
                <div className="prop-row" style={{ marginBottom: 12 }}>
                  <label className="prop-label" style={{ minWidth: 60 }}>{t("ribbon.chartType")}</label>
                  <select className="prop-select" value={chartEditData.type} onChange={(e) => setChartEditData({ ...chartEditData, type: e.target.value as "bar" | "line" | "pie" })}>
                    <option value="bar">{t("ribbon.chartBar")}</option>
                    <option value="line">{t("ribbon.chartLine")}</option>
                    <option value="pie">{t("ribbon.chartPie")}</option>
                  </select>
                </div>
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>{t("ribbon.chartLabels")}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                  {chartEditData.labels.map((lbl, i) => (
                    <input key={i} type="text" className="prop-input" style={{ width: 60 }} value={lbl} onChange={(e) => { const n = [...chartEditData.labels]; n[i] = e.target.value; setChartEditData({ ...chartEditData, labels: n }); }} />
                  ))}
                  <button className="ribbon-icon-btn" style={{ flexShrink: 0 }} onClick={() => setChartEditData({ ...chartEditData, labels: [...chartEditData.labels, "L" + (chartEditData.labels.length + 1)], series: chartEditData.series.map(s => ({ ...s, data: [...s.data, 0] })) })}>+</button>
                  {chartEditData.labels.length > 1 && <button className="ribbon-icon-btn" style={{ flexShrink: 0 }} onClick={() => setChartEditData({ ...chartEditData, labels: chartEditData.labels.slice(0, -1), series: chartEditData.series.map(s => ({ ...s, data: s.data.slice(0, -1) })) })}>-</button>}
                </div>
                {chartEditData.series.map((sr, si) => (
                  <div key={si} style={{ marginBottom: 10, padding: 8, border: "1px solid var(--color-border)", borderRadius: 6, background: "var(--color-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <input type="text" className="prop-input" style={{ flex: 1 }} value={sr.name} onChange={(e) => { const n = [...chartEditData.series]; n[si] = { ...n[si], name: e.target.value }; setChartEditData({ ...chartEditData, series: n }); }} />
                      <input type="color" className="prop-color" value={sr.color} onChange={(e) => { const n = [...chartEditData.series]; n[si] = { ...n[si], color: e.target.value }; setChartEditData({ ...chartEditData, series: n }); }} />
                      {chartEditData.series.length > 1 && <button className="ribbon-icon-btn" onClick={() => setChartEditData({ ...chartEditData, series: chartEditData.series.filter((_, j) => j !== si) })}><X size={14} /></button>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {sr.data.map((v, di) => (
                        <input key={di} type="number" className="prop-input" style={{ width: 50 }} value={v} onChange={(e) => { const n = [...chartEditData.series]; const d = [...n[si].data]; d[di] = parseFloat(e.target.value) || 0; n[si] = { ...n[si], data: d }; setChartEditData({ ...chartEditData, series: n }); }} />
                      ))}
                    </div>
                  </div>
                ))}
                <button className="dialog-btn-ok" style={{ whiteSpace: "nowrap" }} onClick={() => setChartEditData({ ...chartEditData, series: [...chartEditData.series, { name: `Series ${chartEditData.series.length + 1}`, data: chartEditData.labels.map(() => 0), color: ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"][chartEditData.series.length % 6] }] })}>+ {t("ribbon.addSeries")}</button>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setChartEditOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={() => { if (selectedElementId) { updateElement(selectedElementId, { content: JSON.stringify(chartEditData) }); } setChartEditOpen(false); }}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {smartEditOpen && (
          <div className="dialog-overlay" onClick={() => setSmartEditOpen(false)}>
            <div className="dialog-box" style={{ minWidth: 420, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">{t("ribbon.smartArt")}</div>
              <div className="dialog-body" style={{ maxHeight: 400, overflow: "auto" }}>
                <div className="prop-row" style={{ marginBottom: 12 }}>
                  <label className="prop-label" style={{ minWidth: 60 }}>{t("ribbon.smartLayout")}</label>
                  <select className="prop-select" value={smartEditData.layout} onChange={(e) => setSmartEditData({ ...smartEditData, layout: e.target.value as "process" | "cycle" | "hierarchy" | "pyramid" })}>
                    <option value="process">{t("ribbon.layoutProcess")}</option>
                    <option value="cycle">{t("ribbon.layoutCycle")}</option>
                    <option value="hierarchy">{t("ribbon.layoutHierarchy")}</option>
                    <option value="pyramid">{t("ribbon.layoutPyramid")}</option>
                  </select>
                </div>
                {smartEditData.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <input type="text" className="prop-input" style={{ flex: 1 }} value={item.text} onChange={(e) => { const n = [...smartEditData.items]; n[i] = { ...n[i], text: e.target.value }; setSmartEditData({ ...smartEditData, items: n }); }} />
                    <input type="color" className="prop-color" value={item.color} onChange={(e) => { const n = [...smartEditData.items]; n[i] = { ...n[i], color: e.target.value }; setSmartEditData({ ...smartEditData, items: n }); }} />
                    {smartEditData.items.length > 1 && <button className="ribbon-icon-btn" onClick={() => setSmartEditData({ ...smartEditData, items: smartEditData.items.filter((_, j) => j !== i) })}><X size={14} /></button>}
                  </div>
                ))}
                <button className="dialog-btn-ok" style={{ whiteSpace: "nowrap" }} onClick={() => setSmartEditData({ ...smartEditData, items: [...smartEditData.items, { text: "Item " + (smartEditData.items.length + 1), color: ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"][smartEditData.items.length % 6] }] })}>+ {t("ribbon.addItem")}</button>
              </div>
              <div className="dialog-actions">
                <button className="dialog-btn-cancel" onClick={() => setSmartEditOpen(false)}>{t("common.cancel")}</button>
                <button className="dialog-btn-ok" onClick={() => { if (selectedElementId) { updateElement(selectedElementId, { content: JSON.stringify(smartEditData) }); } setSmartEditOpen(false); }}>{t("common.ok")}</button>
              </div>
            </div>
          </div>
        )}
        {formulaEditOpen && (
          <FormulaDialog
            value={formulaEditValue}
            onChange={setFormulaEditValue}
            onConfirm={() => {
              if (formulaEditElementId) {
                updateElement(formulaEditElementId, { content: formulaEditValue });
              } else {
                addElement({ ...defaultElement("formula"), content: formulaEditValue });
              }
              setFormulaEditOpen(false);
            }}
            onCancel={() => setFormulaEditOpen(false)}
          />
        )}
      </div>
    </>
  );
}

const styles = `
.titlebar-wrapper { flex-shrink: 0; user-select: none; }
.titlebar { display: flex; align-items: center; height: 32px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); transition: background var(--transition-normal), border-color var(--transition-normal); }
.titlebar-left { display: flex; align-items: center; padding-left: 8px; position: relative; }
.menu-btn { padding: 4px 12px; font-size: 12px; color: var(--color-text); background: transparent; border: none; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
.menu-btn:hover, .menu-btn.active { background: var(--color-hover); }
.menu-dropdown { position: absolute; top: 100%; left: 0; min-width: 220px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 4px; z-index: 1000; animation: dropdownIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top left; }
@keyframes dropdownIn { from { opacity: 0; transform: scaleY(0.95) translateY(-2px); } to { opacity: 1; transform: scaleY(1) translateY(0); } }
.menu-item { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 6px 12px; font-size: 12px; color: var(--color-text); background: transparent; border: none; border-radius: 4px; cursor: pointer; text-align: left; }
.menu-item:hover { background: var(--color-hover); }
.menu-shortcut { color: var(--color-text-secondary); font-size: 11px; margin-left: 24px; }
.menu-sep { height: 1px; background: var(--color-border); margin: 4px 8px; }
.titlebar-tabs { display: flex; align-items: center; margin-left: 4px; gap: 1px; }
.tab-btn { padding: 4px 14px; font-size: 12px; color: var(--color-text-secondary); background: transparent; border: none; border-radius: 4px 4px 0 0; cursor: pointer; transition: all 0.15s; border-bottom: 2px solid transparent; }
.tab-btn:hover { color: var(--color-text); background: var(--color-hover); }
.tab-btn.active { color: var(--color-primary); background: var(--color-hover); border-bottom-color: var(--color-primary); font-weight: 500; }
.titlebar-center { flex: 1; text-align: center; font-size: 12px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.titlebar-right { display: flex; align-items: center; padding-right: 4px; }
.win-btn { width: 32px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); background: transparent; border: none; cursor: pointer; transition: background 0.15s; border-radius: 4px; }
.win-btn:hover { background: var(--color-hover); color: var(--color-text); }
.win-btn-close:hover { background: #EF4444; color: #FFF; }
.ribbon-bar { background: var(--color-surface); border-bottom: 1px solid var(--color-border); transition: background var(--transition-normal), border-color var(--transition-normal); }
.ribbon-content { display: flex; align-items: stretch; padding: 4px 8px; min-height: 40px; gap: 0; flex-wrap: nowrap; animation: ribbonFadeIn 0.2s ease; }
@keyframes ribbonFadeIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
.ribbon-group { display: flex; flex-direction: column; padding: 2px 8px; min-width: 0; position: relative; }
.ribbon-group-label { font-size: 10px; color: var(--color-text-secondary); text-align: center; margin-top: auto; padding-top: 2px; white-space: nowrap; border-top: 1px solid var(--color-border); }
.ribbon-group-buttons { display: flex; flex-direction: row; gap: 2px; flex: 1; flex-wrap: wrap; align-items: center; }
.ribbon-group-buttons-col { flex-direction: column; flex-wrap: nowrap; align-items: stretch; gap: 4px; }
.ribbon-sep { width: 1px; background: var(--color-border); margin: 4px 4px; flex-shrink: 0; align-self: stretch; }
.ribbon-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 11px; color: var(--color-text); background: transparent; border: 1px solid transparent; border-radius: 4px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.ribbon-btn:hover:not(:disabled) { background: var(--color-hover); border-color: var(--color-border); }
.ribbon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ribbon-btn span { font-size: 11px; }
.ribbon-icon-btn { width: 28px; height: 26px; display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-secondary); background: transparent; border: 1px solid transparent; border-radius: 4px; cursor: pointer; transition: all 0.15s; }
.ribbon-icon-btn:hover:not(:disabled) { background: var(--color-hover); border-color: var(--color-border); color: var(--color-text); }
.ribbon-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ribbon-icon-btn.active { background: var(--color-primary); color: var(--color-background); border-color: var(--color-primary); }
.font-group { min-width: 320px; }
.font-select-wrapper { position: relative; }
.font-select-btn { display: flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 11px; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; min-width: 80px; max-width: 140px; height: 24px; }
.font-select-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.font-select-btn:hover:not(:disabled) { border-color: var(--color-primary); }
.font-select-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left; }
.font-size-btn { min-width: 50px; max-width: 60px; }
.font-dropdown { position: absolute; top: 100%; left: 0; min-width: 180px; max-height: 280px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 4px; z-index: 1000; animation: dropdownIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top left; }
.font-search-input { width: 100%; padding: 4px 8px; font-size: 12px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px; outline: none; margin-bottom: 4px; box-sizing: border-box; }
.font-search-input:focus { border-color: var(--color-primary); }
.font-size-dropdown { min-width: 70px; }
.font-dropdown-item { display: block; width: 100%; padding: 4px 10px; font-size: 12px; color: var(--color-text); background: transparent; border: none; border-radius: 3px; cursor: pointer; text-align: left; }
.font-dropdown-item:hover { background: var(--color-hover); }
.font-dropdown-item.active { background: var(--color-primary); color: var(--color-background); }
.color-picker-wrapper { position: relative; display: inline-flex; }
.color-input-hidden { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.theme-scroll-container { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; margin-bottom: -4px; max-width: 320px; }
.theme-grid { display: flex; gap: 4px; min-width: max-content; }
.theme-card { width: 56px; height: 36px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
.theme-card:hover { border-color: var(--color-primary); transform: scale(1.05); }
.theme-card.active { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
.theme-card-label { font-size: 8px; text-align: center; line-height: 1.2; }
.scheme-scroll-container { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; margin-bottom: -4px; max-width: 280px; }
.scheme-list { display: flex; gap: 6px; min-width: max-content; }
.scheme-row { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 6px; border: 1px solid transparent; border-radius: 4px; cursor: pointer; background: transparent; flex-shrink: 0; }
.scheme-row:hover { background: var(--color-hover); border-color: var(--color-border); }
.scheme-colors { display: flex; gap: 2px; }
.scheme-dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); }
.scheme-label { font-size: 10px; color: var(--color-text-secondary); white-space: nowrap; }
.transition-grid { display: grid; grid-template-columns: repeat(5, 64px); gap: 4px; }
.transition-card { width: 64px; height: 40px; border-radius: 6px; border: 2px solid var(--color-border); cursor: pointer; display: flex; align-items: center; justify-content: center; background: var(--color-surface); transition: all 0.15s; }
.transition-card:hover:not(:disabled) { border-color: var(--color-primary); background: var(--color-hover); }
.transition-card:disabled { opacity: 0.4; cursor: not-allowed; }
.transition-card.active { border-color: var(--color-primary); background: rgba(59,130,246,0.1); }
.transition-card span { font-size: 9px; color: var(--color-text); text-align: center; line-height: 1.2; }
.ribbon-color-swatch { width: 20px; height: 20px; border-radius: 4px; cursor: pointer; transition: all 0.15s; }
.ribbon-color-swatch:hover { transform: scale(1.15); }
.ribbon-color-swatch.active { box-shadow: 0 0 0 2px var(--color-primary); }
.prop-row-compact { display: flex; align-items: center; gap: 4px; }
.prop-label-sm { font-size: 10px; color: var(--color-text-secondary); min-width: 40px; white-space: nowrap; }
.prop-input-sm { width: 60px; padding: 2px 4px; font-size: 11px; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; outline: none; }
.prop-input-sm:focus { border-color: var(--color-primary); }
.prop-unit { font-size: 10px; color: var(--color-text-secondary); }
.zoom-value { font-size: 11px; color: var(--color-text); min-width: 36px; text-align: center; }
.present-ribbon-btn { background: var(--color-primary) !important; color: var(--color-background) !important; border-color: var(--color-primary) !important; }
.present-ribbon-btn:hover:not(:disabled) { opacity: 0.9; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: dialogOverlayIn 0.2s ease; }
@keyframes dialogOverlayIn { from { opacity: 0; } to { opacity: 1; } }
.dialog-box { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.2); min-width: 360px; max-width: 480px; padding: 0; overflow: hidden; animation: dialogBoxIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes dialogBoxIn { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.dialog-title { padding: 16px 20px 12px; font-size: 15px; font-weight: 600; color: var(--color-text); border-bottom: 1px solid var(--color-border); }
.dialog-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.dialog-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
.dialog-input { width: 100%; padding: 8px 10px; font-size: 13px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; }
.dialog-input:focus { border-color: var(--color-primary); }
.dialog-select { width: 100%; padding: 8px 10px; font-size: 13px; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; outline: none; }
.dialog-select option { background: var(--color-surface); color: var(--color-text); }
.dialog-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text); cursor: pointer; }
.dialog-check input { accent-color: var(--color-primary); }
.dialog-color-row { display: flex; align-items: center; gap: 8px; }
.dialog-color-val { font-size: 12px; color: var(--color-text-secondary); font-family: monospace; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--color-border); }
.dialog-btn-cancel { padding: 6px 16px; font-size: 13px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; }
.dialog-btn-cancel:hover { background: var(--color-hover); }
.dialog-btn-ok { padding: 6px 16px; font-size: 13px; color: var(--color-background); background: var(--color-primary); border: none; border-radius: 6px; cursor: pointer; }
.dialog-btn-ok:hover { opacity: 0.9; }
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.settings-row + .settings-row { border-top: 1px solid var(--color-border); }
.settings-label { font-size: 13px; color: var(--color-text); font-weight: 500; }
.settings-toggle-group { display: flex; gap: 0; border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden; }
.settings-toggle-btn { display: flex; align-items: center; gap: 4px; padding: 6px 14px; font-size: 12px; color: var(--color-text-secondary); background: var(--color-surface); border: none; cursor: pointer; transition: all 0.15s; }
.settings-toggle-btn + .settings-toggle-btn { border-left: 1px solid var(--color-border); }
.settings-toggle-btn:hover { background: var(--color-hover); color: var(--color-text); }
.settings-toggle-btn.active { background: var(--color-primary); color: var(--color-background); }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes fly-in-left { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes fly-out-right { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
@keyframes zoom-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes zoom-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; } }
@keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
@keyframes spin-in { from { transform: rotate(0deg) scale(0); opacity: 0; } to { transform: rotate(360deg) scale(1); opacity: 1; } }
@keyframes wipe-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes split-in { from { clip-path: inset(50% 0); opacity: 0; } to { clip-path: inset(0 0); opacity: 1; } }
@keyframes rise-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes float-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes grow-turn { from { transform: scale(0) rotate(-90deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
@keyframes swivel { from { transform: perspective(400px) rotateY(-90deg); opacity: 0; } to { transform: perspective(400px) rotateY(0); opacity: 1; } }

.transition-scroll-container { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; margin-bottom: -4px; max-width: 360px; }
.transition-scroll-container .transition-grid { display: flex; gap: 4px; min-width: max-content; }
.transition-scroll-container .transition-card { width: 64px; height: 40px; flex-shrink: 0; }

@media (max-width: 1200px) {
  .theme-scroll-container { max-width: 280px; }
  .scheme-scroll-container { max-width: 240px; }
  .transition-scroll-container { max-width: 300px; }
}

@media (max-width: 992px) {
  .theme-scroll-container { max-width: 240px; }
  .scheme-scroll-container { max-width: 200px; }
  .transition-scroll-container { max-width: 260px; }
  .ribbon-content { padding: 4px 4px; }
  .ribbon-group { padding: 2px 4px; }
}

@media (max-width: 768px) {
  .theme-scroll-container { max-width: 200px; }
  .scheme-scroll-container { max-width: 160px; }
  .transition-scroll-container { max-width: 220px; }
  .titlebar-center { display: none; }
  .ribbon-btn span { display: none; }
}

@media (max-width: 576px) {
  .theme-scroll-container { max-width: 160px; }
  .scheme-scroll-container { max-width: 140px; }
  .transition-scroll-container { max-width: 180px; }
  .tab-btn { padding: 4px 8px; font-size: 11px; }
  .ribbon-btn { padding: 3px 4px; }
  .font-group { min-width: 240px; }
}
`;