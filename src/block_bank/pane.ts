const template = document.createElement("template");
template.innerHTML = `
  <style>
    .pane{
      width: 100%;
      padding: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      background: white;
    }
  </style>
  <div class="pane">
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  const frag = cloneTemplate();
  const pane = frag.querySelector(".pane") as HTMLDivElement;

  /* State variables. */
  /* DOM update functions */
  /* State update functions */
  /* State logic */
  /* Event dispatchers */
  /* Event listeners */

  return { frag, pane };
}

export default init;
export type Pane = ReturnType<typeof init>;
