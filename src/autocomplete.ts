export function listCompletions(prefix: string) {
  if ("i32.const".startsWith(prefix)) {
    return ["i32.const"];
  }
  return [];
}

const template = document.createElement("template");
template.innerHTML = `<style>
  .autocomplete {
    position: absolute;
  }
</style><div class="autocomplete"></div>`;

function clone() {
  return document.importNode(template.content, true);
}

function init({ onSelect }: { onSelect: (selected: string) => void }) {
  /* DOM variables */
  let frag = clone();
  let div = frag.querySelector(".autocomplete")! as HTMLDivElement;

  /* State variables */
  let completions: string[] = [];
  let lastSelected: string | null = null;

  /* DOM update functions */
  /* State update functions */
  /* State logic */

  /* Event dispatchers */

  function handleKeyDown() {}

  /* Event listeners */

  div.addEventListener("keydown", handleKeyDown);

  /* Initialization */

  function update(
    data: {
      list?: string[];
      position?: { clientLeft: number; clientBottom: number };
    } = {},
  ) {
    if (data.list) div.innerHTML = data.list.join("<br>");
    if (data.position) {
      console.log("trying to set pos");
      div.style.left = `${data.position.clientLeft}px`;
      div.style.top = `${data.position.clientBottom}px`;
    }
    return frag;
  }

  return update;
}

export default init;

export type Autocomplete = ReturnType<typeof init>;
// TODO: add a box
