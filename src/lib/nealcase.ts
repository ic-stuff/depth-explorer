export type NealCasedString = string & { $brand: "NealCasedString" };

export function nealCase(input: string): NealCasedString {
  let result = "";
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const char = input[i]!;
    result +=
      i === 0 || input[i - 1] === " " ? char.toUpperCase() : char.toLowerCase();
  }

  return result as NealCasedString;
}
