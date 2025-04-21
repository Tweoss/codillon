import { get_nodes } from "./lib.js";

const template = document.createElement("template");
template.innerHTML = `
  <span id="line-text">Helloo I'm a line!</span>
`;

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  let nodes = get_nodes(frag, ["line-text"] as const);

  /* State variables */
  let text: string;

  /* DOM update functions */
  function setTextNode(value: string) {
    nodes["line-text"].textContent = value;
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
