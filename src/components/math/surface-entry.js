import { MathfieldElement, convertLatexToMarkup, initVirtualKeyboardInCurrentBrowsingContext } from "mathlive";
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
  send({ type: "inkChanged", revision });
}
function redraw(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#172136";
  for (const stroke of strokes) {
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
      field.addEventListener("input", () => send({ type: "change", value: field.value }));
    }
    if (field.value !== next.value) field.value = next.value || "";
    field.readOnly = !!next.locked;
    if (next.locked) window.mathVirtualKeyboard.hide();
    return;
  }
  if (reset) {
    field = null;
    window.mathVirtualKeyboard.hide();
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
      send({ type: "recognize", image: canvas.toDataURL("image/png"), revision });
    });
    recognize.id = "recognize";
    const status = document.createElement("div");
    status.id = "status";
    status.textContent = "Write one expression. Pen-only ignores fingers and palms.";
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
      ];
    };
    canvas.onpointerdown = (e) => {
      if (config.locked || active || (penOnly && e.pointerType !== "pen")) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      active = { id: e.pointerId, points: [] };
      if (!erase) strokes.push(active.points);
      move(e);
    };
    function move(e) {
      if (!active || active.id !== e.pointerId) return;
      const p = point(e);
      if (erase) strokes = strokes.filter((stroke) => !stroke.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 25));
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
  const recognize = document.getElementById("recognize");
  if (recognize) {
    recognize.disabled = !!next.busy || !!next.locked;
    recognize.textContent = next.busy ? "Recognizing…" : "Recognize";
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
    const value = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    if (value.type === "configure") configure(value.config);
  } catch {
    /* Ignore unrelated messages. */
  }
});
new ResizeObserver(() => send({ type: "height", height: document.body.scrollHeight })).observe(root);
send({ type: "ready" });
