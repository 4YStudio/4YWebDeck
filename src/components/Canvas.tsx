import { useCallback, useRef, useState, useEffect, memo } from "react";
import { useStore } from "../store";
import type { SlideElement, SlideSize } from "../types";
import { t } from "../i18n";
import katex from "katex";

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "255,255,255";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function highlightText(text: string, keyword: string, isActive: boolean): React.ReactNode {
  if (!keyword) return text;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;
  const lower = remaining.toLowerCase();
  const kwLower = keyword.toLowerCase();
  let searchFrom = 0;
  while (searchFrom < remaining.length) {
    const idx = lower.indexOf(kwLower, searchFrom);
    if (idx === -1) {
      parts.push(remaining.slice(searchFrom));
      break;
    }
    if (idx > searchFrom) parts.push(remaining.slice(searchFrom, idx));
    parts.push(
      <mark key={keyIdx++} style={{ backgroundColor: isActive ? "#F59E0B" : "#FDE68A", color: "#000", borderRadius: 2, padding: "0 1px" }}>
        {remaining.slice(idx, idx + keyword.length)}
      </mark>
    );
    searchFrom = idx + keyword.length;
  }
  return parts;
}

function CustomVideoPlayerInner({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovering, setHovering] = useState(false);
  const lastTimeUpdateRef = useRef(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    const bar = e.currentTarget;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", background: "#000" }}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      onMouseDown={(e) => e.stopPropagation()}>
      <video ref={videoRef} src={src} style={{ width: "100%", flex: 1, objectFit: "contain" }} playsInline preload="auto"
        onTimeUpdate={() => {
          const now = Date.now();
          if (now - lastTimeUpdateRef.current > 250) {
            lastTimeUpdateRef.current = now;
            setCurrentTime(videoRef.current?.currentTime || 0);
          }
        }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      {!playing && (
        <div onClick={togglePlay} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 150ms" }}>
          <div style={{ width: 0, height: 0, borderLeft: "18px solid #FFF", borderTop: "11px solid transparent", borderBottom: "11px solid transparent", marginLeft: 4 }} />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", padding: "4px 8px", display: "flex", alignItems: "center", gap: 8, opacity: hovering || !playing ? 1 : 0, transition: "opacity 200ms", pointerEvents: hovering || !playing ? "auto" : "none" }}>
        <div onClick={togglePlay} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: "#FFF", flexShrink: 0 }}>
          {playing ? <span style={{ fontSize: 14 }}>⏸</span> : <span style={{ fontSize: 14 }}>▶</span>}
        </div>
        <div onClick={seek} style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, cursor: "pointer", position: "relative" }}>
          <div style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%", height: "100%", background: "#3B82F6", borderRadius: 2, transition: "width 100ms linear" }} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace", flexShrink: 0 }}>{formatTime(currentTime)}/{formatTime(duration)}</span>
      </div>
    </div>
  );
}
const CustomVideoPlayer = memo(CustomVideoPlayerInner);

