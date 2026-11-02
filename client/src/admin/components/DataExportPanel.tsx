import { useState } from "react";
import { BookUser, CalendarClock, Download, FileSpreadsheet, FileText, ReceiptText, Wallet } from "lucide-react";

import { downloadExport, type ExportDataset } from "../../api/adminTools";

const datasets: { key: ExportDataset; title: string; detail: string; icon: typeof FileText }[] = [
  { key: "students", title: "Students", detail: "Every student with contact details, status, active courses, batch and how they were admitted.", icon: BookUser },
  { key: "enquiries", title: "Enquiries", detail: "All website enquiries with course, message, status and admission number if admitted.", icon: FileText },
  { key: "batches", title: "Batches", detail: "Batch timings, days, seats filled and instructor.", icon: CalendarClock },
  { key: "fees", title: "Fee plans", detail: "Total, discount, paid and balance for every fee plan.", icon: Wallet },
  { key: "payments", title: "Payments", detail: "Every recorded payment with receipt number, date, method and reference.", icon: ReceiptText },
];

export function DataExportPanel() {
  const [pending, setPending] = useState<ExportDataset | null>(null);
  const [error, setError] = useState("");

  const download = async (dataset: ExportDataset) => {
    setPending(dataset);
    setError("");

    try {
      await downloadExport(dataset);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The export could not be downloaded.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="records-panel settings-tools__card" aria-labelledby="export-title">
      <div className="settings-tools__card-head">
        <h2 id="export-title">Data export</h2>
        <p>Download Excel copies for backups, reports or your accountant. Each download is recorded in the activity log.</p>
      </div>

      {error && (
        <div className="records-notice records-notice--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="settings-exports">
        {datasets.map(({ key, title, detail, icon: Icon }) => (
          <article key={key} className="settings-export">
            <span className="settings-export__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
            <button
              type="button"
              className="records-button"
              disabled={pending !== null}
              onClick={() => void download(key)}
              aria-label={`Download ${title} as Excel`}
            >
              {pending === key ? <FileSpreadsheet size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
              {pending === key ? "Preparing…" : "Download .xlsx"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
