import { get_nodes } from "./lib.js";

const template = document.createElement("template");
template.innerHTML = `
  <div class="line" contenteditable="true" spellcheck="false"></div>
`;

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  const lineElement = frag.querySelector('.line') as HTMLDivElement; // Select by class

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

  /* Event listeners */

  /* Initialization */

  function update(
    data: { content?: string; children?: DocumentFragment[] } = {},
  ) {
    if (data.content) setName(data.content);
    return frag;
  }

  return update;
}

export default init;
