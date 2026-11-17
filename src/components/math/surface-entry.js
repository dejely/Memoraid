import { inkBounds } from "../../features/practice/ink";
import {
  MathfieldElement,
  convertLatexToMarkup,
  initVirtualKeyboardInCurrentBrowsingContext,
} from "mathlive";
// Sandboxed frames have an opaque origin; keep the keyboard inside this frame.
if (window !== window.top) {
  delete window.mathVirtualKeyboard;
  initVirtualKeyboardInCurrentBrowsingContext();
}
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;
let config = {},
  field,
  strokes = [],
  active,
  revision = 0,
  erase = false;
const root = document.getElementById("root");
const send = (value) => {
  const message = JSON.stringify(value);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
  else window.parent.postMessage(message, "*");
};
function changed() {
  revision++;
  send({
    type: "inkChanged",
    revision,
    ink: { width: 1000, height: 400, strokes },
  });
}
function redraw(
  canvas,
  visibleStrokes = strokes,
  paper = config.palette?.input || "#fff",
  ink = config.palette?.foreground || "#172136",
) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  for (const stroke of visibleStrokes) {
    ctx.beginPath();
    stroke.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (stroke.length === 1) ctx.lineTo(stroke[0][0] + 0.1, stroke[0][1]);
    ctx.stroke();
  }
}
function renderText(value) {
  const target = document.createElement("div");
  target.id = "render";
  const regex = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  for (const part of value.split(regex)) {
    if (part.startsWith("\\(") || part.startsWith("\\[")) {
      const span = document.createElement("span");
      span.className = part.startsWith("\\[") ? "block" : "";
      try {
        span.innerHTML = convertLatexToMarkup(part.slice(2, -2));
      } catch {
        span.textContent = part;
      }
      target.append(span);
    } else target.append(document.createTextNode(part));
  }
  root.replaceChildren(target);
}
function setup(next) {
  const reset = config.mode !== next.mode;
  config = next;
  document.body.style.color = next.color || "#172136";
  document.documentElement.style.colorScheme = next.colorScheme || "light";
  const background =
    next.mode === "render" ? "transparent" : next.palette?.card || "#fff";
  document.documentElement.style.backgroundColor = background;
  document.body.style.backgroundColor = background;
  if (next.palette) {
    for (const [key, value] of Object.entries(next.palette))
      document.documentElement.style.setProperty("--surface-" + key, value);
    const p = next.palette,
      rootStyle = document.documentElement.style;
    for (const [key, value] of Object.entries({
      "--keyboard-background": p.card,
      "--keyboard-toolbar-background": p.card,
      "--keyboard-toolbar-background-hover": p.muted,
      "--keyboard-toolbar-background-selected": p.muted,
      "--keyboard-toolbar-text": p.mutedForeground,
      "--keyboard-toolbar-text-active": p.foreground,
      "--keyboard-border": p.border,
      "--keyboard-horizontal-rule": p.border,
      "--keyboard-accent-color": p.primary,
      "--keycap-border": p.border,
      "--keycap-border-bottom": p.border,
      "--keycap-secondary-background": p.secondary,
      "--keycap-secondary-text": p.secondaryForeground,
      "--keycap-background": p.muted,
      "--keycap-background-hover": p.secondary,
      "--keycap-background-pressed": p.primary,
      "--keycap-text": p.foreground,
      "--keycap-text-active": p.primaryForeground,
      "--keycap-primary-background": p.primary,
      "--keycap-primary-text": p.primaryForeground,
      "--caret-color": p.foreground,
      "--selection-background-color": p.secondary,
    }))
      rootStyle.setProperty(key, value);
  }
  if (next.mode === "render") {
    renderText(next.value || "");
    return;
  }
  if (next.mode === "editor") {
    if (reset || !field) {
      root.replaceChildren();
      field = new MathfieldElement();
      field.mathVirtualKeyboardPolicy = "manual";
      const keyboard = document.createElement("div");
      keyboard.id = "keyboard";
      root.append(field, keyboard);
      window.mathVirtualKeyboard.container = keyboard;
      window.mathVirtualKeyboard.layouts = [
        {
          label: "Basic",
          rows: [
            ["7", "8", "9", "+", "-"],
            ["4", "5", "6", "\\times", "\\frac{#0}{#?}"],
            ["1", "2", "3", "\\sqrt{#0}", "#@^{#?}"],
            ["0", ".", "=", "(", ")"],
            ["[left]", "[right]", "[backspace]", "[undo]", "[redo]"],
          ],
        },
        {
          label: "Statistics",
          rows: [
            ["\\mu", "\\sigma", "\\sigma^2", "\\bar{x}", "\\hat{p}"],
            ["\\sum_{i=1}^{n}{#0}", "n!", "\\binom{n}{k}", "\\pm", "\\le"],
            [
              "\\frac{\\bar{x}-\\mu}{\\sigma/\\sqrt{n}}",
              "\\bar{x}\\pm z\\frac{\\sigma}{\\sqrt{n}}",
              "\\frac{\\sum_{i=1}^{n}x_i}{n}",
              "\\sqrt{\\frac{\\sum_{i=1}^{n}(x_i-\\bar{x})^2}{n-1}}",
            ],
            ["[left]", "[right]", "[backspace]", "[undo]"],
          ],
        },
        {
          label: "Probability",
          rows: [
            ["P(A)", "P(A\\mid B)", "\\cap", "\\cup", "\\emptyset"],
            ["\\alpha", "\\beta", "\\theta", "\\in", "\\ge"],
            ["[left]", "[right]", "[backspace]", "[undo]"],
          ],
        },
      ];
      field.addEventListener("focusin", () => {
        if (!config.locked) window.mathVirtualKeyboard.show();
      });
      field.addEventListener("input", () =>
        send({ type: "change", value: field.value }),
      );
    }
    if (field.value !== next.value) field.value = next.value || "";
    field.style.background = next.palette?.input || "#fff";
    field.style.color = next.color || "#172136";
    field.style.borderColor = next.palette?.border || "#a7b8d7";
    field.readOnly = !!next.locked;
    if (next.locked) window.mathVirtualKeyboard.hide();
    return;
  }
  if (reset) {
    field = null;
    window.mathVirtualKeyboard.hide();
    strokes = structuredClone(next.ink?.strokes || strokes);
    root.replaceChildren();
    const tools = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 400;
    function button(label, fn) {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = fn;
      tools.append(b);
      return b;
    }
    button("Replay", async () => {
      if (active || config.busy) return;
      const saved = structuredClone(strokes),
        shown = [];
      const replayRevision = revision;
      redraw(canvas, shown);
      for (const stroke of saved) {
        const part = [];
        shown.push(part);
        for (let i = 0; i < stroke.length; i++) {
          if (revision !== replayRevision || config.mode !== "draw") return;
          part.push(stroke[i]);
          redraw(canvas, shown);
          await new Promise((r) =>
            setTimeout(
              r,
              Math.min(
                60,
                Math.max(
                  1,
                  (stroke[i + 1]?.[2] || stroke[i][2]) - stroke[i][2],
                ),
              ),
            ),
          );
        }
      }
      if (revision === replayRevision) redraw(canvas);
    });
    button("Undo", () => {
      if (config.locked) return;
      strokes.pop();
      changed();
      redraw(canvas);
    });
    const eraser = button("Erase: off", () => {
      erase = !erase;
      eraser.textContent = "Erase: " + (erase ? "on" : "off");
    });
    button("Clear", () => {
      if (config.locked) return;
      strokes = [];
      changed();
      redraw(canvas);
    });
    const recognize = button("Recognize", () => {
      if (config.locked || config.busy || !strokes.length) return;
      const started = performance.now();
      const bounds = inkBounds({
        width: canvas.width,
        height: canvas.height,
        strokes,
      });
      if (!bounds) return;
      const crop = document.createElement("canvas");
      crop.width = bounds.width;
      crop.height = bounds.height;
      const source = document.createElement("canvas");
      source.width = canvas.width;
      source.height = canvas.height;
      // Provider images stay dark ink on white, independently of the display theme.
      redraw(source, strokes, "#fff", "#172136");
      crop
        .getContext("2d")
        .drawImage(
          source,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          0,
          0,
          bounds.width,
          bounds.height,
        );
      send({
        type: "recognize",
        image: crop.toDataURL("image/png"),
        revision,
        preparationMs: performance.now() - started,
      });
    });
    recognize.id = "recognize";
    const status = document.createElement("div");
    status.id = "status";
    status.textContent =
      "Write one expression. Pen-only ignores fingers and palms.";
    let penOnly = false;
    const penButton = button("Pen-only: off", () => {
      penOnly = !penOnly;
      penButton.textContent = "Pen-only: " + (penOnly ? "on" : "off");
    });
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return [
        ((event.clientX - rect.left) * canvas.width) / rect.width,
        ((event.clientY - rect.top) * canvas.height) / rect.height,
        Date.now(),
        event.pressure,
      ];
    };
    canvas.onpointerdown = (e) => {
      if (config.locked || active || (penOnly && e.pointerType !== "pen"))
        return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      active = { id: e.pointerId, points: [] };
      if (!erase) strokes.push(active.points);
      move(e);
    };
    function move(e) {
      if (!active || active.id !== e.pointerId) return;
      const p = point(e);
      if (erase)
        strokes = strokes.filter(
          (stroke) =>
            !stroke.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 25),
        );
      else active.points.push(p);
      changed();
      redraw(canvas);
    }
    canvas.onpointermove = move;
    canvas.onpointerup = canvas.onpointercancel = (e) => {
      if (active?.id === e.pointerId) active = null;
    };
    root.append(tools, canvas, status);
    redraw(canvas);
  }
  const visibleCanvas = root.querySelector("canvas");
  if (visibleCanvas) redraw(visibleCanvas);
  const recognize = document.getElementById("recognize");
  if (recognize) {
    recognize.disabled = !!next.busy || !!next.locked;
    recognize.textContent = next.busy ? "Waiting for provider…" : "Recognize";
  }
}
function configure(next) {
  setup(next);
  send({ type: "configured" });
}
window.memoraidConfigure = configure;
window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  try {
    const value =
      typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    if (value.type === "configure") configure(value.config);
  } catch {
    /* Ignore unrelated messages. */
  }
});
new ResizeObserver(() =>
  send({ type: "height", height: document.body.scrollHeight }),
).observe(root);
send({ type: "ready" });
