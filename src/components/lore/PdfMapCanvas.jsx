import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function PdfMapCanvas({ url, rotation = 0, className = "" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [renderSize, setRenderSize] = useState({ canvasWidth: 0, canvasHeight: 0 });
  const normalizedRotation = useMemo(() => ((Number(rotation) || 0) % 360 + 360) % 360, [rotation]);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;
    let renderRun = 0;

    const renderPdf = async () => {
      if (!url || !canvasRef.current || !wrapRef.current) return;
      const currentRun = ++renderRun;
      renderTask?.cancel?.();
      renderTask = null;
      setStatus("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const pdf = await pdfjs.getDocument(url).promise;
        const page = await pdf.getPage(1);
        if (cancelled || currentRun !== renderRun) return;

        const container = wrapRef.current.getBoundingClientRect();
        if (container.width < 2 || container.height < 2) return;
        const pageRotation = ((page.rotate || 0) + normalizedRotation) % 360;
        const baseViewport = page.getViewport({ scale: 1, rotation: pageRotation });
        const scale = Math.min(container.width / baseViewport.width, container.height / baseViewport.height) || 1;
        const viewport = page.getViewport({ scale, rotation: pageRotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const ratio = window.devicePixelRatio || 1;
        const canvasWidth = viewport.width;
        const canvasHeight = viewport.height;

        setRenderSize({ canvasWidth, canvasHeight });
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
        if (!cancelled && currentRun === renderRun) setStatus("ready");
      } catch (error) {
        if (!cancelled && error?.name !== "RenderingCancelledException") setStatus("error");
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
  }, [url, normalizedRotation]);

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
        style={{ width: `${renderSize.canvasWidth}px`, height: `${renderSize.canvasHeight}px` }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block max-w-none"
        />
      </div>
    </div>
  );
}
