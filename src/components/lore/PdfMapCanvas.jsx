import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function PdfMapCanvas({ url, rotation = 0, className = "" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [renderSize, setRenderSize] = useState({ canvasWidth: 0, canvasHeight: 0, frameWidth: 0, frameHeight: 0 });

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    const renderPdf = async () => {
      if (!url || !canvasRef.current || !wrapRef.current) return;
      setStatus("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const pdf = await pdfjs.getDocument(url).promise;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const normalizedRotation = ((Number(rotation) || 0) % 360 + 360) % 360;
        const turnsSideways = normalizedRotation === 90 || normalizedRotation === 270;
        const container = wrapRef.current.getBoundingClientRect();
        const baseViewport = page.getViewport({ scale: 1 });
        const frameBaseWidth = turnsSideways ? baseViewport.height : baseViewport.width;
        const frameBaseHeight = turnsSideways ? baseViewport.width : baseViewport.height;
        const scale = Math.min(container.width / frameBaseWidth, container.height / frameBaseHeight) || 1;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const ratio = window.devicePixelRatio || 1;
        const canvasWidth = viewport.width;
        const canvasHeight = viewport.height;
        const frameWidth = turnsSideways ? canvasHeight : canvasWidth;
        const frameHeight = turnsSideways ? canvasWidth : canvasHeight;

        setRenderSize({ canvasWidth, canvasHeight, frameWidth, frameHeight });
        canvas.width = Math.floor(canvasWidth * ratio);
        canvas.height = Math.floor(canvasHeight * ratio);
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (!cancelled) setStatus("error");
      }
    };

    renderPdf();
    const observer = new ResizeObserver(() => renderPdf());
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      renderTask?.cancel?.();
    };
  }, [url, rotation]);

  return (
    <div ref={wrapRef} className={`absolute inset-0 flex items-center justify-center bg-background ${className}`}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rendering PDF...
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          This PDF could not be rendered.
        </div>
      )}
      <div
        className={status === "ready" ? "relative" : "invisible"}
        style={{ width: `${renderSize.frameWidth}px`, height: `${renderSize.frameHeight}px` }}
      >
        <canvas
          ref={canvasRef}
          className="absolute left-1/2 top-1/2 block max-w-none"
          style={{
            transform: `translate(-50%, -50%) rotate(${((Number(rotation) || 0) % 360 + 360) % 360}deg)`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}