function CustomAudioPlayerInner({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastTimeUpdateRef = useRef(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audioRef.current;
    const bar = e.currentTarget;
    if (!a || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="auto"
        onTimeUpdate={() => {
          const now = Date.now();
          if (now - lastTimeUpdateRef.current > 250) {
            lastTimeUpdateRef.current = now;
            setCurrentTime(audioRef.current?.currentTime || 0);
          }
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div onClick={togglePlay} style={{ width: 28, height: 28, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        {playing
          ? <div style={{ display: "flex", gap: 2 }}><div style={{ width: 3, height: 10, background: "#FFF", borderRadius: 1 }} /><div style={{ width: 3, height: 10, background: "#FFF", borderRadius: 1 }} /></div>
          : <div style={{ width: 0, height: 0, borderLeft: "10px solid #FFF", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: 2 }} />
        }
      </div>
      <div onClick={seek} style={{ flex: 1, height: 4, background: "rgba(59,130,246,0.3)", borderRadius: 2, cursor: "pointer", position: "relative" }}>
        <div style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%", height: "100%", background: "#3B82F6", borderRadius: 2, transition: "width 100ms linear" }} />
      </div>
      <span style={{ fontSize: 9, color: "#64748B", fontFamily: "monospace", flexShrink: 0, minWidth: 52, textAlign: "right" }}>{formatTime(currentTime)}/{formatTime(duration)}</span>
    </div>
  );
}
const CustomAudioPlayer = memo(CustomAudioPlayerInner);

const CLIP_PATHS: Record<string, string> = {
  none: "",
  circle: "circle(50% at 50% 50%)",
  ellipse: "ellipse(50% 40% at 50% 50%)",
  triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  heart: "path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')",
  arrow: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)",
  cross: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
  roundedRect: "inset(0 round 15%)",
};

function getSlideDimensions(size: SlideSize): [number, number] {
  switch (size) {
    case "4:3": return [960, 720];
    case "16:10": return [960, 600];
    case "16:9": default: return [960, 540];
  }
}

type DragState = {
  elementId: string;
  startX: number;
  startY: number;
  elStartX: number;
  elStartY: number;
  multiStartPositions?: { id: string; x: number; y: number }[];
} | null;

type ResizeState = {
  elementId: string;
  handle: string;
  startX: number;
  startY: number;
  elStartX: number;
  elStartY: number;
  elStartW: number;
  elStartH: number;
} | null;

type RotateState = {
  elementId: string;
  startAngle: number;
  elStartRotation: number;
  centerX: number;
  centerY: number;
} | null;

export function Canvas() {
  const {
    project, activeSlideId, selectedElementId, selectElement, updateElement,
    deleteElement, copyElement, cutElement, pasteElement, clipboard,
    duplicateElement, undo, redo, formatPainter, applyFormatPainter,
    animationPainter, applyAnimationPainter,
    showGrid, showGuides, zoom,
    selectedElementIds,
    slideSize, viewMode, setActiveSlide,
    searchHighlight,
    setContextMenu,
  } = useStore();
  const [CANVAS_W, CANVAS_H] = getSlideDimensions(slideSize);
  const activeSlide = project?.slides.find((s) => s.id === activeSlideId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const [rotateState, setRotateState] = useState<RotateState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [snapLines, setSnapLines] = useState<{ type: "h" | "v"; pos: number }[]>([]);
  const [posTooltip, setPosTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const editingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const padding = 48;
      const scaleX = (containerRect.width - padding) / CANVAS_W;
      const scaleY = (containerRect.height - padding) / CANVAS_H;
      setScale(Math.min(scaleX, scaleY, 1));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (editingId && editingRef.current) {
      editingRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (editingRef.current.childNodes.length > 0) {
        range.selectNodeContents(editingRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingId]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("slide-canvas") || (e.target as HTMLElement).classList.contains("canvas-grid")) {
        selectElement(null);
        setEditingId(null);
        setContextMenu(null);
        const canvasEl = containerRef.current?.querySelector(".slide-canvas");
        if (canvasEl) {
          const rect = canvasEl.getBoundingClientRect();
          const x = (e.clientX - rect.left) / (scale * (zoom / 100));
          const y = (e.clientY - rect.top) / (scale * (zoom / 100));
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }
      }
    },
    [selectElement, scale, zoom]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, element: SlideElement) => {
      e.stopPropagation();
      if (editingId === element.id) return;
      if (element.locked) {
        selectElement(element.id, e.shiftKey);
        return;
      }
      if (formatPainter && selectedElementId !== element.id) {
        applyFormatPainter(element.id);
        return;
      }
      if (animationPainter && selectedElementId !== element.id) {
        applyAnimationPainter(element.id);
        return;
      }
      selectElement(element.id, e.shiftKey);
      if (element.groupId && !e.shiftKey) {
        const groupElIds = activeSlide?.elements
          .filter(el => el.groupId === element.groupId)
          .map(el => el.id) || [];
        if (groupElIds.length > 1) {
          groupElIds.forEach(id => {
            if (id !== element.id && !selectedElementIds.includes(id)) {
              selectElement(id, true);
            }
          });
        }
      }
      if (!e.shiftKey) {
        const allSelectedIds = element.groupId
          ? (activeSlide?.elements.filter(el => el.groupId === element.groupId).map(el => el.id) || [element.id])
          : (selectedElementIds.length > 1 && selectedElementIds.includes(element.id) ? selectedElementIds : [element.id]);
        const multiPositions = allSelectedIds.length > 1
          ? activeSlide?.elements
              .filter(el => allSelectedIds.includes(el.id))
              .map(el => ({ id: el.id, x: el.x, y: el.y }))
          : undefined;
        setDragState({
          elementId: element.id,
          startX: e.clientX,
          startY: e.clientY,
          elStartX: element.x,
          elStartY: element.y,
          multiStartPositions: multiPositions,
        });
      }
    },
    [selectElement, editingId, formatPainter, applyFormatPainter, animationPainter, applyAnimationPainter, selectedElementId]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, element: SlideElement, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      setResizeState({
        elementId: element.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        elStartX: element.x,
        elStartY: element.y,
        elStartW: element.width,
        elStartH: element.height,
      });
    },
    []
  );

  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent, element: SlideElement) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = containerRef.current?.querySelector(".slide-canvas");
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const centerX = rect.left + (element.x + element.width / 2) * scale;
      const centerY = rect.top + (element.y + element.height / 2) * scale;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      setRotateState({
        elementId: element.id,
        startAngle,
        elStartRotation: element.rotation || 0,
        centerX,
        centerY,
      });
    },
    [scale]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === "z") { e.preventDefault(); undo(); return; }
      if (isCtrl && e.key === "y") { e.preventDefault(); redo(); return; }
      if (isCtrl && e.key === "c") { e.preventDefault(); if (selectedElementId) copyElement(selectedElementId); return; }
      if (isCtrl && e.key === "x") { e.preventDefault(); if (selectedElementId) cutElement(selectedElementId); return; }
      if (isCtrl && e.key === "v") { e.preventDefault(); if (clipboard) pasteElement(); return; }
      if (isCtrl && e.key === "d") { e.preventDefault(); if (selectedElementId) duplicateElement(selectedElementId); return; }
      if (isCtrl && e.key === "f") { e.preventDefault(); useStore.getState().setRightPanelTab("search"); return; }
      if (isCtrl && e.key === "a") {
        e.preventDefault();
        if (activeSlide && activeSlide.elements.length > 0) {
          const ids = activeSlide.elements.map(el => el.id);
          useStore.setState({ selectedElementId: ids[ids.length - 1], selectedElementIds: ids });
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedElementIds.length > 1) {
          selectedElementIds.forEach(id => deleteElement(id));
        } else if (selectedElementId) {
          deleteElement(selectedElementId);
        }
        return;
      }
      if (e.key === "Escape") { selectElement(null); return; }
      if (selectedElementId) {
        const step = e.shiftKey ? 10 : 1;
        const ids = selectedElementIds.length > 1 ? selectedElementIds : [selectedElementId];
        switch (e.key) {
          case "ArrowUp": e.preventDefault(); ids.forEach(id => updateElement(id, { y: (activeSlide?.elements.find(el => el.id === id)?.y || 0) - step })); break;
          case "ArrowDown": e.preventDefault(); ids.forEach(id => updateElement(id, { y: (activeSlide?.elements.find(el => el.id === id)?.y || 0) + step })); break;
          case "ArrowLeft": e.preventDefault(); ids.forEach(id => updateElement(id, { x: (activeSlide?.elements.find(el => el.id === id)?.x || 0) - step })); break;
          case "ArrowRight": e.preventDefault(); ids.forEach(id => updateElement(id, { x: (activeSlide?.elements.find(el => el.id === id)?.x || 0) + step })); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingId, selectedElementId, selectedElementIds, copyElement, cutElement, pasteElement, deleteElement, duplicateElement, undo, redo, selectElement, updateElement, activeSlide, clipboard]);

  useEffect(() => {
    if (!dragState && !resizeState && !rotateState) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        let newX = Math.round(dragState.elStartX + dx);
        let newY = Math.round(dragState.elStartY + dy);
        const el = activeSlide?.elements.find(e => e.id === dragState.elementId);
        if (el) {
          const SNAP = 5;
          const lines: { type: "h" | "v"; pos: number }[] = [];
          const cx = newX + el.width / 2;
          const cy = newY + el.height / 2;
          const SLIDE_W = 960, SLIDE_H = 540;
          if (Math.abs(cx - SLIDE_W / 2) < SNAP) { newX = SLIDE_W / 2 - el.width / 2; lines.push({ type: "v", pos: SLIDE_W / 2 }); }
          if (Math.abs(cy - SLIDE_H / 2) < SNAP) { newY = SLIDE_H / 2 - el.height / 2; lines.push({ type: "h", pos: SLIDE_H / 2 }); }
          if (Math.abs(newX) < SNAP) { newX = 0; lines.push({ type: "v", pos: 0 }); }
          if (Math.abs(newY) < SNAP) { newY = 0; lines.push({ type: "h", pos: 0 }); }
          if (Math.abs(newX + el.width - SLIDE_W) < SNAP) { newX = SLIDE_W - el.width; lines.push({ type: "v", pos: SLIDE_W }); }
          if (Math.abs(newY + el.height - SLIDE_H) < SNAP) { newY = SLIDE_H - el.height; lines.push({ type: "h", pos: SLIDE_H }); }
          for (const other of activeSlide?.elements || []) {
            if (other.id === el.id) continue;
            if (dragState.multiStartPositions?.some(p => p.id === other.id)) continue;
            const ocx = other.x + other.width / 2;
            const ocy = other.y + other.height / 2;
            if (Math.abs(cx - ocx) < SNAP) { newX = ocx - el.width / 2; lines.push({ type: "v", pos: ocx }); }
            if (Math.abs(cy - ocy) < SNAP) { newY = ocy - el.height / 2; lines.push({ type: "h", pos: ocy }); }
            if (Math.abs(newX - other.x) < SNAP) { newX = other.x; lines.push({ type: "v", pos: other.x }); }
            if (Math.abs(newY - other.y) < SNAP) { newY = other.y; lines.push({ type: "h", pos: other.y }); }
            if (Math.abs(newX + el.width - (other.x + other.width)) < SNAP) { newX = other.x + other.width - el.width; lines.push({ type: "v", pos: other.x + other.width }); }
            if (Math.abs(newY + el.height - (other.y + other.height)) < SNAP) { newY = other.y + other.height - el.height; lines.push({ type: "h", pos: other.y + other.height }); }
          }
          setSnapLines(lines);
        }
        setPosTooltip({ x: newX, y: newY, text: `${newX}, ${newY}` });
        const clampedX = Math.max(0, Math.min(newX, CANVAS_W - (el?.width || 0)));
        const clampedY = Math.max(0, Math.min(newY, CANVAS_H - (el?.height || 0)));
        if (dragState.multiStartPositions && dragState.multiStartPositions.length > 1) {
          const offsetX = clampedX - dragState.elStartX;
          const offsetY = clampedY - dragState.elStartY;
          dragState.multiStartPositions.forEach(p => {
            updateElement(p.id, { x: Math.max(0, Math.min(Math.round(p.x + offsetX), CANVAS_W - (activeSlide?.elements.find(e => e.id === p.id)?.width || 0))), y: Math.max(0, Math.min(Math.round(p.y + offsetY), CANVAS_H - (activeSlide?.elements.find(e => e.id === p.id)?.height || 0))) });
          });
        } else {
          updateElement(dragState.elementId, { x: clampedX, y: clampedY });
        }
      }
      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / scale;
        const dy = (e.clientY - resizeState.startY) / scale;
        const { handle, elStartX, elStartY, elStartW, elStartH } = resizeState;
        let newX = elStartX, newY = elStartY, newW = elStartW, newH = elStartH;
        if (handle.includes("e")) newW = Math.max(20, elStartW + dx);
        if (handle.includes("w")) { newX = elStartX + dx; newW = Math.max(20, elStartW - dx); }
        if (handle.includes("s")) newH = Math.max(20, elStartH + dy);
        if (handle.includes("n")) { newY = elStartY + dy; newH = Math.max(20, elStartH - dy); }
        if (e.shiftKey && (handle.includes("e") || handle.includes("w") || handle.includes("n") || handle.includes("s"))) {
          const ratio = elStartW / elStartH;
          if (handle.includes("e") || handle.includes("w")) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }
        updateElement(resizeState.elementId, {
          x: Math.round(newX), y: Math.round(newY),
          width: Math.round(newW), height: Math.round(newH),
        });
      }
      if (rotateState) {
        const angle = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) * (180 / Math.PI);
        let newRotation = rotateState.elStartRotation + (angle - rotateState.startAngle);
        if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        updateElement(rotateState.elementId, { rotation: Math.round(newRotation) });
      }
      if (selectionBox) {
        const canvasEl = containerRef.current?.querySelector(".slide-canvas");
        if (canvasEl) {
          const rect = canvasEl.getBoundingClientRect();
          const x = (e.clientX - rect.left) / (scale * (zoom / 100));
          const y = (e.clientY - rect.top) / (scale * (zoom / 100));
          setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
        }
      }
    };
    const handleMouseUp = () => {
      if (selectionBox && activeSlide) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);
        if (maxX - minX > 5 || maxY - minY > 5) {
          const selected = activeSlide.elements.filter(el =>
            el.x >= minX && el.x + el.width <= maxX &&
            el.y >= minY && el.y + el.height <= maxY
          );
          if (selected.length > 0) {
            const ids = selected.map(el => el.id);
            useStore.setState({ selectedElementId: ids[ids.length - 1], selectedElementIds: ids });
          }
        }
      }
      setDragState(null);
      setResizeState(null);
      setRotateState(null);
      setSnapLines([]);
      setSelectionBox(null);
      setPosTooltip(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, rotateState, updateElement, scale]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation();
    if (element.locked) return;
    if (element.type === "formula") {
      useStore.getState().setFormulaEditOpen(true, element.id);
      return;
    }
    if (element.type === "text" || element.type === "title" || element.type === "subtitle") {
      setEditingId(element.id);
    }
    if (element.type === "table") {
      setEditingId(element.id);
    }
  }, []);

  const handleEditBlur = useCallback(() => {
    if (editingRef.current) {
      const content = editingRef.current.innerText;
      if (editingId) {
        updateElement(editingId, { content });
      }
    }
    setEditingId(null);
  }, [editingId, updateElement]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleEditBlur();
    }
    e.stopPropagation();
  }, [handleEditBlur]);

  if (!activeSlide) {
    return (
      <div className="canvas-container" ref={containerRef}>
        <div className="canvas-empty">{t("canvas.placeholder")}</div>
        <style>{canvasStyles}</style>
      </div>
    );
  }

  const sortedElements = [...activeSlide.elements].sort((a, b) => a.zIndex - b.zIndex);

  const renderElement = (el: SlideElement) => {
    const isSelected = selectedElementId === el.id || selectedElementIds.includes(el.id);
    const isEditing = editingId === el.id;
    const isDragging = !!(dragState && (dragState.elementId === el.id || dragState.multiStartPositions?.some(p => p.id === el.id)));
    const anyDragging = !!dragState || !!resizeState || !!rotateState;
    const isMediaPlaceholder = anyDragging && (el.type === "video" || el.type === "audio") && !isDragging;
    const style: React.CSSProperties = {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      opacity: el.opacity,
      zIndex: el.zIndex,
      cursor: isEditing ? "text" : el.locked ? "not-allowed" : isDragging ? "grabbing" : isSelected ? "grab" : "default",
      ...(isDragging ? { willChange: "transform", pointerEvents: "none" as const } : {}),
    };

    if (el.shapeEffect === "shadow") {
      style.boxShadow = "4px 4px 12px rgba(0,0,0,0.25)";
    } else if (el.shapeEffect === "reflection") {
      style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
      style.WebkitBoxReflect = "below 4px linear-gradient(transparent, transparent 50%, rgba(0,0,0,0.15))";
    } else if (el.shapeEffect === "glow") {
      style.boxShadow = "0 0 16px 4px rgba(59,130,246,0.4)";
    } else if (el.shapeEffect === "softEdge") {
      style.boxShadow = "0 0 8px 2px rgba(0,0,0,0.1)";
    } else if (el.shapeEffect === "bevel") {
      style.boxShadow = "inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.15)";
    } else if (el.shapeEffect === "3dRotation") {
      style.perspective = "400px";
      style.transform = `${el.rotation ? `rotate(${el.rotation}deg)` : ""} rotateY(-15deg) rotateX(5deg)`;
    }

    let inner: React.ReactNode = null;

    switch (el.type) {
      case "text":
      case "title":
      case "subtitle":
        Object.assign(style, {
          color: el.textColor,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily || "system-ui",
          fontStyle: el.fontStyle || "normal",
          textDecoration: el.textDecoration || "none",
          textAlign: el.textAlign,
          lineHeight: el.lineHeight || 1.4,
          letterSpacing: el.letterSpacing || 0,
          overflow: "hidden",
          wordBreak: "break-word",
          padding: 8,
          paddingLeft: (el.paddingLeft || 0) + 8,
          listStyleType: el.listStyle !== "none" ? el.listStyle : undefined,
          listStylePosition: "inside",
        });
        if (isEditing) {
          inner = (
            <div
              ref={editingRef}
              contentEditable
              suppressContentEditableWarning
              className="editable-text"
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
              style={{ outline: "none", width: "100%", height: "100%", whiteSpace: "pre-wrap" }}
            >
              {el.content}
            </div>
          );
        } else {
          const lines = el.content.split("\n");
          const listPrefix = el.listStyle === "disc" ? "• " : el.listStyle === "decimal" ? (i: number) => `${i + 1}. ` : null;
          const sh = searchHighlight;
          const shouldHighlight = !!(sh && sh.keyword && sh.elementIds.includes(el.id));
          const isActiveMatch = !!(shouldHighlight && sh!.activeId === el.id);
          inner = (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {lines.map((line, i) => (
                <div key={i}>
                  {listPrefix
                    ? (listPrefix instanceof Function ? listPrefix(i) : listPrefix) + (shouldHighlight ? highlightText(line, sh!.keyword, isActiveMatch) : line)
                    : shouldHighlight ? highlightText(line, sh!.keyword, isActiveMatch) : line}
                </div>
              ))}
            </div>
          );
        }
        break;
      case "image": {
        const clipPath = CLIP_PATHS[el.clipShape || "none"];
        Object.assign(style, {
          borderRadius: el.clipShape && el.clipShape !== "none" ? 0 : el.borderRadius,
          overflow: "hidden",
          border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
          clipPath: clipPath || undefined,
        });
        inner = (
          <img
            src={el.content}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: el.objectFit || "cover", pointerEvents: "none" }}
            draggable={false}
          />
        );
        break;
      }
      case "rect":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius,
          border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
        });
        break;
      case "circle":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: "50%",
          border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
        });
        break;
      case "line":
        Object.assign(style, {
          backgroundColor: el.fill,
          height: Math.max(el.height, 3),
        });
        break;
      case "arrow":
        Object.assign(style, {
          backgroundColor: el.fill,
          clipPath: "polygon(0% 20%, 70% 20%, 70% 0%, 100% 50%, 70% 100%, 70% 80%, 0% 80%)",
          border: "none",
        });
        break;
      case "triangle":
        Object.assign(style, {
          backgroundColor: el.fill,
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          border: "none",
        });
        break;
      case "diamond":
        Object.assign(style, {
          backgroundColor: el.fill,
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          border: "none",
        });
        break;
      case "star":
        Object.assign(style, {
          backgroundColor: el.fill,
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          border: "none",
        });
        break;
      case "table":
        Object.assign(style, {
          border: `${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"}`,
          borderRadius: 0,
          padding: 0,
          overflow: "hidden",
        });
        const cols = el.cols || 3;
        const rows = el.rows || 3;
        const tableData: string[][] = el.content ? JSON.parse(el.content) : Array.from({ length: rows }, () => Array(cols).fill(""));
        const updateCell = (r: number, c: number, val: string) => {
          const newData = tableData.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? val : cell));
          updateElement(el.id, { content: JSON.stringify(newData) });
        };
        inner = (
          <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {Array.from({ length: cols * rows }).map((_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              const cellText = tableData[r]?.[c] || "";
              return (
                <div key={i} style={{
                  borderRight: c < cols - 1 ? `1px solid ${el.borderColor || "#CBD5E1"}` : "none",
                  borderBottom: r < rows - 1 ? `1px solid ${el.borderColor || "#CBD5E1"}` : "none",
                  padding: "2px 4px",
                  fontSize: Math.max(10, el.fontSize * 0.75),
                  color: el.textColor,
                  fontFamily: el.fontFamily,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  background: r === 0 ? (el.fill !== "transparent" ? el.fill : "#F1F5F9") : "white",
                  fontWeight: r === 0 ? 600 : 400,
                }}>
                  {isEditing ? (
                    <input
                      style={{ width: "100%", border: "none", background: "transparent", color: "inherit", font: "inherit", padding: 0, outline: "none" }}
                      defaultValue={cellText}
                      onBlur={(e) => updateCell(r, c, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); updateCell(r, c, (e.target as HTMLInputElement).value); } }}
                    />
                  ) : cellText}
                </div>
              );
            })}
          </div>
        );
        break;
      case "wordart":
        Object.assign(style, {
          color: el.textColor,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily || "system-ui",
          textAlign: el.textAlign || "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: el.fill !== "transparent" ? `linear-gradient(135deg, ${el.fill}, ${el.fill}dd)` : undefined,
          WebkitBackgroundClip: el.fill !== "transparent" ? "text" : undefined,
          WebkitTextFillColor: el.fill !== "transparent" ? "transparent" : undefined,
          textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
          letterSpacing: 2,
          padding: 8,
        });
        inner = <div style={{ whiteSpace: "pre-wrap", fontWeight: 700 }}>{el.content}</div>;
        break;
      case "chart": {
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 8,
          border: `${el.borderWidth || 1}px solid ${el.borderColor || "#E2E8F0"}`,
          padding: 12,
          overflow: "hidden",
          ...(el.fillOpacity !== undefined && el.fillOpacity !== 1 ? { "--fill-opacity": el.fillOpacity, backgroundColor: `rgba(${hexToRgb(el.fill === "transparent" ? "#ffffff" : el.fill)}, ${el.fillOpacity ?? 1})` } as React.CSSProperties : {}),
        });
        const defaultChartData: { type: "bar" | "line" | "pie"; labels: string[]; series: { name: string; data: number[]; color: string }[] } = { type: "bar", labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Series 1", data: [40, 65, 35, 80], color: "#3B82F6" }, { name: "Series 2", data: [55, 30, 70, 45], color: "#22C55E" }] };
        let chartData = defaultChartData;
        try { if (el.content && el.content !== "chart") chartData = JSON.parse(el.content); } catch {}
        const chartColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
        if (chartData.type === "pie") {
          const total = chartData.series.reduce((s, sr) => s + sr.data.reduce((a, b) => a + b, 0), 0);
          let cumAngle = 0;
          const slices = chartData.labels.map((label, li) => {
            const val = chartData.series.reduce((s, sr) => s + (sr.data[li] || 0), 0);
            const pct = total > 0 ? val / total : 0;
            const startAngle = cumAngle;
            cumAngle += pct * 360;
            return { label, val, pct, startAngle, endAngle: cumAngle, color: chartColors[li % chartColors.length] };
          });
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg viewBox="-55 -55 110 110" style={{ width: "70%", maxWidth: 180, flexShrink: 0 }}>
                {slices.map((sl, i) => {
                  const startRad = (sl.startAngle - 90) * Math.PI / 180;
                  const endRad = (sl.endAngle - 90) * Math.PI / 180;
                  const largeArc = sl.endAngle - sl.startAngle > 180 ? 1 : 0;
                  const x1 = 50 * Math.cos(startRad), y1 = 50 * Math.sin(startRad);
                  const x2 = 50 * Math.cos(endRad), y2 = 50 * Math.sin(endRad);
                  if (sl.pct === 0) return null;
                  const d = sl.pct >= 1 ? "M0,0 L0,-50 A50,50 0 1,1 0.01,-50 Z" : `M0,0 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`;
                  return <path key={i} d={d} fill={sl.color} stroke="#FFF" strokeWidth="1" />;
                })}
              </svg>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", fontSize: 9, color: "#64748B" }}>
                {slices.map((sl, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: sl.color, display: "inline-block" }} />{sl.label}</span>)}
              </div>
            </div>
          );
        } else if (chartData.type === "line") {
          const allVals = chartData.series.flatMap(sr => sr.data);
          const maxVal = Math.max(...allVals, 1);
          const minVal = Math.min(...allVals, 0);
          const range = maxVal - minVal || 1;
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", flex: 1, position: "relative" }}>
                <svg viewBox={`0 0 ${chartData.labels.length * 60} 100`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                  {[0, 25, 50, 75, 100].map(pct => <line key={pct} x1={0} y1={pct} x2={chartData.labels.length * 60} y2={pct} stroke="#E2E8F0" strokeWidth={0.5} />)}
                  {chartData.series.map((sr, si) => {
                    const points = sr.data.map((v, i) => `${i * 60 + 30},${100 - ((v - minVal) / range) * 90 - 5}`).join(" ");
                    return <polyline key={si} points={points} fill="none" stroke={sr.color || chartColors[si % chartColors.length]} strokeWidth={2} strokeLinejoin="round" />;
                  })}
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", fontSize: 9, color: "#64748B" }}>
                {chartData.labels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 9, color: "#64748B" }}>
                {chartData.series.map((sr, si) => <span key={si} style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ width: 12, height: 2, background: sr.color || chartColors[si % chartColors.length], display: "inline-block" }} />{sr.name}</span>)}
              </div>
            </div>
          );
        } else {
          const allVals = chartData.series.flatMap(sr => sr.data);
          const maxVal = Math.max(...allVals, 1);
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "flex-end", flex: 1, gap: 2 }}>
                {chartData.labels.map((_label, li) => (
                  <div key={li} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, width: "100%", flex: 1, justifyContent: "center" }}>
                      {chartData.series.map((sr, si) => {
                        const h = maxVal > 0 ? (sr.data[li] || 0) / maxVal * 100 : 0;
                        return <div key={si} style={{ width: `${80 / chartData.series.length}%`, height: `${h}%`, background: sr.color || chartColors[si % chartColors.length], borderRadius: "2px 2px 0 0", minHeight: 1 }} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", fontSize: 9, color: "#64748B" }}>
                {chartData.labels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 9, color: "#64748B" }}>
                {chartData.series.map((sr, si) => <span key={si} style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: sr.color || chartColors[si % chartColors.length], display: "inline-block" }} />{sr.name}</span>)}
              </div>
            </div>
          );
        }
        break;
      }
      case "smartart": {
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 8,
          border: `${el.borderWidth || 1}px solid ${el.borderColor || "#BAE6FD"}`,
          padding: 12,
          overflow: "hidden",
        });
        const defaultSmartData: { layout: "process" | "cycle" | "hierarchy" | "pyramid"; items: { text: string; color: string }[] } = { layout: "process", items: [{ text: "Step 1", color: "#3B82F6" }, { text: "Step 2", color: "#22C55E" }, { text: "Step 3", color: "#F59E0B" }] };
        let smartData = defaultSmartData;
        try { if (el.content && el.content !== "smartart") smartData = JSON.parse(el.content); } catch {}
        if (smartData.layout === "hierarchy") {
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {smartData.items.length > 0 && (
                <div style={{ padding: "4px 12px", borderRadius: 6, background: smartData.items[0].color, color: "#FFF", fontSize: 10, fontWeight: 500, textAlign: "center" }}>{smartData.items[0].text}</div>
              )}
              {smartData.items.length > 1 && (
                <>
                  <div style={{ width: 1, height: 8, background: "#CBD5E1" }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {smartData.items.slice(1).map((item, i) => (
                      <div key={i} style={{ padding: "3px 8px", borderRadius: 4, background: item.color, color: "#FFF", fontSize: 9, fontWeight: 500, textAlign: "center" }}>{item.text}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        } else if (smartData.layout === "pyramid") {
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              {smartData.items.map((item, i) => {
                const w = 100 - i * (60 / Math.max(smartData.items.length - 1, 1));
                return <div key={i} style={{ width: `${w}%`, padding: "3px 8px", borderRadius: 4, background: item.color, color: "#FFF", fontSize: 9, fontWeight: 500, textAlign: "center" }}>{item.text}</div>;
              })}
            </div>
          );
        } else if (smartData.layout === "cycle") {
          const n = smartData.items.length;
          const radius = 35;
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg viewBox="-50 -50 100 100" style={{ width: "100%", height: "100%" }}>
                {smartData.items.map((item, i) => {
                  const angle = (i / n) * 360 - 90;
                  const rad = angle * Math.PI / 180;
                  const cx = radius * Math.cos(rad), cy = radius * Math.sin(rad);
                  return <g key={i}><circle cx={cx} cy={cy} r={14} fill={item.color} /><text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize={5} fontWeight={500}>{item.text.length > 6 ? item.text.slice(0, 5) + "…" : item.text}</text></g>;
                })}
                {n > 1 && <circle cx={0} cy={0} r={radius} fill="none" stroke="#CBD5E1" strokeWidth={0.5} strokeDasharray="2,2" />}
              </svg>
            </div>
          );
        } else {
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {smartData.items.map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ padding: "4px 10px", borderRadius: 6, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 9, fontWeight: 500, minWidth: 40, textAlign: "center" }}>{item.text}</div>
                  {i < smartData.items.length - 1 && <span style={{ fontSize: 14, color: "#94A3B8" }}>→</span>}
                </div>
              ))}
            </div>
          );
        }
        break;
      }
      case "formula":
        Object.assign(style, {
          color: el.textColor,
          fontSize: el.fontSize,
          textAlign: el.textAlign || "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          overflow: "hidden",
        });
        if (isEditing) {
          inner = (
            <div
              ref={editingRef}
              contentEditable
              suppressContentEditableWarning
              className="editable-text"
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
              style={{ outline: "none", width: "100%", height: "100%", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13 }}
            >
              {el.content}
            </div>
          );
        } else {
          try {
            const html = katex.renderToString(el.content, { throwOnError: false, displayMode: true });
            inner = <div dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            inner = <div style={{ color: "#EF4444" }}>{el.content}</div>;
          }
        }
        break;
      case "video":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 8,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
        if (isDragging || isMediaPlaceholder || !isSelected) {
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg, #1E293B, #334155)", opacity: isDragging ? 0.7 : isMediaPlaceholder ? 0.5 : 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "12px solid #FFF", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />
              </div>
              <span style={{ fontSize: 9, color: "#94A3B8" }}>Video</span>
            </div>
          );
        } else if (el.content && el.content !== "video") {
          inner = <CustomVideoPlayer src={el.content} />;
        } else {
          inner = (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #1E293B, #334155)" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "16px solid #FFF", borderTop: "10px solid transparent", borderBottom: "10px solid transparent", marginLeft: 4 }} />
              </div>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>Video</span>
            </div>
          );
        }
        break;
      case "audio":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 30,
          border: `${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "0 16px",
        });
        if (isDragging || isMediaPlaceholder || !isSelected) {
          inner = (
            <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isDragging ? 0.7 : isMediaPlaceholder ? 0.5 : 1 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "7px solid #FFF", borderTop: "4px solid transparent", borderBottom: "4px solid transparent", marginLeft: 2 }} />
              </div>
              <span style={{ fontSize: 9, color: "#64748B" }}>Audio</span>
            </div>
          );
        } else if (el.content && el.content !== "audio") {
          inner = <CustomAudioPlayer src={el.content} />;
        } else {
          inner = (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderLeft: "8px solid #FFF", borderTop: "5px solid transparent", borderBottom: "5px solid transparent", marginLeft: 2 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                {[3, 6, 10, 6, 8, 4, 7, 5, 9, 3].map((h, i) => (
                  <div key={i} style={{ width: 2, height: h, background: "#3B82F6", borderRadius: 1 }} />
                ))}
              </div>
            </div>
          );
        }
        break;
      case "action":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        });
        inner = (
          <span style={{ color: el.textColor, fontSize: el.fontSize, fontWeight: 700 }}>{el.content}</span>
        );
        break;
      case "comment":
        Object.assign(style, {
          backgroundColor: el.fill,
          borderRadius: el.borderRadius || 8,
          border: `${el.borderWidth || 1}px solid ${el.borderColor || "#F59E0B"}`,
          padding: 8,
          overflow: "hidden",
        });
        inner = (
          <div style={{ fontSize: el.fontSize || 12, color: "#92400E", whiteSpace: "pre-wrap" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 10, color: "#B45309" }}>💬 {t("ribbon.insertComment")}</div>
            {el.content}
          </div>
        );
        break;
    }

    const isPrimary = selectedElementId === el.id;
    const handles = isSelected && !isEditing && isPrimary ? (
      <>
        <div className="resize-handle nw" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "nw"); }} />
        <div className="resize-handle ne" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "ne"); }} />
        <div className="resize-handle sw" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "sw"); }} />
        <div className="resize-handle se" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "se"); }} />
        <div className="resize-handle n" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "n"); }} />
        <div className="resize-handle s" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "s"); }} />
        <div className="resize-handle w" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "w"); }} />
        <div className="resize-handle e" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleResizeMouseDown(e, el, "e"); }} />
        <div className="rotate-line" />
        <div className="rotate-handle" onMouseDown={(e) => { if (e.button === 0) e.preventDefault(); e.stopPropagation(); handleRotateMouseDown(e, el); }} />
      </>
    ) : null;

    return (
      <div
        key={el.id}
        className={`canvas-element ${isSelected ? "selected" : ""} ${el.locked ? "locked" : ""}`}
        style={style}
        onMouseDown={(e) => { if (e.button === 0 && editingId !== el.id) e.preventDefault(); handleElementMouseDown(e, el); }}
        onDoubleClick={(e) => handleDoubleClick(e, el)}
        onClick={(e) => {
          if ((e.ctrlKey || e.metaKey) && el.hyperlink) {
            e.stopPropagation();
            window.open(el.hyperlink, "_blank");
          }
        }}
        data-element-id={el.id}
      >
        {inner}
        {handles}
        {el.groupId && !isSelected && (
          <div style={{
            position: "absolute", top: -3, left: -3, right: -3, bottom: -3,
            border: "1.5px dashed #8B5CF6", borderRadius: 2, pointerEvents: "none",
          }} />
        )}
        {el.groupId && isSelected && (
          <div style={{
            position: "absolute", top: -16, left: 0, fontSize: 9,
            background: "#8B5CF6", color: "white", padding: "1px 4px",
            borderRadius: 3, pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            {t("ribbon.group")}
          </div>
        )}
      </div>
    );
  };

  if (viewMode === "browser" && project) {
    return (
      <div className="canvas-container" style={{ overflow: "auto", alignItems: "flex-start", justifyContent: "center", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(160, CANVAS_W * 0.18)}px, 1fr))`, gap: 16, width: "100%", maxWidth: 1200 }}>
          {project.slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setActiveSlide(slide.id)}
              style={{
                cursor: "pointer",
                border: slide.id === activeSlideId ? "2px solid var(--color-cta)" : "2px solid var(--color-border)",
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--color-surface)",
                transition: "border-color 150ms ease, box-shadow 150ms ease",
                boxShadow: slide.id === activeSlideId ? "0 0 0 1px var(--color-cta)" : "none",
              }}
              onMouseEnter={(e) => { if (slide.id !== activeSlideId) (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"); }}
              onMouseLeave={(e) => { if (slide.id !== activeSlideId) (e.currentTarget.style.boxShadow = "none"); }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: `${CANVAS_W}/${CANVAS_H}`, background: slide.background, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
                  {slide.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => {
                    const s: React.CSSProperties = {
                      position: "absolute", left: `${(el.x / CANVAS_W) * 100}%`, top: `${(el.y / CANVAS_H) * 100}%`,
                      width: `${(el.width / CANVAS_W) * 100}%`, height: `${(el.height / CANVAS_H) * 100}%`,
                      fontSize: Math.max(6, (el.fontSize || 14) * 0.18), background: el.fill, color: el.textColor,
                      borderRadius: el.borderRadius, overflow: "hidden",
                    };
                    if (el.type === "text" || el.type === "title" || el.type === "subtitle" || el.type === "wordart") {
                      return <div key={el.id} style={{ ...s, background: "transparent", display: "flex", alignItems: "center", justifyContent: el.textAlign === "center" ? "center" : el.textAlign === "right" ? "flex-end" : "flex-start", fontWeight: el.fontWeight, fontFamily: el.fontFamily, lineHeight: 1.2, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{el.content}</div>;
                    }
                    if (el.type === "image") {
                      return <div key={el.id} style={{ ...s, background: "#CBD5E1" }} />;
                    }
                    return <div key={el.id} style={s} />;
                  })}
                </div>
              </div>
              <div style={{ padding: "4px 8px", fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === "reading" && project) {
    const allSlides = project.slides;
    const currentIdx = allSlides.findIndex(s => s.id === activeSlideId);
    return (
      <div className="canvas-container" style={{ background: "#000", cursor: allSlides.length > 1 ? "pointer" : "default" }} onClick={() => {
        if (currentIdx < allSlides.length - 1) setActiveSlide(allSlides[currentIdx + 1].id);
      }}>
        <div
          className="slide-canvas"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            background: activeSlide?.background || "#FFF",
            transform: `scale(${scale * (zoom / 100)})`,
            pointerEvents: "none",
          }}
        >
          {activeSlide && sortedElements.map(renderElement)}
        </div>
        <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,0.5)", padding: "6px 16px", borderRadius: 999, backdropFilter: "blur(8px)", zIndex: 100 }}>
          <button onClick={(e) => { e.stopPropagation(); if (currentIdx > 0) setActiveSlide(allSlides[currentIdx - 1].id); }} style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", fontSize: 18, padding: "0 8px", opacity: currentIdx > 0 ? 1 : 0.3 }}>◀</button>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "system-ui" }}>{(currentIdx + 1)} / {allSlides.length}</span>
          <button onClick={(e) => { e.stopPropagation(); if (currentIdx < allSlides.length - 1) setActiveSlide(allSlides[currentIdx + 1].id); }} style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", fontSize: 18, padding: "0 8px", opacity: currentIdx < allSlides.length - 1 ? 1 : 0.3 }}>▶</button>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container" ref={containerRef}>
      <div
        className="slide-canvas"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          background: activeSlide.background,
          transform: `scale(${scale * (zoom / 100)})`,
          cursor: dragState ? "grabbing" : resizeState || rotateState ? "default" : undefined,
        }}
        onMouseDown={handleCanvasMouseDown}
      >
        {showGrid && (
          <div className="canvas-grid" style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px", zIndex: 0,
          }} />
        )}
        {showGuides && (
          <>
            <div style={{ position: "absolute", left: CANVAS_W / 2, top: 0, width: 1, height: CANVAS_H, background: "rgba(59,130,246,0.4)", pointerEvents: "none", zIndex: 9998 }} />
            <div style={{ position: "absolute", left: 0, top: CANVAS_H / 2, width: CANVAS_W, height: 1, background: "rgba(59,130,246,0.4)", pointerEvents: "none", zIndex: 9998 }} />
          </>
        )}
        {sortedElements.map(renderElement)}
        {snapLines.map((line, i) =>
          line.type === "v" ? (
            <div key={`sv${i}`} style={{ position: "absolute", left: line.pos, top: 0, width: 1, height: CANVAS_H, background: "#EF4444", pointerEvents: "none", zIndex: 9999 }} />
          ) : (
            <div key={`sh${i}`} style={{ position: "absolute", left: 0, top: line.pos, width: CANVAS_W, height: 1, background: "#EF4444", pointerEvents: "none", zIndex: 9999 }} />
          )
        )}
        {selectionBox && (() => {
          const minX = Math.min(selectionBox.startX, selectionBox.endX);
          const minY = Math.min(selectionBox.startY, selectionBox.endY);
          const w = Math.abs(selectionBox.endX - selectionBox.startX);
          const h = Math.abs(selectionBox.endY - selectionBox.startY);
          return (
            <div style={{
              position: "absolute", left: minX, top: minY, width: w, height: h,
              border: "1px solid #3B82F6", background: "rgba(59,130,246,0.08)",
              pointerEvents: "none", zIndex: 9999,
            }} />
          );
        })()}
        {posTooltip && (
          <div style={{
            position: "absolute", left: posTooltip.x + 10, top: posTooltip.y - 24,
            background: "rgba(0,0,0,0.75)", color: "white", fontSize: 11,
            padding: "2px 6px", borderRadius: 4, pointerEvents: "none", zIndex: 10000,
            fontFamily: "monospace", whiteSpace: "nowrap",
          }}>
            {posTooltip.text}
          </div>
        )}
      </div>
      <style>{canvasStyles}</style>
    </div>
  );
}

