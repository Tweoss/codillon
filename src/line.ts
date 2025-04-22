import { get_nodes } from "./lib.js";

const template = document.createElement("template");
template.innerHTML = `\
<style>
  .error {
    text-decoration: underline;
    text-decoration-color: red;
  }
</style>\
<div class="line" contenteditable="true" spellcheck="false"></div>
`;

function clone() {
  return document.importNode(template.content, true);
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
  const lineElement = frag.querySelector(".line") as HTMLDivElement; // Select by class

  /* State variables */
  let text: string;

  /* DOM update functions */
  function setTextNode(value: string) {
    lineElement.textContent = value; // Use the element directly
  }

  /* State update functions */
  function setName(value: string) {
    if (text !== value) {
      text = value;
      setTextNode(value);
    }
  }

  /* State logic */

  /* Event dispatchers */
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnterKey();
    } else if (e.key === "Backspace" && lineElement.textContent?.length === 0) {
      e.preventDefault();
      deleteLine(update);
    }
  }
  function handleInput() {
    if (!lineElement.innerText.startsWith("i32.const")) {
      lineElement.classList.add("error");
    } else {
      lineElement.classList.remove("error");
    }
  }

  function handleEnterKey(): void {
    if (!lineElement.innerText.startsWith("i32.const")) {
      lineElement.animate(
        [
          { transform: "translate2D(0%, 0%)" },
          { transform: "translate2D(-2pt, 0%)" },
          { transform: "translate2D(2pt, 0%)" },
          { transform: "translate2D(0%, 0%)" },
        ],
        {
          duration: 100,
          iterations: 2,
        },
      );
    } else {
      addNewLine(update);
    }
  }

  /* Event listeners */

  lineElement.addEventListener("keydown", handleKeyDown);
  lineElement.addEventListener("input", handleInput);

  /* Initialization */

  function update(data: { content?: string; focus?: boolean } = {}) {
    if (data.content) setName(data.content);
    if (data.focus !== undefined) {
      if (data.focus) {
        // Set focus to the end of this line.
        const range = document.createRange();
        range.selectNodeContents(lineElement);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    return { frag, div: lineElement };
  }

  return update;
}

export default init;

export type Line = ReturnType<typeof init>;
