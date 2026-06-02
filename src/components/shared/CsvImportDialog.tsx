import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from "lucide-react";

interface ColumnMapping {
  csvHeader: string;
  dbColumn: string;
}

interface CsvImportDialogProps {
  tableName: string;
  label: string;
  requiredColumns: { key: string; label: string; required?: boolean }[];
  onSuccess?: () => void;
  onComplete?: (result: { fileName: string; total: number; success: number; errors: string[] }) => void;
  transformRow?: (row: Record<string, string>) => Record<string, any>;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if ((ch === "," || ch === ";") && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });

  return { headers, rows };
}

export default function CsvImportDialog({ tableName, label, requiredColumns, onSuccess, onComplete, transformRow }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setCsvData({ headers: [], rows: [] });
    setMappings([]);
    setResult({ success: 0, errors: [] });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        toast({ title: "Fichier vide ou invalide", variant: "destructive" });
        return;
      }
      setCsvData(parsed);

      // Auto-map columns by matching names
      const autoMappings = requiredColumns.map(col => {
        const match = parsed.headers.find(h =>
          h.toLowerCase().replace(/[_\s-]/g, "") === col.key.toLowerCase().replace(/[_\s-]/g, "") ||
          h.toLowerCase().replace(/[_\s-]/g, "") === col.label.toLowerCase().replace(/[_\s-]/g, "")
        );
        return { csvHeader: match ?? "", dbColumn: col.key };
      });
      setMappings(autoMappings);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    const errors: string[] = [];
    let success = 0;

    const rows = csvData.rows.map((csvRow, idx) => {
      const mapped: Record<string, any> = {};
      mappings.forEach(m => {
        if (m.csvHeader) {
          mapped[m.dbColumn] = csvRow[m.csvHeader] ?? null;
        }
      });
      return transformRow ? transformRow(mapped) : mapped;
    });

    // Check required fields
    const validRows = rows.filter((row, idx) => {
      const missing = requiredColumns.filter(c => c.required && !row[c.key]);
      if (missing.length > 0) {
        errors.push(`Ligne ${idx + 2}: champs manquants (${missing.map(m => m.label).join(", ")})`);
        return false;
      }
      return true;
    });

    // Batch insert
    if (validRows.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName as any).insert(batch as any);
        if (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          success += batch.length;
        }
      }
    }

    setResult({ success, errors });
    setStep("result");
    setImporting(false);
    if (success > 0) onSuccess?.();
    onComplete?.({ fileName, total: csvData.rows.length, success, errors });
  };

  const downloadTemplate = () => {
    const headers = requiredColumns.map(c => c.label).join(",");
    const blob = new Blob(["\uFEFF" + headers + "\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${tableName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mappedCount = mappings.filter(m => m.csvHeader).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <GhButton variant="secondary" size="sm">
          <Upload size={12} /> Import CSV
        </GhButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileText size={16} /> Importer {label}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <div className="text-sm font-medium text-foreground">Glissez un fichier CSV ou cliquez pour parcourir</div>
              <div className="text-[11px] text-muted-foreground mt-1">Formats acceptés : .csv (séparateur virgule ou point-virgule)</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            </div>
            <GhButton variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download size={12} /> Télécharger le template
            </GhButton>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {csvData.rows.length} lignes détectées · {mappedCount}/{requiredColumns.length} colonnes mappées
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {requiredColumns.map(col => {
                const mapping = mappings.find(m => m.dbColumn === col.key);
                return (
                  <div key={col.key} className="flex items-center gap-2">
                    <div className="w-1/3 text-[11px] font-medium text-foreground flex items-center gap-1">
                      {col.label}
                      {col.required && <span className="text-destructive">*</span>}
                    </div>
                    <span className="text-muted-foreground text-[10px]">←</span>
                    <select
                      value={mapping?.csvHeader ?? ""}
                      onChange={(e) => {
                        setMappings(prev => prev.map(m => m.dbColumn === col.key ? { ...m, csvHeader: e.target.value } : m));
                      }}
                      className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground"
                    >
                      <option value="">— Ignorer —</option>
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Preview first 3 rows */}
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Aperçu (3 premières lignes)</div>
              <div className="overflow-x-auto">
                <table className="text-[10px] w-full">
                  <thead>
                    <tr>
                      {mappings.filter(m => m.csvHeader).map(m => (
                        <th key={m.dbColumn} className="text-left px-2 py-1 text-muted-foreground font-mono">{m.dbColumn}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {mappings.filter(m => m.csvHeader).map(m => (
                          <td key={m.dbColumn} className="px-2 py-1 text-foreground truncate max-w-[120px]">{row[m.csvHeader]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <GhButton variant="ghost" onClick={() => setStep("upload")}>Retour</GhButton>
              <GhButton variant="primary" onClick={handleImport} disabled={importing || mappedCount === 0}>
                {importing ? "Import en cours…" : `Importer ${csvData.rows.length} lignes`}
              </GhButton>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {result.errors.length === 0 ? (
                <CheckCircle size={40} className="mx-auto text-gh-green mb-3" />
              ) : (
                <AlertTriangle size={40} className="mx-auto text-gh-amber mb-3" />
              )}
              <div className="text-lg font-bold text-foreground">{result.success} lignes importées</div>
              {result.errors.length > 0 && (
                <div className="text-sm text-muted-foreground">{result.errors.length} erreur(s)</div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 max-h-[150px] overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-[10px] text-destructive mb-1">{e}</div>
                ))}
              </div>
            )}
            <GhButton variant="primary" onClick={() => { setOpen(false); reset(); }} className="w-full">
              Fermer
            </GhButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
