import CRC32 from "crc-32";

export function i18nKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const hash = (CRC32.str(`${label.length}:${label}`) >>> 0).toString(16);
  return `${slug}_${hash}`;
}
