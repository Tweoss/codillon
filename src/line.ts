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
  let textNode = frag.querySelector("#line-text");

  /* State variables */
  let text: string;

  /* DOM update functions */
  function setTextNode(value: string) {
    textNode.textContent = value;
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

  function update(data: { name?: string; children?: DocumentFragment[] } = {}) {
    if (data.name) setName(data.name);
    return frag;
  }

  return update;
}

export default init;
