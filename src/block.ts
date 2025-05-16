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
  .block-container {
    width: fit-content;
		margin: 1px 0;
		cursor: text;
  }
  .empty {
    width: 100%;
  }
  .selected {
    background-color: #e3f2fd;
  }
  .block {
    background: linear-gradient(145deg,rgb(220, 220, 220),rgb(190, 190, 190));
    padding: 1px 8px 3px;
    border-radius: 4px;
    cursor: move;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4),
                inset 1px 1px 2px rgba(255,255,255,0.2),
                inset -1px -1px 2px rgba(0,0,0,0.1);
    transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
    box-sizing: border-box;
    font-weight: bold;
  }
  .block:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.3),
                inset 4px 4px 8px rgba(255,255,255,0.2);
  }
</style><div class="block-container empty" contenteditable="plaintext-only" spellcheck="false"></div>`;

export function setAsBlock(block: HTMLDivElement) {
  block.classList.remove("empty");
  block.classList.remove("selected");
  block.classList.add("block");
  block.setAttribute("draggable", "true");
  block.removeAttribute("contentEditable");
}

export function setAsText(block: HTMLDivElement) {
  block.classList.remove("block");
  block.removeAttribute("draggable");
  block.setAttribute("contentEditable", "plaintext-only");
}

export function applySyntaxHighlighting(element: HTMLElement) {
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
          if (instructions.includes(word as any)) {
            span.className = "instruction";
          }
        } else if (index > 0 && /^\s+$/.test(words[index - 1])) {
          // Get the instruction (first word)
          const instruction = words[0];

          // Apply appropriate validation and styling based on instruction type
          if (labelIndexInstructions.includes(instruction as any)) {
            if (validateLabelIndex(word)) {
              span.className = "number";
            }
          } else if (
            labelIndexVectorLabelIndexInstructions.includes(instruction as any)
          ) {
            if (validateLabelIndexVectorLabelIndex(word)) {
              span.className = "number";
            }
          } else if (funcIndexInstructions.includes(instruction as any)) {
            if (validateFuncIndex(word)) {
              span.className = "number";
            }
          } else if (typeIndexInstructions.includes(instruction as any)) {
            if (validateTypeIndex(word)) {
              span.className = "number";
            }
          } else if (localIndexInstructions.includes(instruction as any)) {
            if (validateLocalIndex(word)) {
              span.className = "number";
            }
          } else if (globalIndexInstructions.includes(instruction as any)) {
            if (validateGlobalIndex(word)) {
              span.className = "number";
            }
          } else if (i32Instructions.includes(instruction as any)) {
            if (validateI32(word)) {
              span.className = "number";
            }
          } else if (i64Instructions.includes(instruction as any)) {
            if (validateI64(word)) {
              span.className = "number";
            }
          } else if (f32Instructions.includes(instruction as any)) {
            if (validateF32(word)) {
              span.className = "number";
            }
          } else if (f64Instructions.includes(instruction as any)) {
            if (validateF64(word)) {
              span.className = "number";
            }
          } else if (memoryArgumentInstructions.includes(instruction as any)) {
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
  return cursorOffset;
}

export function setCursor(element: HTMLElement, finalPosition: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  let currPosition = 0;
  let foundItem = false;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let currentNode = walker.nextNode();
  while (currentNode) {
    const nodeText = currentNode.textContent || "";
    if (currPosition + nodeText.length >= finalPosition) {
      range.setStart(currentNode, finalPosition - currPosition);
      foundItem = true;
      break;
    }
    currPosition += nodeText.length;
    currentNode = walker.nextNode();
  }
  if (!foundItem) {
    range.setStart(element, element.childNodes.length);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  const blockElement = frag.querySelector(".block-container") as HTMLDivElement;

  /* State variables */

  /* DOM update functions */

  /* State update functions */
  function setContent(value: string) {
    if (blockElement.innerText !== value) {
      blockElement.innerText = value;
      if (value) {
        blockElement.classList.remove("empty");
      } else {
        blockElement.classList.add("empty");
      }
    }
  }
  /* State logic */
  function getContent(): string {
    return blockElement.innerText;
  }
  /* Event dispatchers */

  /* Event listeners */
  blockElement.addEventListener("dragstart", (e) => {
    if (blockElement.classList.contains("block")) {
      (window as any).__draggedLine = blockElement;
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", "");
        e.dataTransfer.effectAllowed = "move";
      }
    }
  });
  blockElement.addEventListener("dragover", (e) => {
    if (blockElement.classList.contains("empty")) {
      e.preventDefault();
    }
  });
  blockElement.addEventListener("drop", (e) => {
    if (blockElement.classList.contains("empty")) {
      e.preventDefault();
      const draggedEl = (window as any).__draggedLine;
      if (draggedEl && draggedEl !== blockElement) {
        setAsBlock(blockElement);
        blockElement.innerHTML = draggedEl.innerHTML;
        if (!draggedEl.hasAttribute("bank-block")) {
          draggedEl.innerHTML = "";
          draggedEl.classList.add("empty");
          setAsText(draggedEl);
          draggedEl.removeAttribute("contentEditable");
        }
      }
    }
  });
  blockElement.addEventListener("dragend", () => {
    if (blockElement.classList.contains("block")) {
      (window as any).__draggedLine = null;
      blockElement.style.transform = "";
    }
  });
  blockElement.addEventListener("dragenter", (e) => {
    if (blockElement.classList.contains("empty")) {
      blockElement.classList.add("selected");
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "none";
      }
    }
  });
  blockElement.addEventListener("dragleave", (e) => {
    if (blockElement.classList.contains("empty")) {
      blockElement.classList.remove("selected");
    }
  });

  /* Initialization */
  function update() {
    return { frag, div: blockElement, getContent, setContent };
  }
  return update;
}

export default init;
export type Block = ReturnType<typeof init>;
