import { useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { MATH_SURFACE_HTML } from "../../generated/math-surface";
import { SURFACE_MIN_HEIGHT, type MathSurfaceProps, type SurfaceMessage } from "./MathSurface.types";
const source = { html: MATH_SURFACE_HTML };
export function MathSurface({ config, onMessage }: MathSurfaceProps) {
  const ref = useRef<WebView>(null);
  const [height, setHeight] = useState<number>(SURFACE_MIN_HEIGHT[config.mode]);
  function configure() {
    ref.current?.injectJavaScript(`window.memoraidConfigure(${JSON.stringify(config).replace(/</g, "\\u003c")});true;`);
  }
  useEffect(configure, [config]);
  return (
    <WebView
      ref={ref}
      source={source}
      originWhitelist={["about:*"]}
      scrollEnabled={false}
      style={{ height: Math.max(SURFACE_MIN_HEIGHT[config.mode], height), flex: 0, backgroundColor: "transparent" }}
      onShouldStartLoadWithRequest={(request) =>
        request.url === "about:blank" || request.url.startsWith("about:blank#")
      }
      onMessage={(event) => {
        try {
          const message: SurfaceMessage = JSON.parse(event.nativeEvent.data);
          if (message.type === "ready") configure();
          if (message.type === "height") setHeight(Math.min(1000, Math.max(40, message.height + 20)));
          onMessage?.(message);
        } catch {
          /* Ignore invalid bridge messages. */
        }
      }}
    />
  );
}
