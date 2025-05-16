import { AST, LineID, new_line_id, Location } from "./ast.js";
import { get_nodes } from "./lib.js";
import createLine, { Line } from "./line.js"; // Component for a line
import MenuBar from "./menu_bar.js";
import BlockBank from "./block_bank/block_bank.js";
import { Execution, createExecution } from "./execute.js";

export type Mode = "text" | "block";

const DEFAULTS = { margin_width: 40 };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #editor-container {
      box-sizing: border-box;
      display: flex;
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      height: 300px;
      margin: 0 20px;
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
    .executing {
      background-color: #fff3cd;
      border: 1px solid #ffeeba;
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
  const blockBank = BlockBank();
  frag.append(blockBank);
  const menuBar = MenuBar();
  frag.prepend(menuBar.frag);
  const runBtn = menuBar.runBtn;
  const stepOverBtn = menuBar.stepOverBtn;
  const stepIntoBtn = menuBar.stepIntoBtn;
  const stepOutBtn = menuBar.stepOutBtn;
  const stopBtn = menuBar.stopBtn;
  const transitionBtn = menuBar.transitionBtn;
  const stackVisualization = menuBar.stackVisualization;

  /* State variables. */
  const initial_lines = ["(func", ")", "(func", ")"] as string[];
  let lines: Line[] = [];
  let ast: { inner: AST | null } = { inner: null };
  let isRunning: boolean = false;
  let mode: Mode = "text";
  let currentExecution: Execution | null = null;

  /* State update functions */
  function updateRunningState(running: boolean) {
    isRunning = running;
    stackVisualization.classList.toggle("visible", running);

    // Disable/enable editing based on running state
    document.querySelectorAll(".line .container").forEach((container) => {
      if (running) {
        container.removeAttribute("contentEditable");
        container.removeAttribute("draggable");
        container.classList.remove("executing");
      } else if (mode === "text") {
        container.setAttribute("contentEditable", "plaintext-only");
      } else if (mode === "block") {
        container.setAttribute("draggable", "true");
      }
    });
  }

  function updateLineNumbers(): void {
    const lines = contentEditor.querySelectorAll(".line").length;
    lineNumbersContainer.innerHTML = Array.from(
      { length: lines },
      (_, i) => i + 1,
    ).join("<br>");
  }

  // TODO: make faster. could lookup by lineid
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

  function getPrevLineInAST(line: Line): Line | null {
    const index = getCurrentLineIndex(line);
    const prev_line = lines.slice(0, index).findLast((l) => l().saved_in_ast);
    if (!prev_line) return null;
    return prev_line;
  }

  function addFunction(ref: Line | null, startLine: Line): boolean {
    const loc = ref ? { after: ref().line_id } : "start";
    if (!ast.inner!.place_function(loc, [0, 0], false)) return false;
    // Add the bottom paren and middle line
    const space_line = addNewLine(false, startLine);
    const paren_line = addNewLine(false, space_line);
    paren_line({ content: ")", saved_in_ast: true });
    space_line({ focus: true });
    // Insert into AST
    ast.inner!.place_function(
      loc,
      [startLine().line_id, paren_line().line_id],
      true,
    );
    return true;
  }

  function addNewLine(focus: boolean, referenceLine?: Line) {
    const line = createLine({
      wrapper: ast as { inner: AST },
      addFunction,
      addNewLine,
      line_id: new_line_id(),
      deleteLine: handleBackspaceOnEmptyLine,
      getPrevLineInAST,
    });
    const lineDOM = line({ content: "" }).frag;
    if (referenceLine) {
      contentEditor.insertBefore(lineDOM, referenceLine().div.nextSibling);
    } else {
      contentEditor.prepend(lineDOM);
    }
    // Focus after appending to DOM (needs a bit of time to update).
    if (focus)
      requestAnimationFrame(() => {
        line({ focus: true });
      });
    // Split from start up to and including reference line, then after reference line.
    // Or, if no reference, just append to end.
    const index = referenceLine ? getCurrentLineIndex(referenceLine) + 1 : 0;
    lines = lines.slice(0, index).concat([line]).concat(lines.slice(index));
    updateLineNumbers();
    return line;
  }

  /* Initialization */
  let last_line = undefined;
  for (let i = 0; i < Math.max(10, initial_lines.length); i++) {
    last_line = addNewLine(false, last_line);
  }
  for (const [i, _] of initial_lines.entries()) {
    lines[i]({ content: initial_lines[i], saved_in_ast: true });
  }

  const dbg = <T>(v: T) => {
    console.log(v);
    return v;
  };
  let ast_r = AST.parse(
    dbg(
      lines
        .slice(0, initial_lines.length)
        .map((l) => [l().content, l().line_id]),
    ),
  );
  // TODO: handle error for ast
  // TODO: map from line id to line number
  if (ast_r.result.type == "error")
    throw new Error(ast_r.result.error + " at " + ast_r.result.line);
  ast.inner = ast_r.result.value;
  console.log(ast);

  // Seems like we need delay after page is loaded before focusing.
  requestAnimationFrame(() => {
    lines[0]({ focus: true });
  });

  // Add function to get current AST
  function getCurrentAST(): AST | null {
    return ast.inner;
  }

  // Add function to get current lines for AST parsing
  function getCurrentLines(): [string, LineID][] {
    return lines.map((l) => [l().content, l().line_id]);
  }

  /* Event listeners */

  runBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!isRunning && ast.inner) {
      console.log("Starting execution with AST:", ast);
      currentExecution = createExecution(ast.inner, stackVisualization, lines);
      if (currentExecution) {
        updateRunningState(true);
      }
    }
  });

  stopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (isRunning) {
      console.log("Stopping execution");
      currentExecution = null;
      updateRunningState(false);
      document.querySelectorAll(".line").forEach((container) => {
        container.classList.remove("executing");
      });
    }
  });

  stepOverBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (isRunning && currentExecution) {
      const hasMore = currentExecution.step();
      if (!hasMore) {
        currentExecution = null;
        updateRunningState(false);
      }
    }
  });

  return frag;
}

export default createEditor;
