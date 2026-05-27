import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import type { AnimationCategory, AnimationDirection, AnimationStep, AnimationType, SlideElement } from "../types";

const CANVAS_W = 960;
const CANVAS_H = 540;

function getAnimKeyframes(style: AnimationType, category: AnimationCategory, direction: AnimationDirection): string {
  if (category === "enter") {
    switch (style) {
      case "appear": return "anim-enter-appear";
      case "fade": return "anim-enter-fade";
      case "flyIn": return `anim-enter-fly-${direction}`;
      case "float": return "anim-enter-float";
      case "split": return `anim-enter-split-${direction === "fromLeft" || direction === "fromRight" ? "h" : "v"}`;
      case "wipe": return `anim-enter-wipe-${direction === "fromLeft" || direction === "fromRight" ? "h" : "v"}`;
      case "shape": return "anim-enter-shape";
      case "wheel": return "anim-enter-wheel";
      case "randomBars": return "anim-enter-randomBars";
      case "growTurn": return "anim-enter-growTurn";
      case "zoom": return "anim-enter-zoom";
      case "swivel": return "anim-enter-swivel";
      case "bounce": return "anim-enter-bounce";
      case "blinds": return "anim-enter-blinds";
      default: return "anim-enter-fade";
    }
  }
  if (category === "exit") {
    switch (style) {
      case "appear": return "anim-exit-appear";
      case "fade": return "anim-exit-fade";
      case "flyIn": return `anim-exit-fly-${direction}`;
      case "float": return "anim-exit-float";
      case "split": return `anim-exit-split-${direction === "fromLeft" || direction === "fromRight" ? "h" : "v"}`;
      case "wipe": return `anim-exit-wipe-${direction === "fromLeft" || direction === "fromRight" ? "h" : "v"}`;
      case "shape": return "anim-exit-shape";
      case "wheel": return "anim-exit-wheel";
      case "randomBars": return "anim-exit-randomBars";
      case "growTurn": return "anim-exit-growTurn";
      case "zoom": return "anim-exit-zoom";
      case "swivel": return "anim-exit-swivel";
      case "bounce": return "anim-exit-bounce";
      case "blinds": return "anim-exit-blinds";
      default: return "anim-exit-fade";
    }
  }
  if (category === "emphasis") {
    switch (style) {
      case "growTurn": return "anim-emphasis-grow";
      case "zoom": return "anim-emphasis-zoom";
      case "swivel": return "anim-emphasis-swivel";
      case "bounce": return "anim-emphasis-bounce";
      case "fade": return "anim-emphasis-pulse";
      default: return "anim-emphasis-pulse";
    }
  }
  if (category === "motion") {
    return `anim-motion-${direction}`;
  }
  return "anim-enter-fade";
}

function getElementAnimStyle(animState: "hidden" | "animating" | "visible" | "exited", step: AnimationStep | null): React.CSSProperties {
  if (animState === "hidden") return { opacity: 0, pointerEvents: "none" as const };
  if (animState === "exited") return { opacity: 0, pointerEvents: "none" as const };
  if (animState === "animating" && step) {
    const kf = getAnimKeyframes(step.style, step.category, step.direction);
    const dur = step.duration || 0.5;
    const del = step.delay || 0;
    return {
      animation: `${kf} ${dur}s ${del}s ease both`,
    };
  }
  return {};
}

