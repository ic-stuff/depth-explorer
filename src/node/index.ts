import { ChunkedSet } from "~/lib/chunked-set";
import { nealCase } from "~/lib/nealcase";
import type { CombString } from "~/types";

// Elements the bot combines everything with

const tempElements: string[] = [];

const printLineagesFor = new Set([
  "Delete The Parentheses",
  "Delete The Hyphen",
  "Delete The Dot",
  "Delete The Abc",
  "Delete The Abcd",
  "Delete The Mr.",
]);

const printLineageCondition = (element: string) =>
  printLineagesFor.has(element) ||
  /^Delete .{1,2}$/i.test(element) ||
  /^Delete The .{1,2}$/i.test(element) ||
  /^Delete The Letter .$/i.test(element) ||
  /Delete First/i.test(element) ||
  /Delete Last/i.test(element) ||
  /Remove/i.test(element);

const depthLists = [/* Depth */ new ChunkedSet<string>()];
depthLists[0]!.add("");
const encounteredElements = new Map<string, string[][]>(); // { element: seeds }

const recipesIng: Record<string, string> = loadRecipes();

const recipesRes = new Map<string, Set<CombString>>();

const precomputedRecipesRes = new Map<string, SortedRecipe[]>(); // optimization for printing all Lineages

function recipeExists(recipe: SortedRecipe): string | undefined {
  const [first, second] = recipe;
  const combString = `${first}=${second}` as const;
  const result = recipesIng[combString];

  if (result) {
    if (!recipesRes.has(result)) recipesRes.set(result, new Set());
    recipesRes.get(result)!.add(combString);

    return result;
  }
}

// --------------------------------

import * as fs from "node:fs";
import * as repl from "node:repl";
import { chromium } from "playwright";
import {
  config,
  fullBaseSet,
  printProgressEvery,
  baseElements,
} from "~/config";
import { delay } from "~/lib/delay";
import { getSortedRecipe, type SortedRecipe } from "~/lib/sorted-recipe";
import { generateLineageFromResults } from "~/lib/generate-lineage-from-results";
import { makeLineage } from "~/lib/make-lineage";

let lastCombination = Date.now();

setInterval(() => saveRecipes(recipesIng), 1 * 60 * 1000);

let processedSeeds = 0;
let totalSeeds = 0;
let depth = 0;
let startTime = Date.now();

function saveRecipes(recipes: Record<string, string>) {
  fs.writeFileSync("recipes.json", JSON.stringify(recipes, null, 4), "utf8");
}

function loadRecipes() {
  if (fs.existsSync("recipes.json")) {
    const data = fs.readFileSync("recipes.json", "utf8");
    return JSON.parse(data);
  } else {
    console.error("No recipes.json file found. Please make one.");
  }
}

// // Create a REPL instance
// const replServer = repl.start({ prompt: "> " });

// declare module "node:vm" {
//   interface Context {
//     help: unknown;
//     clearNothings: unknown;
//     lineage: unknown;
//     lineagesFile: unknown;
//     likelyDead: unknown;
//     currentElements: unknown;
//   }
// }

// // Define commands
// replServer.context.help = () => console.log(replServer.context);

// replServer.context.clearNothings = (
//   onlyDead?: boolean,
//   onlyFromCurrentRun?: boolean
// ) => {
//   if (onlyDead === undefined || onlyFromCurrentRun === undefined)
//     return "function requires 2 Boolean values (onlyDead, onlyFromCurrentRun)";

//   let count = 0;
//   for (const key in recipesIng) {
//     if (
//       onlyFromCurrentRun &&
//       !key.split("=").every((x) => !encounteredElements.has(x))
//     )
//       continue;
//     if (
//       recipesIng[key] === "Nothing" &&
//       (!onlyDead || key.split("=").some((x) => x !== nealCase(x)))
//     ) {
//       delete recipesIng[key]; // Remove the entry
//       count++;
//     }
//   }
//   return `Removed ${count} recipes with 'Nothing'`;
// };

// replServer.context.lineage = (element: string) => {
//   element = nealCase(element);
//   const message = [];
//   for (const [elem, seed] of encounteredElements.entries()) {
//     if (nealCase(elem) === element) {
//       message.push(
//         makeLineage(
//           seed,
//           `${elem} Lineage`,
//           precomputedRecipesRes,
//           recipesRes
//         ).join(" ")
//       );
//     }
//   }
//   return message.length > 0
//     ? message.join("\n\n")
//     : "This Element has not been made...";
// };

// replServer.context.lineagesFile = () => {
//   const content: string[] = [];

//   content.push(
//     generateLineageFromResults(
//       baseElements,
//       precomputedRecipesRes,
//       recipesRes,
//       false
//     )
//       .map((recipe) => `${recipe[0]} + ${recipe[1]} = ${recipe[2]}`)
//       .join("\n") + `  // ${baseElements.length}`
//   );

//   const genCounts = Array<number>(depth + 1).fill(0);

