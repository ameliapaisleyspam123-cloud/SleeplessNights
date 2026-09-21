import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PdfMapCanvas from "@/components/lore/PdfMapCanvas";

const BLANK_SIZE = { width: 1200, height: 900 };

/**
 * Keeps the artwork and every overlay in one aspect-ratio-aware coordinate
 * system. Children use percentage coordinates relative to the visible page,
 * rather than the surrounding screen (which may contain letterboxing).
 */
export default function MapPage({ imageUrl = "", pdfUrl = "", rotation = 0, pageRef, children }) {
  const hostRef = useRef(null);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState(BLANK_SIZE);
  const handlePdfSize = useCallback((size) => setMediaSize(size), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      setHostSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!imageUrl && !pdfUrl) setMediaSize(BLANK_SIZE);
  }, [imageUrl, pdfUrl]);

  const fitted = useMemo(() => {
    const availableWidth = Math.max(1, hostSize.width);
    const availableHeight = Math.max(1, hostSize.height);
    const aspect = Math.max(0.01, mediaSize.width / mediaSize.height);
    let width = availableWidth;
    let height = width / aspect;
    if (height > availableHeight) {
      height = availableHeight;
      width = height * aspect;
    }
    return { width, height };
  }, [hostSize, mediaSize]);

  return (
    <div ref={hostRef} className="absolute inset-0 flex items-center justify-center">
      <div
        ref={pageRef}
        className="relative shrink-0 overflow-visible bg-white shadow-[0_12px_40px_rgb(0_0_0/0.28)]"
        style={{ width: `${fitted.width}px`, height: `${fitted.height}px` }}
        data-map-page="true"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth && image.naturalHeight) {
                setMediaSize({ width: image.naturalWidth, height: image.naturalHeight });
              }
            }}
          />
        ) : pdfUrl ? (
          <PdfMapCanvas
            url={pdfUrl}
            rotation={rotation}
            className="pointer-events-none"
            onPageSize={handlePdfSize}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#fffdf8",
              backgroundImage:
                "linear-gradient(rgba(80,70,55,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(80,70,55,.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

export function MapDrawingLayer({ drawings = [], interactive = false, erasing = false, onErase }) {
  return (
    <svg
      className={`absolute inset-0 z-[5] h-full w-full ${interactive ? "pointer-events-auto" : "pointer-events-none"}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="Map drawing layer"
    >
      {drawings.map((stroke) => {
        const points = Array.isArray(stroke.points) ? stroke.points : [];
        if (points.length === 0) return null;
        const path = points.length === 1
          ? `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`
          : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
        return (
          <path
            key={stroke.id}
            d={path}
            fill="none"
            stroke={stroke.color || "#b42318"}
            strokeWidth={stroke.width || 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={erasing ? "cursor-crosshair" : ""}
            style={{ pointerEvents: erasing ? "stroke" : "none" }}
            onPointerDown={(event) => {
              if (!erasing) return;
              event.preventDefault();
              event.stopPropagation();
              onErase?.(stroke.id);
            }}
          />
        );
      })}
    </svg>
  );
}
