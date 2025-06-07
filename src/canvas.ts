import { StackValue, Point } from "./syntax.constants.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    #plot-canvas-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 16px;
      margin-bottom: 16px;
      background: #f8fafc;
      border-radius: 14px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 1.5px 4px rgba(0,0,0,0.03);
      padding: 18px 0;
    }
    #plot-canvas {
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: linear-gradient(135deg, #fafdff 0%, #e9f1fb 100%);
      width: 400px;
      height: 400px;
      display: block;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: box-shadow 0.2s;
    }
  </style>
  <div id="plot-canvas-container">
    <canvas id="plot-canvas" width="400" height="400"></canvas>
  </div>
`;

function clone() {
  return document.importNode(template.content, true);
}

export function stackToPoints(stack: StackValue[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < stack.length - 1; i += 2) {
    points.push([stack[i][1], stack[i + 1][1]]);
  }
  return points;
}

function init() {
  /* DOM variables */
  const frag = clone();
  const canvas = frag.querySelector("#plot-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  /* State variables. */

  /* DOM update functions */
  function plotPoints(points: Array<[number, number]>) {
    // window is -1 to 1 in x and y
    if (points.length === 0) return;
    const minX = -1.1;
    const maxX = 1.1;
    const minY = -1.1;
    const maxY = 1.1;
    function mapX(x: number) {
      return ((x - minX) / (maxX - minX)) * canvas.width;
    }
    function mapY(y: number) {
      return canvas.height - ((y - minY) / (maxY - minY)) * canvas.height;
    }
    ctx.fillStyle = "#005cc5";
    for (const [x, y] of points) {
      ctx.beginPath();
      ctx.arc(mapX(x), mapY(y), 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  /* State update functions */
  /* State logic */
  /* Event dispatchers */
  /* Event listeners */
  return {
    frag,
    plotPoints,
    canvas,
  };
}

export default init;
export type Canvas = ReturnType<typeof init>;
