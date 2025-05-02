import createAutocomplete, {
  Autocomplete,
  listCompletions,
  checkValidSyntax,
} from "./autocomplete.js";
import Block from "./block.js";

const template = document.createElement("template");
template.innerHTML = `<style>
  .line {
    display: flex;
    gap: 4px;
    min-height: 1.2em;
    box-sizing: border-box;
    -webkit-tap-highlight-color: red;
    height: 16px;
    box-sizing: border-box;
  }
  .error {
    text-decoration: underline;
    text-decoration-color: red;
    text-decoration-style: wavy;
  }
</style><div class="line"></div>`;

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
  const block = Block()();
  lineElement.appendChild(block.frag);
  let autocomplete: Autocomplete | null = null;
  let completions = [] as string[];

  /* State variables */

  /* DOM update functions */
  function addAutocomplete(completions: string[]): void {
    if (!completions) return;
    removeAutocomplete();
    autocomplete = createAutocomplete({
      onSelect: (s) => {
        block.setContent(s + " ");
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
    } else if (e.key === "Backspace" && lineElement.textContent?.length === 0) {
      e.preventDefault();
      deleteLine(update);
    } else if (e.key === "Tab") {
      e.preventDefault();
      completions = listCompletions(block.getContent());
      if (block.getContent() && completions.length > 0) {
        block.setContent(completions[0] + " ");
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
    if (!checkValidSyntax(block.getContent())) {
      block.setContent("");
    }
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
