import { create } from "zustand";
import type { AppState, Project, Slide, SlideElement, SlideLayout, AnimationStep } from "../types";
import { setLocale as setI18nLocale, t } from "../i18n";
import { getSystemFonts } from "../utils/fileIO";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DEFAULT_TRANSITION = { type: "none" as const, enterType: "none" as const, exitType: "none" as const, duration: 0.5, advanceOnClick: true, advanceAfterTime: 0, sound: "none" as const, direction: "fromLeft" as const };

function createDefaultSlide(order: number, layout: SlideLayout = "titleContent"): Slide {
  const slide: Slide = {
    id: generateId(),
    title: `${t("slide.defaultTitle")} ${order + 1}`,
    elements: [],
    background: "#FFFFFF",
    order,
    hidden: false,
    transition: { ...DEFAULT_TRANSITION },
    layout,
    animationSequence: [],
  };

  const baseEl = (overrides: Partial<SlideElement> & { type: SlideElement["type"] }): Omit<SlideElement, "id" | "zIndex"> => {
    const { type, ...rest } = overrides;
    return {
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
      ...rest,
    };
  };

  switch (layout) {
    case "title":
      slide.elements = [
        { ...baseEl({ type: "title", content: t("insert.title"), fontSize: 36, fontWeight: 700, textAlign: "center", width: 600, height: 60, x: 180, y: 200 }), id: generateId(), zIndex: 1 },
      ];
      break;
    case "titleContent":
      slide.elements = [
        { ...baseEl({ type: "title", content: t("insert.title"), fontSize: 32, fontWeight: 700, textAlign: "center", width: 600, height: 50, x: 180, y: 60 }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 16, width: 700, height: 340, x: 130, y: 140 }), id: generateId(), zIndex: 2 },
      ];
      break;
    case "twoContent":
      slide.elements = [
        { ...baseEl({ type: "title", content: t("insert.title"), fontSize: 32, fontWeight: 700, textAlign: "center", width: 600, height: 50, x: 180, y: 40 }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 14, width: 330, height: 340, x: 60, y: 130 }), id: generateId(), zIndex: 2 },
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 14, width: 330, height: 340, x: 570, y: 130 }), id: generateId(), zIndex: 3 },
      ];
      break;
    case "sectionHeader":
      slide.elements = [
        { ...baseEl({ type: "title", content: t("insert.title"), fontSize: 40, fontWeight: 700, textAlign: "left", width: 700, height: 70, x: 130, y: 160 }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "line", fill: "#22C55E", width: 400, height: 4, x: 130, y: 250 }), id: generateId(), zIndex: 2 },
        { ...baseEl({ type: "subtitle", content: t("insert.subtitle"), fontSize: 18, textAlign: "left", textColor: "#64748B", width: 600, height: 40, x: 130, y: 270 }), id: generateId(), zIndex: 3 },
      ];
      break;
    case "comparison":
      slide.elements = [
        { ...baseEl({ type: "title", content: t("insert.title"), fontSize: 28, fontWeight: 700, textAlign: "center", width: 600, height: 45, x: 180, y: 30 }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "text", content: t("insert.title"), fontSize: 16, fontWeight: 700, width: 330, height: 30, x: 60, y: 100 }), id: generateId(), zIndex: 2 },
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 13, width: 330, height: 300, x: 60, y: 150 }), id: generateId(), zIndex: 3 },
        { ...baseEl({ type: "text", content: t("insert.title"), fontSize: 16, fontWeight: 700, width: 330, height: 30, x: 570, y: 100 }), id: generateId(), zIndex: 4 },
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 13, width: 330, height: 300, x: 570, y: 150 }), id: generateId(), zIndex: 5 },
      ];
      break;
    case "contentCaption":
      slide.elements = [
        { ...baseEl({ type: "text", content: t("insert.text"), fontSize: 16, width: 700, height: 340, x: 130, y: 60 }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "text", content: t("insert.subtitle"), fontSize: 12, textColor: "#64748B", width: 700, height: 40, x: 130, y: 470 }), id: generateId(), zIndex: 2 },
      ];
      break;
    case "pictureCaption":
      slide.elements = [
        { ...baseEl({ type: "rect", fill: "#F1F5F9", width: 700, height: 340, x: 130, y: 60, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" }), id: generateId(), zIndex: 1 },
        { ...baseEl({ type: "text", content: t("insert.subtitle"), fontSize: 12, textColor: "#64748B", width: 700, height: 40, x: 130, y: 470 }), id: generateId(), zIndex: 2 },
      ];
      break;
    case "blank":
    default:
      break;
  }

  return slide;
}

const MAX_HISTORY = 50;

export const useStore = create<AppState>((set, _get) => ({
  project: null,
  activeSlideId: null,
  selectedElementId: null,
  selectedElementIds: [],
  theme: (localStorage.getItem("webdeck-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) as AppState["theme"],
  locale: (localStorage.getItem("webdeck-locale") || "zh") as AppState["locale"],
  clipboard: null,
  formatPainter: null,
  animationPainter: null,
  showGrid: false,
  showGuides: false,
  zoom: 100,
  viewMode: "normal" as const,
  history: [],
  historyIndex: -1,
  showComments: true,
  showTaskPane: false,
  showAnimationPane: false,
  slideSize: "16:9" as const,
  rehearseMode: false,
  rehearseTimings: [] as number[],
  rehearseStartTime: 0,
  presenting: false,
  presentSlideIndex: 0,
  fontFamilies: [
    "system-ui", "Arial", "Helvetica", "Times New Roman", "Georgia",
    "Verdana", "Courier New", "Impact", "Comic Sans MS",
    "Noto Sans SC", "Noto Serif SC", "Microsoft YaHei", "SimSun",
    "SimHei", "KaiTi", "FangSong"
  ] as string[],
  fontsLoaded: false,

  loadFonts: async () => {
    try {
      const fonts = await getSystemFonts();
      if (fonts.length > 0) set({ fontFamilies: fonts, fontsLoaded: true });
      else set({ fontsLoaded: true });
    } catch {
      set({ fontsLoaded: true });
    }
  },

  setTheme: (theme) => { localStorage.setItem("webdeck-theme", theme); set({ theme }); },
  toggleTheme: () => set((s) => { const next = s.theme === "dark" ? "light" : "dark"; localStorage.setItem("webdeck-theme", next); return { theme: next }; }),

  rightPanelTab: "properties" as "properties" | "search" | "animation",
  rightPanelOpen: true,
  setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  contextMenu: null as { x: number; y: number; type: "element" | "slide" | "canvas" | "sidebar" | "sidebarBlank"; targetId: string } | null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  editingSlideId: null as string | null,
  setEditingSlideId: (id) => set({ editingSlideId: id }),

  searchHighlight: null as { keyword: string; elementIds: string[]; activeId: string } | null,
  setSearchHighlight: (h) => set({ searchHighlight: h }),
  lastSaveDir: (localStorage.getItem("webdeck-lastSaveDir") || null) as string | null,
  setLastSaveDir: (dir: string | null) => { if (dir) localStorage.setItem("webdeck-lastSaveDir", dir); else localStorage.removeItem("webdeck-lastSaveDir"); set({ lastSaveDir: dir }); },
  lastProjectDir: (localStorage.getItem("webdeck-lastProjectDir") || null) as string | null,
  setLastProjectDir: (dir: string | null) => { if (dir) localStorage.setItem("webdeck-lastProjectDir", dir); else localStorage.removeItem("webdeck-lastProjectDir"); set({ lastProjectDir: dir }); },
  lastSaveTime: null as number | null,
  setLastSaveTime: (time: number | null) => set({ lastSaveTime: time }),
  isSaving: false as boolean,
  setIsSaving: (saving: boolean) => set({ isSaving: saving }),

  setLocale: (locale) => {
    localStorage.setItem("webdeck-locale", locale);
    setI18nLocale(locale);
    set({ locale });
  },
  toggleLocale: () =>
    set((s) => {
      const next = s.locale === "zh" ? "en" : "zh";
      localStorage.setItem("webdeck-locale", next);
      setI18nLocale(next);
      return { locale: next };
    }),

  pushHistory: () =>
    set((s) => {
      if (!s.project) return {};
      const entry: AppState["history"][0] = {
        project: JSON.parse(JSON.stringify(s.project)),
        activeSlideId: s.activeSlideId,
        selectedElementId: s.selectedElementId,
      };
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return {};
      const newIndex = s.historyIndex - 1;
      const entry = s.history[newIndex];
      return {
        project: JSON.parse(JSON.stringify(entry.project)),
        activeSlideId: entry.activeSlideId,
        selectedElementId: entry.selectedElementId,
        historyIndex: newIndex,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return {};
      const newIndex = s.historyIndex + 1;
      const entry = s.history[newIndex];
      return {
        project: JSON.parse(JSON.stringify(entry.project)),
        activeSlideId: entry.activeSlideId,
        selectedElementId: entry.selectedElementId,
        historyIndex: newIndex,
      };
    }),

  newProject: (name) => {
    const firstSlide = createDefaultSlide(0);
    const project: Project = {
      id: generateId(),
      name,
      slides: [firstSlide],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      slideSize: "16:9",
      customWidth: 960,
      customHeight: 540,
    };
    const entry: AppState["history"][0] = {
      project: JSON.parse(JSON.stringify(project)),
      activeSlideId: firstSlide.id,
      selectedElementId: null,
    };
    set({ project, activeSlideId: firstSlide.id, selectedElementId: null, history: [entry], historyIndex: 0 });
  },

  loadProject: (project) => {
    const entry: AppState["history"][0] = {
      project: JSON.parse(JSON.stringify(project)),
      activeSlideId: project.slides[0]?.id ?? null,
      selectedElementId: null,
    };
    set({ project, activeSlideId: project.slides[0]?.id ?? null, selectedElementId: null, history: [entry], historyIndex: 0 });
  },

  addSlide: () =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const newSlide = createDefaultSlide(s.project.slides.length);
      return {
        project: { ...s.project, slides: [...s.project.slides, newSlide], updatedAt: Date.now() },
        activeSlideId: newSlide.id,
        selectedElementId: null,
      };
    }),

  addSlideWithLayout: (layout) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const newSlide = createDefaultSlide(s.project.slides.length, layout);
      return {
        project: { ...s.project, slides: [...s.project.slides, newSlide], updatedAt: Date.now() },
        activeSlideId: newSlide.id,
        selectedElementId: null,
      };
    }),

  deleteSlide: (id) =>
    set((s) => {
      if (!s.project || s.project.slides.length <= 1) return {};
      s.pushHistory();
      const filtered = s.project.slides.filter((sl) => sl.id !== id);
      const newActiveId = s.activeSlideId === id ? filtered[0]?.id ?? null : s.activeSlideId;
      return {
        project: { ...s.project, slides: filtered, updatedAt: Date.now() },
        activeSlideId: newActiveId,
        selectedElementId: null,
      };
    }),

  duplicateSlide: (slideId: string) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === slideId);
      if (!slide) return {};
      const index = s.project.slides.indexOf(slide);
      const newSlide: Slide = {
        ...slide,
        id: generateId(),
        title: `${slide.title} (2)`,
        elements: slide.elements.map((el) => ({ ...el, id: generateId() })),
      };
      const slides = [...s.project.slides];
      slides.splice(index + 1, 0, newSlide);
      return {
        project: { ...s.project, slides, updatedAt: Date.now() },
        activeSlideId: newSlide.id,
        selectedElementId: null,
      };
    }),

  updateSlide: (id, updates) =>
    set((s) => {
      if (!s.project) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
          updatedAt: Date.now(),
        },
      };
    }),

  bringForward: (elementId: string) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      const above = slide.elements.find((e) => e.zIndex === el.zIndex + 1);
      if (!above) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? {
                  ...sl,
                  elements: sl.elements.map((e) => {
                    if (e.id === elementId) return { ...e, zIndex: e.zIndex + 1 };
                    if (e.id === above.id) return { ...e, zIndex: e.zIndex - 1 };
                    return e;
                  }),
                }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  sendBackward: (elementId: string) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      const below = slide.elements.find((e) => e.zIndex === el.zIndex - 1);
      if (!below) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? {
                  ...sl,
                  elements: sl.elements.map((e) => {
                    if (e.id === elementId) return { ...e, zIndex: e.zIndex - 1 };
                    if (e.id === below.id) return { ...e, zIndex: e.zIndex + 1 };
                    return e;
                  }),
                }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  setActiveSlide: (id) => set({ activeSlideId: id, selectedElementId: null }),

  reorderSlides: (fromIndex, toIndex) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const slides = [...s.project.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return {
        project: { ...s.project, slides: slides.map((sl, i) => ({ ...sl, order: i })), updatedAt: Date.now() },
      };
    }),

  setProjectName: (name) =>
    set((s) => {
      if (!s.project) return {};
      return { project: { ...s.project, name, updatedAt: Date.now() } };
    }),

  setSlideSize: (size) =>
    set((s) => {
      if (!s.project) return {};
      return { project: { ...s.project, slideSize: size, updatedAt: Date.now() }, slideSize: size };
    }),

  addElement: (element) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const maxZ = slide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const newEl: SlideElement = { ...element, id: generateId(), zIndex: maxZ + 1 };
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId ? { ...sl, elements: [...sl.elements, newEl] } : sl
          ),
          updatedAt: Date.now(),
        },
        selectedElementId: newEl.id,
      };
    }),

  updateElement: (elementId, updates) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  deleteElement: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId ? { ...sl, elements: sl.elements.filter((el) => el.id !== elementId) } : sl
          ),
          updatedAt: Date.now(),
        },
        selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
      };
    }),

  duplicateElement: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      const maxZ = slide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const newEl: SlideElement = { ...el, id: generateId(), x: el.x + 20, y: el.y + 20, zIndex: maxZ + 1 };
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId ? { ...sl, elements: [...sl.elements, newEl] } : sl
          ),
          updatedAt: Date.now(),
        },
        selectedElementId: newEl.id,
      };
    }),

  selectElement: (elementId, multiSelect = false) => set((s) => {
    const panelSwitch = elementId && s.rightPanelTab === "search" ? { rightPanelTab: "properties" as const, searchHighlight: null as null } : {};
    if (multiSelect && elementId) {
      const ids = s.selectedElementIds.includes(elementId)
        ? s.selectedElementIds.filter(id => id !== elementId)
        : [...s.selectedElementIds, elementId];
      return { selectedElementId: ids.length > 0 ? ids[ids.length - 1] : null, selectedElementIds: ids, ...panelSwitch };
    }
    return { selectedElementId: elementId, selectedElementIds: elementId ? [elementId] : [], ...panelSwitch };
  }),

  bringToFront: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const maxZ = slide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  sendToBack: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const minZ = slide.elements.reduce((m, e) => Math.min(m, e.zIndex), 0);
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.id === elementId ? { ...el, zIndex: minZ - 1 } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  moveUp: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      const above = slide.elements.find((e) => e.zIndex === el.zIndex + 1);
      if (!above) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((e) => e.id === elementId ? { ...e, zIndex: el.zIndex + 1 } : e.id === above.id ? { ...e, zIndex: el.zIndex } : e) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  moveDown: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      const below = slide.elements.find((e) => e.zIndex === el.zIndex - 1);
      if (!below) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((e) => e.id === elementId ? { ...e, zIndex: el.zIndex - 1 } : e.id === below.id ? { ...e, zIndex: el.zIndex } : e) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  moveElementToSlide: (elementId, targetSlideId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || s.activeSlideId === targetSlideId) return {};
      const srcSlide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      const el = srcSlide?.elements.find((e) => e.id === elementId);
      if (!el) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => {
            if (sl.id === s.activeSlideId) return { ...sl, elements: sl.elements.filter((e) => e.id !== elementId) };
            if (sl.id === targetSlideId) return { ...sl, elements: [...sl.elements, { ...el, zIndex: Math.max(0, ...sl.elements.map(e => e.zIndex)) + 1 }] };
            return sl;
          }),
          updatedAt: Date.now(),
        },
        selectedElementId: null,
        selectedElementIds: [],
      };
    }),

  copyElement: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      return { clipboard: { ...el } };
    }),

  cutElement: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === elementId);
      if (!el) return {};
      return {
        clipboard: { ...el },
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId ? { ...sl, elements: sl.elements.filter((e) => e.id !== elementId) } : sl
          ),
          updatedAt: Date.now(),
        },
        selectedElementId: null,
      };
    }),

  pasteElement: () =>
    set((s) => {
      if (!s.project || !s.activeSlideId || !s.clipboard) return {};
      s.pushHistory();
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const maxZ = slide.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const newEl: SlideElement = { ...s.clipboard, id: generateId(), x: s.clipboard.x + 20, y: s.clipboard.y + 20, zIndex: maxZ + 1 };
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId ? { ...sl, elements: [...sl.elements, newEl] } : sl
          ),
          updatedAt: Date.now(),
        },
        selectedElementId: newEl.id,
      };
    }),

  applyFormatPainter: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || !s.formatPainter) return {};
      s.pushHistory();
      const src = s.formatPainter;
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? {
                  ...sl,
                  elements: sl.elements.map((el) =>
                    el.id === elementId
                      ? {
                          ...el,
                          fontFamily: src.fontFamily,
                          fontSize: src.fontSize,
                          fontWeight: src.fontWeight,
                          fontStyle: src.fontStyle,
                          textDecoration: src.textDecoration,
                          textColor: src.textColor,
                          textAlign: src.textAlign,
                          lineHeight: src.lineHeight,
                          letterSpacing: src.letterSpacing,
                          fill: src.fill,
                          borderWidth: src.borderWidth,
                          borderColor: src.borderColor,
                          borderRadius: src.borderRadius,
                          opacity: src.opacity,
                          shadow: src.shadow,
                        }
                      : el
                  ),
                }
              : sl
          ),
          updatedAt: Date.now(),
        },
        formatPainter: null,
      };
    }),

  setFormatPainter: (element) => set({ formatPainter: element }),

  setAnimationPainter: (element) => set({ animationPainter: element }),

  applyAnimationPainter: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || !s.animationPainter) return {};
      s.pushHistory();
      const src = s.animationPainter;
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? {
                  ...sl,
                  elements: sl.elements.map((el) =>
                    el.id === elementId ? { ...el, animation: src.animation ? { ...src.animation } : null } : el
                  ),
                }
              : sl
          ),
          updatedAt: Date.now(),
        },
        animationPainter: null,
      };
    }),

  setShowGrid: (show) => set({ showGrid: show }),
  setShowGuides: (show) => set({ showGuides: show }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowComments: (show) => set({ showComments: show }),
  setShowTaskPane: (show) => set({ showTaskPane: show }),
  setShowAnimationPane: (show) => set({ showAnimationPane: show }),

  startRehearse: () => set({ rehearseMode: true, rehearseTimings: [], rehearseStartTime: Date.now() }),
  stopRehearse: () => set({ rehearseMode: false }),
  recordRehearseTiming: () => set((s) => {
    const elapsed = Date.now() - s.rehearseStartTime;
    return { rehearseTimings: [...s.rehearseTimings, elapsed], rehearseStartTime: Date.now() };
  }),

  startPresentation: (fromIndex: number = 0) => set({ presenting: true, presentSlideIndex: fromIndex }),
  stopPresentation: () => set({ presenting: false, presentSlideIndex: 0 }),
  setPresentSlideIndex: (index: number) => set({ presentSlideIndex: index }),

  applyTransitionToAll: () =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      const srcSlide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!srcSlide) return {};
      const transition = srcSlide.transition;
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => ({ ...sl, transition })),
          updatedAt: Date.now(),
        },
      };
    }),

  applyThemeToAll: (background) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => ({ ...sl, background })),
          updatedAt: Date.now(),
        },
      };
    }),

  applyFontToAll: (fontFamily) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => ({
            ...sl,
            elements: sl.elements.map((el) =>
              ["text", "title", "subtitle", "wordart"].includes(el.type) ? { ...el, fontFamily } : el
            ),
          })),
          updatedAt: Date.now(),
        },
      };
    }),

  groupElements: (elementIds) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || elementIds.length < 2) return {};
      s.pushHistory();
      const groupId = generateId();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (elementIds.includes(el.id) ? { ...el, groupId } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  ungroupElements: (groupId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.groupId === groupId ? { ...el, groupId: null } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  alignElements: (alignment) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || !s.selectedElementId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return {};
      s.pushHistory();
      const SLIDE_W = 960, SLIDE_H = 540;
      let updated = el;
      switch (alignment) {
        case "left": updated = { ...el, x: 0 }; break;
        case "center": updated = { ...el, x: (SLIDE_W - el.width) / 2 }; break;
        case "right": updated = { ...el, x: SLIDE_W - el.width }; break;
        case "top": updated = { ...el, y: 0 }; break;
        case "middle": updated = { ...el, y: (SLIDE_H - el.height) / 2 }; break;
        case "bottom": updated = { ...el, y: SLIDE_H - el.height }; break;
      }
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => (sl.id === s.activeSlideId ? { ...sl, elements: sl.elements.map((e) => e.id === updated.id ? updated : e) } : sl)),
          updatedAt: Date.now(),
        },
      };
    }),

  distributeElements: (direction) =>
    set((s) => {
      if (!s.project || !s.activeSlideId || !s.selectedElementId) return {};
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
      if (!slide) return {};
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return {};
      s.pushHistory();
      const SLIDE_W = 960, SLIDE_H = 540;
      let updated = el;
      if (direction === "horizontal") {
        updated = { ...el, x: (SLIDE_W - el.width) / 2 };
      } else {
        updated = { ...el, y: (SLIDE_H - el.height) / 2 };
      }
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) => (sl.id === s.activeSlideId ? { ...sl, elements: sl.elements.map((e) => e.id === updated.id ? updated : e) } : sl)),
          updatedAt: Date.now(),
        },
      };
    }),

  setElementAnimation: (elementId, animation) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.id === elementId ? { ...el, animation } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeElementAnimation: (elementId) =>
    set((s) => {
      if (!s.project || !s.activeSlideId) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map((sl) =>
            sl.id === s.activeSlideId
              ? { ...sl, elements: sl.elements.map((el) => (el.id === elementId ? { ...el, animation: null } : el)) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  addAnimationStep: (slideId, step) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const slide = s.project.slides.find(sl => sl.id === slideId);
      if (!slide) return {};
      const seq = slide.animationSequence || [];
      const maxOrder = seq.reduce((m, st) => Math.max(m, st.order), 0);
      const newStep: AnimationStep = { ...step, id: generateId(), order: maxOrder + 1 };
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map(sl =>
            sl.id === slideId ? { ...sl, animationSequence: [...seq, newStep] } : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  updateAnimationStep: (slideId, stepId, updates) =>
    set((s) => {
      if (!s.project) return {};
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map(sl =>
            sl.id === slideId
              ? { ...sl, animationSequence: (sl.animationSequence || []).map(st => st.id === stepId ? { ...st, ...updates } : st) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeAnimationStep: (slideId, stepId) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map(sl =>
            sl.id === slideId
              ? { ...sl, animationSequence: (sl.animationSequence || []).filter(st => st.id !== stepId) }
              : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  reorderAnimationStep: (slideId, fromIndex, toIndex) =>
    set((s) => {
      if (!s.project) return {};
      s.pushHistory();
      const slide = s.project.slides.find(sl => sl.id === slideId);
      if (!slide) return {};
      const seq = [...(slide.animationSequence || [])];
      const [moved] = seq.splice(fromIndex, 1);
      seq.splice(toIndex, 0, moved);
      return {
        project: {
          ...s.project,
          slides: s.project.slides.map(sl =>
            sl.id === slideId ? { ...sl, animationSequence: seq.map((st, i) => ({ ...st, order: i + 1 })) } : sl
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  formulaEditOpen: false,
  formulaEditElementId: null,
  setFormulaEditOpen: (open, elementId) => set({ formulaEditOpen: open, formulaEditElementId: elementId ?? null }),
}));
