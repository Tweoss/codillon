import createAutocomplete, {
  Autocomplete,
  listCompletions,
  checkValidSyntax,
} from "./autocomplete.js";
import Block from "./block.js";
import {
  instructions,
  noArgInstructions,
  labelIndexInstructions,
  labelIndexVectorLabelIndexInstructions,
  funcIndexInstructions,
  typeIndexInstructions,
  localIndexInstructions,
  globalIndexInstructions,
  memoryArgumentInstructions,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
} from "./syntax.constants.js";
import {
  validateI32,
  validateI64,
  validateF32,
  validateF64,
  validateLabelIndex,
  validateLabelIndexVectorLabelIndex,
  validateFuncIndex,
  validateTypeIndex,
  validateLocalIndex,
  validateGlobalIndex,
  validateMemoryArgument,
  validateUI32,
} from "./instruction_arg_validation.js";

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

function applySyntaxHighlighting(element: HTMLElement) {
  const text = element.textContent || "";
  const words = text.split(/(\s+)/); // Split on whitespace and keep the spaces

  if (words.length === 0) return;

  // Store cursor position
  const selection = window.getSelection();
  let cursorOffset = 0;
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    cursorOffset = range.startOffset;
  }

  // Process each word and space
  const spans = words
    .map((word, index) => {
      // Skip empty strings
      if (word === "") return null;

      const span = document.createElement("span");
      span.textContent = word;

      // Only apply styling to non-whitespace words
      if (!/^\s+$/.test(word)) {
        if (index === 0) {
          // First word or word after whitespace is the instruction
          if (instructions.includes(word)) {
            span.className = "instruction";
          }
        } else if (index > 0 && /^\s+$/.test(words[index - 1])) {
          // Get the instruction (first word)
          const instruction = words[0];

          // Apply appropriate validation and styling based on instruction type
          if (labelIndexInstructions.includes(instruction)) {
            if (validateLabelIndex(word)) {
              span.className = "number";
            }
          } else if (
            labelIndexVectorLabelIndexInstructions.includes(instruction)
          ) {
            if (validateLabelIndexVectorLabelIndex(word)) {
              span.className = "number";
            }
          } else if (funcIndexInstructions.includes(instruction)) {
            if (validateFuncIndex(word)) {
              span.className = "number";
            }
          } else if (typeIndexInstructions.includes(instruction)) {
            if (validateTypeIndex(word)) {
              span.className = "number";
            }
          } else if (localIndexInstructions.includes(instruction)) {
            if (validateLocalIndex(word)) {
              span.className = "number";
            }
          } else if (globalIndexInstructions.includes(instruction)) {
            if (validateGlobalIndex(word)) {
              span.className = "number";
            }
          } else if (i32Instructions.includes(instruction)) {
            if (validateI32(word)) {
              span.className = "number";
            }
          } else if (i64Instructions.includes(instruction)) {
            if (validateI64(word)) {
              span.className = "number";
            }
          } else if (f32Instructions.includes(instruction)) {
            if (validateF32(word)) {
              span.className = "number";
            }
          } else if (f64Instructions.includes(instruction)) {
            if (validateF64(word)) {
              span.className = "number";
            }
          } else if (memoryArgumentInstructions.includes(instruction)) {
            // right now this is applying the same styling to both arguments
            if (validateUI32(word)) {
              span.className = "number";
            }
          }
        }
      }

      return span;
    })
    .filter(Boolean) as HTMLSpanElement[];

  // Clear and rebuild content
  element.innerHTML = "";
  spans.forEach((span) => {
    element.appendChild(span);
  });

  // Restore cursor position if we had a valid selection
  if (selection && cursorOffset > 0) {
    const newRange = document.createRange();
    newRange.setStart(
      element,
      Math.min(cursorOffset, element.textContent?.length || 0),
    );
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

function init({
  addNewLine,
  deleteLine,
}: {
  addNewLine: (ref: Line) => void;
  deleteLine: (ref: Line) => void;
}) {
  /* DOM variables */
  let frag = clone();
  const lineElement = frag.querySelector(".line") as HTMLDivElement;
  const block = Block()();
  lineElement.appendChild(block.frag);
  let autocomplete: Autocomplete | null = null;
  let completions = [] as string[];
  let preValidState = "";

  /* State variables */

  /* DOM update functions */
  function addAutocomplete(completions: string[]): void {
    if (!completions) return;
    removeAutocomplete();
    autocomplete = createAutocomplete({
      onSelect: (s) => {
        block.setContent(s);
        block.moveCursorToEnd();
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
        block.moveCursorToEnd();
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
    if (!checkValidSyntax(value)) {
      lineElement.classList.add("error");
    } else {
      lineElement.classList.remove("error");
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
    if (!value || checkValidSyntax(value)) {
      addNewLine(update);
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
    if (!checkValidSyntax(value)) {
      block.setContent(preValidState);
    } else {
      try {
        applySyntaxHighlighting(block.div);
      } catch (e) {
        console.error("Error applying syntax highlighting:", e);
      }
    }
    lineElement.classList.remove("error");
    removeAutocomplete();
  });
  lineElement.addEventListener("click", (e) => {
    if (!block.div.contains(e.target as Node)) {
      block.moveCursorToEnd();
      if (!autocomplete && block.getContent()) {
        addAutocomplete(completions);
      }
    }
  });

  /* Initialization */

  function update(data: { content?: string; focus?: boolean } = {}) {
    if (data.content) block.setContent(data.content);
    if (data.focus && data.focus !== undefined) {
      block.moveCursorToEnd();
    }
    return { frag, div: lineElement };
  }

  return update;
}

export default init;
export type Line = ReturnType<typeof init>;
