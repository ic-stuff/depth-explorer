import { nealCase, type NealCasedString } from "./nealcase";

export type SortedRecipe = [NealCasedString, NealCasedString] & {
  $brand: "SortedRecipe";
};

export function getSortedRecipe(first: string, second: string): SortedRecipe {
  return [nealCase(first), nealCase(second)].toSorted() as SortedRecipe;
}
