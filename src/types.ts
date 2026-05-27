export type ElementType = "text" | "image" | "rect" | "circle" | "line" | "title" | "subtitle" | "table" | "arrow" | "star" | "diamond" | "triangle" | "chart" | "smartart" | "video" | "audio" | "formula" | "wordart" | "comment" | "action";

export type ClipShape = "none" | "circle" | "ellipse" | "triangle" | "diamond" | "star" | "hexagon" | "pentagon" | "heart" | "arrow" | "cross" | "roundedRect";

export type AnimationType = "none" | "appear" | "fade" | "flyIn" | "float" | "split" | "wipe" | "shape" | "wheel" | "randomBars" | "growTurn" | "zoom" | "swivel" | "bounce" | "blinds";

export type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";

export type AnimationDirection = "fromBottom" | "fromRight" | "fromTop" | "fromLeft" | "center" | "horizontal" | "vertical";

export type AnimationCategory = "enter" | "exit" | "emphasis" | "motion";

export interface AnimationStep {
  id: string;
  elementId: string;
  category: AnimationCategory;
  style: AnimationType;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  direction: AnimationDirection;
  order: number;
}

export interface ElementAnimation {
  type: AnimationType;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  direction: AnimationDirection;
  order: number;
}

export type TextDirection = "horizontal" | "vertical" | "rotate90" | "rotate270";

export type TextCase = "none" | "uppercase" | "lowercase" | "capitalize" | "sentence";

export interface SlideElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  fill: string;
  textColor: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  textAlign: "left" | "center" | "right" | "justify";
  borderRadius: number;
  opacity: number;
  fillOpacity: number;
  borderWidth: number;
  borderColor: string;
  zIndex: number;
  lineHeight: number;
  letterSpacing: number;
  paddingLeft: number;
  listStyle: "none" | "disc" | "decimal" | "square";
  verticalAlign: "top" | "middle" | "bottom";
  shadow: string;
  cols: number;
  rows: number;
  groupId: string | null;
  animation: ElementAnimation | null;
  hyperlink: string | null;
  locked: boolean;
  textDirection: TextDirection;
  superscript: boolean;
  subscript: boolean;
  textCase: TextCase;
  shapeEffect: "none" | "shadow" | "reflection" | "glow" | "softEdge" | "bevel" | "3dRotation";
  clipShape: ClipShape;
  objectFit: "cover" | "contain" | "fill";
}

export type TransitionType = "none" | "fade" | "slide" | "push" | "wipe" | "dissolve" | "zoom" | "flip" | "smooth" | "cut" | "shape" | "newsflash" | "spokes" | "blinds" | "comb";

export type TransitionSound = "none" | "applause" | "windChime" | "whoosh" | "click" | "drumroll";

export interface SlideTransition {
  type: TransitionType;
  enterType: TransitionType;
  exitType: TransitionType;
  duration: number;
  advanceOnClick: boolean;
  advanceAfterTime: number;
  sound: TransitionSound;
  direction: "fromLeft" | "fromRight" | "fromTop" | "fromBottom" | "horizontal" | "vertical";
}

export type SlideLayout = "blank" | "title" | "titleContent" | "twoContent" | "sectionHeader" | "comparison" | "contentCaption" | "pictureCaption";

export interface Slide {
  id: string;
  title: string;
  elements: SlideElement[];
  background: string;
  order: number;
  hidden: boolean;
  transition: SlideTransition;
  layout: SlideLayout;
  animationSequence: AnimationStep[];
}

export type SlideSize = "16:9" | "4:3" | "16:10" | "custom";

export interface Project {
  id: string;
  name: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
  slideSize: SlideSize;
  customWidth: number;
  customHeight: number;
}

export type ThemeMode = "light" | "dark";

export type ViewMode = "normal" | "browser" | "reading" | "master" | "handout";

export interface HistoryEntry {
  project: Project;
  activeSlideId: string | null;
  selectedElementId: string | null;
}

