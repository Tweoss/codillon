import { get_nodes } from "./lib.js";

type Mode = "text" | "block";

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
    }
    #menu-bar .right-buttons button {
      width: 100px;
      margin-right: 0;
    }
  </style>
  <div id="menu-bar" class="container">
    <div class="left-buttons">
      <button id="run-btn" class="button press-effect">Run</button>
      <button id="step-over-button" class="button press-effect">Step Over</button>
      <button id="step-into-button" class="button press-effect">Step Into</button>
      <button id="step-out-button" class="button press-effect">Step Out</button>
    </div>
    <div class="right-buttons">
      <button id="transition-btn" class="button press-effect"></button>
    </div>
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
  ] as const);
  const menuBar = frag.querySelector("#menu-bar") as HTMLDivElement;
  const runBtn = nodes["run-btn"] as HTMLButtonElement;
  const stepOverBtn = nodes["step-over-btn"] as HTMLButtonElement;
  const stepIntoBtn = nodes["step-into-btn"] as HTMLButtonElement;
  const stepOutBtn = nodes["step-out-btn"] as HTMLButtonElement;
  const transitionBtn = nodes["transition-btn"] as HTMLButtonElement;

  /* State variables. */
  let mode: Mode = "text";
  /* DOM update functions */
  /* State update functions */
  transitionBtn.textContent = `show ${mode}`;
  function convertToBlock() {
    document.querySelectorAll(".line .container").forEach((container) => {
      container.removeAttribute("contentEditable");
      if (!container.classList.contains("empty")) {
        container.classList.add("block");
        container.setAttribute("draggable", "true");
      }
    });
    mode = "block";
    transitionBtn.textContent = `show ${mode}`;
  }
  function convertToText() {
    document.querySelectorAll(".line .container").forEach((container) => {
      container.setAttribute("contentEditable", "plaintext-only");
      container.removeAttribute("draggable");
      container.classList.remove("block");
    });
    mode = "text";
    transitionBtn.textContent = `show ${mode}`;
  }
  /* State logic */
  /* Event dispatchers */
  /* Event listeners */
  transitionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    mode === "text" ? convertToBlock() : convertToText();
  });

  return frag;
}

export default init;
export type MenuBar = ReturnType<typeof init>;
