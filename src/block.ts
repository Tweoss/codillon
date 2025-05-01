const template = document.createElement("template");
template.innerHTML = `<style>
  .container {
    width: fit-conent;
  }
  .empty {
    width: 100%;
  }
  .selected {
    background-color: #e3f2fd;
  }
  .block {
    border: 1px solid blue;
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
  let text: string;

  /* DOM update functions */

  /* State update functions */
  function setContent(value: string) {
    if (text !== value) {
      text = value;
      blockElement.textContent = value;
    }
    if (value) {
      blockElement.classList.remove("empty");
    } else {
      blockElement.classList.add("empty");
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
      e.dataTransfer?.setData("text/plain", "");
      (window as any).__draggedLine = blockElement;
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
        blockElement.textContent = draggedEl.textContent;
        draggedEl.textContent = "";
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
