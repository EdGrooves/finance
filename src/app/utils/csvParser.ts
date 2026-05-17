export interface ReviewRow {
  id: string;
  date: string;             // ISO YYYY-MM-DD
  description: string;
  originalCategory: string; // raw from CSV
  category: string;         // mapped + validated
  amount: number;           // always positive
  isShared: boolean;
  skip: boolean;
}

// RFC 4180-compliant quoted CSV parser
export function parseQuotedCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let inQuotes = false;
  let row: string[] = [];
  const t = text.replace(/^\uFEFF/, ""); // strip BOM

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const next = t[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && next === '\n') i++;
        row.push(field); field = "";
        if (row.some(f => f.trim())) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); if (row.some(f => f.trim())) rows.push(row); }
  return rows;
}

// "15.05.2026" → "2026-05-15"
export function parseGermanDate(s: string): string | null {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// '"-21,68 €"' → -21.68
export function parseGermanAmount(s: string): number | null {
  const clean = s.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isFinite(n) ? n : null;
}

export function parseBankCsv(
  text: string,
  csvMappings: Record<string, string>,
  knownCategories: string[],
): ReviewRow[] {
  const grid = parseQuotedCsv(text);
  if (grid.length < 2) throw new Error("CSV file is empty");

  const header = grid[0].map(h => h.trim());
  const idx = (name: string) => header.indexOf(name);

  const colDate = idx("Buchungsdatum");
  const colBetrag = idx("Betrag");
  const colBeschreibung = idx("Beschreibung");
  const colVerwendung = idx("Verwendungszweck");
  const colEmpfaenger = idx("Zahlungsempfänger");
  const colKategorie = idx("Kategorie");

  if (colDate === -1 || colBetrag === -1)
    throw new Error("CSV does not look like a supported bank export (missing Buchungsdatum or Betrag columns)");

  const rows: ReviewRow[] = [];
  let idCounter = 0;

  for (let i = 1; i < grid.length; i++) {
    const cols = grid[i];
    const get = (i: number) => (i >= 0 && i < cols.length ? cols[i].trim() : "");

    const dateStr = parseGermanDate(get(colDate));
    if (!dateStr) continue;

    const amountRaw = parseGermanAmount(get(colBetrag));
    if (amountRaw === null || amountRaw >= 0) continue; // skip income / zero

    const description =
      get(colBeschreibung) || get(colVerwendung) || get(colEmpfaenger) || "Unknown";

    const originalCategory = get(colKategorie) || "Other";
    const mapped = csvMappings[originalCategory] ?? originalCategory;
    const category = knownCategories.includes(mapped) ? mapped : "Other";

    rows.push({
      id: String(idCounter++),
      date: dateStr,
      description,
      originalCategory,
      category,
      amount: Math.abs(amountRaw),
      isShared: false,
      skip: false,
    });
  }

  if (rows.length === 0) throw new Error("No expense rows found in CSV");
  return rows;
}
