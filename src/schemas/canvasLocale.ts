import { z } from "zod";

export function canvasLocaleSchema(localeCode: string) {
  return z.object({
    [localeCode]: z.record(z.string(), z.unknown()),
  });
}

export type CanvasLocaleData = z.infer<ReturnType<typeof canvasLocaleSchema>>;

export function getTranslation(
  parsed: Record<string, Record<string, unknown>>,
  localeCode: string,
  i18nKey: string,
): string | undefined {
  const val = parsed[localeCode]?.[i18nKey];
  return typeof val === "string" ? val : undefined;
}
