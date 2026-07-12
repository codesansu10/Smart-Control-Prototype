export function numberFormat(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function compactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value);
}

export function percent(value: number, digits = 1): string {
  return `${numberFormat(value * 100, digits)}%`;
}
