import type { IC_Container_VUE_CraftApiResponse } from "@infinite-craft/dom-types";

import { baseElements, config, fullBaseSet } from "~/config";
import { nealCase } from "~/lib/nealcase";
import { delay } from "~/lib/delay";
import { getSortedRecipe, type SortedRecipe } from "~/lib/sorted-recipe";
import { makeLineage } from "~/lib/make-lineage";
import { generateLineageFromResults } from "~/lib/generate-lineage-from-results";

import type { CombString } from "~/types";

declare const unsafeWindow: Window;

let __VUE__ = document.querySelector(".infinite-craft").__vue__;

const emojiMap: Map<string, IC_Container_VUE_CraftApiResponse> = new Map();
let elementStorageSet: Set<string> = new Set();

window.addEventListener("load", async () => {
  while (!unsafeWindow.IC) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  __VUE__ = document.querySelector(".infinite-craft").__vue__;
  const items = unsafeWindow.IC.getItems();
  elementStorageSet = new Set(items.map((x) => x.text));
});

const endElements = new Set([
  "Hashtag",
  "Punctuation",
  "Grammar",
  "Grammar",
  "Sentence",
  "Quote",
  "Phrase",
  "Period",
  "Comma",
  "Colon",
  "Semicolon",
  "Parenthesis",
  "Parentheses",
  "Slash",
  "Alphabetical",
  "Ampersand",
  "Abrreviation",
  "Not",
  "Quotation",
  "Hyphen",
  "Dash",
  "Addition",
  "Minus",
  "Plus",
  "Division",
  "Multiplication",
  "Factorial",
  "Exponentiation",
  "Exponent",
  "Power",
  "Plural",
  "Cross",
  "Human",
  "Cow",
  "Ocean",
  "King",
  "Palindrome",
]);

const depthLists = [/* Depth */ new Set(["" /* Seed (starts empty) */])];
const encounteredElements = new Map<string, string[][]>(); // { element: seeds }

const recipesIng: Record<CombString, string> = GM_getValue("recipesIng", {});
const recipesRes = new Map<string, Set<CombString>>();

const precomputedRecipesRes = new Map(); // optimization for printing all Lineages

unsafeWindow.depthExplorer = function () {
  if (startTime === 0) {
    depthExplorer();
    return "New Depth Explorer started!!!! Wowies, i can't wait for the results!!!1";
  }
  return "Refresh the tab before starting the bot again. you've done this mistake before...";
};

unsafeWindow.depthExplorerClearNothings = function () {
  let count = 0;
  // Iterate through the object keys
  for (const _key in recipesIng) {
    const key = _key as CombString;
    if (recipesIng[key] === "Nothing") {
      delete recipesIng[key]; // Remove the entry
      count++;
    }
  }
  return `Removed ${count} recipes with 'Nothing'` as const;
};

unsafeWindow.depthExplorerTimeSinceStart = function () {
  const timeSinceStart = (Date.now() - startTime) / 1000;
  return `Time since start: ${timeSinceStart}s` as const;
};

unsafeWindow.depthExplorerLineage = function (element: string) {
  return encounteredElements.has(element)
    ? makeLineage(
        encounteredElements.get(element),
        `${element} Lineage`,
        precomputedRecipesRes,
        recipesRes
      ).join(" ")
    : "This Element has not been made...";
};

