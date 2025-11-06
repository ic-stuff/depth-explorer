import { baseBaseElements, fullBaseSet } from "~/config";
import { nealCase, type NealCasedString } from "./nealcase";
import type { SortedRecipe } from "./sorted-recipe";

export function generateLineageFromResults(
  results: string[],
  precomputedRecipesRes: Map<string, SortedRecipe[]>,
  recipesRes: Map<string, Set<`${NealCasedString}=${NealCasedString}`>>,
  allowBaseElements = true
) {
  const toUse = new Set<NealCasedString>(
    allowBaseElements ? fullBaseSet : baseBaseElements
  );
  const toAdd = new Set(results);
  let recipe = [];

  // required to make different cases work THIS WAS A PAIN TO CODE

  const correctCaseMap = new Map<NealCasedString, string>();

  while (toAdd.size > 0) {
    let addedSmth = false;
    for (const result of toAdd) {
      const sortedrecipes: SortedRecipe[] =
        precomputedRecipesRes.get(result) ||
        Array.from(recipesRes.get(result)!).map(
          (x) => x.split("=") as SortedRecipe
        );

      const validRecipe = sortedrecipes.find(
        ([first, second]) =>
          toUse.has(first) &&
          toUse.has(second) &&
          (!correctCaseMap.has(first) ||
            correctCaseMap.get(first) !== result) &&
          (!correctCaseMap.has(second) || correctCaseMap.get(second) !== result)
      );

      if (validRecipe) {
        recipe.push([
          ...validRecipe.map((x) =>
            correctCaseMap.has(x) ? correctCaseMap.get(x) : x
          ),
          result,
        ] as const);
        const icResult = nealCase(result);
        toUse.add(icResult);
        correctCaseMap.set(icResult, result);
        toAdd.delete(result);
        addedSmth = true;
      }
    }
    if (!addedSmth)
      return [...recipe, ...["could", "not generate", "Lineage"]] as const;
  }
  return recipe;
}
