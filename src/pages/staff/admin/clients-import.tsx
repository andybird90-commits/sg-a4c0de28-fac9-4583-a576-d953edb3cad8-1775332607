import React, { useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentValue += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentValue);
      currentValue = "";
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentValue += char;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeName(name: string | null | undefined): string {
  return (name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

interface ImportResult {
  totalRows: number;
  inserted: number;
  skipped: number;
}

const ClientsImportPage: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleImport = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStatus("Fetching CSV...");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/MASTER_CLIENT_DETAILS_ACTIVE_CLIENTS_1771837958.csv");
      if (!response.ok) {
        throw new Error("Failed to fetch CSV file from /public");
      }
      const text = await response.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        throw new Error("CSV file appears to be empty");
      }

      const header = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      const idx = (name: string): number => header.indexOf(name);

      const companyNameIdx = idx("company_name");
      if (companyNameIdx === -1) {
        throw new Error("Could not find 'company_name' column in CSV header");
      }

      const contactNameIdx = idx("contact_name");
      const titleIdx = idx("title");
      const emailIdx = idx("email");
      const phoneIdx = idx("phone");
      const landlineIdx = idx("landline");
      const addressIdx = idx("address");
      const bdmNameIdx = idx("bdm");
      const companyNumberIdx = idx("company_number");
      const utrIdx = idx("utr");
      const feePercentageIdx = idx("fee_percentage");
      const yearEndMonthIdx = idx("year_end_month");
      const refByIdx = idx("ref_by");
      const refFeeTextIdx = idx("ref_fee");
      const commentsIdx = idx("comments");

      setStatus("Loading BDM profiles...");
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) {
        throw new Error(`Failed to load profiles for BDM lookup: ${profilesError.message}`);
      }

      const bdmMap = new Map<string, string>();
      (profiles || []).forEach((p) => {
        const key = normalizeName((p as any).full_name as string | null);
        if (key) {
          bdmMap.set(key, (p as any).id as string);
        }
      });

      const records: any[] = [];
      let skipped = 0;

      for (const row of dataRows) {
        const companyName = (row[companyNameIdx] || "").trim();
        if (!companyName || companyName.toLowerCase().startsWith("=sum(")) {
          skipped += 1;
          continue;
        }

        const getValue = (index: number): string => {
          if (index < 0 || index >= row.length) return "";
          return (row[index] || "").trim();
        };

        const feePercentRaw = getValue(feePercentageIdx);
        let feePercent: number | null = null;
        if (feePercentRaw) {
          const numericPart = feePercentRaw.replace(/[^0-9.]/g, "");
          const parsed = Number(numericPart);
          if (!Number.isNaN(parsed)) {
            feePercent = parsed;
          }
        }

        const bdmNameRaw = getValue(bdmNameIdx);
        let bdmId: string | null = null;
        if (bdmNameRaw) {
          const key = normalizeName(bdmNameRaw);
          if (key && bdmMap.has(key)) {
            bdmId = bdmMap.get(key) || null;
          }
        }

        const commentsParts: string[] = [];
        const csvComments = getValue(commentsIdx);
        if (csvComments) {
          commentsParts.push(csvComments);
        }
        const refFeeText = getValue(refFeeTextIdx);
        if (refFeeText) {
          commentsParts.push(`Referral fee note: ${refFeeText}`);
        }
        const comments = commentsParts.length ? commentsParts.join("\n\n") : null;

        records.push({
          company_name: companyName,
          contact_name: getValue(contactNameIdx) || null,
          title: getValue(titleIdx) || null,
          email: getValue(emailIdx) || null,
          phone: getValue(phoneIdx) || null,
          landline: getValue(landlineIdx) || null,
          address: getValue(addressIdx) || null,
          bdm: bdmId,
          company_number: getValue(companyNumberIdx) || null,
          utr: getValue(utrIdx) || null,
          fee_percent: feePercent,
          year_end_month: getValue(yearEndMonthIdx) || null,
          ref_by: getValue(refByIdx) || null,
          ref_fee: null,
          comments,
        });
      }

      if (!records.length) {
        throw new Error("No valid data rows found to import");
      }

      setStatus(`Importing ${records.length} records into clients_to_be_onboarded...`);
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from("clients_to_be_onboarded").insert(batch);

        if (insertError) {
          throw new Error(`Insert failed after ${inserted} records: ${insertError.message}`);
        }
        inserted += batch.length;
        setStatus(`Imported ${inserted}/${records.length} records...`);
      }

      setStatus("Import completed successfully.");
      setResult({
        totalRows: dataRows.length,
        inserted,
        skipped,
      });
    } catch (e: any) {
      setError(e?.message || "Unknown error during import");
      setStatus("Import failed.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <StaffLayout title="Import Clients To Be Onboarded">
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-2xl font-semibold mb-4">Import Clients To Be Onboarded</h1>
        <p className="text-sm text-muted-foreground mb-4">
          This tool reads the CSV file{" "}
          <code className="bg-muted px-1 py-0.5 rounded">
            MASTER_CLIENT_DETAILS_ACTIVE_CLIENTS_1771837958.csv
          </code>{" "}
          from the public folder and imports each row into{" "}
          <code className="bg-muted px-1 py-0.5 rounded">clients_to_be_onboarded</code>. Only
          internal staff with an RD role can run this import.
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mb-4">
          <li>
            Fee percentages are parsed into the numeric field <code>fee_percent</code>.
          </li>
          <li>
            Referral fee text is preserved inside the <code>comments</code> field as{" "}
            <code>Referral fee note: ...</code>.
          </li>
          <li>
            BDM names are matched to profiles by <code>full_name</code>; unmatched BDMs are left
            blank.
          </li>
        </ul>
        <button
          type="button"
          onClick={handleImport}
          disabled={isRunning}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {isRunning ? "Running import..." : "Run Import"}
        </button>
        {status && (
          <p className="mt-4 text-sm">
            <span className="font-medium">Status:</span> {status}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">
            <span className="font-medium">Error:</span> {error}
          </p>
        )}
        {result && (
          <div className="mt-4 text-sm">
            <p className="font-medium">Result</p>
            <p>Total data rows in CSV (excluding header): {result.totalRows}</p>
            <p>Inserted rows: {result.inserted}</p>
            <p>Skipped rows (blank or summary lines): {result.skipped}</p>
          </div>
        )}
      </div>
    </StaffLayout>
  );
};

export default ClientsImportPage;