import { AST, LineID, Location } from "./ast.js";
import createAutocomplete, {
  Autocomplete,
  listCompletions,
  checkValidSyntax,
} from "./autocomplete.js";
import Block, { applySyntaxHighlighting, setCursor } from "./block.js";

const template = document.createElement("template");
template.innerHTML = `<style>
  .line {
    display: flex;
    gap: 4px;
    box-sizing: border-box;
    -webkit-tap-highlight-color: red;
    height: 24px;
    border-bottom: 1px dashed var(--border-color);
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
</style><div class="line"></div>`;

function clone() {
  return document.importNode(template.content, true);
}

function init({
  wrapper: ast,
  line_id,
  addNewLine,
  addFunction,
  deleteLine,
  getPrevLineInAST,
}: {
  wrapper: { inner: AST };
  line_id: LineID;
  addNewLine: (focus: boolean, ref: Line) => void;
  addFunction: (ref: Line | null, currentLine: Line) => void;
  deleteLine: (ref: Line) => void;
  getPrevLineInAST: (ref: Line) => Line | null;
}) {
  /* DOM variables */
  let frag = clone();
  const lineElement = frag.querySelector(".line") as HTMLDivElement;
  const block = Block()();
  lineElement.appendChild(block.frag);
  let autocomplete: Autocomplete | null = null;

  /* State variables */
  let completions = [] as string[];
  let preValidState = "";
  let saved_in_ast = false;

  /* DOM update functions */
  function addAutocomplete(completions: string[]): void {
    if (!completions) return;
    removeAutocomplete();
    autocomplete = createAutocomplete({
      onSelect: (s) => {
        block.setContent(s);
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
      completions = listCompletions(block.getContent());
      if (block.getContent() && completions.length > 0) {
        block.setContent(completions[0]);
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
    completions = listCompletions(value);
    const line = update;
    const prev_line = getPrevLineInAST(line);
    if (!prev_line) return;
    if (
      !ast.inner.place_instruction(
        prev_line ? { after: prev_line().line_id } : "start",
        [value, line_id],
        false,
      )
    ) {
      lineElement.classList.add("error");
    } else {
      lineElement.classList.remove("error");
      // TODO: verify this is wanted behavior (user edits a box to something valid, then invalid, then exits. should
      // the box have the initial state or the most recent valid state)
      preValidState = value;
    }
    if (completions.length > 0) {
      if (!autocomplete) {
        addAutocomplete(completions);
      } else {
        autocomplete({ list: completions });
      }
    } else {
      removeAutocomplete();
    }
  }

  function handleEnterKey(): void {
    const value: string = block.getContent();
    console.log("handling ", value);
    // TODO: handle updating a block (not just inserting)
    const line = update;
    const prev_line = getPrevLineInAST(line);
    if (value.length == 0) {
      addNewLine(true, update);
      return;
    }
    if (value == "(func") {
      if (saved_in_ast) {
        addNewLine(true, update);
        return;
      }
      // TODO: handle if there is already a function block.
      addFunction(prev_line, update);
      saved_in_ast = true;
      return;
    }
    if (
      ast.inner.place_instruction(
        prev_line ? { after: prev_line().line_id } : "start",
        [value, line_id],
        true,
      )
    ) {
      console.log(`saved ${value} in AST`);
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
    if (!value) {
      preValidState = "";
    }
    const line = update;
    const prev_line = getPrevLineInAST(line);
    // TODO: handle update
    if (
      ast.inner.place_instruction(
        prev_line ? { after: prev_line().line_id } : "start",
        [value, line_id],
        true,
      )
    ) {
      console.log("running focus out handler");
      console.log(ast.inner);
      block.setContent(preValidState);
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
    if (data.content) block.setContent(data.content);
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
    };
  }

  return update;
}

export default init;
export type Line = ReturnType<typeof init>;
