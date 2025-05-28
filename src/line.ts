import { AST, Location, Function } from "./ast.js";
import createAutocomplete, { Autocomplete } from "./autocomplete.js";
import Block, { applySyntaxHighlighting, setCursor } from "./block.js";
import { LineID, globalStates } from "./global_variables.js";
import {
  controlStartTypes,
  controlEndTypes,
  MarginWidth,
} from "./syntax.constants.js";

const template = document.createElement("template");
template.innerHTML = `<style>
  .line {
    position: relative;
    display: flex;
    gap: 4px;
    box-sizing: border-box;
    -webkit-tap-highlight-color: red;
    height: 24px;
    background-image: linear-gradient(to right, var(--border-color) 33%, white 0%);
    background-position: bottom;
    background-size: 12px 1px;
    background-repeat: repeat-x;
    background-clip: content-box;
    box-shadow: none;
  }
  .error {
    text-decoration: underline;
    text-decoration-color: red;
    text-decoration-style: wavy;
  }
  .instruction {
    color: #005cc5;
    font-weight: 500;
  }
  .number {
    color:rgb(230, 51, 51);
  }
  .label {
    color: #6f42c1;
  }
  .indent {
    height: 24px;
    width: 1px;
    position: absolute;
    background-color: var(--border-color);
    left: 0px;
  }
</style><div class="line"><div class="indent"></div></div>`;

function clone() {
  return document.importNode(template.content, true);
}

