export type Mode = "text" | "block";
export type LineID = number;
export const globalStates = {
  isRunning: false,
  mode: "test" as Mode,
  lineIdToIndex: new Map<LineID, number>(),
};
