import { get_nodes } from "./lib.js";
import Line from "./line.js";
import LineNumber from "./line_number.js";

const DEFAULTS = { margin_width: 62 };

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #line-numbers, #lines {
      position: absolute;
    }
  </style>
  <div>Helloo <span id="name">world</span>!</div>
  <div id="editor">
    <!-- Design taken from Monaco Editor -->
    <div id="line-numbers" style="width:${DEFAULTS.margin_width}px;">
    </div>
    <div id="lines" style="left:${DEFAULTS.margin_width}px;">
    </div>
  </div>
`;

function clone() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  let frag = clone();
  let elements = ["name", "editor", "line-numbers", "lines"] as const;

  let nodes = get_nodes(frag, elements);

  /* State variables */
  let name: string;
  let line_height: number;
  let margin_width: number;
  let lines: ReturnType<typeof Line>[] = [];

  /* DOM update functions */
  function setNameNode(value: string) {
    nodes.name.textContent = value;
  }

  /* State update functions */
  function setName(value: string) {
    if (name !== value) {
      name = value;
      setNameNode(value);
    }
  }

  /* State logic */

  /* Event dispatchers */

  /* Event listeners */

  /* Initialization */

  function update(data: { name?: string } = {}) {
    if (data.name) setName(data.name);
    return frag;
  }

  function addLine() {
    lines.push(Line());
    nodes.lines.appendChild(lines.at(-1)!());
    nodes["line-numbers"].appendChild(LineNumber(lines.length)!());
  }

  addLine();

  return update;
}

export default init;