//   encounteredElements.forEach((seeds) => genCounts[seeds[0]!.length - 1]!++);
//   let runningTotal = 0;
//   content.push(
//     genCounts
//       .map((count, index) => {
//         runningTotal += genCounts[index]!;
//         return `Gen ${
//           index + 1
//         } - ${count} Elements -> ${runningTotal} Total Elements`;
//       })
//       .join("\n")
//   );

//   console.time("Generate Lineages File");
//   for (const [result, recipes] of recipesRes.entries()) {
//     precomputedRecipesRes.set(
//       result,
//       Array.from(recipes).map((x) => x.split("=") as SortedRecipe)
//     );
//   }

//   content.push(
//     Array.from(encounteredElements.entries())
//       .map(([element, lineage]) =>
//         makeLineage(lineage, element, precomputedRecipesRes, recipesRes).join(
//           " "
//         )
//       )
//       .join("\n\n")
//   );

//   precomputedRecipesRes.clear();
//   console.timeEnd("Generate Lineages File");

//   content.push(
//     JSON.stringify(
//       Object.fromEntries(
//         Array.from(encounteredElements, ([element, seed]) => [
//           element,
//           seed[0]!.length,
//         ])
//       ),
//       null,
//       2
//     )
//   );

//   const filename = `${
//     baseElements[baseElements.length - 1]
//   } Seed - ${Math.floor((processedSeeds / totalSeeds) * 100)}% gen ${
//     depth + 1
//   }.txt`;
//   fs.writeFileSync(`./${filename}`, content.join("\n\n\n\n"), "utf8");
//   return `File saved: ${filename}`;
// };

// /**
//  * Prints all elements that have been made in the current run and that haven't been used in any recipe
//  */
// replServer.context.likelyDead = () => {
//   const candidatesSet = new Set<string>(
//     encounteredElements.keys().filter((x) => x !== nealCase(x))
//   );
//   console.log(candidatesSet.size);

//   const recipeResSet = new Set();
//   for (const [element, recipes] of recipesRes) {
//     if (element === "Nothing") continue;
//     for (const recipe of recipes) {
//       recipe.split("=", 2).forEach((x) => recipeResSet.add(x));
//     }
//   }
//   for (const element of candidatesSet) {
//     if (recipeResSet.has(nealCase(element))) candidatesSet.delete(element);
//   }
//   fs.writeFileSync(`./tempOutput.txt`, [...candidatesSet].join("\n"), "utf8");
//   return `File saved - ${candidatesSet.size} Elements`;
// };

// replServer.context.currentElements = () => {
//   fs.writeFileSync(
//     `./tempOutput.txt`,
//     Array.from(encounteredElements.keys()).join("\n"),
//     "utf8"
//   );
//   return `File saved - ${encounteredElements.size} Elements`;
// };

// // Handle process cleanup on exit or stop
// function onExit() {
//   saveRecipes(recipesIng);
// }

// process.on("beforeExit", () => {
//   onExit();
// });

// // Listen for termination signals (for Ctrl+C)
// process.on("SIGINT", () => {
//   onExit();
//   process.exit(0); // Exit gracefully
// });

// // Handle process exit (e.g., from Shift+F5 in VS Code)
// process.on("exit", () => {
//   onExit();
// });

