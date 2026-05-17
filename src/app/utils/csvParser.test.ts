import { describe, it, expect } from "vitest";
import { parseQuotedCsv, parseGermanDate, parseGermanAmount, parseBankCsv } from "./csvParser";

// ── parseQuotedCsv ────────────────────────────────────────────────────────────

describe("parseQuotedCsv", () => {
  it("parses simple row", () => {
    expect(parseQuotedCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  it("parses quoted field with comma", () => {
    expect(parseQuotedCsv('"hello, world",b')).toEqual([["hello, world", "b"]]);
  });

  it("parses escaped double-quote inside quotes", () => {
    expect(parseQuotedCsv('"say ""hi""",b')).toEqual([['say "hi"', "b"]]);
  });

  it("strips UTF-8 BOM", () => {
    expect(parseQuotedCsv("\uFEFFa,b")).toEqual([["a", "b"]]);
  });

  it("handles CRLF line endings", () => {
    const result = parseQuotedCsv("a,b\r\nc,d");
    expect(result).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("skips blank lines", () => {
    const result = parseQuotedCsv("a,b\n\nc,d");
    expect(result).toHaveLength(2);
  });

  it("handles trailing content without newline", () => {
    const result = parseQuotedCsv("a,b\nc,d");
    expect(result).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("parses quoted amount like german bank", () => {
    expect(parseQuotedCsv('"-21,68 €"')).toEqual([["-21,68 €"]]);
  });
});

// ── parseGermanDate ───────────────────────────────────────────────────────────

describe("parseGermanDate", () => {
  it("converts DD.MM.YYYY to ISO", () => {
    expect(parseGermanDate("15.05.2026")).toBe("2026-05-15");
  });

  it("pads single-digit day and month", () => {
    expect(parseGermanDate("1.3.2024")).toBe("2024-03-01");
  });

  it("returns null for invalid format", () => {
    expect(parseGermanDate("2026-05-15")).toBeNull();
    expect(parseGermanDate("")).toBeNull();
    expect(parseGermanDate("32.13.2024")).toBe("2024-13-32"); // regex matches, no semantic validation
  });
});

// ── parseGermanAmount ─────────────────────────────────────────────────────────

describe("parseGermanAmount", () => {
  it("parses negative amount with euro sign", () => {
    expect(parseGermanAmount("-21,68 €")).toBeCloseTo(-21.68);
  });

  it("parses positive amount", () => {
    expect(parseGermanAmount("100,00 €")).toBeCloseTo(100);
  });

  it("parses without euro sign", () => {
    expect(parseGermanAmount("-5,50")).toBeCloseTo(-5.5);
  });

  it("returns null for non-numeric", () => {
    expect(parseGermanAmount("abc")).toBeNull();
    expect(parseGermanAmount("")).toBeNull();
  });
});

// ── parseBankCsv ──────────────────────────────────────────────────────────────

const CATS = ["Groceries", "Transportation", "Other"];
const MAPPINGS: Record<string, string> = { Lebensmittel: "Groceries", Mobilität: "Transportation" };

function makeCsv(rows: string[]): string {
  const header = "Buchungsdatum,Betrag,Beschreibung,Verwendungszweck,Zahlungsempfänger,Kategorie";
  return [header, ...rows].join("\n");
}

describe("parseBankCsv", () => {
  it("throws on empty CSV", () => {
    expect(() => parseBankCsv("", MAPPINGS, CATS)).toThrow("empty");
  });

  it("throws when header only (no data rows)", () => {
    expect(() => parseBankCsv("Buchungsdatum,Betrag", MAPPINGS, CATS)).toThrow("empty");
  });

  it("throws when required columns missing", () => {
    expect(() => parseBankCsv("Foo,Bar\n1,2", MAPPINGS, CATS)).toThrow("missing Buchungsdatum or Betrag");
  });

  it("parses a valid expense row", () => {
    const csv = makeCsv([`15.05.2026,"-21,68 €",Rewe,,,Lebensmittel`]);
    const rows = parseBankCsv(csv, MAPPINGS, CATS);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-05-15",
      description: "Rewe",
      category: "Groceries",
      originalCategory: "Lebensmittel",
      amount: 21.68,
      isShared: false,
      skip: false,
    });
  });

  it("skips income (positive amounts)", () => {
    const csv = makeCsv([`15.05.2026,"100,00 €",Salary,,,Other`]);
    expect(() => parseBankCsv(csv, MAPPINGS, CATS)).toThrow("No expense rows");
  });

  it("skips zero amounts", () => {
    const csv = makeCsv([`15.05.2026,"0,00 €",Fee,,,Other`]);
    expect(() => parseBankCsv(csv, MAPPINGS, CATS)).toThrow("No expense rows");
  });

  it("skips rows with invalid date", () => {
    const csv = makeCsv([
      `bad-date,"-10,00 €",X,,,Other`,
      `15.05.2026,"-10,00 €",Valid,,,Other`,
    ]);
    const rows = parseBankCsv(csv, MAPPINGS, CATS);
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Valid");
  });

  it("uses Verwendungszweck if Beschreibung empty", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",,Verwendung,,Other`]);
    expect(parseBankCsv(csv, MAPPINGS, CATS)[0].description).toBe("Verwendung");
  });

  it("uses Zahlungsempfänger as last fallback", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",,,Empfaenger,Other`]);
    expect(parseBankCsv(csv, MAPPINGS, CATS)[0].description).toBe("Empfaenger");
  });

  it("falls back to Unknown when all description cols empty", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",,,,Other`]);
    expect(parseBankCsv(csv, MAPPINGS, CATS)[0].description).toBe("Unknown");
  });

  it("maps category via csvMappings", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",X,,,Mobilität`]);
    expect(parseBankCsv(csv, MAPPINGS, CATS)[0].category).toBe("Transportation");
  });

  it("defaults unknown category to Other", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",X,,,UnknownBank`]);
    const row = parseBankCsv(csv, MAPPINGS, CATS)[0];
    expect(row.category).toBe("Other");
    expect(row.originalCategory).toBe("UnknownBank");
  });

  it("empty Kategorie column defaults to Other", () => {
    const csv = makeCsv([`15.05.2026,"-10,00 €",X,,,`]);
    expect(parseBankCsv(csv, MAPPINGS, CATS)[0].category).toBe("Other");
  });

  it("assigns sequential ids", () => {
    const csv = makeCsv([
      `15.05.2026,"-10,00 €",A,,,Other`,
      `16.05.2026,"-20,00 €",B,,,Other`,
    ]);
    const rows = parseBankCsv(csv, MAPPINGS, CATS);
    expect(rows[0].id).toBe("0");
    expect(rows[1].id).toBe("1");
  });
});
