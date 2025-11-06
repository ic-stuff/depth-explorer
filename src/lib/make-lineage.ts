import { generateLineageFromResults } from "./generate-lineage-from-results";
import type { NealCasedString } from "./nealcase";
import type { SortedRecipe } from "./sorted-recipe";

/**
 * Generates a valid lineage using just the results
 */
export function makeLineage(
  lineages: string[][],
  element: string,
  precomputedRecipesRes: Map<string, SortedRecipe[]>,
  recipesRes: Map<string, Set<`${NealCasedString}=${NealCasedString}`>>
) {
  return [
    lineages[0]!.length,
    `- ${element}:`,
    lineages
      .map((lineage) =>
        generateLineageFromResults(lineage, precomputedRecipesRes, recipesRes)
          .map(
            (recipe) => `\n${recipe[0]} + ${recipe[1]} = ${recipe[2]}` as const
          )
          .join("")
      )
      .join("\n ..."),
  ] as const;
}
