const template = document.createElement("template");
template.innerHTML = `<style>
  .container {
    width: fit-conent;
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.3),
                itnset 4px 4px 8px rgba(255,255,255,0.2),
                inset -4px -4px 8px rgba(0,0,0,0.1);
    transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
    box-sizing: border-box;
    font-weight: bold;
  }
  .block:hover {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4),
                inset 1px 1px 2px rgba(255,255,255,0.2),
                inset -1px -1px 2px rgba(0,0,0,0.1);
  }
</style><div class="container empty" contenteditable="plaintext-only" spellcheck="false"></div>`;

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  const blockElement = frag.querySelector(".container") as HTMLDivElement;

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
  function moveCursorToEnd() {
    const range = document.createRange();
    range.selectNodeContents(blockElement);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
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
        blockElement.classList.remove("empty");
        blockElement.classList.remove("selected");
        blockElement.classList.add("block");
        blockElement.setAttribute("draggable", "true");
        blockElement.innerHTML = draggedEl.innerHTML;
        draggedEl.innerHTML = "";
        draggedEl.classList.remove("block");
        draggedEl.classList.add("empty");
        draggedEl.removeAttribute("draggable");
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
    return { frag, div: blockElement, getContent, setContent, moveCursorToEnd };
  }
  return update;
}

export default init;
export type Block = ReturnType<typeof init>;
