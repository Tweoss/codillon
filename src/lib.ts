import Editor from "./editor.js";
import Line from "./line.js";

export async function init() {
  const main = document.querySelector("main");
  const editor = Editor();

  main.appendChild(editor({ name: "world" }));

  setTimeout(() => {
    const lines = [0, 0].map((_) => Line());
    editor({ children: lines.map((l) => l()) });
  }, 1000);
}

init();
