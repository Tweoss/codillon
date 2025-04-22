import { get_nodes } from "./lib.js";
import createLineNumber from "./line_number.js";
import createLine, { Line } from "./line.js"; // Component for a line

const DEFAULTS = { margin_width: 62 };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #editor-container {
      display: flex;
      border: 1px solid #ccc;
      font-family: monospace;
      height: 300px;
      margin: 20px;
      overflow: hidden;
    }
    #line-numbers {
      background: #f0f0f0;
      padding: 10px;
      text-align: right;
      user-select: none;
      line-height: 1.2em;
      overflow-y: hidden;
      display: block;
    }
    #content-editor {
      flex: 1;
      padding: 10px;
      outline: none;
      overflow-y: auto;
      white-space: pre;
      line-height: 1.2em;
      background: white;
    }
    .line {
      min-height: 1.2em;
    }
  </style>
  <div>Helloo <span id="name">world</span>!</div>
  <div id="editor-container">
    <div id="line-numbers" style="width:${DEFAULTS.margin_width}px;"></div>
    <div id="content-editor" style="left:${DEFAULTS.margin_width}px;"></div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function createEditor() {
  const frag = cloneTemplate();
  const nodes = get_nodes(frag, [
    "line-numbers",
    "content-editor",
    "name",
  ] as const);
  const lineNumbersContainer = nodes["line-numbers"] as HTMLDivElement;
  const contentEditor = nodes["content-editor"] as HTMLDivElement;

  /* State variables. */
  let lines: Line[] = [];

  function updateLineNumbers(): void {
    const lines = contentEditor.querySelectorAll(".line").length;
    lineNumbersContainer.innerHTML = Array.from(
      { length: lines },
      (_, i) => i + 1,
    ).join("<br>");
  }

  async function handleBackspaceOnEmptyLine(line: Line): Promise<void> {
    const prevLine = line().div.previousElementSibling as HTMLDivElement;
    if (!prevLine) return;
    if (prevLine.textContent) {
      prevLine.textContent += line().div.textContent;
    }
    // Always make sure at least one line.
    if (lines.length > 1) {
      line().div.remove();
      const index = lines.findIndex((l) => l == line);
      const next_index = index - 1 < 0 ? 0 : index - 1;
      if (next_index < lines.length) {
        // Refocus on the previous line.
        lines[next_index]({ focus: true });
      }
      lines.splice(index, 1);
      updateLineNumbers();
    }
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
    // Focus after appending to DOM.
    line({ focus: true });
    lines.push(line);
    updateLineNumbers();
  }

  contentEditor.addEventListener("scroll", () => {
    lineNumbersContainer.scrollTop = contentEditor.scrollTop;
  });
  contentEditor.focus();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (
            node.parentElement &&
            !node.parentElement.classList.contains("line")
          ) {
            const line = node.parentElement.closest(".line");
            if (line) {
              line.appendChild(node);
            }
          }
        }
      }
    }
  }).observe(contentEditor, { childList: true, subtree: true });

  if (lines.length == 0) {
    addNewLine();
  }
  updateLineNumbers();
  return frag;
}

export default createEditor;
