import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function PdfMapCanvas({ url, className = "" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [status, setStatus] = useState("loading");

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

        const container = wrapRef.current.getBoundingClientRect();
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(container.width / baseViewport.width, container.height / baseViewport.height) || 1;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
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
  }, [url]);

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
      <canvas ref={canvasRef} className={status === "ready" ? "block max-w-full max-h-full" : "invisible"} />
    </div>
  );
}
