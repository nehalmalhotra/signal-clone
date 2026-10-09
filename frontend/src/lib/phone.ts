// Country calling codes for the phone step. Signal lists every region; we keep a short list
// (D-43) because nothing is ever actually sent to the number.

export interface Country {
  region: string;
  name: string;
  code: string; // calling code without the "+"
}

export const COUNTRIES: Country[] = [
  { region: "US", name: "United States", code: "1" },
  { region: "CA", name: "Canada", code: "1" },
  { region: "IN", name: "India", code: "91" },
  { region: "GB", name: "United Kingdom", code: "44" },
  { region: "DE", name: "Germany", code: "49" },
  { region: "FR", name: "France", code: "33" },
  { region: "AU", name: "Australia", code: "61" },
  { region: "BR", name: "Brazil", code: "55" },
  { region: "JP", name: "Japan", code: "81" },
  { region: "SG", name: "Singapore", code: "65" },
  { region: "AE", name: "United Arab Emirates", code: "971" },
];

/** "+1" and "(555) 010-0" -> "+15550100". Returns null unless it matches the backend's E.164 rule. */
export function toE164(callingCode: string, localNumber: string): string | null {
  const digits = localNumber.replace(/\D/g, "");
  const full = `+${callingCode}${digits}`;
  return /^\+[0-9]{7,15}$/.test(full) ? full : null;
}
