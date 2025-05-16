import { get_nodes } from "./lib.js";
import { setAsBlock, setAsText } from "./block.js";
import { AST } from "./ast.js";
import { globalStates } from "./global_variables.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #menu-bar {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #eee;
      margin: 20px 20px 0;
      border-radius: 10px 10px 0 0;
      border: 1px solid var(--border-color);
      border-bottom: 0;
    }
    #menu-bar .right-buttons button {
      width: 100px;
      margin-right: 0;
    }
    #stack-visualization {
      display: none;
      position: absolute;
      right: 20px;
      top: 100px;
      width: 200px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 10px;
      font-family: monospace;
    }
    #stack-visualization.visible {
      display: block;
    }
    .stack-item {
      padding: 5px;
      border-bottom: 1px solid #eee;
    }
    .stack-item:last-child {
      border-bottom: none;
    }
  </style>
  <div id="menu-bar" class="container">
    <div class="left-buttons">
      <button id="run-btn" class="button press-effect">Run</button>
      <button id="step-over-btn" class="button press-effect">Step Over</button>
      <button id="step-into-btn" class="button press-effect">Step Into</button>
      <button id="step-out-btn" class="button press-effect">Step Out</button>
      <button id="stop-btn" class="button press-effect">Stop</button>
    </div>
    <div class="right-buttons">
      <button id="transition-btn" class="button press-effect">show block</button>
    </div>
  </div>
  <div id="stack-visualization">
    <h3>Execution Stack</h3>
    <div id="stack-items"></div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  const frag = cloneTemplate();
  const nodes = get_nodes(frag, [
    "run-btn",
    "step-over-btn",
    "step-into-btn",
    "step-out-btn",
    "transition-btn",
    "stop-btn",
  ] as const);
  const menuBar = frag.querySelector("#menu-bar") as HTMLDivElement;
  const runBtn = nodes["run-btn"] as HTMLButtonElement;
  const stepOverBtn = nodes["step-over-btn"] as HTMLButtonElement;
  const stepIntoBtn = nodes["step-into-btn"] as HTMLButtonElement;
  const stepOutBtn = nodes["step-out-btn"] as HTMLButtonElement;
  const stopBtn = nodes["stop-btn"] as HTMLButtonElement;
  const transitionBtn = nodes["transition-btn"] as HTMLButtonElement;
  const stackVisualization = frag.querySelector(
    "#stack-visualization",
  ) as HTMLDivElement;
  const stackItems = frag.querySelector("#stack-items") as HTMLDivElement;

  /* State variables. */

  /* DOM update functions */

  /* State update functions */
  function convertToBlock() {
    document.querySelectorAll(".line .block-container").forEach((block) => {
      block.removeAttribute("contentEditable");
      if (!block.classList.contains("empty")) {
        setAsBlock(block as HTMLDivElement);
      }
      if (globalStates.isRunning) {
        block.removeAttribute("draggeable");
      }
    });
    transitionBtn.textContent = `show ${globalStates.mode}`;
    globalStates.mode = "block";
    document.querySelector("#block-bank")?.classList.remove("hidden");
  }

  function convertToText() {
    document.querySelectorAll(".line .block-container").forEach((container) => {
      setAsText(container as HTMLDivElement);
      if (globalStates.isRunning) {
        container.removeAttribute("contentEditable");
      }
    });
    transitionBtn.textContent = `show ${globalStates.mode}`;
    globalStates.mode = "text";
    document.querySelector("#block-bank")?.classList.add("hidden");
  }
  /* State logic */
  /* Event dispatchers */
  /* Event listeners */
  transitionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    globalStates.mode === "text" ? convertToBlock() : convertToText();
  });

  return {
    frag,
    runBtn,
    stepOverBtn,
    stepIntoBtn,
    stepOutBtn,
    stopBtn,
    transitionBtn,
    stackVisualization,
  };
}

export default init;
export type MenuBar = ReturnType<typeof init>;
