import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Check, GraduationCap, Phone, X } from "lucide-react";

import { enquiryStatusLabels, formatEnquiryDate } from "../utils/enquiries";

import type { Enquiry, EnquiryStatus } from "../../api/enquiries";

type EnquiryDetailsDialogProps = {
  enquiry: Enquiry;
  isSaving: boolean;
  error?: string;
  onClose: () => void;
  onStatusChange: (status: EnquiryStatus) => void;
  onAdmit: () => void;
};

export function EnquiryDetailsDialog({
  enquiry,
  isSaving,
  error,
  onClose,
  onStatusChange,
  onAdmit,
}: EnquiryDetailsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  /* =========================================================
     OPEN / CLOSE NATIVE DIALOG
     ========================================================= */

  useEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    if (!element.open) {
      element.showModal();
    }

    return () => {
      if (element.open) {
        element.close();
      }
    };
  }, []);

  /* =========================================================
     ESCAPE KEY
     ========================================================= */

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    /*
      Prevent the browser from closing the native dialog itself.

      React owns the selected enquiry state, so we close the
      dialog by clearing selectedId in EnquiriesPage instead.
    */
    event.preventDefault();

    if (!isSaving) {
      onClose();
    }
  };

  /* =========================================================
     PHONE NUMBER
     ========================================================= */

  const telephoneNumber = enquiry.phone.replace(/[^+\d]/g, "");

  return (
    <dialog
      ref={dialog}
      className="enquiry-dialog"
      aria-labelledby="enquiry-detail-title"
      onCancel={handleCancel}
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="enquiry-dialog__header">
        <div>
          <span className="enquiries-eyebrow">Website enquiry</span>

          <h2 id="enquiry-detail-title">{enquiry.name}</h2>

          <p>Received {formatEnquiryDate(enquiry.createdAt)}</p>
        </div>

        <button
          className="enquiry-icon-button"
          type="button"
          onClick={onClose}
          disabled={isSaving}
          aria-label="Close enquiry details"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* =====================================================
          BODY
          ===================================================== */}

      <div className="enquiry-dialog__body">
        {/* Enquiry facts */}

        <div className="enquiry-dialog__facts">
          <div>
            <span>Course interested in</span>

            <strong>{enquiry.course}</strong>
          </div>

          <div>
            <span>Phone number</span>

            <a href={`tel:${telephoneNumber}`}>
              {enquiry.phone}

              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>

          <div>
            <span>Current status</span>

            <span
              className={`enquiry-badge enquiry-badge--${enquiry.status.toLowerCase()}`}
            >
              {enquiryStatusLabels[enquiry.status]}
            </span>
          </div>

          <div>
            <span>Last updated</span>

            <strong>{formatEnquiryDate(enquiry.updatedAt)}</strong>
          </div>
        </div>

        {/* Already admitted */}

        {enquiry.student && (
          <p className="enquiries-notice">
            <GraduationCap size={18} aria-hidden="true" />

            <span>Admitted · {enquiry.student.admissionNumber}</span>

            <Link to="/admin/students">View student register</Link>
          </p>
        )}

        {/* Message */}

        <section className="enquiry-dialog__message">
          <h3>Enquiry message</h3>

          <p>{enquiry.message || "No additional message was provided."}</p>
        </section>

        {/* Status */}

        <div className="enquiry-dialog__followup">
          <label htmlFor="enquiry-detail-status">Follow-up status</label>

          <select
            id="enquiry-detail-status"
            value={enquiry.status}
            disabled={isSaving}
            onChange={(event) =>
              onStatusChange(event.target.value as EnquiryStatus)
            }
          >
            {Object.entries(enquiryStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>

          <p>
            {isSaving
              ? "Saving status…"
              : "Mark contacted after reaching out. Close the enquiry when follow-up is complete."}
          </p>
        </div>

        {/* Error */}

        {error && (
          <p className="enquiries-notice enquiries-notice--error" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="enquiry-dialog__footer">
        {!enquiry.studentId && (
          <button
            type="button"
            className="enquiries-button enquiries-button--primary"
            disabled={isSaving}
            onClick={onAdmit}
          >
            <GraduationCap size={16} aria-hidden="true" />
            Admit student
          </button>
        )}

        <a className="enquiries-button" href={`tel:${telephoneNumber}`}>
          <Phone size={16} aria-hidden="true" />
          Call applicant
        </a>

        {enquiry.status === "NEW" && (
          <button
            type="button"
            className="enquiries-button enquiries-button--primary"
            disabled={isSaving}
            onClick={() => onStatusChange("CONTACTED")}
          >
            <Check size={16} aria-hidden="true" />
            Mark contacted
          </button>
        )}

        {enquiry.status === "CONTACTED" && (
          <button
            type="button"
            className="enquiries-button enquiries-button--primary"
            disabled={isSaving}
            onClick={() => onStatusChange("CLOSED")}
          >
            <Check size={16} aria-hidden="true" />
            Close enquiry
          </button>
        )}
      </div>
    </dialog>
  );
}
