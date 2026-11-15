import { useEffect, useRef, useState } from "react";
import { MATH_SURFACE_HTML } from "../../generated/math-surface";
import { SURFACE_MIN_HEIGHT, type MathSurfaceProps, type SurfaceMessage } from "./MathSurface.types";
export function MathSurface({ config, onMessage }: MathSurfaceProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ config, onMessage });
  latest.current = { config, onMessage };
  const [height, setHeight] = useState<number>(SURFACE_MIN_HEIGHT[config.mode]);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || typeof event.data !== "string") return;
      try {
        const message: SurfaceMessage = JSON.parse(event.data);
        if (message.type === "ready")
          ref.current?.contentWindow?.postMessage({ type: "configure", config: latest.current.config }, "*");
        if (message.type === "height") setHeight(Math.min(1000, Math.max(40, message.height + 20)));
        latest.current.onMessage?.(message);
      } catch {
        /* Ignore unrelated frames. */
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: "configure", config }, "*");
  }, [config]);
  return (
    <iframe
      title={
        config.mode === "render"
          ? "Mathematical content"
          : config.mode === "draw"
            ? "Handwriting canvas"
            : "Math editor"
      }
      ref={ref}
      onLoad={() => ref.current?.contentWindow?.postMessage({ type: "configure", config: latest.current.config }, "*")}
      srcDoc={MATH_SURFACE_HTML}
      sandbox="allow-scripts"
      style={{
        width: "100%",
        height: Math.max(SURFACE_MIN_HEIGHT[config.mode], height),
        border: 0,
        background: "transparent",
      }}
    />
  );
}
