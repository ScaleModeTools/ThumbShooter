export function composeMapEditorLayoutClassName(
  ...classNames: readonly (false | null | string | undefined)[]
): string {
  return classNames
    .filter((className): className is string => typeof className === "string" && className.length > 0)
    .join(" ");
}