function init({
  wrapper: ast,
  line_id,
  addNewLine,
  addFunction,
  addControlFlow,
  deleteLine,
  getPrevLineInAST,
}: {
  wrapper: { inner: AST };
  line_id: LineID;
  addNewLine: (focus: boolean, ref: Line) => void;
  addFunction: (ref: Line | null, currentLine: Line) => boolean;
  addControlFlow: (ref: Line | null, currentLine: Line) => boolean;
  deleteLine: (ref: Line) => void;
  getPrevLineInAST: (ref: Line) => Line | null;
}) {
  /* DOM variables */
  let indentationLevel = 0;
  let frag = clone();
  const lineElement = frag.querySelector(".line") as HTMLDivElement;
  const block = Block()();
  lineElement.appendChild(block.frag);
  let autocomplete: Autocomplete | null = null;
  let indentBar = lineElement.querySelector(".indent") as HTMLDivElement;

  /* State variables */
  let completions = [] as readonly string[];
  let preValidState: string | null = null;
  let saved_in_ast = false;
  let cur_function: Function | null = null;

  /* DOM update functions */
  function addAutocomplete(completions: readonly string[]): void {
    if (!completions || globalStates.isRunning) return;
    removeAutocomplete();
    autocomplete = createAutocomplete({
      onSelect: (s) => {
        if (!block.getContent().includes(s)) {
          block.setContent(s);
        }
        lineElement.classList.remove("error");
        applySyntaxHighlighting(block.div);
        setCursor(block.div, block.getContent().length);
      },
    });
    const autoFrag = autocomplete({ list: completions });
    lineElement.appendChild(autoFrag);
  }
  function removeAutocomplete(): void {
    const autoEl = lineElement.querySelector(".autocomplete-container");
    if (autoEl) {
      autoEl.remove();
    }
    autocomplete = null;
  }

  /* State update functions */
  function setIndentation(level?: number) {
    cur_function = ast.inner?.get_containing_function(line_id);
    indentationLevel = level ? level : cur_function ? 1 : 0;
    indentBar.style.display = indentationLevel ? "block" : "none";
    indentBar.style.left = `${(indentationLevel - 1) * MarginWidth}px`;
    lineElement.style.paddingLeft = `${indentationLevel * MarginWidth}px`;
  }
  /* State logic */
  function completionError() {
    lineElement.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: "translate3d(-2pt, 0, 0)" },
        { transform: "translate3d(2pt, 0, 0)" },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 100,
        iterations: 2,
      },
    );
  }

  /* Event dispatchers */
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnterKey();
    } else if (e.key === "Backspace" && block.getContent() === "") {
      e.preventDefault();
      deleteLine(update);
    } else if (e.key === "Tab") {
      e.preventDefault();
      completions = ast.inner.get_autocomplete(line_id, block.getContent());
      if (block.getContent() && completions.length > 0) {
        if (!block.getContent().includes(completions[0])) {
          block.setContent(completions[0]);
        }
        lineElement.classList.remove("error");
        applySyntaxHighlighting(block.div);
        setCursor(block.div, block.getContent().length);
      } else {
        completionError();
      }
    }
  }
  function handleInput() {
    const value = block.getContent();
    value
      ? block.div.classList.remove("empty")
      : block.div.classList.add("empty");
    completions = ast.inner.get_autocomplete(line_id, value);
    if (completions.length > 0) {
      if (!autocomplete) {
        addAutocomplete(completions);
      } else {
        autocomplete({ list: completions });
      }
    } else {
      removeAutocomplete();
    }
    const line = update;
    const prev_line = getPrevLineInAST(line);
    const location = prev_line ? { after: prev_line().line_id } : "start";
    if (
      (saved_in_ast && ast.inner.update_line([value, line_id], false)) ||
      // TODO: maybe extract span of function so not necessary if save = false
      (!saved_in_ast &&
        ((value == "(func" &&
          ast.inner.place_function(location, [0, 0], false)) ||
          ast.inner.place_instruction(location, [value, line_id], false)))
    ) {
      lineElement.classList.remove("error");
      // TODO: verify this is wanted behavior (user edits a box to something valid, then invalid, then exits. should
      // the box have the initial state or the most recent valid state)
      preValidState = value;
    } else {
      lineElement.classList.add("error");
    }
  }

  function handleEnterKey(): void {
    const value: string = block.getContent();
    // TODO: handle updating a block (not just inserting)
    const line = update;
    const prev_line = getPrevLineInAST(line);
    if (value.length == 0) {
      addNewLine(true, update);
      return;
    }
    if (!cur_function && value == "(func") {
      preValidState = value;
      if (saved_in_ast) {
        addNewLine(true, update);
        return;
      }
      if (addFunction(prev_line, update)) {
        saved_in_ast = true;
      }
      return;
    } else if (
      (controlStartTypes as Readonly<Array<string>>).includes(
        value.split(" ")[0],
      )
    ) {
      if (!saved_in_ast && addControlFlow(prev_line, update)) {
        saved_in_ast = true;
      }
      return;
    }
    if (saved_in_ast) {
      if (ast.inner.update_line([value, line_id], true)) {
        addNewLine(true, update);
      } else {
        completionError();
      }
      return;
    }
    if (
      ast.inner.place_instruction(
        prev_line ? { after: prev_line().line_id } : "start",
        [value, line_id],
        true,
      )
    ) {
      saved_in_ast = true;
      addNewLine(true, update);
    } else {
      completionError();
    }
  }

  /* Event listeners */

  lineElement.addEventListener("keydown", handleKeyDown);
  lineElement.addEventListener("input", handleInput);
  lineElement.addEventListener("focusout", () => {
    let value = block.getContent().trim();
    const line = update;
    const prev_line = getPrevLineInAST(line);
    // TODO: handle update
    if (
      (controlEndTypes as Readonly<Array<string>>).includes(value) ||
      (saved_in_ast && !ast.inner.update_line([value, line_id], true)) ||
      (!saved_in_ast &&
        !ast.inner.place_instruction(
          prev_line ? { after: prev_line().line_id } : "start",
          [value, line_id],
          true,
        ))
    ) {
      block.setContent(preValidState ?? "");
    }

    applySyntaxHighlighting(block.div);
    lineElement.classList.remove("error");
    removeAutocomplete();
  });
  lineElement.addEventListener("click", (e) => {
    if (!block.div.contains(e.target as Node)) {
      setCursor(block.div, block.getContent().length);
      if (
        !autocomplete &&
        block.getContent() &&
        !block.div.classList.contains("block")
      ) {
        addAutocomplete(completions);
      }
    }
  });

  /* Initialization */

  function update(
    data: { content?: string; focus?: boolean; saved_in_ast?: boolean } = {},
  ) {
    if (data.content) {
      block.setContent(data.content);
      applySyntaxHighlighting(block.div);
      preValidState = data.content;
    }
    if (data.focus && data.focus !== undefined)
      setCursor(block.div, block.getContent().length);
    if (data.saved_in_ast !== undefined) saved_in_ast = data.saved_in_ast;
    return {
      frag,
      div: lineElement,
      location,
      saved_in_ast,
      line_id,
      content: block.getContent(),
      setIndentation,
      indentationLevel,
    };
  }

  return update;
}

export default init;
export type Line = ReturnType<typeof init>;
