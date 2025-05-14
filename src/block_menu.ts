import { get_nodes } from "./lib.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #block-menu {
      display: flex;
      border-bottom: 1px solid var(--border-color);
    }
    .tab {
      padding: 8px 16px;
      background: #ddd;
      border-left: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      cursor: pointer;
      width: 20%;
    }
    .tab:hover {
      background: #ccc;
    }
    .tab.active {
      background: #bbb;
      font-weight: bold;
    }
  </style>
  <div id="block-menu">
  <div class="tab active" data-tab="noArg">No Argument</div>
    <div class="tab" data-tab="labelIndex">Label Index</div>
    <div class="tab" data-tab="i32">i32</div>
    <div class="tab" data-tab="i64">i64</div>
    <div class="tab" data-tab="f32">f32</div>
    <div class="tab" data-tab="f64">f64</div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  const frag = cloneTemplate();
  const menuElement = frag.querySelector("#block-menu") as HTMLDivElement;
  const tabs = menuElement.querySelectorAll(".tab");
  /* State variables. */
  /* DOM update functions */
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      const event = new CustomEvent("tab-change", {
        detail: { tab: tabName },
        bubbles: true,
      });
      menuElement.dispatchEvent(event);
    });
  });
  /* State update functions */
  /* State logic */
  /* Event dispatchers */
  /* Event listeners */

  return frag;
}

export default init;
export type BlockMenu = ReturnType<typeof init>;
