import { get_nodes } from "./lib.js";

const template = document.createElement("template");
template.innerHTML = `
  <span id="line-number"></span>
`;

function clone() {
  return document.importNode(template.content, true);
}

function init(number: number) {
  /* DOM variables */
  let frag = clone();
  let nodes = get_nodes(frag, ["line-number"] as const);
  nodes["line-number"].textContent = number.toString();

  function update() {
    return frag;
  }

  return update;
}

export default init;
