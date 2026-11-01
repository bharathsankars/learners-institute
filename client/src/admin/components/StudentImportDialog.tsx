import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  SearchCheck,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  confirmStudentImportFile,
  downloadStudentImportTemplate,
  previewStudentImportFile,
  StudentImportNotEligibleError,
  type StudentImportPreview,
  type StudentImportResult,
} from "../../api/studentImport";

import "../styles/StudentImportDialog.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type RowFilter = "ALL" | "VALID" | "INVALID" | "WARNINGS";

export function StudentImportDialog({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [filter, setFilter] = useState<RowFilter>("ALL");
  // One ID per previewed file: a retry reuses it so the server replays rather than re-imports.
  const [requestId, setRequestId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const submittingRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const element = dialogRef.current;
    if (!open || !element) return;

    if (!element.open) element.showModal();

    return () => {
      if (element.open) element.close();
    };
  }, [open]);

  if (!open) return null;

  const locked = busy || downloading || importing;

  const resetImport = () => {
    setPreview(null);
    setFilter("ALL");
    setError("");
    setRequestId(null);
    setConfirming(false);
    setResult(null);
  };

  const close = () => {
    if (locked) return;
    setFile(null);
    resetImport();
    onClose();
  };

  const selectFile = (candidate?: File) => {
    resetImport();

    if (!candidate) {
      setFile(null);
      return;
    }

    if (!candidate.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setError("Please select an Excel workbook in .xlsx format.");
      return;
    }

    if (candidate.size > 2 * 1024 * 1024) {
      setFile(null);
      setError("The maximum permitted file size is 2 MB.");
      return;
    }

    setFile(candidate);
  };

  const download = async () => {
    setDownloading(true);
    setError("");

    try {
      await downloadStudentImportTemplate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to download template.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const validate = async () => {
    if (!file || busy) return;

    setBusy(true);
    resetImport();

    try {
      setPreview(await previewStudentImportFile(file));
      setRequestId(crypto.randomUUID());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to validate workbook.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!file || !requestId || submittingRef.current) return;

    submittingRef.current = true;
    setImporting(true);
    setError("");

    try {
      const imported = await confirmStudentImportFile(file, requestId);
      setResult(imported);
      setConfirming(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["student-enrollments"] }),
      ]);
    } catch (cause) {
      if (cause instanceof StudentImportNotEligibleError) {
        setPreview(cause.preview);
        setFilter("ALL");
        setConfirming(false);
      }

      setError(
        cause instanceof Error ? cause.message : "Unable to import students.",
      );
    } finally {
      submittingRef.current = false;
      setImporting(false);
    }
  };

  const visibleRows = preview?.rows.filter((row) => {
    if (filter === "VALID") return row.valid;
    if (filter === "INVALID") return !row.valid;
    if (filter === "WARNINGS") return row.warnings.length > 0;
    return true;
  }) ?? [];

  const ready = preview?.eligible === true;
  const enrollmentCount =
    preview?.rows.reduce((total, row) => total + row.selectedCourses.length, 0) ?? 0;

  return (
    <dialog
      ref={dialogRef}
      className="student-import-dialog"
      aria-labelledby="student-import-title"
      aria-describedby="student-import-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="student-import-dialog__header">
        <div className="student-import-dialog__heading">
          <span className="student-import-dialog__heading-icon">
            <FileSpreadsheet size={23} aria-hidden="true" />
          </span>
          <div>
            <span className="student-import-dialog__eyebrow">
              Student management
            </span>
            <h2 id="student-import-title">Import student records</h2>
            <p id="student-import-description">
              Validate your Excel register before adding students.
            </p>
          </div>
        </div>

        <button
          className="student-import-dialog__close"
          type="button"
          aria-label="Close import dialog"
          disabled={locked}
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>

      <div className="student-import-dialog__body">
        <div className="student-import-dialog__setup">
          <section className="student-import-dialog__step">
            <span className="student-import-dialog__step-number">01</span>
            <h3>Prepare your spreadsheet</h3>
            <p>
              Use the official template with student names, contact details,
              dates and enrolled course names.
            </p>
            <button
              type="button"
              className="students-button"
              disabled={locked}
              onClick={() => void download()}
            >
              <Download size={17} aria-hidden="true" />
              {downloading ? "Downloading..." : "Download template"}
            </button>
          </section>

          <section className="student-import-dialog__step">
            <span className="student-import-dialog__step-number">02</span>
            <h3>Upload and validate</h3>
            <p>Select an .xlsx workbook, up to 2 MB and 500 students.</p>

            <div className="student-import-dialog__upload">
              <FileUp size={22} aria-hidden="true" />
              <div>
                <strong>{file ? file.name : "Choose your Excel file"}</strong>
                <small>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB selected`
                    : "XLSX format only"}
                </small>
              </div>
              <button
                type="button"
                className="students-button"
                disabled={busy || importing}
                onClick={() => inputRef.current?.click()}
              >
                Browse
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                aria-label="Select student import workbook"
                disabled={busy || importing}
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>

            <button
              type="button"
              className="students-button students-button--primary"
              disabled={!file || busy || importing}
              onClick={() => void validate()}
            >
              {busy
                ? <LoaderCircle size={17} className="students-spin" />
                : <SearchCheck size={17} aria-hidden="true" />}
              {busy ? "Checking student records..." : "Validate and preview"}
            </button>
          </section>
        </div>

        {error && (
          <div className="student-import-dialog__alert" role="alert">
            <AlertCircle size={19} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <section
            className="student-import-dialog__results"
            aria-label="Imported students"
          >
            <div className="student-import-dialog__results-heading">
              <div>
                <span className="student-import-dialog__eyebrow">
                  Import complete
                </span>
                <h3>
                  {result.studentCount} students added to the register
                </h3>
                <p>
                  {result.replayed
                    ? "This import had already been completed; no new records were created."
                    : `${result.enrollmentCount} course enrollments created. Admission numbers were assigned automatically.`}
                </p>
              </div>

              <span className="student-import-dialog__result-badge is-ready">
                <CheckCircle2 size={16} />
                Saved
              </span>
            </div>

            <div className="student-import-dialog__table-wrap">
              <table className="student-import-dialog__table">
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Admission no.</th>
                    <th scope="col">Student</th>
                    <th scope="col">Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {result.students.map((student) => (
                    <tr key={student.id}>
                      <td className="student-import-dialog__row-number">
                        {student.rowNumber}
                      </td>
                      <td>
                        <strong className="student-import-dialog__admission">
                          {student.admissionNumber}
                        </strong>
                      </td>
                      <td>
                        <strong>{student.name}</strong>
                        <small>{student.phone}</small>
                      </td>
                      <td>
                        <div className="student-import-dialog__courses">
                          {student.courses.length
                            ? student.courses.map((title) => (
                                <span key={title}>{title}</span>
                              ))
                            : <small>No courses selected</small>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {preview && !result && (
          <section
            className="student-import-dialog__results"
            aria-label="Student import validation results"
          >
            <div className="student-import-dialog__results-heading">
              <div>
                <span className="student-import-dialog__eyebrow">
                  Validation report
                </span>
                <h3>Import preview</h3>
                <p>
                  Review the records below. No changes have been saved.
                </p>
              </div>

              <span className={
                ready
                  ? "student-import-dialog__result-badge is-ready"
                  : "student-import-dialog__result-badge is-review"
              }>
                {ready
                  ? <CheckCircle2 size={16} />
                  : <AlertTriangle size={16} />}
                {ready ? "Validation passed" : "Review required"}
              </span>
            </div>

            <div className="student-import-dialog__metrics">
              <div>
                <Users size={19} aria-hidden="true" />
                <span>Total students</span>
                <strong>{preview.totalRows}</strong>
              </div>
              <div className="is-valid">
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>Valid records</span>
                <strong>{preview.validRows}</strong>
              </div>
              <div className="is-invalid">
                <AlertCircle size={19} aria-hidden="true" />
                <span>Invalid records</span>
                <strong>{preview.invalidRows}</strong>
              </div>
              <div className="is-warning">
                <AlertTriangle size={19} aria-hidden="true" />
                <span>Warnings</span>
                <strong>{preview.warningRows}</strong>
              </div>
            </div>

            <div className="student-import-dialog__filters" aria-label="Filter preview rows">
              {([
                ["ALL", "All records"],
                ["VALID", "Valid"],
                ["INVALID", "Invalid"],
                ["WARNINGS", "Warnings"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  className={filter === value ? "is-active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="student-import-dialog__table-wrap">
              <table className="student-import-dialog__table">
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Student</th>
                    <th scope="col">Phone / DOB</th>
                    <th scope="col">Courses</th>
                    <th scope="col">Status / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="student-import-dialog__row-number">
                        {row.rowNumber}
                      </td>
                      <td>
                        <strong>
                          {row.data.studentName ||
                            `${row.data.firstName} ${row.data.lastName}`.trim() ||
                            "Unnamed student"}
                        </strong>
                        <small>{row.data.email || "No email"}</small>
                      </td>
                      <td>
                        <span>{row.data.phone || "—"}</span>
                        <small>
                          {row.data.dateOfBirth
                            ? row.data.dateOfBirth.split("-").reverse().join("-")
                            : "DOB not provided"}
                        </small>
                      </td>
                      <td>
                        <div className="student-import-dialog__courses">
                          {row.selectedCourses.length
                            ? row.selectedCourses.map((course) => (
                                <span key={course.id}>{course.title}</span>
                              ))
                            : <small>No courses selected</small>}
                        </div>
                      </td>
                      <td>
                        <span className={
                          row.valid
                            ? "student-import-dialog__status is-valid"
                            : "student-import-dialog__status is-invalid"
                        }>
                          {row.valid ? "Valid" : "Invalid"}
                        </span>
                        {row.errors.map((message, index) => (
                          <p
                            key={`error-${index}`}
                            className="student-import-dialog__row-error"
                          >
                            {message}
                          </p>
                        ))}
                        {row.warnings.map((message, index) => (
                          <p
                            key={`warning-${index}`}
                            className="student-import-dialog__row-warning"
                          >
                            {message}
                          </p>
                        ))}
                        {!row.errors.length && !row.warnings.length && (
                          <small>No issues found</small>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="student-import-dialog__no-results">
                        No records match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {confirming ? (
              <div
                className="student-import-dialog__confirm"
                role="alertdialog"
                aria-labelledby="student-import-confirm-title"
                aria-describedby="student-import-confirm-description"
              >
                <AlertTriangle size={20} aria-hidden="true" />
                <div>
                  <strong id="student-import-confirm-title">
                    Permanently register {preview.totalRows} students?
                  </strong>
                  <p id="student-import-confirm-description">
                    This creates {preview.totalRows} student records and{" "}
                    {enrollmentCount} course enrollments with new admission
                    numbers. Student records cannot be deleted afterwards. No
                    login accounts or fee plans will be created.
                  </p>
                  <div className="student-import-dialog__confirm-actions">
                    <button
                      type="button"
                      className="students-button"
                      disabled={importing}
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="students-button students-button--primary"
                      disabled={importing}
                      aria-busy={importing}
                      onClick={() => void confirmImport()}
                    >
                      {importing
                        ? <LoaderCircle size={17} className="students-spin" />
                        : <UserPlus size={17} aria-hidden="true" />}
                      {importing ? "Importing students..." : "Confirm import"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="student-import-dialog__info">
                <Info size={18} aria-hidden="true" />
                <p>
                  {ready
                    ? "The server will check every record again when you confirm. If anything has changed, nothing will be imported."
                    : "Correct the highlighted rows in your spreadsheet and validate it again. Possible duplicates must be removed from the file; register those students individually if they are genuinely new."}
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="student-import-dialog__footer">
        <span>
          <ShieldCheck size={17} aria-hidden="true" />
          {result
            ? "Import saved. All records were added together."
            : "No student records will be changed until you confirm."}
        </span>
        <div className="student-import-dialog__footer-actions">
          <button
            type="button"
            className="students-button"
            disabled={locked}
            onClick={close}
          >
            {result ? "Done" : "Close"}
          </button>
          {preview && !result && (
            <button
              type="button"
              className="students-button students-button--primary"
              disabled={!ready || !requestId || locked || confirming}
              title={ready ? undefined : "Resolve all errors and warnings first."}
              onClick={() => {
                setError("");
                setConfirming(true);
              }}
            >
              <UserPlus size={17} aria-hidden="true" />
              Import {preview.totalRows} students
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
