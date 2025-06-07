import { get_nodes } from "./lib.js";
import { setAsBlock, setAsText } from "./block.js";
import { AST } from "./ast.js";
import { globalStates } from "./global_variables.js";
import { downloadWatFile, createFileInput } from "./file_operations.js";

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
    #menu-bar .left-buttons,
    #menu-bar .center-buttons,
    #menu-bar .right-buttons {
      display: flex;
      gap: 10px;
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
      width: 240px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 16px 12px 12px 12px;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      z-index: 1;
      max-height: 600px;
      overflow: auto;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1.5px 4px rgba(0,0,0,0.04);
    }
    #stack-visualization.visible {
      display: block;
    }
    #stack-visualization h3 {
      margin: 0 0 12px 0;
      font-size: 1.1em;
      color: #444;
      letter-spacing: 0.03em;
      font-weight: 600;
    }
    .file-buttons {
      display: flex;
      gap: 10px;
    }
    
    /* Execution control buttons styling */
    .left-buttons button {
      background: #e3f2fd;
      border-color: #1976d2;
      color: #1976d2;
      font-weight: 500;
    }
    
    .left-buttons button:hover {
      background: #bbdefb;
    }
    
    .left-buttons button:active {
      background: #90caf9;
    }
    
    /* Stop button special styling */
    #stop-btn {
      background: #ffebee !important;
      border-color: #d32f2f !important;
      color: #d32f2f !important;
    }
    
    #stop-btn:hover {
      background: #ffcdd2 !important;
    }
    
    #stop-btn:active {
      background: #ef9a9a !important;
    }
    
    /* Add emojis to execution buttons */
    #run-btn::before {
      content: "▶️ ";
    }
    
    #step-over-btn::before {
      content: "⏭️ ";
    }
    
    #step-into-btn::before {
      content: "⬇️ ";
    }
    
    #step-out-btn::before {
      content: "⬆️ ";
    }
    
    #stop-btn::before {
      content: "⏹️ ";
    }
  .stack-item {
    background: #f7f9fa;
    margin-bottom: 8px;
    padding: 10px 2px;
    border-radius: 6px;
    border: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    font-size: 1em;
    color: #222;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .stack-item:last-child {
    margin-bottom: 0;
  }
  .stack-item:hover {
    background: #eaf3fb;
  }
  </style>
  <div id="menu-bar" class="container">
    <div class="left-buttons">
      <button id="run-btn" class="button press-effect">Run</button>
      <button id="step-over-btn" class="button press-effect">Step Over</button>
      <button id="step-into-btn" class="button press-effect">Step Into</button>
      <button id="step-out-btn" class="button press-effect">Step Out</button>
      <button id="stop-btn" class="button press-effect">Stop</button>
      <button id="run-fast-btn" class="button press-effect">Run Fast</button>
    </div>
    <div class="center-buttons file-buttons">
      <button id="upload-btn" class="button press-effect">Upload .wat</button>
      <button id="download-btn" class="button press-effect">Download .wat</button>
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
    "upload-btn",
    "download-btn",
    "run-fast-btn",
  ] as const);
  const menuBar = frag.querySelector("#menu-bar") as HTMLDivElement;
  const runBtn = nodes["run-btn"] as HTMLButtonElement;
  const stepOverBtn = nodes["step-over-btn"] as HTMLButtonElement;
  const stepIntoBtn = nodes["step-into-btn"] as HTMLButtonElement;
  const stepOutBtn = nodes["step-out-btn"] as HTMLButtonElement;
  const stopBtn = nodes["stop-btn"] as HTMLButtonElement;
  const runFastBtn = nodes["run-fast-btn"] as HTMLButtonElement;
  const transitionBtn = nodes["transition-btn"] as HTMLButtonElement;
  const uploadBtn = nodes["upload-btn"] as HTMLButtonElement;
  const downloadBtn = nodes["download-btn"] as HTMLButtonElement;
  const stackVisualization = frag.querySelector(
    "#stack-visualization",
  ) as HTMLDivElement;
  const stackItems = frag.querySelector("#stack-items") as HTMLDivElement;

  /* State variables. */
  let onFileUpload: ((content: string) => void) | null = null;
  let getEditorContent: (() => string[]) | null = null;

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

  /* Create file input element */
  const fileInput = createFileInput((content, filename) => {
    if (onFileUpload) {
      onFileUpload(content);
    }
  });
  menuBar.appendChild(fileInput);

  /* State logic */
  /* Event dispatchers */
  /* Event listeners */
  transitionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    globalStates.mode === "text" ? convertToBlock() : convertToText();
  });

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!globalStates.isRunning) {
      fileInput.click();
    }
  });

  downloadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (getEditorContent) {
      const content = getEditorContent();
      downloadWatFile(content);
    }
  });

  /* Public API */
  function setFileHandlers(
    uploadHandler: (content: string) => void,
    contentGetter: () => string[],
  ) {
    onFileUpload = uploadHandler;
    getEditorContent = contentGetter;
  }

  return {
    frag,
    runBtn,
    stepOverBtn,
    stepIntoBtn,
    stepOutBtn,
    stopBtn,
    runFastBtn,
    transitionBtn,
    stackVisualization,
    setFileHandlers,
  };
}

export default init;
export type MenuBar = ReturnType<typeof init>;