function renderPresentElement(el: SlideElement, animStyle: React.CSSProperties): React.ReactNode {
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
    overflow: "hidden",
    ...animStyle,
  };

  switch (el.type) {
    case "text":
    case "title":
    case "subtitle":
      return (
        <div key={el.id} style={{
          ...style,
          color: el.textColor,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily,
          fontStyle: el.fontStyle,
          textDecoration: el.textDecoration,
          textAlign: el.textAlign,
          lineHeight: `${el.lineHeight || 1.4}`,
          letterSpacing: el.letterSpacing,
          padding: "8px 12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {el.content}
        </div>
      );
    case "image": {
      const clipPaths: Record<string, string> = {
        circle: "circle(50% at 50% 50%)",
        ellipse: "ellipse(50% 40% at 50% 50%)",
        triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
        diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
        arrow: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)",
        cross: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
        roundedRect: "inset(0 round 15%)",
      };
      const cp = (el as any).clipShape;
      const clipPath = cp && cp !== "none" && clipPaths[cp] ? clipPaths[cp] : undefined;
      const br = cp && cp !== "none" ? 0 : el.borderRadius;
      const objFit = (el as any).objectFit || "cover";
      return (
        <div key={el.id} style={{ ...style, borderRadius: br, clipPath }}>
          <img src={el.content} alt="" style={{ width: "100%", height: "100%", objectFit: objFit }} draggable={false} />
        </div>
      );
    }
    case "rect":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: el.borderRadius, border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined }} />;
    case "circle":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: "50%", border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined }} />;
    case "line":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, height: Math.max(el.height, 2) }} />;
    case "arrow":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(0% 20%, 70% 20%, 70% 0%, 100% 50%, 70% 100%, 70% 80%, 0% 80%)" }} />;
    case "triangle":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />;
    case "diamond":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />;
    case "star":
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />;
    case "table":
      const tableData: string[][] = el.content ? JSON.parse(el.content) : Array.from({ length: el.rows || 3 }, () => Array(el.cols || 3).fill(""));
      return (
        <div key={el.id} style={{ ...style, border: `${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"}`, display: "grid", gridTemplateColumns: `repeat(${el.cols || 3}, 1fr)`, gridTemplateRows: `repeat(${el.rows || 3}, 1fr)` }}>
          {Array.from({ length: (el.cols || 3) * (el.rows || 3) }).map((_, i) => {
            const r = Math.floor(i / (el.cols || 3));
            const c = i % (el.cols || 3);
            return (
              <div key={i} style={{
                borderRight: c < (el.cols || 3) - 1 ? `1px solid ${el.borderColor || "#E2E8F0"}` : "none",
                borderBottom: r < (el.rows || 3) - 1 ? `1px solid ${el.borderColor || "#E2E8F0"}` : "none",
                padding: "2px 4px",
                fontSize: Math.max(10, (el.fontSize || 16) * 0.75),
                color: el.textColor,
                fontFamily: el.fontFamily,
              }}>
                {tableData[r]?.[c] || ""}
              </div>
            );
          })}
        </div>
      );
    case "chart":
      return (
        <div key={el.id} style={{ ...style, backgroundColor: el.fill, borderRadius: 4, border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, padding: 8 }}>
          {[40, 65, 35, 80, 55].map((h, i) => (
            <div key={i} style={{ width: "14%", height: `${h}%`, background: ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"][i], borderRadius: "2px 2px 0 0" }} />
          ))}
        </div>
      );
    case "comment":
      return <div key={el.id} style={{ ...style, backgroundColor: "#FEF3C7", borderRadius: 4, border: "1px solid #F59E0B", padding: 4, fontSize: 12, color: "#92400E" }}>{el.content}</div>;
    default:
      return <div key={el.id} style={{ ...style, backgroundColor: el.fill !== "transparent" ? el.fill : "#E2E8F0", borderRadius: 4 }} />;
  }
}

