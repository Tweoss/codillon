const template = document.createElement("template");
template.innerHTML = `
  <div>Helloo <span id="name">world</span>!</div>
  <div id="editor">
  </div>
`;

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  let nameNode = frag.querySelector("#name");
  let editorNode = frag.querySelector("#editor");

  /* State variables */
  let name: string;
  let nodes: DocumentFragment[] = [];

  /* DOM update functions */
  function setNameNode(value: string) {
    nameNode.textContent = value;
  }
  function setChildrenNodes(children: DocumentFragment[]) {
    editorNode.replaceChildren(...children);
  }

  /* State update functions */
  function setName(value: string) {
    if (name !== value) {
      name = value;
      setNameNode(value);
    }
  }
  function setChildren(children: DocumentFragment[]) {
    setChildrenNodes(children);
  }

  /* State logic */

  /* Event dispatchers */

  /* Event listeners */

  /* Initialization */

  function update(data: { name?: string; children?: DocumentFragment[] } = {}) {
    if (data.name) setName(data.name);
    if (data.children) setChildren(data.children);
    return frag;
  }

  return update;
}

export default init;
