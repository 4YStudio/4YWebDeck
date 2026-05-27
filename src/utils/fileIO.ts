import { open } from "@tauri-apps/plugin-dialog";
import { writeFile, readTextFile, readFile, mkdir, exists, copyFile, readDir, remove } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { join, basename, tempDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import type { Project, Slide, SlideElement, SlideSize } from "../types";

interface BlobMeta {
  ext: string;
  size: number;
}

const blobMetaMap = new Map<string, BlobMeta>();

export async function createMediaBlobUrl(file: File, mediaType: "video" | "audio"): Promise<string> {
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer], { type: file.type });
  const blobUrl = URL.createObjectURL(blob);
  const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "mp3");
  blobMetaMap.set(blobUrl, { ext, size: buffer.byteLength });
  return blobUrl;
}

export function getBlobSize(blobUrl: string): number {
  return blobMetaMap.get(blobUrl)?.size ?? 0;
}

function registerBlobUrl(blobUrl: string, ext: string, size: number) {
  blobMetaMap.set(blobUrl, { ext, size });
}

function getMimeForMediaType(ext: string, elementType: string): string {
  ext = ext.toLowerCase();
  if (elementType === "video") {
    const map: Record<string, string> = {
      mp4: "video/mp4", webm: "video/webm", ogv: "video/ogg", ogg: "video/ogg",
      mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska",
    };
    return map[ext] || "video/mp4";
  }
  if (elementType === "audio") {
    const map: Record<string, string> = {
      mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg",
      aac: "audio/aac", webm: "audio/webm", weba: "audio/webm", flac: "audio/flac",
      m4a: "audio/mp4",
    };
    return map[ext] || "audio/mpeg";
  }
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

function getSlideDimensions(size: SlideSize): [number, number] {
  switch (size) {
    case "4:3": return [960, 720];
    case "16:10": return [960, 600];
    case "16:9": default: return [960, 540];
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function getMediaExtension(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image|video|audio)\/([\w+.-]+);base64,/);
  if (!match) return "png";
  const mediaType = match[1];
  const fmt = match[2].toLowerCase();
  if (mediaType === "image") {
    if (fmt === "jpeg" || fmt === "jpg") return "jpg";
    if (fmt === "svg+xml") return "svg";
    if (fmt === "webp") return "webp";
    if (fmt === "gif") return "gif";
    if (fmt === "png") return "png";
    return "png";
  }
  if (mediaType === "video") {
    if (fmt === "mp4") return "mp4";
    if (fmt === "webm") return "webm";
    if (fmt === "ogg") return "ogv";
    if (fmt === "quicktime") return "mov";
    return "mp4";
  }
  if (mediaType === "audio") {
    if (fmt === "mpeg") return "mp3";
    if (fmt === "wav") return "wav";
    if (fmt === "ogg") return "oga";
    if (fmt === "webm") return "weba";
    if (fmt === "aac") return "aac";
    return "mp3";
  }
  return "bin";
}

function extractBase64Data(dataUrl: string): string {
  const idx = dataUrl.indexOf(";base64,");
  if (idx === -1) return dataUrl;
  return dataUrl.substring(idx + 8);
}

function elementToHtml(el: SlideElement, imageMap?: Map<string, string>): string {
  const baseStyle = [
    `position:absolute`,
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    el.rotation ? `transform:rotate(${el.rotation}deg)` : "",
    `opacity:${el.opacity}`,
    `z-index:${el.zIndex}`,
  ].filter(Boolean).join(";");

  switch (el.type) {
    case "text":
    case "title":
    case "subtitle": {
      const listPrefix = el.listStyle === "disc" ? "● " : el.listStyle === "decimal" ? "1. " : el.listStyle === "square" ? "■ " : "";
      const padLeft = el.paddingLeft ? el.paddingLeft : 0;
      return `<div style="${baseStyle};color:${el.textColor};font-size:${el.fontSize}px;font-weight:${el.fontWeight};font-family:'${el.fontFamily || "system-ui"}';font-style:${el.fontStyle || "normal"};text-decoration:${el.textDecoration || "none"};text-align:${el.textAlign};line-height:${el.lineHeight || 1.4};padding:8px;padding-left:${8 + padLeft}px;word-break:break-word;overflow:hidden">${listPrefix}${escapeHtml(el.content)}</div>`;
    }
    case "image": {
      let imgSrc: string;
      if (imageMap && imageMap.has(el.id)) {
        imgSrc = imageMap.get(el.id)!;
      } else if (el.content.startsWith("data:")) {
        imgSrc = el.content;
      } else {
        imgSrc = el.content;
      }
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
      const clipPath = (el as any).clipShape && clipPaths[(el as any).clipShape] ? `clip-path:${clipPaths[(el as any).clipShape]};` : "";
      const objFit = (el as any).objectFit || "cover";
      const br = (el as any).clipShape && (el as any).clipShape !== "none" ? 0 : el.borderRadius;
      return `<div style="${baseStyle};border-radius:${br}px;overflow:hidden;${el.borderWidth ? `border:${el.borderWidth}px solid ${el.borderColor}` : ""};${clipPath}"><img src="${imgSrc}" alt="" style="width:100%;height:100%;object-fit:${objFit}" /></div>`;
    }
    case "rect":
      return `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius}px;${el.borderWidth ? `border:${el.borderWidth}px solid ${el.borderColor}` : ""}"></div>`;
    case "circle":
      return `<div style="${baseStyle};background:${el.fill};border-radius:50%;${el.borderWidth ? `border:${el.borderWidth}px solid ${el.borderColor}` : ""}"></div>`;
    case "line":
      return `<div style="${baseStyle};background:${el.fill}"></div>`;
    case "arrow":
      return `<div style="${baseStyle};background:${el.fill};clip-path:polygon(0% 20%,70% 20%,70% 0%,100% 50%,70% 100%,70% 80%,0% 80%)"></div>`;
    case "triangle":
      return `<div style="${baseStyle};background:${el.fill};clip-path:polygon(50% 0%,0% 100%,100% 100%)"></div>`;
    case "diamond":
      return `<div style="${baseStyle};background:${el.fill};clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)"></div>`;
    case "star":
      return `<div style="${baseStyle};background:${el.fill};clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"></div>`;
    case "video": {
      let videoSrc: string;
      if (imageMap && imageMap.has(el.id)) {
        videoSrc = imageMap.get(el.id)!;
      } else if (el.content && el.content !== "video") {
        videoSrc = el.content;
      } else {
        videoSrc = "";
      }
      if (videoSrc) {
        return `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius || 8}px;overflow:hidden"><video src="${videoSrc}" style="width:100%;height:100%;object-fit:contain" controls playsinline></video></div>`;
      }
      return `<div style="${baseStyle};background:linear-gradient(135deg,#1E293B,#334155);border-radius:${el.borderRadius || 8}px;display:flex;align-items:center;justify-content:center"><div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:16px solid #FFF;border-top:10px solid transparent;border-bottom:10px solid transparent;margin-left:4px"></div></div></div>`;
    }
    case "audio": {
      let audioSrc: string;
      if (imageMap && imageMap.has(el.id)) {
        audioSrc = imageMap.get(el.id)!;
      } else if (el.content && el.content !== "audio") {
        audioSrc = el.content;
      } else {
        audioSrc = "";
      }
      if (audioSrc) {
        return `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius || 30}px;border:${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"};display:flex;align-items:center;justify-content:center;padding:0 16px"><audio src="${audioSrc}" controls style="width:100%;height:32px"></audio></div>`;
      }
      return `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius || 30}px;border:${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"};display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px"><div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:8px solid #FFF;border-top:5px solid transparent;border-bottom:5px solid transparent;margin-left:2px"></div></div><div style="display:flex;align-items:center;gap:1px"><div style="width:2px;height:3px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:6px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:10px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:6px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:8px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:4px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:7px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:5px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:9px;background:#3B82F6;border-radius:1px"></div><div style="width:2px;height:3px;background:#3B82F6;border-radius:1px"></div></div></div>`;
    }
    case "table": {
      const cols = el.cols || 3;
      const rows = el.rows || 3;
      let tableData: string[][] = [];
      try { if (el.content) tableData = JSON.parse(el.content); } catch {}
      if (!tableData.length) tableData = Array.from({ length: rows }, () => Array(cols).fill(""));
      const borderStyle = `${el.borderWidth || 1}px solid ${el.borderColor || "#CBD5E1"}`;
      let tableHtml = `<div style="${baseStyle};border:${borderStyle};border-radius:0;overflow:hidden;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellText = tableData[r]?.[c] || "";
          const br = c < cols - 1 ? `border-right:${borderStyle};` : "";
          const bb = r < rows - 1 ? `border-bottom:${borderStyle};` : "";
          tableHtml += `<div style="padding:2px 4px;font-size:${Math.max(10, el.fontSize * 0.75)}px;color:${el.textColor};font-family:'${el.fontFamily || "system-ui"}';overflow:hidden;white-space:nowrap;text-overflow:ellipsis;${br}${bb}">${escapeHtml(cellText)}</div>`;
        }
      }
      tableHtml += "</div>";
      return tableHtml;
    }
    case "formula":
      return `<div style="${baseStyle};color:${el.textColor};font-size:${el.fontSize}px;text-align:${el.textAlign || "center"};display:flex;align-items:center;justify-content:center;padding:8px;overflow:hidden" data-formula="${escapeHtml(el.content)}"></div>`;
    case "chart": {
      const defaultChartData = { type: "bar" as string, labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Series 1", data: [40, 65, 35, 80], color: "#3B82F6" }, { name: "Series 2", data: [55, 30, 70, 45], color: "#22C55E" }] };
      let chartData = defaultChartData;
      try { if (el.content && el.content !== "chart") chartData = JSON.parse(el.content); } catch {}
      const chartColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
      let chartHtml = `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius || 8}px;border:${el.borderWidth || 1}px solid ${el.borderColor || "#E2E8F0"};padding:12px;overflow:hidden">`;
      if (chartData.type === "pie") {
        const total = chartData.series.reduce((s: number, sr: { data: number[] }) => s + sr.data.reduce((a: number, b: number) => a + b, 0), 0);
        let cumAngle = 0;
        const slices = chartData.labels.map((label: string, li: number) => {
          const val = chartData.series.reduce((s: number, sr: { data: number[] }) => s + (sr.data[li] || 0), 0);
          const pct = total > 0 ? val / total : 0;
          const startAngle = cumAngle;
          cumAngle += pct * 360;
          return { label, val, pct, startAngle, endAngle: cumAngle, color: chartColors[li % chartColors.length] };
        });
        chartHtml += `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">`;
        chartHtml += `<svg viewBox="-55 -55 110 110" style="width:70%;max-width:180px;flex-shrink:0">`;
        slices.forEach((sl: { pct: number; startAngle: number; endAngle: number; color: string }) => {
          if (sl.pct === 0) return;
          if (sl.pct >= 1) { chartHtml += `<path d="M0,0 L0,-50 A50,50 0 1,1 0.01,-50 Z" fill="${sl.color}" stroke="#FFF" stroke-width="1"/>`; return; }
          const startRad = (sl.startAngle - 90) * Math.PI / 180;
          const endRad = (sl.endAngle - 90) * Math.PI / 180;
          const largeArc = sl.endAngle - sl.startAngle > 180 ? 1 : 0;
          const x1 = 50 * Math.cos(startRad), y1 = 50 * Math.sin(startRad);
          const x2 = 50 * Math.cos(endRad), y2 = 50 * Math.sin(endRad);
          chartHtml += `<path d="M0,0 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z" fill="${sl.color}" stroke="#FFF" stroke-width="1"/>`;
        });
        chartHtml += `</svg>`;
        chartHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;font-size:9px;color:#64748B">`;
        slices.forEach((sl: { label: string; color: string }) => {
          chartHtml += `<span style="display:flex;align-items:center;gap:2px"><span style="width:8px;height:8px;border-radius:2px;background:${sl.color};display:inline-block"></span>${sl.label}</span>`;
        });
        chartHtml += `</div></div>`;
      } else if (chartData.type === "line") {
        const allVals = chartData.series.flatMap((sr: { data: number[] }) => sr.data);
        const maxVal = Math.max(...allVals, 1);
        const minVal = Math.min(...allVals, 0);
        const range = maxVal - minVal || 1;
        chartHtml += `<div style="width:100%;height:100%;display:flex;flex-direction:column;gap:4px">`;
        chartHtml += `<div style="display:flex;flex:1;position:relative"><svg viewBox="0 0 ${chartData.labels.length * 60} 100" preserveAspectRatio="none" style="width:100%;height:100%">`;
        [0, 25, 50, 75, 100].forEach(pct => { chartHtml += `<line x1="0" y1="${pct}" x2="${chartData.labels.length * 60}" y2="${pct}" stroke="#E2E8F0" stroke-width="0.5"/>`; });
        chartData.series.forEach((sr: { data: number[]; color: string }, si: number) => {
          const points = sr.data.map((v: number, i: number) => `${i * 60 + 30},${100 - ((v - minVal) / range) * 90 - 5}`).join(" ");
          chartHtml += `<polyline points="${points}" fill="none" stroke="${sr.color || chartColors[si % chartColors.length]}" stroke-width="2" stroke-linejoin="round"/>`;
        });
        chartHtml += `</svg></div>`;
        chartHtml += `<div style="display:flex;justify-content:space-around;font-size:9px;color:#64748B">`;
        chartData.labels.forEach((l: string) => { chartHtml += `<span>${l}</span>`; });
        chartHtml += `</div>`;
        chartHtml += `<div style="display:flex;gap:8px;justify-content:center;font-size:9px;color:#64748B">`;
        chartData.series.forEach((sr: { name: string; color: string }, si: number) => { chartHtml += `<span style="display:flex;align-items:center;gap:2px"><span style="width:12px;height:2px;background:${sr.color || chartColors[si % chartColors.length]};display:inline-block"></span>${sr.name}</span>`; });
        chartHtml += `</div></div>`;
      } else {
        const allVals = chartData.series.flatMap((sr: { data: number[] }) => sr.data);
        const maxVal = Math.max(...allVals, 1);
        chartHtml += `<div style="width:100%;height:100%;display:flex;flex-direction:column;gap:4px">`;
        chartHtml += `<div style="display:flex;align-items:flex-end;flex:1;gap:2px">`;
        chartData.labels.forEach((_label: string, li: number) => {
          chartHtml += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;height:100%;justify-content:flex-end"><div style="display:flex;align-items:flex-end;gap:1px;width:100%;flex:1;justify-content:center">`;
          chartData.series.forEach((sr: { data: number[]; color: string }, si: number) => {
            const h = maxVal > 0 ? (sr.data[li] || 0) / maxVal * 100 : 0;
            chartHtml += `<div style="width:${80 / chartData.series.length}%;height:${h}%;background:${sr.color || chartColors[si % chartColors.length]};border-radius:2px 2px 0 0;min-height:1px"></div>`;
          });
          chartHtml += `</div></div>`;
        });
        chartHtml += `</div>`;
        chartHtml += `<div style="display:flex;justify-content:space-around;font-size:9px;color:#64748B">`;
        chartData.labels.forEach((l: string) => { chartHtml += `<span>${l}</span>`; });
        chartHtml += `</div>`;
        chartHtml += `<div style="display:flex;gap:8px;justify-content:center;font-size:9px;color:#64748B">`;
        chartData.series.forEach((sr: { name: string; color: string }, si: number) => { chartHtml += `<span style="display:flex;align-items:center;gap:2px"><span style="width:8px;height:8px;border-radius:2px;background:${sr.color || chartColors[si % chartColors.length]};display:inline-block"></span>${sr.name}</span>`; });
        chartHtml += `</div></div>`;
      }
      chartHtml += "</div>";
      return chartHtml;
    }
    case "smartart": {
      const defaultSmartData = { layout: "process" as string, items: [{ text: "Step 1", color: "#3B82F6" }, { text: "Step 2", color: "#22C55E" }, { text: "Step 3", color: "#F59E0B" }] };
      let smartData = defaultSmartData;
      try { if (el.content && el.content !== "smartart") smartData = JSON.parse(el.content); } catch {}
      let smartHtml = `<div style="${baseStyle};background:${el.fill};border-radius:${el.borderRadius || 8}px;border:${el.borderWidth || 1}px solid ${el.borderColor || "#BAE6FD"};padding:12px;overflow:hidden">`;
      if (smartData.layout === "hierarchy") {
        smartHtml += `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">`;
        if (smartData.items.length > 0) {
          smartHtml += `<div style="padding:4px 12px;border-radius:6px;background:${smartData.items[0].color};color:#FFF;font-size:10px;font-weight:500;text-align:center">${smartData.items[0].text}</div>`;
        }
        if (smartData.items.length > 1) {
          smartHtml += `<div style="width:1px;height:8px;background:#CBD5E1"></div><div style="display:flex;gap:8px;justify-content:center">`;
          smartData.items.slice(1).forEach((item: { text: string; color: string }) => {
            smartHtml += `<div style="padding:3px 8px;border-radius:4px;background:${item.color};color:#FFF;font-size:9px;font-weight:500;text-align:center">${item.text}</div>`;
          });
          smartHtml += `</div>`;
        }
        smartHtml += `</div>`;
      } else if (smartData.layout === "pyramid") {
        smartHtml += `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">`;
        smartData.items.forEach((item: { text: string; color: string }, i: number) => {
          const w = 100 - i * (60 / Math.max(smartData.items.length - 1, 1));
          smartHtml += `<div style="width:${w}%;padding:3px 8px;border-radius:4px;background:${item.color};color:#FFF;font-size:9px;font-weight:500;text-align:center">${item.text}</div>`;
        });
        smartHtml += `</div>`;
      } else {
        smartHtml += `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:8px">`;
        smartData.items.forEach((item: { text: string; color: string }, i: number) => {
          smartHtml += `<div style="padding:6px 14px;border-radius:6px;background:${item.color};color:#FFF;font-size:11px;font-weight:500;text-align:center">${item.text}</div>`;
          if (i < smartData.items.length - 1) {
            smartHtml += `<div style="color:#94A3B8;font-size:14px">→</div>`;
          }
        });
        smartHtml += `</div>`;
      }
      smartHtml += "</div>";
      return smartHtml;
    }
    case "wordart":
      return `<div style="${baseStyle};color:${el.textColor};font-size:${el.fontSize}px;font-weight:900;font-family:'${el.fontFamily || "system-ui"}';text-align:${el.textAlign};display:flex;align-items:center;justify-content:center;padding:8px;overflow:hidden;word-break:break-word;text-shadow:2px 2px 4px rgba(0,0,0,0.3)">${escapeHtml(el.content)}</div>`;
    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

function generateFontFaceCss(fonts: string[], fontFileMap: Map<string, string>): string {
  const css: string[] = [];
  for (const fontName of fonts) {
    const fontFile = fontFileMap.get(fontName);
    if (fontFile) {
      css.push(`@font-face { font-family: '${fontName}'; src: url('fonts/${fontFile}') format('truetype'); font-weight: normal; font-style: normal; }`);
    }
  }
  return css.join("\n    ");
}

function slideToFullHtml(slide: Slide, _index: number, imageMap?: Map<string, string>, fontFaceCss?: string, slideSize: SlideSize = "16:9"): string {
  const [SLIDE_W, SLIDE_H] = getSlideDimensions(slideSize);
  const elementsHtml = [...slide.elements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(el => elementToHtml(el, imageMap))
    .join("\n    ");

  const fontCss = fontFaceCss ? `\n    ${fontFaceCss}` : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${slide.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }${fontCss}
  .slide-wrapper {
    width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
  }
  .slide-container {
    width: ${SLIDE_W}px; height: ${SLIDE_H}px;
    position: relative;
    overflow: hidden;
    background: ${slide.background};
    transform-origin: center center;
  }
</style>
</head>
<body>
<div class="slide-wrapper">
  <div class="slide-container" id="slide">
    ${elementsHtml}
  </div>
</div>
<script>
(function(){
  var slide = document.getElementById('slide');
  function fit(){
    var sx = window.innerWidth / ${SLIDE_W};
    var sy = window.innerHeight / ${SLIDE_H};
    var s = Math.min(sx, sy);
    slide.style.transform = 'scale(' + s + ')';
  }
  fit();
  window.addEventListener('resize', fit);
})();
</script>
</body>
</html>`;
}

const INDEX_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  {{FONT_FACE_CSS}}
  .slide-wrapper {
    width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    position: absolute; top: 0; left: 0;
    opacity: 0; pointer-events: none;
  }
  .slide-wrapper.active { opacity: 1; pointer-events: auto; }
  .slide-container {
    width: {{SLIDE_W}}px; height: {{SLIDE_H}}px;
    position: relative;
    overflow: hidden;
    transform-origin: center center;
  }
  .slide-nav {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 8px; z-index: 100; cursor: pointer;
    background: rgba(0,0,0,0.4); padding: 8px 16px; border-radius: 999px;
    backdrop-filter: blur(8px);
  }
  .slide-nav button {
    width: 10px; height: 10px; border-radius: 50%;
    border: none; cursor: pointer;
    background: rgba(255,255,255,0.4);
    transition: background 200ms ease;
  }
  .slide-nav button.active { background: #fff; }
  .slide-counter {
    position: fixed; bottom: 24px; right: 24px;
    color: rgba(255,255,255,0.6); font-size: 14px;
    font-family: system-ui, sans-serif; z-index: 100;
  }
  .el-anim-hidden { opacity: 0 !important; pointer-events: none !important; }

  #draw-canvas {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 50; pointer-events: none;
  }
  body.draw-mode { cursor: crosshair; }
  body.eraser-mode { cursor: cell; }
  body.draw-mode *, body.eraser-mode * { cursor: inherit !important; }
  body.drawing { user-select: none !important; -webkit-user-select: none !important; }
  body.drawing * { user-select: none !important; -webkit-user-select: none !important; }
  #laser-dot {
    position: fixed; width: 12px; height: 12px; border-radius: 50%;
    background: #EF4444; box-shadow: 0 0 12px 4px rgba(239,68,68,0.6);
    pointer-events: none; z-index: 60; display: none;
    transform: translate(-50%, -50%);
  }
  #blackout {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #000; z-index: 45; display: none;
  }
  .pres-toolbar {
    position: fixed; bottom: 64px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 4px; z-index: 100;
    background: rgba(0,0,0,0.6); padding: 6px 10px; border-radius: 12px;
    backdrop-filter: blur(12px); opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  .pres-toolbar.show { opacity: 1; pointer-events: auto; }
  .pres-toolbar .tb-btn {
    width: 36px; height: 36px; border-radius: 8px; border: none;
    background: transparent; color: rgba(255,255,255,0.7);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; font-size: 16px; position: relative;
  }
  .pres-toolbar .tb-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .pres-toolbar .tb-btn.active { background: rgba(59,130,246,0.6); color: #fff; }
  .pres-toolbar .tb-sep { width: 1px; height: 24px; background: rgba(255,255,255,0.2); margin: 0 4px; }
  .pres-toolbar .tb-btn .color-dot {
    position: absolute; bottom: 3px; right: 3px; width: 8px; height: 8px;
    border-radius: 50%; border: 1px solid rgba(255,255,255,0.5);
  }
  .pres-toolbar .tb-btn { overflow: visible; }
  .pres-toolbar .color-picker-popup {
    position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%);
    background: rgba(30,30,30,0.95); border-radius: 10px; padding: 8px;
    display: none; gap: 4px; flex-wrap: wrap; width: 140px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 200;
  }
  .pres-toolbar .color-picker-popup.show { display: flex; }
  .pres-toolbar .color-picker-popup .cp-swatch {
    width: 24px; height: 24px; border-radius: 6px; border: 2px solid transparent;
    cursor: pointer; transition: border-color 0.15s;
  }
  .pres-toolbar .color-picker-popup .cp-swatch:hover { border-color: rgba(255,255,255,0.5); }
  .pres-toolbar .color-picker-popup .cp-swatch.selected { border-color: #fff; }
  .pres-toolbar .size-popup {
    position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%);
    background: rgba(30,30,30,0.95); border-radius: 10px; padding: 10px 12px;
    display: none; align-items: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 200;
  }
  .pres-toolbar .size-popup.show { display: flex; }
  .pres-toolbar .size-popup input[type=range] {
    width: 100px; accent-color: #3B82F6;
  }
  .pres-toolbar .size-popup span { color: rgba(255,255,255,0.7); font-size: 11px; min-width: 20px; text-align: center; }
  .pres-timer {
    position: fixed; top: 16px; right: 16px; z-index: 100;
    color: rgba(255,255,255,0.5); font-size: 14px; font-family: system-ui, monospace;
    background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 6px;
    display: none; cursor: pointer; user-select: none;
  }
  .pres-timer.show { display: block; }

  /* Slide transitions */
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideInTop { from { transform: translateY(-100%); } to { transform: translateY(0); } }
  @keyframes slideInBottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
  @keyframes slideOutTop { from { transform: translateX(0); } to { transform: translateY(-100%); } }
  @keyframes slideOutBottom { from { transform: translateX(0); } to { transform: translateY(100%); } }
  @keyframes pushInLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes pushInRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes pushOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes pushOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
  @keyframes wipeIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes wipeOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
  @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes zoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes flipIn { from { transform: perspective(1200px) rotateY(-90deg); opacity: 0; } to { transform: perspective(1200px) rotateY(0deg); opacity: 1; } }
  @keyframes flipOut { from { transform: perspective(1200px) rotateY(0deg); opacity: 1; } to { transform: perspective(1200px) rotateY(90deg); opacity: 0; } }
  @keyframes dissolveIn { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } }
  @keyframes dissolveOut { from { opacity: 1; filter: blur(0); } to { opacity: 0; filter: blur(8px); } }
  @keyframes shapeIn { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(75% at 50% 50%); } }
  @keyframes shapeOut { from { clip-path: circle(75% at 50% 50%); } to { clip-path: circle(0% at 50% 50%); } }
  @keyframes blindsIn { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes blindsOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 100% 0); } }
  @keyframes combIn { from { clip-path: inset(0 50% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes combOut { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 50%); } }
  @keyframes smoothIn { from { transform: scale(1.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes smoothOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8); opacity: 0; } }
  @keyframes cutIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cutOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes newsflashIn { from { transform: rotate(360deg) scale(0); opacity: 0; } to { transform: rotate(0deg) scale(1); opacity: 1; } }
  @keyframes newsflashOut { from { transform: rotate(0deg) scale(1); opacity: 1; } to { transform: rotate(-360deg) scale(0); opacity: 0; } }
  @keyframes spokesIn { from { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%); } to { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%, 100% 100%, 50% 100%, 0% 100%, 0% 50%); } }
  @keyframes spokesOut { from { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%, 100% 100%, 50% 100%, 0% 100%, 0% 50%); } to { clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%); } }

  /* Element enter animations */
  @keyframes elAppear { from { opacity: 0; } to { opacity: 1; } }
  @keyframes elFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes elFlyInFromBottom { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes elFlyInFromRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes elFlyInFromTop { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes elFlyInFromLeft { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes elFloat { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes elSplitH { from { opacity: 0; clip-path: inset(0 50% 0 50%); } to { opacity: 1; clip-path: inset(0); } }
  @keyframes elSplitV { from { opacity: 0; clip-path: inset(50% 0 50% 0); } to { opacity: 1; clip-path: inset(0); } }
  @keyframes elWipeH { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
  @keyframes elWipeV { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0); } }
  @keyframes elShapeIn { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(75% at 50% 50%); } }
  @keyframes elWheelIn { from { clip-path: polygon(50% 50%, 50% 0%, 50% 0%); } to { clip-path: polygon(50% 50%, 50% 0%, 100% 50%, 50% 100%, 0% 50%); } }
  @keyframes elRandomBarsIn { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
  @keyframes elGrowTurn { from { opacity: 0; transform: scale(0.3) rotate(-15deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
  @keyframes elZoomIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes elSwivel { from { opacity: 0; transform: perspective(800px) rotateY(-90deg); } to { opacity: 1; transform: perspective(800px) rotateY(0deg); } }
  @keyframes elBounce { 0% { opacity: 0; transform: translateY(-60px); } 60% { opacity: 1; transform: translateY(10px); } 80% { transform: translateY(-5px); } 100% { transform: translateY(0); } }
  @keyframes elBlindsIn { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }

  /* Element exit animations */
  @keyframes elAppearOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes elFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
  @keyframes elFlyOutBottom { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100%); } }
  @keyframes elFlyOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
  @keyframes elFlyOutTop { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100%); } }
  @keyframes elFlyOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-100%); } }
  @keyframes elFloatOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-40px) scale(0.9); } }
  @keyframes elSplitHOut { from { opacity: 1; clip-path: inset(0); } to { opacity: 0; clip-path: inset(0 50% 0 50%); } }
  @keyframes elSplitVOut { from { opacity: 1; clip-path: inset(0); } to { opacity: 0; clip-path: inset(50% 0 50% 0); } }
  @keyframes elWipeHOut { from { clip-path: inset(0); } to { clip-path: inset(0 0 0 100%); } }
  @keyframes elWipeVOut { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }
  @keyframes elShapeOut { from { clip-path: circle(75% at 50% 50%); } to { clip-path: circle(0% at 50% 50%); } }
  @keyframes elWheelOut { from { clip-path: polygon(50% 50%, 50% 0%, 100% 50%, 50% 100%, 0% 50%); } to { clip-path: polygon(50% 50%, 50% 0%, 50% 0%); } }
  @keyframes elRandomBarsOut { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }
  @keyframes elGrowTurnOut { from { opacity: 1; transform: scale(1) rotate(0deg); } to { opacity: 0; transform: scale(0.3) rotate(15deg); } }
  @keyframes elZoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0); } }
  @keyframes elSwivelOut { from { opacity: 1; transform: perspective(800px) rotateY(0deg); } to { opacity: 0; transform: perspective(800px) rotateY(90deg); } }
  @keyframes elBounceOut { 0% { transform: translateY(0); } 30% { transform: translateY(-20%); } 100% { opacity: 0; transform: translateY(100%); } }
  @keyframes elBlindsOut { from { clip-path: inset(0); } to { clip-path: inset(0 0 100% 0); } }

  /* Element emphasis animations */
  @keyframes elEmphGrow { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
  @keyframes elEmphZoom { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
  @keyframes elEmphSwivel { 0% { transform: perspective(600px) rotateY(0); } 50% { transform: perspective(600px) rotateY(20deg); } 100% { transform: perspective(600px) rotateY(0); } }
  @keyframes elEmphBounce { 0% { transform: translateY(0); } 30% { transform: translateY(-15px); } 50% { transform: translateY(0); } 70% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
  @keyframes elEmphPulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

  /* Element motion animations */
  @keyframes elMotionBottom { 0% { transform: translateY(0); } 50% { transform: translateY(-40px); } 100% { transform: translateY(0); } }
  @keyframes elMotionTop { 0% { transform: translateY(0); } 50% { transform: translateY(40px); } 100% { transform: translateY(0); } }
  @keyframes elMotionLeft { 0% { transform: translateX(0); } 50% { transform: translateX(40px); } 100% { transform: translateX(0); } }
  @keyframes elMotionRight { 0% { transform: translateX(0); } 50% { transform: translateX(-40px); } 100% { transform: translateX(0); } }
  @keyframes elMotionCenter { 0% { transform: scale(1); } 50% { transform: scale(0.8); } 100% { transform: scale(1); } }
  @keyframes elMotionH { 0% { transform: translateX(-30px); } 50% { transform: translateX(30px); } 100% { transform: translateX(0); } }
  @keyframes elMotionV { 0% { transform: translateY(-30px); } 50% { transform: translateY(30px); } 100% { transform: translateY(0); } }
</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
</head>
<body>
{{SLIDE_FRAMES}}
<canvas id="draw-canvas"></canvas>
<div id="laser-dot"></div>
<div id="blackout"></div>
<nav class="slide-nav" id="nav"></nav>
<div class="slide-counter" id="counter"></div>
<div class="pres-timer" id="timer" title="Click to pause/resume">00:00</div>
<div class="pres-toolbar" id="toolbar">
  <button class="tb-btn" id="tb-pen" title="Pen (P)">&#9998;</button>
  <button class="tb-btn" id="tb-highlighter" title="Highlighter (H)">&#9733;</button>
  <button class="tb-btn" id="tb-eraser" title="Eraser (E)">&#9744;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-color" title="Color" style="position:relative">
    <span class="color-dot" id="color-dot" style="background:#EF4444"></span>
    <div class="color-picker-popup" id="color-popup">
      <div class="cp-swatch selected" data-color="#EF4444" style="background:#EF4444"></div>
      <div class="cp-swatch" data-color="#F59E0B" style="background:#F59E0B"></div>
      <div class="cp-swatch" data-color="#22C55E" style="background:#22C55E"></div>
      <div class="cp-swatch" data-color="#3B82F6" style="background:#3B82F6"></div>
      <div class="cp-swatch" data-color="#8B5CF6" style="background:#8B5CF6"></div>
      <div class="cp-swatch" data-color="#EC4899" style="background:#EC4899"></div>
      <div class="cp-swatch" data-color="#FFFFFF" style="background:#FFFFFF"></div>
      <div class="cp-swatch" data-color="#000000" style="background:#000000;border:1px solid rgba(255,255,255,0.3)"></div>
    </div>
  </button>
  <button class="tb-btn" id="tb-size" title="Size" style="position:relative">&#8226;
    <div class="size-popup" id="size-popup">
      <span id="size-label">3</span>
      <input type="range" id="size-range" min="1" max="20" value="3">
    </div>
  </button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-laser" title="Laser Pointer (L)">&#9679;</button>
  <button class="tb-btn" id="tb-blackout" title="Black Screen (B)">&#9632;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-undo" title="Undo (Ctrl+Z)">&#8617;</button>
  <button class="tb-btn" id="tb-clear" title="Clear All">&#10005;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-timer" title="Timer (T)">&#9201;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-fs" title="Fullscreen (F)">&#9974;</button>
</div>
<script>
var current = -1;
var frames = document.querySelectorAll('.slide-wrapper');
var nav = document.getElementById('nav');
var counter = document.getElementById('counter');
var transitioning = false;
var animIndex = 0;
var currentSeq = [];

var TRANSITION_ENTER_MAP = {
  fade: 'fadeIn', slide: 'slideInRight', push: 'pushInRight',
  wipe: 'wipeIn', dissolve: 'dissolveIn', zoom: 'zoomIn',
  flip: 'flipIn', smooth: 'smoothIn', cut: 'cutIn',
  shape: 'shapeIn', newsflash: 'newsflashIn', spokes: 'spokesIn',
  blinds: 'blindsIn', comb: 'combIn'
};
var TRANSITION_EXIT_MAP = {
  fade: 'fadeOut', slide: 'slideOutLeft', push: 'pushOutLeft',
  wipe: 'wipeOut', dissolve: 'dissolveOut', zoom: 'zoomOut',
  flip: 'flipOut', smooth: 'smoothOut', cut: 'cutOut',
  shape: 'shapeOut', newsflash: 'newsflashOut', spokes: 'spokesOut',
  blinds: 'blindsOut', comb: 'combOut'
};
var SLIDE_DIR_ENTER = {
  fromLeft: 'slideInLeft', fromRight: 'slideInRight',
  fromTop: 'slideInTop', fromBottom: 'slideInBottom'
};
var SLIDE_DIR_EXIT = {
  fromLeft: 'slideOutRight', fromRight: 'slideOutLeft',
  fromTop: 'slideOutBottom', fromBottom: 'slideOutTop'
};
var PUSH_DIR_ENTER = {
  fromLeft: 'pushInLeft', fromRight: 'pushInRight',
  fromTop: 'slideInTop', fromBottom: 'slideInBottom'
};
var PUSH_DIR_EXIT = {
  fromLeft: 'pushOutRight', fromRight: 'pushOutLeft',
  fromTop: 'slideOutBottom', fromBottom: 'slideOutTop'
};

var ENTER_ANIM_MAP = {
  appear: 'elAppear', fade: 'elFadeIn', flyIn: 'elFlyInFromBottom',
  float: 'elFloat', split: 'elSplitH', wipe: 'elWipeH',
  shape: 'elShapeIn', wheel: 'elWheelIn', randomBars: 'elRandomBarsIn',
  growTurn: 'elGrowTurn', zoom: 'elZoomIn', swivel: 'elSwivel',
  bounce: 'elBounce', blinds: 'elBlindsIn'
};
var EXIT_ANIM_MAP = {
  appear: 'elAppearOut', fade: 'elFadeOut', flyIn: 'elFlyOutBottom',
  float: 'elFloatOut', split: 'elSplitHOut', wipe: 'elWipeHOut',
  shape: 'elShapeOut', wheel: 'elWheelOut', randomBars: 'elRandomBarsOut',
  growTurn: 'elGrowTurnOut', zoom: 'elZoomOut', swivel: 'elSwivelOut',
  bounce: 'elBounceOut', blinds: 'elBlindsOut'
};
var EMPHASIS_ANIM_MAP = {
  appear: 'elEmphPulse', fade: 'elEmphPulse', flyIn: 'elEmphBounce',
  float: 'elEmphBounce', split: 'elEmphGrow', wipe: 'elEmphGrow',
  shape: 'elEmphZoom', wheel: 'elEmphZoom', randomBars: 'elEmphPulse',
  growTurn: 'elEmphGrow', zoom: 'elEmphZoom', swivel: 'elEmphSwivel',
  bounce: 'elEmphBounce', blinds: 'elEmphPulse'
};
var MOTION_ANIM_MAP = {
  fromBottom: 'elMotionBottom', fromTop: 'elMotionTop',
  fromLeft: 'elMotionLeft', fromRight: 'elMotionRight',
  center: 'elMotionCenter', horizontal: 'elMotionH', vertical: 'elMotionV'
};
var FLY_DIR_MAP = {
  fromBottom: 'elFlyInFromBottom', fromRight: 'elFlyInFromRight',
  fromTop: 'elFlyInFromTop', fromLeft: 'elFlyInFromLeft'
};
var FLY_DIR_EXIT_MAP = {
  fromBottom: 'elFlyOutBottom', fromRight: 'elFlyOutRight',
  fromTop: 'elFlyOutTop', fromLeft: 'elFlyOutLeft'
};
var SPLIT_DIR_MAP = {
  fromLeft: 'elSplitH', fromRight: 'elSplitH', fromTop: 'elSplitV', fromBottom: 'elSplitV'
};
var SPLIT_DIR_EXIT_MAP = {
  fromLeft: 'elSplitHOut', fromRight: 'elSplitHOut', fromTop: 'elSplitVOut', fromBottom: 'elSplitVOut'
};
var WIPE_DIR_MAP = {
  fromLeft: 'elWipeH', fromRight: 'elWipeH', fromTop: 'elWipeV', fromBottom: 'elWipeV'
};
var WIPE_DIR_EXIT_MAP = {
  fromLeft: 'elWipeHOut', fromRight: 'elWipeHOut', fromTop: 'elWipeVOut', fromBottom: 'elWipeVOut'
};

function fitSlide(el) {
  var sx = window.innerWidth / {{SLIDE_W}};
  var sy = window.innerHeight / {{SLIDE_H}};
  var s = Math.min(sx, sy);
  el.style.transform = 'scale(' + s + ')';
}
function fitAll() {
  var containers = document.querySelectorAll('.slide-container');
  for (var i = 0; i < containers.length; i++) fitSlide(containers[i]);
}
fitAll();
window.addEventListener('resize', fitAll);

frames.forEach(function(_, i) {
  var btn = document.createElement('button');
  btn.addEventListener('click', function(e) { e.stopPropagation(); goTo(i); });
  nav.appendChild(btn);
});

function getElAnimName(category, style, direction) {
  if (category === 'enter') {
    if (style === 'flyIn') return FLY_DIR_MAP[direction] || 'elFlyInFromBottom';
    if (style === 'split') return SPLIT_DIR_MAP[direction] || 'elSplitH';
    if (style === 'wipe') return WIPE_DIR_MAP[direction] || 'elWipeH';
    return ENTER_ANIM_MAP[style] || 'elFadeIn';
  }
  if (category === 'exit') {
    if (style === 'flyIn') return FLY_DIR_EXIT_MAP[direction] || 'elFlyOutBottom';
    if (style === 'split') return SPLIT_DIR_EXIT_MAP[direction] || 'elSplitHOut';
    if (style === 'wipe') return WIPE_DIR_EXIT_MAP[direction] || 'elWipeHOut';
    return EXIT_ANIM_MAP[style] || 'elFadeOut';
  }
  if (category === 'emphasis') {
    return EMPHASIS_ANIM_MAP[style] || 'elEmphPulse';
  }
  if (category === 'motion') {
    return MOTION_ANIM_MAP[direction] || 'elMotionBottom';
  }
  return 'elFadeIn';
}

function getTransitionAnim(slide, isExit) {
  var d = slide.dataset;
  var type;
  if (isExit) {
    type = d.transitionExit || d.transitionType || 'none';
  } else {
    type = d.transitionEnter || d.transitionType || 'none';
  }
  var dir = d.transitionDir || 'fromRight';
  var dur = parseFloat(d.transitionDur) || 0.5;
  if (type === 'none' || type === 'cut') return null;
  var map = isExit ? TRANSITION_EXIT_MAP : TRANSITION_ENTER_MAP;
  var animName;
  if (type === 'slide') {
    animName = isExit ? (SLIDE_DIR_EXIT[dir] || 'slideOutLeft') : (SLIDE_DIR_ENTER[dir] || 'slideInRight');
  } else if (type === 'push') {
    animName = isExit ? (PUSH_DIR_EXIT[dir] || 'pushOutLeft') : (PUSH_DIR_ENTER[dir] || 'pushInRight');
  } else {
    animName = map[type] || (isExit ? 'fadeOut' : 'fadeIn');
  }
  return { name: animName, duration: dur };
}

function resetSlide(slide) {
  var seq = [];
  try { seq = JSON.parse(slide.dataset.animSeq || '[]'); } catch(e) {}
  var enterEls = new Set();
  seq.forEach(function(s) { if (s.category === 'enter') enterEls.add(s.elementId); });
  var els = slide.querySelectorAll('[data-el-id]');
  els.forEach(function(el) {
    el.style.animation = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    if (enterEls.has(el.dataset.elId)) {
      el.classList.add('el-anim-hidden');
    } else {
      el.classList.remove('el-anim-hidden');
    }
  });
}

function advanceAnimation() {
  if (animIndex >= currentSeq.length) return false;
  var stepsToRun = [];
  var firstStep = currentSeq[animIndex];
  if (!firstStep) return false;
  stepsToRun.push(firstStep);
  animIndex++;
  while (animIndex < currentSeq.length) {
    var next = currentSeq[animIndex];
    if (next.trigger === 'withPrevious') {
      stepsToRun.push(next);
      animIndex++;
    } else {
      break;
    }
  }
  var slide = frames[current];
  stepsToRun.forEach(function(step) {
    var el = slide.querySelector('[data-el-id="' + step.elementId + '"]');
    if (!el) return;
    var animName = getElAnimName(step.category, step.style, step.direction);
    var dur = step.duration || 0.5;
    var delay = step.delay || 0;
    el.classList.remove('el-anim-hidden');
    el.style.animation = animName + ' ' + dur + 's ease ' + delay + 's both';
  });
  var maxDur = 0;
  stepsToRun.forEach(function(s) {
    var d = (s.duration || 0.5) + (s.delay || 0);
    if (d > maxDur) maxDur = d;
  });
  setTimeout(function() {
    stepsToRun.forEach(function(step) {
      var el = slide.querySelector('[data-el-id="' + step.elementId + '"]');
      if (!el) return;
      if (step.category === 'exit') {
        el.classList.add('el-anim-hidden');
        el.style.animation = '';
      } else if (step.category === 'emphasis' || step.category === 'motion') {
        el.style.animation = '';
      }
    });
    var afterSteps = [];
    while (animIndex < currentSeq.length && currentSeq[animIndex].trigger === 'afterPrevious') {
      afterSteps.push(currentSeq[animIndex]);
      animIndex++;
    }
    if (afterSteps.length > 0) {
      afterSteps.forEach(function(step) {
        var el = slide.querySelector('[data-el-id="' + step.elementId + '"]');
        if (!el) return;
        var animName = getElAnimName(step.category, step.style, step.direction);
        var dur = step.duration || 0.5;
        var delay = step.delay || 0;
        el.classList.remove('el-anim-hidden');
        el.style.animation = animName + ' ' + dur + 's ease ' + delay + 's both';
      });
      var afterMaxDur = 0;
      afterSteps.forEach(function(s) {
        var d = (s.duration || 0.5) + (s.delay || 0);
        if (d > afterMaxDur) afterMaxDur = d;
      });
      setTimeout(function() {
        afterSteps.forEach(function(step) {
          var el = slide.querySelector('[data-el-id="' + step.elementId + '"]');
          if (!el) return;
          if (step.category === 'exit') {
            el.classList.add('el-anim-hidden');
            el.style.animation = '';
          } else if (step.category === 'emphasis' || step.category === 'motion') {
            el.style.animation = '';
          }
        });
      }, afterMaxDur * 1000 + 50);
    }
  }, maxDur * 1000 + 50);
  return true;
}

function initSlide(slide) {
  var seq = [];
  try { seq = JSON.parse(slide.dataset.animSeq || '[]'); } catch(e) {}
  seq.sort(function(a, b) { return a.order - b.order; });
  currentSeq = seq;
  animIndex = 0;
  var enterEls = new Set();
  seq.forEach(function(s) { if (s.category === 'enter') enterEls.add(s.elementId); });
  var els = slide.querySelectorAll('[data-el-id]');
  els.forEach(function(el) {
    el.style.animation = '';
    if (enterEls.has(el.dataset.elId)) {
      el.classList.add('el-anim-hidden');
    } else {
      el.classList.remove('el-anim-hidden');
    }
  });
  var autoSteps = seq.filter(function(s) { return s.trigger === 'withPrevious' || s.trigger === 'afterPrevious'; });
  if (autoSteps.length > 0 && seq.length > 0 && (seq[0].trigger === 'withPrevious' || seq[0].trigger === 'afterPrevious')) {
    setTimeout(function() { advanceAnimation(); }, 100);
  }
}

function goTo(index) {
  if (index < 0 || index >= frames.length) return;
  if (transitioning) return;
  var prev = current;
  var prevFrame = prev >= 0 ? frames[prev] : null;
  var nextFrame = frames[index];
  var exitAnim = prevFrame ? getTransitionAnim(prevFrame, true) : null;
  var enterAnim = getTransitionAnim(nextFrame, false);
  current = index;
  counter.textContent = (current + 1) + ' / ' + frames.length;
  for (var i = 0; i < nav.children.length; i++) {
    nav.children[i].classList.toggle('active', i === current);
  }
  if (prev >= 0 && prev !== current) {
    resetSlide(prevFrame);
  }
  if (exitAnim && enterAnim && prev >= 0 && prev !== current) {
    transitioning = true;
    var prevContainer = prevFrame.querySelector('.slide-container');
    var nextContainer = nextFrame.querySelector('.slide-container');
    prevFrame.classList.add('active');
    nextFrame.classList.add('active');
    prevContainer.style.animation = exitAnim.name + ' ' + exitAnim.duration + 's ease both';
    nextContainer.style.animation = enterAnim.name + ' ' + enterAnim.duration + 's ease both';
    initSlide(nextFrame);
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      prevContainer.style.animation = '';
      nextContainer.style.animation = '';
      if (prev !== current) prevFrame.classList.remove('active');
      transitioning = false;
    }
    nextContainer.addEventListener('animationend', finish);
    prevContainer.addEventListener('animationend', finish);
    setTimeout(finish, Math.max(exitAnim.duration, enterAnim.duration) * 1000 + 100);
  } else {
    if (prev >= 0 && prev !== current) {
      prevFrame.classList.remove('active');
    }
    nextFrame.classList.add('active');
    initSlide(nextFrame);
  }
}

goTo(0);

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (animIndex < currentSeq.length) {
      advanceAnimation();
    } else {
      goTo(current + 1);
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace') {
    e.preventDefault();
    goTo(current - 1);
  } else if (e.key === 'Home') {
    e.preventDefault(); goTo(0);
  } else if (e.key === 'End') {
    e.preventDefault(); goTo(frames.length - 1);
  } else if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
});

document.addEventListener('click', function(e) {
  if (e.target.closest('.slide-nav') || e.target.closest('.pres-toolbar') || e.target.closest('.color-picker-popup') || e.target.closest('.size-popup') || e.target.closest('.pres-timer')) return;
  if (window._presDrawMode) return;
  if (animIndex < currentSeq.length) {
    advanceAnimation();
  } else {
    goTo(current + 1);
  }
});

function renderFormulas() {
  document.querySelectorAll('[data-formula]').forEach(function(el) {
    var latex = el.getAttribute('data-formula');
    if (latex && typeof katex !== 'undefined') {
      try {
        katex.render(latex, el, { throwOnError: false, displayMode: true });
      } catch(e) {
        el.textContent = latex;
      }
    }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(renderFormulas, 100); });
} else {
  setTimeout(renderFormulas, 100);
}

(function() {
  var canvas = document.getElementById('draw-canvas');
  var ctx = canvas.getContext('2d');
  var laserDot = document.getElementById('laser-dot');
  var blackout = document.getElementById('blackout');
  var toolbar = document.getElementById('toolbar');
  var timerEl = document.getElementById('timer');
  var nav = document.getElementById('nav');

  var drawMode = null;
  var drawColor = '#EF4444';
  var drawSize = 3;
  var isDrawing = false;
  var lastX = 0, lastY = 0;
  var strokesByPage = {};
  var currentStroke = null;
  var isLaser = false;
  var isBlackout = false;
  var timerRunning = false;
  var timerStart = 0;
  var timerPaused = 0;
  var timerInterval = null;
  var toolbarVisible = false;

  window._presDrawMode = null;

  function getCurrentPageIndex() {
    return typeof current !== 'undefined' ? current : 0;
  }

  function saveCurrentStrokes() {
    var idx = getCurrentPageIndex();
    strokesByPage[idx] = strokesByPage[idx] || [];
    strokesByPage[idx] = strokesByPage[idx].length > 0 ? strokesByPage[idx].slice() : [];
  }

  function loadPageStrokes() {
    var idx = getCurrentPageIndex();
    strokesByPage[idx] = strokesByPage[idx] || [];
    redrawStrokes();
  }

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawStrokes();
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function redrawStrokes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var idx = getCurrentPageIndex();
    var pageStrokes = strokesByPage[idx] || [];
    pageStrokes.forEach(function(s) { drawStroke(s); });
  }

  function drawStroke(s) {
    if (s.points.length < 2) return;
    ctx.save();
    if (s.tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineWidth = s.size * 4;
    } else if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = s.size * 6;
    } else {
      ctx.globalAlpha = 1;
      ctx.lineWidth = s.size;
    }
    ctx.strokeStyle = s.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (var i = 1; i < s.points.length; i++) {
      var mx = (s.points[i - 1].x + s.points[i].x) / 2;
      var my = (s.points[i - 1].y + s.points[i].y) / 2;
      ctx.quadraticCurveTo(s.points[i - 1].x, s.points[i - 1].y, mx, my);
    }
    ctx.stroke();
    ctx.restore();
  }

  function isUIElement(target) {
    return !!target.closest('.pres-toolbar, .slide-nav, .pres-timer, .color-picker-popup, .size-popup, #blackout');
  }

  function setDrawMode(mode) {
    drawMode = drawMode === mode ? null : mode;
    window._presDrawMode = drawMode;
    document.body.classList.toggle('draw-mode', drawMode === 'pen' || drawMode === 'highlighter');
    document.body.classList.toggle('eraser-mode', drawMode === 'eraser');
    document.getElementById('tb-pen').classList.toggle('active', drawMode === 'pen');
    document.getElementById('tb-highlighter').classList.toggle('active', drawMode === 'highlighter');
    document.getElementById('tb-eraser').classList.toggle('active', drawMode === 'eraser');
    if (drawMode) {
      isLaser = false;
      laserDot.style.display = 'none';
      document.getElementById('tb-laser').classList.remove('active');
    }
  }

  document.addEventListener('pointerdown', function(e) {
    if (!drawMode) return;
    if (isUIElement(e.target)) return;
    isDrawing = true;
    document.body.classList.add('drawing');
    lastX = e.clientX;
    lastY = e.clientY;
    currentStroke = { tool: drawMode, color: drawColor, size: drawSize, points: [{ x: e.clientX, y: e.clientY }] };
  });
  document.addEventListener('pointermove', function(e) {
    if (!isDrawing || !currentStroke) return;
    currentStroke.points.push({ x: e.clientX, y: e.clientY });
    redrawStrokes();
    drawStroke(currentStroke);
  });
  document.addEventListener('pointerup', function() {
    if (currentStroke && currentStroke.points.length >= 2) {
      var idx = getCurrentPageIndex();
      strokesByPage[idx] = strokesByPage[idx] || [];
      strokesByPage[idx].push(currentStroke);
    }
    currentStroke = null;
    isDrawing = false;
    document.body.classList.remove('drawing');
  });

  nav.addEventListener('click', function(e) {
    e.stopPropagation();
    toolbarVisible = !toolbarVisible;
    toolbar.classList.toggle('show', toolbarVisible);
  });

  document.getElementById('tb-pen').addEventListener('click', function() { setDrawMode('pen'); });
  document.getElementById('tb-highlighter').addEventListener('click', function() { setDrawMode('highlighter'); });
  document.getElementById('tb-eraser').addEventListener('click', function() { setDrawMode('eraser'); });

  document.getElementById('tb-color').addEventListener('click', function(e) {
    e.stopPropagation();
    var popup = document.getElementById('color-popup');
    popup.classList.toggle('show');
    document.getElementById('size-popup').classList.remove('show');
  });
  document.querySelectorAll('#color-popup .cp-swatch').forEach(function(sw) {
    sw.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      drawColor = sw.dataset.color;
      document.getElementById('color-dot').style.background = drawColor;
      document.querySelectorAll('#color-popup .cp-swatch').forEach(function(s) { s.classList.remove('selected'); });
      sw.classList.add('selected');
      document.getElementById('color-popup').classList.remove('show');
    });
  });
  document.getElementById('color-popup').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  document.getElementById('tb-size').addEventListener('click', function(e) {
    e.stopPropagation();
    var popup = document.getElementById('size-popup');
    popup.classList.toggle('show');
    document.getElementById('color-popup').classList.remove('show');
  });
  document.getElementById('size-range').addEventListener('input', function(e) {
    e.stopPropagation();
    drawSize = parseInt(this.value);
    document.getElementById('size-label').textContent = drawSize;
  });
  document.getElementById('size-range').addEventListener('click', function(e) {
    e.stopPropagation();
  });
  document.getElementById('size-popup').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  document.getElementById('tb-laser').addEventListener('click', function() {
    isLaser = !isLaser;
    this.classList.toggle('active', isLaser);
    laserDot.style.display = isLaser ? 'block' : 'none';
    if (isLaser) {
      setDrawMode(null);
      canvas.classList.remove('active');
    }
  });
  document.addEventListener('mousemove', function(e) {
    if (isLaser) {
      laserDot.style.left = e.clientX + 'px';
      laserDot.style.top = e.clientY + 'px';
    }
  });

  document.getElementById('tb-blackout').addEventListener('click', function() {
    isBlackout = !isBlackout;
    blackout.style.display = isBlackout ? 'block' : 'none';
    this.classList.toggle('active', isBlackout);
  });

  document.getElementById('tb-undo').addEventListener('click', function() {
    var idx = getCurrentPageIndex();
    strokesByPage[idx] = strokesByPage[idx] || [];
    if (strokesByPage[idx].length > 0) {
      strokesByPage[idx].pop();
      redrawStrokes();
    }
  });

  document.getElementById('tb-clear').addEventListener('click', function() {
    var idx = getCurrentPageIndex();
    strokesByPage[idx] = [];
    redrawStrokes();
  });

  function formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  document.getElementById('tb-timer').addEventListener('click', function() {
    if (!timerRunning) {
      timerRunning = true;
      timerStart = Date.now();
      timerEl.classList.add('show');
      timerInterval = setInterval(function() {
        timerEl.textContent = formatTime(Date.now() - timerStart);
      }, 500);
    } else {
      timerRunning = false;
      clearInterval(timerInterval);
      timerEl.textContent = formatTime(timerPaused || (Date.now() - timerStart));
    }
  });
  timerEl.addEventListener('click', function() {
    if (timerRunning) {
      timerPaused = Date.now() - timerStart;
      timerRunning = false;
      clearInterval(timerInterval);
    } else if (timerPaused) {
      timerStart = Date.now() - timerPaused;
      timerPaused = 0;
      timerRunning = true;
      timerInterval = setInterval(function() {
        timerEl.textContent = formatTime(Date.now() - timerStart);
      }, 500);
    }
  });

  document.getElementById('tb-fs').addEventListener('click', function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.color-picker-popup') && !e.target.closest('#tb-color')) {
      document.getElementById('color-popup').classList.remove('show');
    }
    if (!e.target.closest('.size-popup') && !e.target.closest('#tb-size')) {
      document.getElementById('size-popup').classList.remove('show');
    }
  });

  var origGoTo = goTo;
  goTo = function(index) {
    origGoTo(index);
    loadPageStrokes();
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setDrawMode('pen'); }
    else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setDrawMode('highlighter'); }
    else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setDrawMode('eraser'); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); document.getElementById('tb-laser').click(); }
    else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); document.getElementById('tb-blackout').click(); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); document.getElementById('tb-timer').click(); }
    else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); document.getElementById('tb-undo').click(); }
    else if (e.key === 'Escape') {
      if (toolbarVisible) { toolbarVisible = false; toolbar.classList.remove('show'); }
      else if (isBlackout) { isBlackout = false; blackout.style.display = 'none'; document.getElementById('tb-blackout').classList.remove('active'); }
      else if (isLaser) { isLaser = false; laserDot.style.display = 'none'; document.getElementById('tb-laser').classList.remove('active'); }
      else if (drawMode) { setDrawMode(null); }
    }
  });
})();
</script>
</body>
</html>`;

function generateIndexHtml(project: Project, imageMap?: Map<string, string>, fontFaceCss?: string): string {
  const [SLIDE_W, SLIDE_H] = getSlideDimensions(project.slideSize);
  const slideFrames = project.slides.map((slide) => {
    const enterElements = new Set<string>();
    const exitElements = new Set<string>();
    (slide.animationSequence || []).forEach(step => {
      if (step.category === "enter") enterElements.add(step.elementId);
      if (step.category === "exit") exitElements.add(step.elementId);
    });
    const elementsHtml = [...slide.elements]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(el => {
        let animClass = "";
        if (enterElements.has(el.id)) animClass = " el-anim-hidden";
        const html = elementToHtml(el, imageMap);
        if (animClass && html.startsWith("<div")) {
          return html.replace("<div", `<div class="${animClass.trim()}" data-el-id="${el.id}"`);
        }
        if (!animClass && html.startsWith("<div")) {
          return html.replace("<div", `<div data-el-id="${el.id}"`);
        }
        return html;
      })
      .join("\n    ");
    const tr = slide.transition;
    const transAttrs = `data-transition-type="${tr.type}" data-transition-enter="${tr.enterType || "none"}" data-transition-exit="${tr.exitType || "none"}" data-transition-dur="${tr.duration}" data-transition-dir="${tr.direction}"`;
    const seqJson = JSON.stringify(slide.animationSequence || []);
    return `<div class="slide-wrapper" ${transAttrs} data-anim-seq='${seqJson}'>\n  <div class="slide-container" style="background:${slide.background}">\n    ${elementsHtml}\n  </div>\n</div>`;
  }).join("\n");

  return INDEX_TEMPLATE
    .replace("{{TITLE}}", project.name)
    .replace("{{FONT_FACE_CSS}}", fontFaceCss || "")
    .replace(/\{\{SLIDE_W\}\}/g, String(SLIDE_W))
    .replace(/\{\{SLIDE_H\}\}/g, String(SLIDE_H))
    .replace("{{SLIDE_FRAMES}}", slideFrames);
}

async function ensureDir(dirPath: string) {
  try {
    if (!(await exists(dirPath))) {
      await mkdir(dirPath, { recursive: true });
    }
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

function collectUsedFonts(project: Project): Set<string> {
  const fonts = new Set<string>();
  for (const slide of project.slides) {
    for (const el of slide.elements) {
      if (el.fontFamily && el.fontFamily !== "system-ui") {
        fonts.add(el.fontFamily);
      }
    }
  }
  return fonts;
}

function isAssetUrl(content: string): boolean {
  return content.startsWith("http://asset.localhost") || content.startsWith("asset://");
}

function collectMediaElements(project: Project): SlideElement[] {
  const media: SlideElement[] = [];
  for (const slide of project.slides) {
    for (const el of slide.elements) {
      if ((el.type === "image" || el.type === "video" || el.type === "audio") && (el.content.startsWith("data:") || el.content.startsWith("blob:"))) {
        media.push(el);
      }
    }
  }
  return media;
}

function collectAssetUrlElements(project: Project): SlideElement[] {
  const media: SlideElement[] = [];
  for (const slide of project.slides) {
    for (const el of slide.elements) {
      if ((el.type === "video" || el.type === "audio") && isAssetUrl(el.content)) {
        media.push(el);
      }
    }
  }
  return media;
}

function extractPathFromAssetUrl(url: string): string | null {
  try {
    if (url.startsWith("http://asset.localhost/")) {
      return decodeURIComponent(url.substring("http://asset.localhost/".length));
    }
    if (url.startsWith("asset://localhost/")) {
      return decodeURIComponent(url.substring("asset://localhost/".length));
    }
    if (url.startsWith("asset://")) {
      return decodeURIComponent(url.substring("asset://".length));
    }
  } catch { return null; }
  return null;
}

export async function saveProject(project: Project, saveDir?: string): Promise<{ dir: string; assetUpdates: Map<string, string> } | null> {
  let projectDir: string;
  if (saveDir) {
    projectDir = saveDir;
  } else {
    const dir = await open({
      title: "选择保存位置",
      directory: true,
    });
    if (!dir || typeof dir !== "string") return null;
    projectDir = await join(dir, project.name);
  }
  await ensureDir(projectDir);

  const pagesDir = await join(projectDir, "pages");
  const imagesDir = await join(projectDir, "images");
  const videosDir = await join(projectDir, "videos");
  const audioDir = await join(projectDir, "audio");
  const fontsDir = await join(projectDir, "fonts");

  await ensureDir(pagesDir);
  await ensureDir(imagesDir);
  await ensureDir(videosDir);
  await ensureDir(audioDir);
  await ensureDir(fontsDir);

  const mediaElements = collectMediaElements(project);
  const imageMap = new Map<string, string>();
  const imageCounter = new Map<string, number>();
  const videoCounter = new Map<string, number>();
  const audioCounter = new Map<string, number>();

  for (const el of mediaElements) {
    let ext: string;
    if (el.content.startsWith("blob:")) {
      ext = blobMetaMap.get(el.content)?.ext || (el.type === "video" ? "mp4" : el.type === "audio" ? "mp3" : "png");
    } else {
      ext = getMediaExtension(el.content);
    }
    let baseName: string;
    let mediaDir: string;
    let counter: Map<string, number>;
    let dirPrefix: string;
    if (el.type === "video") {
      baseName = "video";
      mediaDir = videosDir;
      counter = videoCounter;
      dirPrefix = "videos";
    } else if (el.type === "audio") {
      baseName = "audio";
      mediaDir = audioDir;
      counter = audioCounter;
      dirPrefix = "audio";
    } else if (el.content.startsWith("data:image/svg+xml") || el.content.startsWith("blob:") && ext === "svg") {
      baseName = "graphic";
      mediaDir = imagesDir;
      counter = imageCounter;
      dirPrefix = "images";
    } else {
      baseName = "img";
      mediaDir = imagesDir;
      counter = imageCounter;
      dirPrefix = "images";
    }
    const count = (counter.get(baseName) || 0) + 1;
    counter.set(baseName, count);
    const fileName = `${baseName}-${String(count).padStart(3, "0")}.${ext}`;
    imageMap.set(el.id, `${dirPrefix}/${fileName}`);

    let binaryData: Uint8Array;
    if (el.content.startsWith("blob:")) {
      const response = await fetch(el.content);
      const buffer = await response.arrayBuffer();
      binaryData = new Uint8Array(buffer);
    } else {
      const base64Data = extractBase64Data(el.content);
      binaryData = base64ToUint8Array(base64Data);
    }
    const filePath = await join(mediaDir, fileName);
    await writeFile(filePath, binaryData);
  }

  const usedFonts = collectUsedFonts(project);
  const fontFileMap = new Map<string, string>();

  if (usedFonts.size > 0) {
    try {
      const systemFonts: { name: string; path: string }[] = await invoke("scan_system_fonts");
      for (const fontName of usedFonts) {
        const match = systemFonts.find(f => f.name === fontName);
        if (match) {
          const fontFileName = await basename(match.path);
          const destPath = await join(fontsDir, fontFileName);
          try {
            if (!(await exists(destPath))) {
              await copyFile(match.path, destPath);
            }
            fontFileMap.set(fontName, fontFileName);
          } catch (err) {
            console.warn(`Failed to copy font ${fontName}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to scan system fonts:", err);
    }
  }

  const fontFaceCss = generateFontFaceCss([...usedFonts], fontFileMap);

  const projectForJson = { ...project };
  const assetUrlElements = collectAssetUrlElements(project);
  const assetUrlMap = new Map<string, string>();
  for (const el of assetUrlElements) {
    const absPath = extractPathFromAssetUrl(el.content);
    if (absPath) {
      if (absPath.startsWith(projectDir)) {
        const relPath = absPath.substring(projectDir.length + 1).replace(/\\/g, "/");
        assetUrlMap.set(el.id, relPath);
      } else {
        try {
          const fileName = absPath.split(/[/\\]/).pop() || `${el.id}.${el.type === "video" ? "mp4" : "mp3"}`;
          const destPath = await join(imagesDir, fileName);
          await copyFile(absPath, destPath);
          assetUrlMap.set(el.id, `images/${fileName}`);
        } catch (err) {
          console.error("Failed to copy external media file:", err);
        }
      }
    }
  }
  const slidesWithImageRefs = project.slides.map(slide => ({
    ...slide,
    elements: slide.elements.map(el => {
      if ((el.type === "image" || el.type === "video" || el.type === "audio") && imageMap.has(el.id)) {
        return { ...el, content: imageMap.get(el.id)! };
      }
      if (assetUrlMap.has(el.id)) {
        return { ...el, content: assetUrlMap.get(el.id)! };
      }
      return el;
    })
  }));
  projectForJson.slides = slidesWithImageRefs;

  const projectJson = JSON.stringify(projectForJson, null, 2);
  const projectJsonPath = await join(projectDir, "project.webdeck.json");
  await writeFile(projectJsonPath, new TextEncoder().encode(projectJson));

  const indexHtml = generateIndexHtml(project, imageMap, fontFaceCss);
  await writeFile(await join(projectDir, "index.html"), new TextEncoder().encode(indexHtml));

  for (let i = 0; i < project.slides.length; i++) {
    const slide = project.slides[i];
    const pageHtml = slideToFullHtml(slide, i, imageMap, fontFaceCss, project.slideSize);
    const fileName = `slide-${String(i + 1).padStart(3, "0")}.html`;
    await writeFile(await join(pagesDir, fileName), new TextEncoder().encode(pageHtml));
  }

  const usedMediaFiles = new Set<string>();
  for (const relPath of imageMap.values()) usedMediaFiles.add(relPath);
  for (const relPath of assetUrlMap.values()) usedMediaFiles.add(relPath);

  const mediaDirs = [
    { dir: videosDir, prefix: "videos/" },
    { dir: audioDir, prefix: "audio/" },
    { dir: imagesDir, prefix: "images/" },
  ];
  for (const { dir, prefix } of mediaDirs) {
    try {
      const entries = await readDir(dir);
      for (const entry of entries) {
        if (entry.isFile) {
          const relPath = `${prefix}${entry.name}`;
          if (!usedMediaFiles.has(relPath)) {
            try {
              const filePath = await join(dir, entry.name);
              await remove(filePath);
            } catch {}
          }
        }
      }
    } catch {}
  }

  return { dir: projectDir, assetUpdates: assetUrlMap };
}

export async function applyMediaUrlUpdates(project: Project, updates: Map<string, string>, projectDir: string): Promise<Project> {
  if (updates.size === 0) return project;
  const newSlides = await Promise.all(project.slides.map(async slide => ({
    ...slide,
    elements: await Promise.all(slide.elements.map(async el => {
      if (updates.has(el.id)) {
        const relPath = updates.get(el.id)!;
        const absPath = relPath.startsWith("/") ? relPath : `${projectDir}/${relPath}`;
        try {
          const bytes = await readFile(absPath);
          const ext = relPath.split(".").pop()?.toLowerCase() || "";
          const mime = getMimeForMediaType(ext, el.type);
          const blob = new Blob([bytes], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          registerBlobUrl(blobUrl, ext, bytes.byteLength);
          return { ...el, content: blobUrl };
        } catch {
          return el;
        }
      }
      return el;
    }))
  })));
  return { ...project, slides: newSlides };
}

export async function saveAsProject(project: Project): Promise<{ dir: string; assetUpdates: Map<string, string> } | null> {
  return saveProject(project);
}

export async function presentInBrowser(project: Project): Promise<void> {
  let mediaDirPath: string | null = null;
  const blobUrlToFile = new Map<string, string>();

  const hasBlobMedia = project.slides.some(s =>
    s.elements.some(el =>
      (el.type === "video" || el.type === "audio" || el.type === "image") && el.content.startsWith("blob:")
    )
  );

  if (hasBlobMedia) {
    const tmp = await tempDir();
    mediaDirPath = await join(tmp, "webdeck-present-" + Date.now().toString(36));
    await mkdir(mediaDirPath, { recursive: true });

    for (const slide of project.slides) {
      for (const el of slide.elements) {
        if ((el.type === "video" || el.type === "audio" || el.type === "image") && el.content.startsWith("blob:") && !blobUrlToFile.has(el.content)) {
          try {
            const response = await fetch(el.content);
            const buffer = await response.arrayBuffer();
            const meta = blobMetaMap.get(el.content);
            const ext = meta?.ext || (el.type === "video" ? "mp4" : el.type === "audio" ? "mp3" : "png");
            const fileName = `${el.type}-${el.id.substring(0, 8)}.${ext}`;
            const filePath = await join(mediaDirPath, fileName);
            await writeFile(filePath, new Uint8Array(buffer));
            blobUrlToFile.set(el.content, fileName);
          } catch (err) {
            console.error("Failed to write media for preview:", err);
          }
        }
      }
    }
  }

  const convertedSlides = project.slides.map(slide => ({
    ...slide,
    elements: slide.elements.map(el => {
      if ((el.type === "video" || el.type === "audio" || el.type === "image") && el.content.startsWith("blob:") && blobUrlToFile.has(el.content)) {
        return { ...el, content: `/media/${blobUrlToFile.get(el.content)!}` };
      }
      return el;
    })
  }));
  const convertedProject = { ...project, slides: convertedSlides };

  const html = generateIndexHtml(convertedProject);
  const port: number = await invoke("start_present_server", { html, mediaDir: mediaDirPath });
  await shellOpen(`http://127.0.0.1:${port}`);
}

export async function openProject(): Promise<{ project: Project; dir: string } | null> {
  let selectedDir: string | string[] | null;
  try {
    selectedDir = await open({
      title: "打开项目",
      directory: true,
    });
  } catch (err) {
    console.error("open dialog error:", err);
    return null;
  }
  if (!selectedDir) return null;

  const projectDir = typeof selectedDir === "string" ? selectedDir : Array.isArray(selectedDir) ? selectedDir[0] : null;
  if (!projectDir) return null;

  try {
    const projectJsonPath = await join(projectDir, "project.webdeck.json");
    const content = await readTextFile(projectJsonPath);
    const project = JSON.parse(content) as Project;
    if (!project || !project.slides || !Array.isArray(project.slides)) {
      console.error("Invalid project file: missing slides array");
      return null;
    }

    const imagesDir = await join(projectDir, "images");

    const slidesWithMedia = await Promise.all(
      project.slides.map(async (slide) => ({
        ...slide,
        elements: await Promise.all(
          slide.elements.map(async (el) => {
            if ((el.type === "video" || el.type === "audio") && isAssetUrl(el.content)) {
              const absPath = extractPathFromAssetUrl(el.content);
              if (absPath) {
                try {
                  const bytes = await readFile(absPath);
                  const ext = absPath.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                  const mime = getMimeForMediaType(ext, el.type);
                  const blob = new Blob([bytes], { type: mime });
                  const blobUrl = URL.createObjectURL(blob);
                  registerBlobUrl(blobUrl, ext, bytes.byteLength);
                  return { ...el, content: blobUrl };
                } catch { return el; }
              }
            }
            if ((el.type === "image" || el.type === "video" || el.type === "audio") && !el.content.startsWith("data:") && !el.content.startsWith("blob:") && !isAssetUrl(el.content)) {
              try {
                const mediaPath = await join(projectDir, el.content);
                if (el.type === "video" || el.type === "audio") {
                  const bytes = await readFile(mediaPath);
                  const ext = el.content.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                  const mime = getMimeForMediaType(ext, el.type);
                  const blob = new Blob([bytes], { type: mime });
                  const blobUrl = URL.createObjectURL(blob);
                  registerBlobUrl(blobUrl, ext, bytes.byteLength);
                  return { ...el, content: blobUrl };
                }
                const mediaBytes = await readFile(mediaPath);
                const base64 = btoa(String.fromCharCode(...mediaBytes));
                const ext = el.content.split(".").pop()?.toLowerCase() || "";
                const mime = getMimeForMediaType(ext, "image");
                return { ...el, content: `data:${mime};base64,${base64}` };
              } catch {
                if (el.type === "video" || el.type === "audio") {
                  try {
                    const fallbackPath = await join(imagesDir, el.content.split("/").pop()!);
                    const bytes = await readFile(fallbackPath);
                    const ext = el.content.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                    const mime = getMimeForMediaType(ext, el.type);
                    const blob = new Blob([bytes], { type: mime });
                    const blobUrl = URL.createObjectURL(blob);
                    registerBlobUrl(blobUrl, ext, bytes.byteLength);
                    return { ...el, content: blobUrl };
                  } catch { return el; }
                }
                try {
                  const fallbackPath = await join(imagesDir, el.content.split("/").pop()!);
                  const mediaBytes = await readFile(fallbackPath);
                  const base64 = btoa(String.fromCharCode(...mediaBytes));
                  const ext = el.content.split(".").pop()?.toLowerCase() || "";
                  const mime = getMimeForMediaType(ext, "image");
                  return { ...el, content: `data:${mime};base64,${base64}` };
                } catch { return el; }
              }
            }
            return el;
          })
        ),
      }))
    );
    project.slides = slidesWithMedia;

    return { project, dir: projectDir };
  } catch (err) {
    console.error("read project file error:", err);
    return null;
  }
}

export async function openProjectFromDir(projectDir: string): Promise<{ project: Project; dir: string } | null> {
  try {
    const projectJsonPath = await join(projectDir, "project.webdeck.json");
    const content = await readTextFile(projectJsonPath);
    const project = JSON.parse(content) as Project;
    if (!project || !project.slides || !Array.isArray(project.slides)) {
      console.error("Invalid project file: missing slides array");
      return null;
    }

    const imagesDir = await join(projectDir, "images");

    const slidesWithMedia = await Promise.all(
      project.slides.map(async (slide) => ({
        ...slide,
        elements: await Promise.all(
          slide.elements.map(async (el) => {
            if ((el.type === "video" || el.type === "audio") && isAssetUrl(el.content)) {
              const absPath = extractPathFromAssetUrl(el.content);
              if (absPath) {
                try {
                  const bytes = await readFile(absPath);
                  const ext = absPath.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                  const mime = getMimeForMediaType(ext, el.type);
                  const blob = new Blob([bytes], { type: mime });
                  const blobUrl = URL.createObjectURL(blob);
                  registerBlobUrl(blobUrl, ext, bytes.byteLength);
                  return { ...el, content: blobUrl };
                } catch { return el; }
              }
            }
            if ((el.type === "image" || el.type === "video" || el.type === "audio") && !el.content.startsWith("data:") && !el.content.startsWith("blob:") && !isAssetUrl(el.content)) {
              try {
                const mediaPath = await join(projectDir, el.content);
                if (el.type === "video" || el.type === "audio") {
                  const bytes = await readFile(mediaPath);
                  const ext = el.content.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                  const mime = getMimeForMediaType(ext, el.type);
                  const blob = new Blob([bytes], { type: mime });
                  const blobUrl = URL.createObjectURL(blob);
                  registerBlobUrl(blobUrl, ext, bytes.byteLength);
                  return { ...el, content: blobUrl };
                }
                const mediaBytes = await readFile(mediaPath);
                const base64 = btoa(String.fromCharCode(...mediaBytes));
                const ext = el.content.split(".").pop()?.toLowerCase() || "";
                const mime = getMimeForMediaType(ext, "image");
                return { ...el, content: `data:${mime};base64,${base64}` };
              } catch {
                if (el.type === "video" || el.type === "audio") {
                  try {
                    const fallbackPath = await join(imagesDir, el.content.split("/").pop()!);
                    const bytes = await readFile(fallbackPath);
                    const ext = el.content.split(".").pop()?.toLowerCase() || (el.type === "video" ? "mp4" : "mp3");
                    const mime = getMimeForMediaType(ext, el.type);
                    const blob = new Blob([bytes], { type: mime });
                    const blobUrl = URL.createObjectURL(blob);
                    registerBlobUrl(blobUrl, ext, bytes.byteLength);
                    return { ...el, content: blobUrl };
                  } catch { return el; }
                }
                try {
                  const fallbackPath = await join(imagesDir, el.content.split("/").pop()!);
                  const mediaBytes = await readFile(fallbackPath);
                  const base64 = btoa(String.fromCharCode(...mediaBytes));
                  const ext = el.content.split(".").pop()?.toLowerCase() || "";
                  const mime = getMimeForMediaType(ext, "image");
                  return { ...el, content: `data:${mime};base64,${base64}` };
                } catch { return el; }
              }
            }
            return el;
          })
        ),
      }))
    );
    project.slides = slidesWithMedia;

    return { project, dir: projectDir };
  } catch (err) {
    console.error("read project from dir error:", err);
    return null;
  }
}

export async function getSystemFonts(): Promise<string[]> {
  try {
    const fonts: { name: string; path: string }[] = await invoke("scan_system_fonts");
    const seen = new Set<string>();
    return fonts
      .map(f => f.name)
      .filter(name => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort();
  } catch {
    return [
      "system-ui", "Arial", "Helvetica", "Times New Roman", "Georgia",
      "Verdana", "Courier New", "Impact", "Comic Sans MS",
      "Noto Sans SC", "Noto Serif SC", "Microsoft YaHei", "SimSun",
      "SimHei", "KaiTi", "FangSong"
    ];
  }
}
