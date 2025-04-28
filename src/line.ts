import createAutocomplete, {
  Autocomplete,
  listCompletions,
  checkValidSyntax,
} from "./autocomplete.js";

const template = document.createElement("template");
template.innerHTML = `<style>
  .line {
    display: flex;
    gap: 4px;
    min-height: 1.2em;
    box-sizing: border-box;
    -webkit-tap-highlight-color: red;
  }
  .container {
    width: fit-conent;
  }
  .empty {
    width: 100%;
  }
  .error {
    text-decoration: underline;
    text-decoration-color: red;
    text-decoration-style: wavy;
  }
</style><div class="line"><div class="container empty" contenteditable="plaintext-only" spellcheck="false"></div></div>`;

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
  const lineElement = frag.querySelector(".line") as HTMLDivElement;
  const lineContainerElement = frag.querySelector(".line .container") as HTMLDivElement;
  let autocomplete: Autocomplete | null = null;
  let completions = [] as string[];

  /* State variables */
  let text: string;

  /* DOM update functions */
  function setTextNode(value: string) {
    lineContainerElement.textContent = value; // Use the element directly
  }
  function addAutocomplete(completions: string[]): void {
    removeAutocomplete();
    autocomplete = createAutocomplete({
      onSelect: (s) => {
        setContent(s);
        moveCursorToEnd();
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
  function setContent(value: string) {
    if (text !== value) {
      text = value;
      setTextNode(value);
    }
  }
  /* State logic */
  function moveCursorToEnd() {
    const range = document.createRange();
    range.selectNodeContents(lineContainerElement);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
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
    } else if (e.key === "Backspace" && lineElement.textContent?.length === 0) {
      e.preventDefault();
      deleteLine(update);
    } else if (e.key === "Tab") {
      e.preventDefault();
      completions = listCompletions(lineContainerElement.innerText);
      if (lineContainerElement.innerText && completions.length > 0) {
        setContent(completions[0]);
        moveCursorToEnd();
      } else {
        completionError();
      }
    }
  }
  function handleInput() {
    const value = lineContainerElement.innerText;
    value ? lineContainerElement.classList.remove("empty") : lineContainerElement.classList.add("empty");
    if (!value.startsWith("i32.const")) {
      lineElement.classList.add("error");
    } else {
      lineElement.classList.remove("error");
    }
    completions = listCompletions(value);
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
    if (checkValidSyntax(lineContainerElement.innerText)) {
      addNewLine(update);
    } else {
      completionError();
    }
  }

  /* Event listeners */

  lineElement.addEventListener("keydown", handleKeyDown);
  lineElement.addEventListener("input", handleInput);
  lineElement.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!lineElement.contains(document.activeElement)) {
        removeAutocomplete();
      }
    }, 0);
  });

  /* Initialization */

  function update(data: { content?: string; focus?: boolean } = {}) {
    if (data.content) setContent(data.content);
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