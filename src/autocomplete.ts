export function listCompletions(prefix: string): string[] {
  return syntaxList.filter((syntax) => syntax.startsWith(prefix));
}
export function checkValidSyntax(text: string): boolean { 
	return syntaxList.some((syntax) => syntax === text);
}

const syntaxList = ["i32.const", "i32.add", "i32.sub", "i32.mul", "f32.const", "f32.add", "f32.sub", "f32.mul"];

// Placeholder
const autoCompletIcon = document.createElement("template");
autoCompletIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Update-Complete-Fill--Streamline-Outlined-Fill-Expansion"><desc>Update Complete Fill Streamline Icon: https://streamlinehq.com</desc><g id="update-complete-fill"><path id="Union" fill="currentColor" fill-rule="evenodd" d="M19.1875 15.5c-0.4629 0.9116 -1.0628 1.7076 -1.7996 2.3879L15 15.5l0 6h6l-2.1892 -2.1892c0.9508 -0.8776 1.7097 -1.9145 2.2767 -3.1108 0.6083 -1.2833 0.9125 -2.6833 0.9125 -4.2 0 -2.61662 -0.8667 -4.86662 -2.6 -6.74995s-3.8667 -2.95 -6.4 -3.2v2.025c1.9833 0.25 3.6458 1.12083 4.9875 2.6125C19.3292 8.17922 20 9.95005 20 12c0 1.2667 -0.2708 2.4334 -0.8125 3.5Zm-11.725 5.4125c1.09167 0.5584 2.27083 0.9042 3.5375 1.0375v-2.025c-1.98333 -0.25 -3.64583 -1.1208 -4.9875 -2.6125C4.67083 15.8209 4 14.05 4 12c0 -1.2666 0.27083 -2.43745 0.8125 -3.51245 0.46222 -0.91733 1.06097 -1.71026 1.79625 -2.3788L9 8.5l0 -6 -6 0 2.18924 2.18924c-0.95078 0.87765 -1.7097 1.91458 -2.27674 3.11081C2.30417 9.08338 2 10.4834 2 12c0 1.3 0.23333 2.525 0.7 3.675 0.46667 1.15 1.10417 2.1709 1.9125 3.0625 0.80833 0.8917 1.75833 1.6167 2.85 2.175Zm3.4879 -5.3625 5.65 -5.65005 -1.45 -1.45 -4.225 4.22505 -2.10001 -2.1L7.40039 12l3.55001 3.55Z" clip-rule="evenodd" stroke-width="1"></path></g></svg>`;

const template = document.createElement("template");
template.innerHTML = `<style>
  .autocomplete-container {
    position: relative;
    display: inline-flex;
    margin: 0 0 0 5px;
    width: auto;
    height: 15.6px;
  }
  .autocomplete-header {
    cursor: pointer;
    padding: 1px 1px 2px;
    margin: 0 0 1px;
    border: 1px solid #ccc;
    background: white;
    display: inline-flex;
    height: 100%;
    aspect-ratio: 1;
  }
  .autocomplete-list {
    position: absolute;
    top: 125%;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccc;
    background: #fff;
    margin: 0;
    padding: 0;
    list-style: none;
    z-index: 1;
    width: auto;
  }
  .autocomplete-list.hidden {
    display: none;
  }
  .autocomplete-list li {
    padding: 2px 4px;
    cursor: pointer;
  }
  .autocomplete-list li:hover {
    background: #eee;
  }
</style><div class="autocomplete-container" contenteditable="false"><div class="autocomplete-header">${autoCompletIcon.innerHTML}</div><ul class="autocomplete-list"></ul></div>`;

function clone() {
  return document.importNode(template.content, true);
}

function init({ onSelect }: { onSelect: (selected: string) => void }) {
  /* DOM variables */
  let frag = clone();
  let header = frag.querySelector(".autocomplete-header") as HTMLDivElement;
  let listElements = frag.querySelector(".autocomplete-list") as HTMLUListElement;

  /* State variables */
  let completions: string[] = [];
  let lastSelected: string | null = null;
  let isOpen = localStorage.getItem("autocomplete_open") !== "false";

  /* DOM update functions */
  /* State update functions */
  /* State logic */
  if (!isOpen) {
    listElements.classList.add("hidden");
  }
  function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /* Event dispatchers */

  function handleKeyDown() {}

  /* Event listeners */

  header.addEventListener("click", () => {
    isOpen = !isOpen;
    if (isOpen) {
      listElements.classList.remove("hidden");
    } else {
      listElements.classList.add("hidden");
    }
    localStorage.setItem("autocomplete_open", isOpen.toString());
  });
  /* Initialization */

  function update(
    data: {
      list?: string[];
      position?: { clientLeft: number; clientBottom: number };
    } = {},
  ) {
    if (data.list) {
      completions = data.list;
      listElements.innerHTML = "";
      data.list.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
				li.addEventListener("mousedown", () => onSelect(item));
        listElements.appendChild(li);
      });
    }
    return frag;
  }

  return update;
}

export default init;

export type Autocomplete = ReturnType<typeof init>;
// TODO: add a box
