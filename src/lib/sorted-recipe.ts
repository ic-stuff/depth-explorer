import { nealCase, type NealCasedString } from "./nealcase";

export type NealCasedRecipe = [NealCasedString, NealCasedString];

export type SortedRecipe = NealCasedRecipe & { $brand: "SortedRecipe" };

export type CombString = `${NealCasedString}=${NealCasedString}`;

export function getSortedRecipe(first: string, second: string): SortedRecipe {
  return [nealCase(first), nealCase(second)].toSorted() as SortedRecipe;
}

export function splitRecipeString(combString: CombString): NealCasedRecipe {
  return combString.split("=") as NealCasedRecipe;
}
