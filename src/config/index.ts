import { nealCase, type NealCasedString } from "~/lib/nealcase";

// Settings
const config = {
  combineTimeMs: 510, // ms
  combineRetries: 3, // Maximum retries for a failed combination
  combineLogs: true,

  stopAfterDepth: 4,
  parallelBots: 10, // Number of concurrent workers (probably dont modify this)
} as const;

const printProgressEvery = { time: 300 * 1000, elements: 1000 } as const;

export const baseElements = [
  "Apple",
].map(nealCase);

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
