import Editor from "./editor.js";

export async function init() {
  const main = document.querySelector("main");
  const editor = Editor();

  main!.appendChild(editor);
}

type Nodes<T> = T extends readonly string[]
  ? T[number] extends string
    ? { [K in T[number]]: HTMLElement }
    : never
  : never;
export function get_nodes<T extends readonly string[]>(
  fragment: DocumentFragment,
  elements: T,
): Nodes<T> {
  let nodes: Nodes<T> = elements.reduce(
    (prev, current) => ({
      ...prev,
      [current]: fragment.querySelector("#" + current),
    }),
    {},
  ) as Nodes<T>;
  return nodes;
}

init();
