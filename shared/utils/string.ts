/** Converts a SNAKE_CASE (or snake_case) identifier to Title Case, e.g. `PAYLOAD_TOO_LARGE` -> `Payload Too Large`. */
export function snakeCaseToTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
