import {
  AST,
  new_line_id,
  get_cur_line_id,
  Location,
  ControlFlowInstruction,
  Instruction,
} from "./ast.js";
import { get_nodes } from "./lib.js";
import createLine, { Line } from "./line.js"; // Component for a line
import MenuBar from "./menu_bar.js";
import BlockBank from "./block_bank/block_bank.js";
import { Execution, createExecution } from "./execute.js";
import { LineID, globalStates } from "./global_variables.js";
import { parseWatContent } from "./file_operations.js";
import { applySyntaxHighlighting } from "./block.js";
import {
  controlStartTypes,
  ControlStartTypes,
  InstructionName,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
  labelIndexInstructions,
  funcIndexInstructions,
  typeIndexInstructions,
  localIndexInstructions,
  globalIndexInstructions,
} from "./syntax.constants.js";
import Canvas, { stackToPoints } from "./canvas.js";

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
  const canvas = Canvas();
  frag.append(canvas.frag);
  const menuBar = MenuBar();
  frag.prepend(menuBar.frag);
  const runBtn = menuBar.runBtn;
  const stepOverBtn = menuBar.stepOverBtn;
  const stepIntoBtn = menuBar.stepIntoBtn;
  const stepOutBtn = menuBar.stepOutBtn;
  const stopBtn = menuBar.stopBtn;
  const runFastBtn = menuBar.runFastBtn;
  const transitionBtn = menuBar.transitionBtn;
  const stackVisualization = menuBar.stackVisualization;

  /* State variables. */
  const initial_lines = [
    "(func",
    "call $clear",
    "local $n_iter i32",
    "i32.const 100",
    "local.set $n_iter",
    "local $x f32",
    "local $y f32",
    "local $d f32",
    "local $i i32",
    "f32.const 1.0",
    "local.set $x",
    "f32.const 0.0",
    "local.set $y",
    "f32.const 3.141592653589793",
    "f32.const 2",
    "f32.mul",
    "local.get $n_iter",
    "f32.convert_i32_s",
    "f32.div",
    "local.set $d",
    "i32.const 0",
    "local.set $i",
    "loop $circle",
    "local.get $x",
    "local.get $y",
    "call $draw",
    "local.get $x",
    "local.get $y",
    "local.get $d",
    "f32.mul",
    "f32.add",
    "local.set $x",
    "local.get $y",
    "local.get $x",
    "local.get $d",
    "f32.mul",
    "f32.sub",
    "local.set $y",
    "local.get $i",
    "i32.const 1",
    "i32.add",
    "local.set $i",
    "local.get $i",
    "local.get $n_iter",
    "i32.lt_s",
    "br_if $circle",
    "end",
    ")",
    "(func",
    "",
    ")",
  ] as string[];
  let lines: Line[] = [];
  let ast: { inner: AST | null } = { inner: null };
  let currentExecution: Execution | null = null;

  /* State update functions */
  function updateRunningState(running: boolean) {
    globalStates.isRunning = running;
    stackVisualization.classList.toggle("visible", running);

    // Disable/enable editing based on running state
    document.querySelectorAll(".line .block-container").forEach((container) => {
      if (running) {
        container.removeAttribute("contentEditable");
        container.removeAttribute("draggable");
        container.classList.remove("executing");
      } else if (globalStates.mode === "text") {
        container.setAttribute("contentEditable", "plaintext-only");
      } else if (globalStates.mode === "block") {
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

  function getCurrentLineIndex(reference: Line) {
    return globalStates.lineIdToIndex.get(reference().line_id) as number;
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
    mapLineIdToIndex();
    updateLineNumbers();
  }

  function getPrevLineInAST(line: Line): Line | null {
    const index = getCurrentLineIndex(line);
    const prev_line = lines.slice(0, index).findLast((l) => l().saved_in_ast);
    if (!prev_line) return null;
    return prev_line;
  }

  function addFunction(startLine: Line): boolean {
    if (
      !ast.inner!.place_function(
        [startLine().line_id, startLine().line_id + 2],
        false,
      )
    )
      return false;
    // Add the bottom paren and middle line
    const space_line = addNewLine(false, startLine);
    const paren_line = addNewLine(false, space_line);
    paren_line({ content: ")", saved_in_ast: true });
    space_line({ focus: true });
    space_line().setIndentation(startLine().indentationLevel + 1);
    // Insert into AST
    ast.inner!.place_function(
      [startLine().line_id, paren_line().line_id],
      true,
    );
    mapLineIdToIndex();
    return true;
  }

  function addControlFlow(startLine: Line): boolean {
    if (
      !ast.inner!.place_control_flow(
        [startLine().content, startLine().line_id],
        false,
      )
    )
      return false;
    ast.inner!.place_control_flow(
      [startLine().content, startLine().line_id],
      true,
    );
    const space_line = addNewLine(false, startLine);
    const paren_line = addNewLine(false, space_line);
    paren_line({ content: "end", saved_in_ast: true });
    space_line({ focus: true });
    space_line().setIndentation(startLine().indentationLevel + 1);
    paren_line().setIndentation(startLine().indentationLevel);
    return true;
  }

  function addNewLine(focus: boolean, referenceLine?: Line) {
    const line = createLine({
      wrapper: ast as { inner: AST },
      addFunction,
      addNewLine,
      addControlFlow,
      line_id: new_line_id(),
      deleteLine: handleBackspaceOnEmptyLine,
      getPrevLineInAST,
    });
    const lineDOM = line({ content: "" }).frag;
    // Split from start up to and including reference line, then after reference line.
    // Or, if no reference, just append to end.
    const index = referenceLine ? getCurrentLineIndex(referenceLine) + 1 : 0;
    lines.splice(index, 0, line);
    updateLineNumbers();
    mapLineIdToIndex();
    if (referenceLine) {
      contentEditor.insertBefore(lineDOM, referenceLine().div.nextSibling);
      const indentLevel =
        referenceLine().indentationLevel +
        ((controlStartTypes as Readonly<Array<string>>).includes(
          referenceLine().content,
        )
          ? 1
          : 0);
      line().setIndentation(indentLevel);
    } else {
      contentEditor.prepend(lineDOM);
      line().setIndentation();
    }
    // Focus after appending to DOM (needs a bit of time to update).
    if (focus)
      requestAnimationFrame(() => {
        line({ focus: true });
      });
    return line;
  }

  function handleFileUpload(content: string) {
    if (globalStates.isRunning) {
      alert("Cannot upload file while running");
      return;
    }

    // Save current state for rollback
    const backupLines = lines.map((line) => ({
      content: line().content,
      saved_in_ast: line().saved_in_ast,
      line_id: line().line_id,
    }));
    const backupAst = ast.inner;
    const backupContentEditorHTML = contentEditor.innerHTML;

    try {
      // Parse the WAT content
      const parsedLines = parseWatContent(content);

      if (parsedLines.length === 0) {
        alert("The uploaded file appears to be empty");
        return;
      }

      // Validate each line before proceeding
      const validationErrors: string[] = [];
      for (let i = 0; i < parsedLines.length; i++) {
        const line = parsedLines[i].trim();
        if (line === "" || line === "(func" || line === ")" || line === "end") {
          continue; // These are valid as-is
        }

        // Check if it's a control flow instruction
        if ((controlStartTypes as readonly string[]).includes(line)) {
          continue;
        }

        // For other instructions, validate they have proper arguments
        const parts = line.split(" ");
        const instruction = parts[0];

        // Check if this instruction requires arguments
        if (
          [
            ...i32Instructions,
            ...i64Instructions,
            ...f32Instructions,
            ...f64Instructions,
          ].includes(instruction as any)
        ) {
          if (parts.length < 2) {
            validationErrors.push(
              `Line ${i + 1}: ${instruction} requires an argument`,
            );
          }
        } else if (
          [
            ...labelIndexInstructions,
            ...funcIndexInstructions,
            ...typeIndexInstructions,
            ...localIndexInstructions,
            ...globalIndexInstructions,
          ].includes(instruction as any)
        ) {
          if (parts.length < 2) {
            validationErrors.push(
              `Line ${i + 1}: ${instruction} requires an argument`,
            );
          }
        }
      }

      if (validationErrors.length > 0) {
        alert(
          `File validation errors:\n\n${validationErrors.join(
            "\n",
          )}\n\nThe file was not loaded.`,
        );
        return;
      }

      // Clear existing content
      contentEditor.innerHTML = "";
      lines = [];

      // Reset the AST
      ast.inner = null;

      // Add lines from the uploaded file
      let lastLine: Line | undefined = undefined;
      for (let i = 0; i < Math.max(parsedLines.length, 10); i++) {
        lastLine = addNewLine(false, lastLine);
        if (i < parsedLines.length && parsedLines[i]) {
          lastLine({ content: parsedLines[i], saved_in_ast: false });
        }
      }

      // Try to parse the AST
      const astLines: [string, LineID][] = [];
      for (let i = 0; i < parsedLines.length; i++) {
        if (lines[i] && parsedLines[i]) {
          astLines.push([parsedLines[i], lines[i]().line_id]);
        }
      }

      const astResult = AST.parse(astLines);
      if (astResult.result.type === "ok") {
        ast.inner = astResult.result.value;
        // Mark lines as saved in AST
        for (let i = 0; i < parsedLines.length; i++) {
          if (lines[i]) {
            lines[i]({ saved_in_ast: true });
          }
        }

        // Update UI
        updateLineNumbers();
        mapLineIdToIndex();
        lines.forEach((line) => line().setIndentation());

        // Apply syntax highlighting by triggering the highlighting on each block
        lines.forEach((line) => {
          if (line().content.trim()) {
            const lineDiv = line().div;
            const blockContainer = lineDiv.querySelector(
              ".block-container",
            ) as HTMLDivElement;
            if (blockContainer) {
              applySyntaxHighlighting(blockContainer);
            }
          }
        });

        // Focus first line
        if (lines[0]) {
          requestAnimationFrame(() => {
            lines[0]({ focus: true });
          });
        }
      } else {
        // AST parsing failed - rollback
        console.error("Error parsing uploaded file:", astResult.result.error);

        // Restore previous state
        contentEditor.innerHTML = "";
        lines = [];
        ast.inner = backupAst;

        // Recreate lines from backup
        let lastRestoredLine: Line | undefined = undefined;
        for (const backup of backupLines) {
          lastRestoredLine = addNewLine(false, lastRestoredLine);
          lastRestoredLine({
            content: backup.content,
            saved_in_ast: backup.saved_in_ast,
          });
        }

        // Ensure we have at least 10 lines
        while (lines.length < 10) {
          lastRestoredLine = addNewLine(false, lastRestoredLine);
        }

        updateLineNumbers();
        mapLineIdToIndex();
        lines.forEach((line) => line().setIndentation());

        // Apply syntax highlighting to restored content
        lines.forEach((line) => {
          if (line().content.trim()) {
            const lineDiv = line().div;
            const blockContainer = lineDiv.querySelector(
              ".block-container",
            ) as HTMLDivElement;
            if (blockContainer) {
              applySyntaxHighlighting(blockContainer);
            }
          }
        });

        alert(
          `Error parsing file: ${astResult.result.error}\n\nThe editor has been restored to its previous state.`,
        );
      }
    } catch (error) {
      // Something went wrong during the upload process - rollback
      console.error("Error during file upload:", error);

      // Restore previous state
      contentEditor.innerHTML = "";
      lines = [];
      ast.inner = backupAst;

      // Recreate lines from backup
      let lastRestoredLine: Line | undefined = undefined;
      for (const backup of backupLines) {
        lastRestoredLine = addNewLine(false, lastRestoredLine);
        lastRestoredLine({
          content: backup.content,
          saved_in_ast: backup.saved_in_ast,
        });
      }

      // Ensure we have at least 10 lines
      while (lines.length < 10) {
        lastRestoredLine = addNewLine(false, lastRestoredLine);
      }

      updateLineNumbers();
      mapLineIdToIndex();
      lines.forEach((line) => line().setIndentation());

      // Apply syntax highlighting to restored content
      lines.forEach((line) => {
        if (line().content.trim()) {
          const lineDiv = line().div;
          const blockContainer = lineDiv.querySelector(
            ".block-container",
          ) as HTMLDivElement;
          if (blockContainer) {
            applySyntaxHighlighting(blockContainer);
          }
        }
      });

      alert(
        "An error occurred while uploading the file. The editor has been restored to its previous state.",
      );
    }
  }
  function getEditorContent(): string[] {
    return lines
      .map((line) => line().content)
      .filter((content) => content.trim() !== "");
  }

  /* Initialization */
  let last_line = undefined;
  for (let i = 0; i < Math.max(10, initial_lines.length); i++) {
    last_line = addNewLine(false, last_line);
  }
  addNewLine(false, last_line);
  for (const [i, _] of initial_lines.entries()) {
    lines[i]({ content: initial_lines[i] });
    const startLoop = 21;
    const endLoop = 44;
    if (initial_lines[i]) {
      lines[i]().setSavedInAST(true);
    }
    if (i == startLoop || i == endLoop || i == 47 || (i > 0 && i < startLoop)) {
      lines[i]().setIndentation(1);
    } else if (i > startLoop && i < endLoop) {
      lines[i]().setIndentation(2);
    }
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
  if (ast_r.result.type == "error")
    throw new Error(ast_r.result.error + " at " + ast_r.result.line);
  ast.inner = ast_r.result.value;
  console.log(ast);

  // Set the file handlers in the menu bar
  menuBar.setFileHandlers(handleFileUpload, getEditorContent);

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

  function mapLineIdToIndex() {
    globalStates.lineIdToIndex.clear();
    lines.forEach((line, idx) => {
      globalStates.lineIdToIndex.set(line().line_id, idx);
    });
  }

  /* Event listeners */
  runFastBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (ast.inner) {
      if (!globalStates.isRunning) {
        console.log("Starting execution with AST:", ast);
        currentExecution = createExecution(
          ast.inner,
          stackVisualization,
          lines,
          canvas,
        );
      }
      let i = 0;
      if (currentExecution) {
        const interval = setInterval(() => {
          const hasMore = currentExecution?.step();
          if (!hasMore || !currentExecution || i > 10000) {
            clearInterval(interval);
            currentExecution = null;
            updateRunningState(false);
          } else {
            updateRunningState(true);
            i++;
          }
        }, 1);
      }
    }
  });
  runBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!globalStates.isRunning && ast.inner) {
      console.log("Starting execution with AST:", ast);
      currentExecution = createExecution(
        ast.inner,
        stackVisualization,
        lines,
        canvas,
      );
      if (currentExecution) {
        updateRunningState(true);
      }
    }
  });

  stopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (globalStates.isRunning) {
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
    if (globalStates.isRunning && currentExecution) {
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
