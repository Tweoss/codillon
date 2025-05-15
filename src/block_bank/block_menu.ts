import { get_nodes } from "../lib.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #sub-block-menu, #block-menu {
      display: flex;
      border-bottom: 1px solid var(--border-color);
    }
    .tab {
      padding: 8px 16px;
      background: #ddd;
      border-left: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      cursor: pointer;
    }
    #block-menu .tab {
      width: 20%;
    }
    #sub-block-menu .tab {
      width: 25%;
    }
    .tab:hover {
      background: #ccc;
    }
    .tab.active {
      background: #bbb;
      font-weight: bold;
    }
    #sub-block-menu.hidden {
      visibility: hidden;
      height: 0px;
    }
  </style>
  <div id="block-menu">
    <div class="tab active" data-tab="control">Control Instructions</div>
    <div class="tab" data-tab="parametric">Parametric Instructions</div>
    <div class="tab" data-tab="variable">Variable Instructions</div>
    <div class="tab" data-tab="memory">Memory Instructions</div>
    <div class="tab" data-tab="numeric">Numeric Instructions</div>
  </div>
  <div id="sub-block-menu" class="hidden">
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
  const subBlockMenu = frag.querySelector("#sub-block-menu") as HTMLDivElement;
  /* State variables. */
  const tabNames = [
    "control",
    "parametric",
    "Variable",
    "memory",
    "numeric",
    "i32",
    "i64",
    "f32",
    "f64",
  ];
  const tabs = frag.querySelectorAll(".tab");
  let curNumeric = -1;
  let prevNumeric = 5;
  /* DOM update functions */
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      let tabName = tab.getAttribute("data-tab") || "";
      let index = tabNames.indexOf(tabName);
      if (index < 4) {
        prevNumeric = curNumeric;
        curNumeric = -1;
        subBlockMenu.classList.add("hidden");
      } else if (index == 4) {
        curNumeric = prevNumeric;
        subBlockMenu.classList.remove("hidden");
        tabs[prevNumeric].classList.add("active");
        tabs[4].classList.add("active");
        tabName = tabNames[prevNumeric];
      } else {
        curNumeric = index;
        tabs[4].classList.add("active");
      }
      tab.classList.add("active");
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