unsafeWindow.depthExplorerLineages = function () {
  if (encounteredElements.size === 0)
    return "start the bot before running this! You stoopid.";

  const content = [];

  content.push(
    generateLineageFromResults(
      baseElements,
      precomputedRecipesRes,
      recipesRes,
      false
    )
      .map((recipe) => `${recipe[0]} + ${recipe[1]} = ${recipe[2]}`)
      .join("\n") + `  // ${baseElements.length}`
  );

  const genCounts = Array(depth + 1).fill(0);
  encounteredElements.forEach((seeds) => genCounts[seeds[0]!.length - 1]++);
  let runningTotal = 0;
  content.push(
    genCounts
      .map((count, index) => {
        runningTotal += genCounts[index];
        return `Gen ${
          index + 1
        } - ${count} Elements -> ${runningTotal} Total Elements`;
      })
      .join("\n")
  );

  content.push(
    JSON.stringify(
      Object.fromEntries(
        Array.from(encounteredElements, ([element, seed]) => [
          element,
          seed[0]!.length,
        ])
      ),
      null,
      2
    )
  );

  console.time("Generate Lineages File");
  for (const [result, recipes] of recipesRes.entries()) {
    precomputedRecipesRes.set(
      result,
      Array.from(recipes).map((x) => x.split("="))
    );
  }

  content.push(
    Array.from(encounteredElements.entries())
      .map(([element, lineage]) =>
        makeLineage(lineage, element, precomputedRecipesRes, recipesRes).join(
          " "
        )
      )
      .join("\n\n")
  );

  precomputedRecipesRes.clear();
  console.timeEnd("Generate Lineages File");

  const blob = new Blob([content.join("\n\n\n\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${baseElements[baseElements.length - 1]} Seed - ${Math.floor(
    (processedSeeds / totalSeeds) * 100
  )}p gen ${depth + 1}.txt`;

  a.click();
  return "Downloaded all lineages.";
};

window.addEventListener("beforeunload", () => {
  GM_setValue("recipesIng", recipesIng);
  console.log("Saved Recipes");
});
setInterval(() => {
  GM_setValue("recipesIng", recipesIng);
  console.log("Saved Recipes");
}, 5 * 60 * 1000);

let processedSeeds = 0;
let totalSeeds = 0;
let depth = 0;
let startTime = 0;

async function depthExplorer() {
  startTime = Date.now();
  function printSeedProgress() {
    console.log(
      processedSeeds,
      "/",
      totalSeeds,
      "seeds processed -",
      Math.round((processedSeeds / totalSeeds) * 100 * 100) / 100,
      "%"
    );
  }

  const interval = setInterval(() => {
    printSeedProgress();
  }, 10 * 1000); // 10 seconds

  // calculate depth1 ONCE
  const depth1 = await processCombinations(allCombinations([...fullBaseSet]));

  while (true) {
    depthLists[depth + 1] = new Set();
    processedSeeds = 0;
    totalSeeds = depthLists[depth]!.size;

    async function worker(
      seedGen: Generator<string, void, unknown>
    ): Promise<void> {
      for (let seed of seedGen) {
        const seedAsArray = seed === "" ? [] : seed.split("=");

        const combElements = [
          ...seedAsArray.map((x) => nealCase(x)),
          ...fullBaseSet,
        ];

        const allResults = new Set(depth1); // use prebcalculated depth1
        // do all non base-base combinations as those are already in depth1

        for (let i = 0; i < seedAsArray.length; i++) {
          for (let j = 0; j < combElements.length; j++) {
            const combination = getSortedRecipe(
              combElements[i]!,
              combElements[j]!
            );
            const recExists = recipeExists(combination);

            const result = recExists ? recExists : await combine(combination);

            if (result && result !== "Nothing") allResults.add(result);
          }
        }

        for (const result of allResults) {
          if (seedAsArray.includes(result) || fullBaseSet.has(result)) continue;

          if (encounteredElements.has(result)) {
            if (encounteredElements.get(result)![0]!.length - 1 === depth) {
              encounteredElements
                .get(result)!
                .push([...seedAsArray, result].toSorted());
            }
          } else {
            encounteredElements.set(result, [
              [...seedAsArray, result].toSorted(),
            ]);
            console.log(depth + 1, "-", result);
            if (encounteredElements.size % 100 === 0) printSeedProgress();

            if (
              endElements.has(result) ||
              result.length === 1 ||
              (result.length === 3 && result[0] === result[result.length - 1])
            ) {
              console.log(
                ...makeLineage(
                  encounteredElements.get(result)!,
                  `${result} Lineage` as const,
                  precomputedRecipesRes,
                  recipesRes
                )
              );
            }
          }

          if (depth < config.stopAfterDepth - 1 && result.length <= 30) {
            const newSeed = [...seedAsArray, result];

            let countDepth1s = 0;
            let nonDepth1 = false;
            for (const res of newSeed) {
              if (depth1.has(res)) countDepth1s++;
              else nonDepth1 = true;
            }

            if (nonDepth1 || countDepth1s <= 2)
              depthLists[depth + 1]!.add(newSeed.toSorted().join("="));
          }
        }
        processedSeeds++;
      }
    }

    // parallize set iterator (3 fancy words)
    function* seedGenerator(set: Set<string>) {
      for (const item of set) {
        yield item;
      }
    }

    const seedGen = seedGenerator(depthLists[depth]!);
    const workers = Array(config.parallelBots)
      .fill(undefined)
      .map(() => worker(seedGen));

    await Promise.all(workers); // wait for all workers to finish

    console.log(
      "Depth:",
      depth + 1,
      "completed!",
      "\nTime:",
      (Date.now() - startTime) / 1000,
      "s\nSeeds:",
      totalSeeds,
      "->",
      depthLists[depth]!.size,
      "\nElements:",
      encounteredElements.size,
      encounteredElements
    );
    if (depth > config.stopAfterDepth - 2) return "Done.";

    depth++;
  }
  clearInterval(interval);
}

function allCombinations(array: string[]): SortedRecipe[] {
  const combinations = [];
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

let lastCombination = Date.now();

async function combine(recipe: SortedRecipe): Promise<string | undefined> {
  const [first, second] = recipe;

  if (first.length > 30 || second.length > 30) return;

  const combString = `${first}=${second}` as const;

  const existingRecipes = recipeExists(recipe);

  if (existingRecipes) return existingRecipes;

  const promise = (async () => {
    const waitingDelay = Math.max(
      0,
      config.combineTimeMs - (Date.now() - lastCombination)
    );
    lastCombination = Date.now() + waitingDelay;
    await delay(waitingDelay);

    const existingRecipes = recipeExists(recipe);
    if (existingRecipes) return existingRecipes;

    const response = await __VUE__.craftApi(first, second);

    const text = response?.text;

    if (text) {
      recipesIng[combString] = text;
      if (!recipesRes.has(text)) recipesRes.set(text, new Set());
      recipesRes.get(text)!.add(combString);

      if (text !== "Nothing") {
        emojiMap.set(text, response);
      }

      addElementToStorage(text); // == Patched by GameRoMan ==

      return text;
    }
  })();

  const text = await promise;
  return text;
}
function createElementInStorage(elementText: string) {
  const items = __VUE__.items;

  const toPush = {
    id: items.length,
    saveId: 0,
    text: elementText,
    emoji: "⬜",
    discovery: false,
    recipes: [],
  };

  items.push(toPush);

  // Add to IndexedDB
  const request = indexedDB.open("infinite-craft");

  request.onsuccess = (event) => {
    const db = (event.target as typeof request).result;
    const transaction = db.transaction("items", "readwrite");
    const store = transaction.objectStore("items");
    store.put(toPush);
  };
}

function addElementToStorage(elementText: string) {
  if (
    !elementText ||
    !emojiMap.has(elementText) ||
    elementStorageSet.has(elementText) ||
    unsafeWindow.IC.getItems().filter((e) => e.text === elementText).length !==
      0
  ) {
    return;
  }

  elementStorageSet.add(elementText);

  const element = emojiMap.get(elementText)!;

  const items = __VUE__.items;

  const recipesForElement: [number, number][] = [];

  for (const recipe of recipesRes.get(element.text)!) {
    const [first, second] = recipe.split("=") as SortedRecipe;
    let firstElementId = items.findIndex((x) => x.text === first);
    let secondElementId = items.findIndex((x) => x.text === second);

    if (firstElementId === -1) {
      createElementInStorage(first);
      firstElementId = items.findIndex((x) => x.text === first);
    }

    if (secondElementId === -1) {
      createElementInStorage(second);
      secondElementId = items.findIndex((x) => x.text === second);
    }

    if (firstElementId >= 0 && secondElementId >= 0) {
      recipesForElement.push([firstElementId, secondElementId]);
    }
  }

  const toPush = {
    id: items.length,
    saveId: 0,
    text: element.text,
    emoji: element.emoji,
    discovery: element.discovery ?? false,
    recipes: [...recipesForElement],
  };

  items.push(toPush);

  // Add to IndexedDB
  const request = indexedDB.open("infinite-craft");

  request.onsuccess = (event) => {
    const db = (event.target as typeof request).result;
    const transaction = db.transaction("items", "readwrite");
    const store = transaction.objectStore("items");
    store.put(toPush);
  };
}

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
