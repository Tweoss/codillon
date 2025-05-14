import Pane from "./pane.js";
import BlockMenu from "./block_menu.js";
import Block, {
  applySyntaxHighlighting,
  setAsBlock,
  setAsText,
} from "../block.js";
import {
  instructions,
  noArgInstructions,
  labelIndexInstructions,
  labelIndexVectorLabelIndexInstructions,
  funcIndexInstructions,
  typeIndexInstructions,
  localIndexInstructions,
  globalIndexInstructions,
  memoryArgumentInstructions,
  i32Instructions,
  i64Instructions,
  f32Instructions,
  f64Instructions,
} from "../syntax.constants.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #block-bank {
      display: flex;
      flex-direction: column;
      background: #eee;
      margin: 0 20px 20px;
      border-radius: 0 0 10px 10px;
      border: 1px solid var(--border-color);
      border-top: 0;
      height: fit-content;
      max-height: 400px;
      overflow: scroll;
    }
    #block-bank.hidden {
      visibility: hidden;
    }
  </style>
  <div id="block-bank" class="hidden">
    <div id="menu-container"></div>
    <div id="bank-container"></div>
  </div>
`;

function cloneTemplate() {
  return document.importNode(template.content, true);
}

function init() {
  /* DOM variables */
  const frag = cloneTemplate();
  const blockBankElement = frag.querySelector("#block-bank") as HTMLDivElement;
  const contentContainer = blockBankElement.querySelector(
    "#bank-container",
  ) as HTMLDivElement;
  const menuContainer = blockBankElement.querySelector(
    "#menu-container",
  ) as HTMLDivElement;
  const blockMenu = BlockMenu();
  menuContainer.prepend(blockMenu);

  /* State variables. */
  const tabPanes: { [tab: string]: HTMLDivElement } = {};
  const tabMapping: { [key: string]: string[] } = {
    noArg: noArgInstructions,
    labelIndex: labelIndexInstructions,
    i32: i32Instructions,
    i64: i64Instructions,
    f32: f32Instructions,
    f64: f64Instructions,
  };
  /* DOM update functions */
  function showTab(selectedTab: string) {
    for (const tab in tabPanes) {
      tabPanes[tab].style.display = tab === selectedTab ? "grid" : "none";
    }
  }
  /* State update functions */
  /* State logic */
  for (const tab in tabMapping) {
    const { frag, pane } = Pane();
    pane.setAttribute("data-tab", tab);
    tabMapping[tab].forEach((instruction) => {
      const blockInstance = Block();
      const { frag: blockFrag, div, setContent } = blockInstance();
      setContent(instruction);
      applySyntaxHighlighting(div);
      setAsBlock(div);
      div.setAttribute("bank-block", "true");
      pane.appendChild(blockFrag);
    });
    tabPanes[tab] = pane;
    contentContainer.appendChild(frag);
  }
  /* Event dispatchers */
  /* Event listeners */
  menuContainer.addEventListener("tab-change", (e) => {
    const customEvent = e as CustomEvent;
    const selectedTab = customEvent.detail.tab;
    showTab(selectedTab);
  });

  showTab("noArg");
  return frag;
}

export default init;
export type BlockBank = ReturnType<typeof init>;