export interface AppState {
  project: Project | null;
  activeSlideId: string | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
  theme: ThemeMode;
  locale: "zh" | "en";
  clipboard: SlideElement | null;
  formatPainter: SlideElement | null;
  animationPainter: SlideElement | null;
  showGrid: boolean;
  showGuides: boolean;
  zoom: number;
  viewMode: ViewMode;
  history: HistoryEntry[];
  historyIndex: number;
  lastSaveDir: string | null;
  lastProjectDir: string | null;
  lastSaveTime: number | null;
  isSaving: boolean;
  showComments: boolean;
  showTaskPane: boolean;
  showAnimationPane: boolean;
  slideSize: SlideSize;
  rehearseMode: boolean;
  rehearseTimings: number[];
  rehearseStartTime: number;
  presenting: boolean;
  presentSlideIndex: number;
  fontFamilies: string[];
  fontsLoaded: boolean;
  rightPanelTab: "properties" | "search" | "animation";
  rightPanelOpen: boolean;
  contextMenu: { x: number; y: number; type: "element" | "slide" | "canvas" | "sidebar" | "sidebarBlank"; targetId: string } | null;
  setContextMenu: (menu: { x: number; y: number; type: "element" | "slide" | "canvas" | "sidebar" | "sidebarBlank"; targetId: string } | null) => void;
  editingSlideId: string | null;
  setEditingSlideId: (id: string | null) => void;
  searchHighlight: { keyword: string; elementIds: string[]; activeId: string } | null;
  setSearchHighlight: (h: { keyword: string; elementIds: string[]; activeId: string } | null) => void;
  setLastSaveDir: (dir: string | null) => void;
  setLastProjectDir: (dir: string | null) => void;
  setLastSaveTime: (time: number | null) => void;
  setIsSaving: (saving: boolean) => void;

  loadFonts: () => Promise<void>;
  setRightPanelTab: (tab: "properties" | "search" | "animation") => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: "zh" | "en") => void;
  toggleLocale: () => void;
  newProject: (name: string) => void;
  loadProject: (project: Project) => void;
  addSlide: () => void;
  addSlideWithLayout: (layout: SlideLayout) => void;
  deleteSlide: (id: string) => void;
  duplicateSlide: (slideId: string) => void;
  updateSlide: (id: string, updates: Partial<Pick<Slide, "title" | "background" | "hidden" | "transition" | "layout">>) => void;
  setActiveSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setProjectName: (name: string) => void;
  setSlideSize: (size: SlideSize) => void;

  addElement: (element: Omit<SlideElement, "id" | "zIndex">) => void;
  updateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  selectElement: (elementId: string | null, multiSelect?: boolean) => void;
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
  moveUp: (elementId: string) => void;
  moveDown: (elementId: string) => void;
  moveElementToSlide: (elementId: string, targetSlideId: string) => void;
  copyElement: (elementId: string) => void;
  cutElement: (elementId: string) => void;
  pasteElement: () => void;
  applyFormatPainter: (elementId: string) => void;
  setFormatPainter: (element: SlideElement | null) => void;
  setAnimationPainter: (element: SlideElement | null) => void;
  applyAnimationPainter: (elementId: string) => void;
  setShowGrid: (show: boolean) => void;
  setShowGuides: (show: boolean) => void;
  setZoom: (zoom: number) => void;
  setViewMode: (mode: ViewMode) => void;
  applyTransitionToAll: () => void;
  applyThemeToAll: (background: string) => void;
  applyFontToAll: (fontFamily: string) => void;
  setShowComments: (show: boolean) => void;
  setShowTaskPane: (show: boolean) => void;
  setShowAnimationPane: (show: boolean) => void;
  startRehearse: () => void;
  stopRehearse: () => void;
  recordRehearseTiming: () => void;
  startPresentation: (fromIndex?: number) => void;
  stopPresentation: () => void;
  setPresentSlideIndex: (index: number) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  groupElements: (elementIds: string[]) => void;
  ungroupElements: (groupId: string) => void;
  alignElements: (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => void;
  distributeElements: (direction: "horizontal" | "vertical") => void;

  setElementAnimation: (elementId: string, animation: ElementAnimation | null) => void;
  removeElementAnimation: (elementId: string) => void;
  addAnimationStep: (slideId: string, step: Omit<AnimationStep, "id" | "order">) => void;
  updateAnimationStep: (slideId: string, stepId: string, updates: Partial<AnimationStep>) => void;
  removeAnimationStep: (slideId: string, stepId: string) => void;
  reorderAnimationStep: (slideId: string, fromIndex: number, toIndex: number) => void;

  formulaEditOpen: boolean;
  formulaEditElementId: string | null;
  setFormulaEditOpen: (open: boolean, elementId?: string | null) => void;
}
