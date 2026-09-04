import type { Options } from "@oxlint/plugins";

type OptionValue = Options[number];
type OptionObject = Exclude<OptionValue, string | number | boolean | null | readonly unknown[]>;

const isOptionObject = (value: OptionValue | undefined): value is OptionObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The numeric option `key` from the first options object, or `fallback` when it is absent. */
export const numberOption = (options: Readonly<Options>, key: string, fallback: number): number => {
  const first = options[0];
  if (!isOptionObject(first)) return fallback;
  const value = first[key];
  if (typeof value === "number") return value;
  return fallback;
};

/** The string list option `key` from the first options object, or `fallback` when it is absent. */
export const stringsOption = (
  options: Readonly<Options>,
  key: string,
  fallback: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const first = options[0];
  if (!isOptionObject(first)) return fallback;
  const value = first[key];
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((entry) => typeof entry === "string");
  if (strings.length !== value.length) return fallback;
  return strings;
};
