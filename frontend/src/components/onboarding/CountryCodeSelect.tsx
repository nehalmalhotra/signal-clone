import { ChevronDown } from "lucide-react";
import { COUNTRIES } from "@/lib/phone";
import styles from "./CountryCodeSelect.module.css";

interface Props {
  region: string;
  onChange: (region: string) => void;
}

/** The small "+1 ⌄" control inside the phone field (design-tokens §7.1). */
export function CountryCodeSelect({ region, onChange }: Props) {
  const country = COUNTRIES.find((c) => c.region === region) ?? COUNTRIES[0];
  return (
    <div className={styles.wrap}>
      <select
        className={styles.select}
        value={region}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select country code"
      >
        {COUNTRIES.map((c) => (
          <option key={c.region} value={c.region}>
            {c.name} (+{c.code})
          </option>
        ))}
      </select>
      <span className={styles.display} aria-hidden>
        +{country.code}
        <ChevronDown size={14} />
      </span>
    </div>
  );
}