(async () => {
  const browser = await chromium.launch({ headless: false, timeout: 12 * 1000  }); // false for debugging
  const page = await browser.newPage();

  await page.goto("https://neal.fun/infinite-craft", {
    waitUntil: "domcontentloaded",
  });
  console.log("Page loaded successfully!");
  console.log("For help with commands type 'help'");

  (async function main() {
    const interval = setInterval(() => {
      printSeedProgress();
    }, printProgressEvery.time);

    // calculate depth1 ONCE  (set)
    const depth1 = await processCombinations(allCombinations([...fullBaseSet]));

    for (; depth < config.stopAfterDepth; depth++) {
      depthLists[depth + 1] = new ChunkedSet();
      processedSeeds = 0;
      totalSeeds = depthLists[depth]!.size;

      async function worker(
        seedGen: Generator<string, void, unknown>
      ): Promise<void> {
        for (const seed of seedGen) {
          const seedAsArray = seed ? seed.split("=") : [];

          const combElements = [
            ...seedAsArray.map((x) => nealCase(x)),
            ...fullBaseSet,
          ];

          const allResults = new Set<string>(depth1); // use prebcalculated depth1
          // do all non base-base combinations as those are already in depth1

          for (let i = 0; i < seedAsArray.length; i++) {
            for (let j = i; j < combElements.length; j++) {
              const combination = getSortedRecipe(
                seedAsArray[i]!,
                combElements[j]!
              );
              const combString = `${combination[0]}=${combination[1]}` as const;

              let recExists = recipesIng[combString];

              if (recExists) {
                if (!recipesRes.has(recExists))
                  recipesRes.set(recExists, new Set());
                recipesRes.get(recExists)!.add(combString);
              } else {
                recExists = await combine(combination);
              }

              if (recExists && recExists !== "Nothing")
                allResults.add(recExists);
            }
          }

          for (const result of allResults) {
            if (seedAsArray.includes(result) || fullBaseSet.has(result)) {
              continue;
            }

            seedAsArray.push(result);

            addToEncounteredElements(result, seedAsArray);

            if (tempElements.length > 0) {
              const tempResults = await processCombinations(
                tempElements.map((x) => [x, result])
              );
              for (const tempResult of tempResults) {
                addToEncounteredElements(tempResult, [
                  ...seedAsArray,
                  tempResult,
                ]);
              }
            }

            if (depth < config.stopAfterDepth - 1 && result.length <= 30) {
              let countDepth1s = 0;
              let nonDepth1 = 0;
              for (const res of seedAsArray) {
                if (depth1.has(res)) countDepth1s++;
                else nonDepth1++;
              }

              if (countDepth1s - 2 * nonDepth1 <= 2)
                depthLists[depth + 1]!.add([...seedAsArray].sort().join("="));
            }
            seedAsArray.pop();
          }
          processedSeeds++;
        }
      }

      const seedIterator = depthLists[depth]!.values();
      const workers = Array(config.parallelBots)
        .fill(undefined)
        .map(() => worker(seedIterator));
      await Promise.all(workers); // wait for all workers to finish

      console.log(
        "\nDepth:",
        depth + 1,
        "completed!",
        "\nTime:",
        (Date.now() - startTime) / 1000,
        "s\nSeeds:",
        totalSeeds,
        "->",
        depthLists[depth + 1]!.size,
        "\nElements:",
        encounteredElements.size
      );
    }

    clearInterval(interval);
    await browser.close();
    console.log("%cDone!", "background: red; color: white");
  })();

  function addToEncounteredElements(element: string, seed: string[]): void {
    const setFlag = (() => {
      if (!encounteredElements.has(element)) {
        return true;
      }

      const ee = encounteredElements.get(element)!;

      if (ee[0]!.length === seed.length) {
        ee.push(seed.toSorted());
      } else if (ee[0]!.length > seed.length) {
        return true;
      }
    })();

    if (setFlag) {
      encounteredElements.set(element, [seed.toSorted()]);
      if (encounteredElements.size % printProgressEvery.elements === 0)
        printSeedProgress();

      if (printLineageCondition(element))
        console.log(
          "\n",
          ...makeLineage(
            encounteredElements.get(element)!,
            `${element} Lineage` as const,
            precomputedRecipesRes,
            recipesRes
          )
        );
    }
  }

  function printSeedProgress(): void {
    console.log(
      "Depth",
      depth + 1,
      "-",
      processedSeeds,
      "/",
      totalSeeds,
      "seeds processed -",
      Math.round((processedSeeds / totalSeeds) * 100 * 100) / 100,
      "%"
    );
  }

  async function combine(recipe: SortedRecipe): Promise<string | undefined> {
    const [first, second] = recipe;
    if (first.length > 30 || second.length > 30) return "Nothing";
    const waitingDelay = Math.max(
      0,
      config.combineTimeMs - (Date.now() - lastCombination)
    );
    lastCombination = Date.now() + waitingDelay;
    await delay(waitingDelay);

    // if recipe suddenly exists after awaiting delay
    const recExists = recipeExists(recipe);
    if (recExists) {
      lastCombination -= config.combineTimeMs;
      return recExists;
    }

    for (let attempt = 0; attempt < config.combineRetries; attempt++) {
      const url = `/api/infinite-craft/pair?first=${encodeURIComponent(
        first
      )}&second=${encodeURIComponent(second)}`;

      const response = (async () => {
        try {
          return await page.evaluate(async (url) => {
            const res = await fetch(url);
            if (!res.ok) {
              if (res.status === 429) {
                return { ratelimited: true } as const;
              } else {
                throw new Error(`Failed with status: ${res.status}`);
              }
            } else {
              return res.json() as Promise<{ ___: "___" }>;
            }
          }, url);
        } catch {
          if (attempt < config.combineRetries - 1) {
            // if it is NOT the final attempt
            lastCombination += config.combineTimeMs;
            return { shouldContinue: true } as const;
          }
        }
      })();

      if (response?.shouldContinue) {
        continue;
      }

      if (response?.ratelimited) {
        throw new Error("rate limited!");
      }

      const result = (response?.result as string | undefined) || "Nothing";

      const combString = `${first}=${second}` as const;
      recipesIng[combString] = result;

      if (!recipesRes.has(result)) recipesRes.set(result, new Set());
      recipesRes.get(result)!.add(combString);

      if (config.combineLogs)
        console.log(`Combine: ${first} + ${second} = ${result}`);
      return result;
    }
  }

  function allCombinations(array: string[]): SortedRecipe[] {
    const combinations: SortedRecipe[] = [];
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j <= i; j++) {
        combinations.push(getSortedRecipe(array[i]!, array[j]!));
      }
    }
    return combinations;
  }

  async function processCombinations(
    combinations: [string, string][]
  ): Promise<Set<string>> {
    const results = new Set<string>();
    const sortedCombinations = combinations.map(([first, second]) =>
      getSortedRecipe(first, second)
    );

    for (const recipe of sortedCombinations) {
      let result = recipeExists(recipe);
      if (!result) {
        result = await combine(recipe);
      }
      if (result && result !== "Nothing") {
        results.add(result);
      }
    }

    return results;
  }
})();