export function Presentation() {
  const { project, presentSlideIndex, setPresentSlideIndex, stopPresentation } = useStore();
  const slides = project?.slides.filter(s => !s.hidden) ?? [];
  const currentSlide = slides[presentSlideIndex];
  const [animClass, setAnimClass] = useState("");
  const [scale, setScale] = useState(1);
  const [elementStates, setElementStates] = useState<Record<string, "hidden" | "animating" | "visible" | "exited">>({});
  const [activeAnims, setActiveAnims] = useState<Record<string, AnimationStep>>({});
  const animIndexRef = useRef(0);
  const slideIdRef = useRef<string | null>(null);
  const transitioningRef = useRef(false);
  const [prevSlideHtml, setPrevSlideHtml] = useState<string | null>(null);
  const [exitAnimClass, setExitAnimClass] = useState("");

  const sequence: AnimationStep[] = currentSlide
    ? [...(currentSlide.animationSequence || [])].sort((a, b) => a.order - b.order)
    : [];

  const fitScale = useCallback(() => {
    const sx = window.innerWidth / CANVAS_W;
    const sy = window.innerHeight / CANVAS_H;
    setScale(Math.min(sx, sy));
  }, []);

  useEffect(() => {
    fitScale();
    window.addEventListener("resize", fitScale);
    return () => window.removeEventListener("resize", fitScale);
  }, [fitScale]);

  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!currentSlide) return;
    if (slideIdRef.current === currentSlide.id) return;
    slideIdRef.current = currentSlide.id;
    animIndexRef.current = 0;

    const enterElements = new Set<string>();
    const exitElements = new Set<string>();
    sequence.forEach(step => {
      if (step.category === "enter") enterElements.add(step.elementId);
      if (step.category === "exit") exitElements.add(step.elementId);
    });

    const initial: Record<string, "hidden" | "visible"> = {};
    currentSlide.elements.forEach(el => {
      if (enterElements.has(el.id)) {
        initial[el.id] = "hidden";
      } else {
        initial[el.id] = "visible";
      }
    });
    setElementStates(initial as any);
    setActiveAnims({});

    const autoSteps = sequence.filter(s => s.trigger === "withPrevious" || s.trigger === "afterPrevious");
    if (autoSteps.length > 0 && sequence.length > 0 && (sequence[0].trigger === "withPrevious" || sequence[0].trigger === "afterPrevious")) {
      setTimeout(() => advanceAnimation(), 100);
    }
  }, [currentSlide?.id]);

  const advanceAnimation = useCallback(() => {
    const seq = sequence;
    if (animIndexRef.current >= seq.length) return false;

    const stepsToRun: AnimationStep[] = [];
    const firstStep = seq[animIndexRef.current];
    if (!firstStep) return false;

    stepsToRun.push(firstStep);
    animIndexRef.current++;

    while (animIndexRef.current < seq.length) {
      const next = seq[animIndexRef.current];
      if (next.trigger === "withPrevious") {
        stepsToRun.push(next);
        animIndexRef.current++;
      } else if (next.trigger === "afterPrevious") {
        break;
      } else {
        break;
      }
    }

    setElementStates(prev => {
      const next = { ...prev };
      stepsToRun.forEach(step => {
        if (step.category === "enter") {
          next[step.elementId] = "animating";
        } else if (step.category === "exit") {
          next[step.elementId] = "animating";
        } else if (step.category === "emphasis") {
          next[step.elementId] = "animating";
        } else if (step.category === "motion") {
          next[step.elementId] = "animating";
        }
      });
      return next;
    });

    setActiveAnims(prev => {
      const next = { ...prev };
      stepsToRun.forEach(step => { next[step.elementId] = step; });
      return next;
    });

    const maxDur = Math.max(...stepsToRun.map(s => (s.duration || 0.5) + (s.delay || 0)));
    setTimeout(() => {
      setElementStates(prev => {
        const next = { ...prev };
        stepsToRun.forEach(step => {
          if (step.category === "exit") {
            next[step.elementId] = "exited";
          } else {
            next[step.elementId] = "visible";
          }
        });
        return next;
      });
      setActiveAnims(prev => {
        const next = { ...prev };
        stepsToRun.forEach(step => { delete next[step.elementId]; });
        return next;
      });

      const afterSteps = seq.filter((s, i) =>
        i < seq.length && i >= animIndexRef.current && s.trigger === "afterPrevious"
      );
      if (afterSteps.length > 0) {
        advanceAnimation();
      }
    }, maxDur * 1000 + 50);

    return true;
  }, [sequence]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= slides.length) return;
    if (transitioningRef.current) return;

    const transition = currentSlide?.transition;
    const exitType = transition?.exitType || transition?.type || "none";
    const enterType = slides[index]?.transition?.enterType || slides[index]?.transition?.type || "none";

    if ((exitType !== "none" || enterType !== "none") && currentSlide) {
      transitioningRef.current = true;
      const slideEl = document.querySelector(".present-slide-current");
      if (slideEl) {
        setPrevSlideHtml(slideEl.innerHTML);
      }

      if (exitType !== "none") {
        setExitAnimClass(`present-exit-${exitType}`);
      }
      if (enterType !== "none") {
        setAnimClass(`present-enter-${enterType}`);
      }

      const dur = transition?.duration || 0.5;
      setTimeout(() => {
        setPresentSlideIndex(index);
        setPrevSlideHtml(null);
        setExitAnimClass("");
        setAnimClass("");
        transitioningRef.current = false;
      }, dur * 1000 + 100);
    } else {
      setPresentSlideIndex(index);
    }
  }, [slides.length, currentSlide, setPresentSlideIndex]);

  const handleClick = useCallback(() => {
    if (animIndexRef.current < sequence.length) {
      advanceAnimation();
    } else {
      goTo(presentSlideIndex + 1);
    }
  }, [advanceAnimation, goTo, presentSlideIndex, sequence.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleClick();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "Backspace") {
        e.preventDefault();
        goTo(presentSlideIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        stopPresentation();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClick, goTo, presentSlideIndex, slides.length, stopPresentation]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        stopPresentation();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [stopPresentation]);

  if (!currentSlide) {
    stopPresentation();
    return null;
  }

  const sortedElements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        cursor: "none",
      }}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); goTo(presentSlideIndex - 1); }}
    >
      {prevSlideHtml && (
        <div
          className={exitAnimClass}
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            position: "absolute",
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            zIndex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: prevSlideHtml }}
        />
      )}
      <div
        className={`present-slide-current ${animClass}`}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          background: currentSlide.background,
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          zIndex: 2,
        }}
      >
        {sortedElements.map(el => {
          const state = elementStates[el.id] || "visible";
          const animStep = activeAnims[el.id] || null;
          const animStyle = getElementAnimStyle(state, animStep);
          return renderPresentElement(el, animStyle);
        })}
      </div>
      <div style={{
        position: "fixed",
        bottom: 16,
        right: 24,
        color: "rgba(255,255,255,0.5)",
        fontSize: 14,
        fontFamily: "system-ui",
        zIndex: 100000,
        pointerEvents: "none",
      }}>
        {presentSlideIndex + 1} / {slides.length}
      </div>

      <style>{animationCSS}</style>
    </div>
  );
}

