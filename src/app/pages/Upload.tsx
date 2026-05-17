import { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { apiImportTransactions } from "../api/client";
import { useCategories } from "../hooks/useCategories";
import { parseBankCsv } from "../utils/csvParser";
import { ImportReviewModal } from "../components/ImportReviewModal";
import type { ReviewRow } from "../utils/csvParser";

export function Upload() {
  const { transactionCategories, csvMappings } = useCategories();
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);

  const handleFiles = (fileList: FileList) => {
    setParseError(null);
    setImportResult(null);
    const csvFile = Array.from(fileList).find(f => f.name.toLowerCase().endsWith(".csv"));
    if (!csvFile) { setParseError("Please select a CSV file."); return; }
    if (csvFile.size > 5 * 1024 * 1024) { setParseError("File is larger than 5MB."); return; }

    void csvFile.text().then(text => {
      try {
        const rows = parseBankCsv(text, csvMappings, transactionCategories);
        setReviewRows(rows);
      } catch (err: any) {
        setParseError(err?.message || "Failed to parse CSV");
      }
    });
  };

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop: (item: { files: FileList }) => { if (item.files) handleFiles(item.files); },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [csvMappings]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleRowChange = (id: string, patch: Partial<ReviewRow>) => {
    setReviewRows(prev => prev ? prev.map(r => r.id === id ? { ...r, ...patch } : r) : prev);
  };

  const handleToggleAllShared = (shared: boolean) => {
    setReviewRows(prev => prev ? prev.map(r => r.skip ? r : { ...r, isShared: shared }) : prev);
  };

  const handleImport = async () => {
    if (!reviewRows) return;
    const active = reviewRows.filter(r => !r.skip);
    if (active.length === 0) return;

    setImporting(true);
    try {
      const result = await apiImportTransactions(
        active.map(r => ({
          Date: r.date,
          Description: r.description,
          Category: r.category,
          Amount: r.amount,
          isShared: r.isShared,
        }))
      );
      setImportResult({ imported: result.imported, failed: result.failed });
      setReviewRows(null);
    } catch (err: any) {
      setParseError(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>Upload Transactions</h1>
        <p className="text-gray-500">Import your bank transactions via CSV export</p>
      </div>

      <div className="max-w-3xl">
        {/* Drop Zone */}
        <div
          ref={drop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isOver || isDragging
              ? "border-green-500 bg-green-50"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
          />
          <div className="pointer-events-none">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UploadIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>Drop your CSV here</h3>
            <p className="text-gray-500 mb-4">or click to browse</p>
            <p className="text-sm text-gray-400">Supports C24/DKB-style German bank exports · max 5MB</p>
          </div>
        </div>

        {/* Supported format hint */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Supported columns (German bank export)</p>
          <p className="font-mono text-xs text-blue-600">Buchungsdatum · Betrag · Beschreibung / Verwendungszweck · Kategorie</p>
          <p className="mt-2 text-blue-500 text-xs">
            Map German category names → app categories in <a href="/settings" className="underline">Settings → CSV Category Mapping</a>
          </p>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {parseError}
          </div>
        )}

        {/* Success */}
        {importResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            <p className="font-semibold mb-0.5">Import complete</p>
            <p>{importResult.imported} transactions imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}.</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewRows && (
        <ImportReviewModal
          rows={reviewRows}
          categories={transactionCategories}
          onRowChange={handleRowChange}
          onToggleAllShared={handleToggleAllShared}
          onImport={handleImport}
          onCancel={() => setReviewRows(null)}
          importing={importing}
        />
      )}
    </div>
  );
}
