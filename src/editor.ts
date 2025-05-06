import { get_nodes } from "./lib.js";
import createLine, { Line } from "./line.js"; // Component for a line
import MenuBar from "./menu_bar.js";

const DEFAULTS = { margin_width: 40 };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #editor-container {
      display: flex;
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-radius: 0 0 10px 10px;
      height: 300px;
      margin: 0 20px 20px;
      overflow-y: auto;
    }
    #line-numbers {
      background: #f0f0f0;
      padding: 10px;
      text-align: right;
      user-select: none;
      line-height: 24px;
      display: block;
    }
    #content-editor {
      flex: 1;
      padding: 10px;
      outline: none;
      white-space: pre;
      line-height: 20px;
      background: white;
    }
  </style>
  <div id="editor-container">
    <!-- wrapper div allows us to get around no background in overflow -->
    <div><div id="line-numbers" style="width:${DEFAULTS.margin_width}px;"></div></div>
    <div id="content-editor" style="left:${DEFAULTS.margin_width}px;"></div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function createEditor() {
  /* DOM variables */
  const frag = cloneTemplate();
  const nodes = get_nodes(frag, [
    "line-numbers",
    "content-editor",
    "name",
  ] as const);
  const lineNumbersContainer = nodes["line-numbers"] as HTMLDivElement;
  const contentEditor = nodes["content-editor"] as HTMLDivElement;
  const menuBar = MenuBar();
  frag.prepend(menuBar);

  /* State variables. */
  let lines: Line[] = [];

  function updateLineNumbers(): void {
    const lines = contentEditor.querySelectorAll(".line").length;
    lineNumbersContainer.innerHTML = Array.from(
      { length: lines },
      (_, i) => i + 1,
    ).join("<br>");
  }

  function getCurrentLineIndex(reference: Line) {
    return lines.findIndex((l) => l == reference);
  }

  function handleBackspaceOnEmptyLine(line: Line) {
    const prevLine = line().div.previousElementSibling as HTMLDivElement;
    if (!prevLine) return;
    if (prevLine.textContent) {
      prevLine.textContent += line().div.textContent;
    }

    const index = getCurrentLineIndex(line);
    // Always makes sure at least one line.
    if (index <= 0) return;
    const prev_index = index - 1;
    line().div.remove();
    lines.splice(index, 1);
    lines[prev_index]({ focus: true });

    updateLineNumbers();
  }

  function addNewLine(referenceLine?: Line) {
    const line = createLine({
      addNewLine,
      deleteLine: handleBackspaceOnEmptyLine,
    });
    const lineDOM = line({ content: "" }).frag;
    if (referenceLine) {
      contentEditor.insertBefore(lineDOM, referenceLine().div.nextSibling);
    } else {
      contentEditor.appendChild(lineDOM);
    }
    // Focus after appending to DOM (needs a bit of time to update).
    requestAnimationFrame(() => {
      line({ focus: true });
    });
    // Split from start up to and including reference line, then after reference line.
    // Or, if no reference, just append to end.
    const index = referenceLine
      ? getCurrentLineIndex(referenceLine) + 1
      : lines.length;
    lines = lines.slice(0, index).concat([line]).concat(lines.slice(index));
    updateLineNumbers();
  }

  /* Initialization */
  for (let i = 0; i < 10; i++) {
    addNewLine();
  }
  // Seems like we need delay after page is loaded before focusing.
  requestAnimationFrame(() => {
    lines[0]({ focus: true });
  });

  return frag;
}

export default createEditor;