const animationCSS = `
  /* Slide enter/exit transitions */
  .present-enter-fade { animation: present-fade-in 0.5s ease forwards; }
  .present-exit-fade { animation: present-fade-out 0.35s ease forwards; }
  .present-enter-slide { animation: present-slide-in 0.5s ease forwards; }
  .present-exit-slide { animation: present-slide-out 0.35s ease forwards; }
  .present-enter-push { animation: present-push-in 0.5s ease forwards; }
  .present-exit-push { animation: present-push-out 0.35s ease forwards; }
  .present-enter-wipe { animation: present-wipe-in 0.5s ease forwards; }
  .present-exit-wipe { animation: present-wipe-out 0.35s ease forwards; }
  .present-enter-dissolve { animation: present-dissolve-in 0.6s ease forwards; }
  .present-exit-dissolve { animation: present-dissolve-out 0.4s ease forwards; }
  .present-enter-zoom { animation: present-zoom-in 0.5s ease forwards; }
  .present-exit-zoom { animation: present-zoom-out 0.35s ease forwards; }
  .present-enter-flip { animation: present-flip-in 0.6s ease forwards; }
  .present-exit-flip { animation: present-flip-out 0.4s ease forwards; }
  .present-enter-smooth { animation: present-smooth-in 0.5s ease forwards; }
  .present-exit-smooth { animation: present-smooth-out 0.35s ease forwards; }
  .present-enter-shape { animation: present-shape-in 0.5s ease forwards; }
  .present-exit-shape { animation: present-shape-out 0.35s ease forwards; }
  .present-enter-newsflash { animation: present-newsflash-in 0.5s ease forwards; }
  .present-exit-newsflash { animation: present-newsflash-out 0.35s ease forwards; }
  .present-enter-spokes { animation: present-spokes-in 0.5s ease forwards; }
  .present-exit-spokes { animation: present-spokes-out 0.35s ease forwards; }
  .present-enter-blinds { animation: present-blinds-in 0.5s ease forwards; }
  .present-exit-blinds { animation: present-blinds-out 0.35s ease forwards; }
  .present-enter-comb { animation: present-comb-in 0.5s ease forwards; }
  .present-exit-comb { animation: present-comb-out 0.35s ease forwards; }
  .present-enter-cut, .present-exit-cut { animation: none; }

  @keyframes present-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes present-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes present-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes present-slide-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes present-push-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes present-push-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes present-wipe-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
  @keyframes present-wipe-out { from { clip-path: inset(0); } to { clip-path: inset(0 0 0 100%); } }
  @keyframes present-dissolve-in { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } }
  @keyframes present-dissolve-out { from { opacity: 1; filter: blur(0); } to { opacity: 0; filter: blur(8px); } }
  @keyframes present-zoom-in { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes present-zoom-out { from { transform: scale(1); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes present-flip-in { from { transform: perspective(800px) rotateY(-90deg); opacity: 0; } to { transform: perspective(800px) rotateY(0); opacity: 1; } }
  @keyframes present-flip-out { from { transform: perspective(800px) rotateY(0); opacity: 1; } to { transform: perspective(800px) rotateY(90deg); opacity: 0; } }
  @keyframes present-smooth-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes present-smooth-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8); opacity: 0; } }
  @keyframes present-shape-in { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(75% at 50% 50%); } }
  @keyframes present-shape-out { from { clip-path: circle(75% at 50% 50%); } to { clip-path: circle(0% at 50% 50%); } }
  @keyframes present-newsflash-in { from { transform: scale(2) rotate(15deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
  @keyframes present-newsflash-out { from { transform: scale(1) rotate(0deg); opacity: 1; } to { transform: scale(0.5) rotate(-15deg); opacity: 0; } }
  @keyframes present-spokes-in { from { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%); } to { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%, 100% 100%, 50% 100%, 0% 100%, 0% 50%, 0% 0%); } }
  @keyframes present-spokes-out { from { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%, 100% 100%, 50% 100%, 0% 100%, 0% 50%, 0% 0%); } to { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%); } }
  @keyframes present-blinds-in { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
  @keyframes present-blinds-out { from { clip-path: inset(0); } to { clip-path: inset(100% 0 0 0); } }
  @keyframes present-comb-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
  @keyframes present-comb-out { from { clip-path: inset(0); } to { clip-path: inset(0 0 0 100%); } }

  /* Element enter animations */
  @keyframes anim-enter-appear { from { opacity: 0; } to { opacity: 1; } }
  @keyframes anim-enter-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-enter-fly-fromBottom { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-enter-fly-fromTop { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes anim-enter-fly-fromLeft { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-enter-fly-fromRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes anim-enter-float { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes anim-enter-split-h { from { clip-path: inset(0 50% 0 50%); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
  @keyframes anim-enter-split-v { from { clip-path: inset(50% 0 50% 0); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
  @keyframes anim-enter-wipe-h { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
  @keyframes anim-enter-wipe-v { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0); } }
  @keyframes anim-enter-shape { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(75% at 50% 50%); } }
  @keyframes anim-enter-wheel { from { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%); } to { clip-path: polygon(50% 50%, 50% 0%, 100% 50%, 50% 100%, 0% 50%); } }
  @keyframes anim-enter-randomBars { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
  @keyframes anim-enter-growTurn { from { opacity: 0; transform: scale(0.5) rotate(-10deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
  @keyframes anim-enter-zoom { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }
  @keyframes anim-enter-swivel { from { opacity: 0; transform: perspective(600px) rotateY(-90deg); } to { opacity: 1; transform: perspective(600px) rotateY(0); } }
  @keyframes anim-enter-bounce { 0% { opacity: 0; transform: translateY(100%); } 60% { opacity: 1; transform: translateY(-10%); } 80% { transform: translateY(5%); } 100% { transform: translateY(0); } }
  @keyframes anim-enter-blinds { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }

  /* Element exit animations */
  @keyframes anim-exit-appear { from { opacity: 1; } to { opacity: 0; } }
  @keyframes anim-exit-fade { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
  @keyframes anim-exit-fly-fromBottom { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100%); } }
  @keyframes anim-exit-fly-fromTop { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100%); } }
  @keyframes anim-exit-fly-fromLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-100%); } }
  @keyframes anim-exit-fly-fromRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
  @keyframes anim-exit-float { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-30px) scale(0.95); } }
  @keyframes anim-exit-split-h { from { clip-path: inset(0); opacity: 1; } to { clip-path: inset(0 50% 0 50%); opacity: 0; } }
  @keyframes anim-exit-split-v { from { clip-path: inset(0); opacity: 1; } to { clip-path: inset(50% 0 50% 0); opacity: 0; } }
  @keyframes anim-exit-wipe-h { from { clip-path: inset(0); } to { clip-path: inset(0 0 0 100%); } }
  @keyframes anim-exit-wipe-v { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }
  @keyframes anim-exit-shape { from { clip-path: circle(75% at 50% 50%); } to { clip-path: circle(0% at 50% 50%); } }
  @keyframes anim-exit-wheel { from { clip-path: polygon(50% 50%, 50% 0%, 100% 50%, 50% 100%, 0% 50%); } to { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%); } }
  @keyframes anim-exit-randomBars { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }
  @keyframes anim-exit-growTurn { from { opacity: 1; transform: scale(1) rotate(0deg); } to { opacity: 0; transform: scale(0.5) rotate(10deg); } }
  @keyframes anim-exit-zoom { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.3); } }
  @keyframes anim-exit-swivel { from { opacity: 1; transform: perspective(600px) rotateY(0); } to { opacity: 0; transform: perspective(600px) rotateY(90deg); } }
  @keyframes anim-exit-bounce { 0% { transform: translateY(0); } 30% { transform: translateY(-20%); } 100% { opacity: 0; transform: translateY(100%); } }
  @keyframes anim-exit-blinds { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }

  /* Element emphasis animations */
  @keyframes anim-emphasis-grow { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
  @keyframes anim-emphasis-zoom { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
  @keyframes anim-emphasis-swivel { 0% { transform: perspective(600px) rotateY(0); } 50% { transform: perspective(600px) rotateY(20deg); } 100% { transform: perspective(600px) rotateY(0); } }
  @keyframes anim-emphasis-bounce { 0% { transform: translateY(0); } 30% { transform: translateY(-15px); } 50% { transform: translateY(0); } 70% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
  @keyframes anim-emphasis-pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

  /* Element motion animations */
  @keyframes anim-motion-fromBottom { 0% { transform: translateY(0); } 50% { transform: translateY(-40px); } 100% { transform: translateY(0); } }
  @keyframes anim-motion-fromTop { 0% { transform: translateY(0); } 50% { transform: translateY(40px); } 100% { transform: translateY(0); } }
  @keyframes anim-motion-fromLeft { 0% { transform: translateX(0); } 50% { transform: translateX(40px); } 100% { transform: translateX(0); } }
  @keyframes anim-motion-fromRight { 0% { transform: translateX(0); } 50% { transform: translateX(-40px); } 100% { transform: translateX(0); } }
  @keyframes anim-motion-center { 0% { transform: scale(1); } 50% { transform: scale(0.8); } 100% { transform: scale(1); } }
  @keyframes anim-motion-horizontal { 0% { transform: translateX(-30px); } 50% { transform: translateX(30px); } 100% { transform: translateX(0); } }
  @keyframes anim-motion-vertical { 0% { transform: translateY(-30px); } 50% { transform: translateY(30px); } 100% { transform: translateY(0); } }
`;
