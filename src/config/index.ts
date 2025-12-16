import { nealCase, type NealCasedString } from "~/lib/nealcase";

// Settings
const config = {
  combineTimeMs: 510, // ms
  // Maximum retries for a failed combination
  combineRetries: 3,
  combineLogs: true,

  stopAfterDepth: 4,
  // Number of concurrent workers (probably dont modify this)
  parallelBots: 10,
} as const;

const printProgressEvery = { time: 300 * 1000, elements: 1000 } as const;

export const baseElements = ["Apple"].map(nealCase);

const baseBaseElements = [
  "Fire",
  "Water",
  "Earth",
  "Wind",
] as NealCasedString[];

const fullBaseSet = new Set<NealCasedString>([
  ...baseBaseElements,
  ...baseElements,
]);

export { config, fullBaseSet, baseBaseElements, printProgressEvery };
