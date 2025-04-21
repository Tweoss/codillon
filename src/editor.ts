import { get_nodes } from "./lib.js";
import createLineNumber from "./line_number.js";
import createLine from "./line.js"; // Component for a line

const DEFAULTS = { margin_width: 62 };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #editor-container {
      display: flex;
      border: 1px solid #ccc;
      font-family: monospace;
      height: 300px;
      margin: 20px;
      overflow: hidden;
    }
    #line-numbers {
      background: #f0f0f0;
      padding: 10px;
      text-align: right;
      user-select: none;
      line-height: 1.2em;
      overflow-y: hidden;
      display: block;
    }
    #content-editor {
      flex: 1;
      padding: 10px;
      outline: none;
      overflow-y: auto;
      white-space: pre;
      line-height: 1.2em;
      background: white;
    }
    .line {
      min-height: 1.2em;
    }
  </style>
  <div>Helloo <span id="name">world</span>!</div>
  <div id="editor-container">
    <div id="line-numbers" style="width:${DEFAULTS.margin_width}px;"></div>
    <div id="content-editor" style="left:${DEFAULTS.margin_width}px;" contenteditable="true"></div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function createEditor() {
  const frag = cloneTemplate();
  const nodes = get_nodes(frag, ["line-numbers", "content-editor", "name"] as const);
  const lineNumbersContainer = nodes["line-numbers"] as HTMLDivElement;
  const contentEditor = nodes["content-editor"] as HTMLDivElement;

  function updateLineNumbers(): void {
    const lines = contentEditor.querySelectorAll('.line').length;
    lineNumbersContainer.innerHTML = Array.from(
        {length: lines},
        (_, i) => i + 1
    ).join('<br>');
  }

  function addNewLine(text: string = '', referenceLine?: HTMLDivElement): HTMLDivElement {
    const lineFrag = createLine();
    const lineDOM = lineFrag({ content: text });
    const line = lineDOM.firstElementChild as HTMLDivElement;
    line.addEventListener('keydown', handleKeyDown);
    if (referenceLine) {
      contentEditor.insertBefore(line, referenceLine.nextSibling);
    } else {
      contentEditor.appendChild(line);
    }
    updateLineNumbers();
    return line;
  }

  function getCurrentLine(): HTMLDivElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    if (node instanceof HTMLElement) {
      return node.closest('.line') as HTMLDivElement;
    } else if (node instanceof Text && node.parentElement) {
      return node.parentElement.closest('.line') as HTMLDivElement;
    }
    return null;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const line = getCurrentLine();
    if (!line) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnterKey(line);
    } else if (e.key === 'Backspace' && line.textContent?.length === 0) {
      e.preventDefault();
      handleBackspaceOnEmptyLine(line);
    }
    updateLineNumbers();
  }

  function handleEnterKey(line: HTMLDivElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = line.textContent || '';
    const caretOffset = range.startOffset;
    const newLine = addNewLine(text.slice(caretOffset), line);
    line.textContent = text.slice(0, caretOffset);
    requestAnimationFrame(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(newLine);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    });
  }

  async function handleBackspaceOnEmptyLine(line: HTMLDivElement): Promise<void> {
    const prevLine = line.previousElementSibling as HTMLDivElement;
    if (!prevLine) return;
    if (prevLine.textContent) {
      prevLine.textContent += line.textContent;
    }
    line.remove();
  }

  contentEditor.addEventListener('keydown', handleKeyDown);
  contentEditor.addEventListener('input', updateLineNumbers);
  contentEditor.addEventListener('scroll', () => {
    lineNumbersContainer.scrollTop = contentEditor.scrollTop;
  });
  contentEditor.focus();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.parentElement && !node.parentElement.classList.contains('line')) {
            const line = node.parentElement.closest('.line');
            if (line) {
              line.appendChild(node);
            }
          }
        }
      }
    }
  }).observe(contentEditor, { childList: true, subtree: true });

  if (!contentEditor.querySelector('.line')) {
    addNewLine();
  }
  updateLineNumbers();
  return frag;
}

export default createEditor;