const canvasStyles = `
  .canvas-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--color-surface);
    transition: background var(--transition-normal);
  }
  .canvas-empty {
    color: var(--color-text-muted);
    font-size: 15px;
  }
  .slide-canvas {
    position: relative;
    transform-origin: center center;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    flex-shrink: 0;
  }
  .canvas-element {
    user-select: none;
    outline: 1px solid transparent;
    outline-offset: -1px;
    transition: outline-color 0.15s ease;
  }
  .canvas-element.selected {
    outline: 2px solid var(--color-cta);
    outline-offset: -1px;
  }
  .canvas-element:hover:not(.selected) {
    outline-color: rgba(34, 197, 94, 0.4);
  }
  .canvas-element.locked {
    cursor: not-allowed !important;
  }
  .canvas-element.locked.selected {
    outline: 2px solid #F59E0B;
    outline-offset: -1px;
  }
  .editable-text {
    cursor: text;
    user-select: text;
  }
  .resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    border: 2px solid var(--color-cta);
    border-radius: 2px;
    z-index: 9999;
  }
  .resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
  .resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
  .resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
  .resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
  .resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
  .resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
  .resize-handle.w { left: -5px; top: 50%; transform: translateY(-50%); cursor: w-resize; }
  .resize-handle.e { right: -5px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
  .rotate-line { position: absolute; top: -20px; left: 50%; width: 1px; height: 16px; background: var(--color-cta); transform: translateX(-50%); z-index: 9999; }
  .rotate-handle { position: absolute; top: -28px; left: 50%; width: 12px; height: 12px; background: white; border: 2px solid var(--color-cta); border-radius: 50%; transform: translateX(-50%); cursor: grab; z-index: 9999; }
  .rotate-handle:active { cursor: grabbing; }
`;
