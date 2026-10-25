import { Link } from "react-router-dom";

import {
  ArrowUpRight,
  Check,
  Clock3,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
} from "react";

import {
  enquiryStatusLabels,
  formatEnquiryDate,
} from "../utils/enquiries";

import type {
  Enquiry,
  EnquiryStatus,
} from "../../api/enquiries";

import "../styles/EnquiryDetailsDialog.css";

type EnquiryDetailsDialogProps = {
  enquiry: Enquiry;
  isSaving: boolean;
  error?: string;
  onClose: () => void;
  onStatusChange: (
    status: EnquiryStatus,
  ) => void;
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
  const dialog =
    useRef<HTMLDialogElement>(
      null,
    );

  useEffect(() => {
    const element =
      dialog.current;

    if (!element) {
      return;
    }

    if (!element.open) {
      element.showModal();
    }

    return () => {
      if (
        element.open
      ) {
        element.close();
      }
    };
  }, []);

  const handleCancel = (
    event:
      React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    event.preventDefault();

    if (!isSaving) {
      onClose();
    }
  };

  const telephoneNumber =
    enquiry.phone.replace(
      /[^+\d]/g,
      "",
    );

  return (
    <dialog
      ref={dialog}
      className="enquiry-profile-dialog"
      aria-labelledby="enquiry-detail-title"
      onCancel={
        handleCancel
      }
    >
      <div className="enquiry-profile">

        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="enquiry-profile__header">

          <div className="enquiry-profile__identity">

            <div
              className="enquiry-profile__avatar"
              aria-hidden="true"
            >
              {enquiry.name
                .trim()
                .slice(
                  0,
                  1,
                )
                .toUpperCase()}
            </div>

            <div>
              <span className="enquiry-profile__eyebrow">
                Website enquiry
              </span>

              <h2 id="enquiry-detail-title">
                {enquiry.name}
              </h2>

              <div className="enquiry-profile__received">
                <Clock3
                  size={15}
                  aria-hidden="true"
                />

                Received{" "}
                {formatEnquiryDate(
                  enquiry.createdAt,
                )}
              </div>
            </div>
          </div>

          <button
            className="enquiry-profile__close"
            type="button"
            onClick={
              onClose
            }
            disabled={
              isSaving
            }
            aria-label="Close enquiry details"
          >
            <X
              size={22}
              aria-hidden="true"
            />
          </button>
        </header>


        {/* ===================================================
            STATUS
            =================================================== */}

        <div className="enquiry-profile__status-row">

          <div>
            <span>
              Follow-up status
            </span>

            <strong>
              Current enquiry status
            </strong>
          </div>

          <span
            className={`enquiry-profile__status enquiry-profile__status--${enquiry.status.toLowerCase()}`}
          >
            {
              enquiryStatusLabels[
                enquiry.status
              ]
            }
          </span>
        </div>


        {/* ===================================================
            BODY
            =================================================== */}

        <div className="enquiry-profile__body">

          {/* CONTACT */}

          <section className="enquiry-profile__section">

            <div className="enquiry-profile__section-heading">

              <span className="enquiry-profile__section-icon">
                <UserRound
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3>
                  Contact details
                </h3>

                <p>
                  How to contact this
                  applicant.
                </p>
              </div>
            </div>

            <div className="enquiry-profile__contact-grid">

              <a
                className="enquiry-profile__contact-card"
                href={`tel:${telephoneNumber}`}
              >
                <span className="enquiry-profile__contact-icon">
                  <Phone
                    size={20}
                    aria-hidden="true"
                  />
                </span>

                <span>
                  <small>
                    Phone number
                  </small>

                  <strong>
                    {enquiry.phone}
                  </strong>
                </span>

                <ArrowUpRight
                  size={16}
                  aria-hidden="true"
                />
              </a>

              {enquiry.email ? (
                <a
                  className="enquiry-profile__contact-card"
                  href={`mailto:${enquiry.email}`}
                >
                  <span className="enquiry-profile__contact-icon">
                    <Mail
                      size={20}
                      aria-hidden="true"
                    />
                  </span>

                  <span>
                    <small>
                      Email address
                    </small>

                    <strong>
                      {enquiry.email}
                    </strong>
                  </span>

                  <ArrowUpRight
                    size={16}
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <div className="enquiry-profile__contact-card enquiry-profile__contact-card--empty">

                  <span className="enquiry-profile__contact-icon">
                    <Mail
                      size={20}
                      aria-hidden="true"
                    />
                  </span>

                  <span>
                    <small>
                      Email address
                    </small>

                    <strong>
                      Not provided
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </section>


          {/* COURSE */}

          <section className="enquiry-profile__section">

            <div className="enquiry-profile__section-heading">

              <span className="enquiry-profile__section-icon">
                <GraduationCap
                  size={20}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3>
                  Course interest
                </h3>

                <p>
                  Course selected by
                  the applicant.
                </p>
              </div>
            </div>

            <div className="enquiry-profile__course">
              <span>
                Interested in
              </span>

              <strong>
                {enquiry.course}
              </strong>
            </div>
          </section>


          {/* MESSAGE */}

          <section className="enquiry-profile__section">

            <div className="enquiry-profile__section-heading">

              <span className="enquiry-profile__section-icon">
                <MessageSquare
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3>
                  Enquiry message
                </h3>

                <p>
                  Message submitted
                  through the website.
                </p>
              </div>
            </div>

            <div className="enquiry-profile__message">
              <p>
                {enquiry.message ||
                  "No additional message was provided."}
              </p>
            </div>
          </section>


          {/* ADMITTED */}

          {enquiry.student && (
            <section className="enquiry-profile__admitted">

              <GraduationCap
                size={21}
                aria-hidden="true"
              />

              <div>
                <strong>
                  Student admitted
                </strong>

                <span>
                  Admission number{" "}
                  {
                    enquiry
                      .student
                      .admissionNumber
                  }
                </span>
              </div>

              <Link
                to="/admin/students"
              >
                View student
              </Link>
            </section>
          )}


          {/* FOLLOW UP */}

          <section className="enquiry-profile__section">

            <div className="enquiry-profile__section-heading">

              <span className="enquiry-profile__section-icon">
                <Check
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3>
                  Follow-up
                </h3>

                <p>
                  Update the enquiry
                  after contacting the
                  applicant.
                </p>
              </div>
            </div>

            <div className="enquiry-profile__followup">

              <label htmlFor="enquiry-detail-status">
                Enquiry status
              </label>

              <select
                id="enquiry-detail-status"
                value={
                  enquiry.status
                }
                disabled={
                  isSaving
                }
                onChange={(
                  event,
                ) =>
                  onStatusChange(
                    event.target
                      .value as EnquiryStatus,
                  )
                }
              >
                <option value="NEW">
                  Awaiting contact
                </option>

                <option value="CONTACTED">
                  Contacted
                </option>

                <option value="CLOSED">
                  Closed
                </option>
              </select>

              <p>
                {isSaving
                  ? "Saving status…"
                  : enquiry.status ===
                      "NEW"
                    ? "Change to Contacted after speaking with the applicant."
                    : enquiry.status ===
                        "CONTACTED"
                      ? "Close the enquiry once the follow-up is complete."
                      : "This enquiry has been closed."}
              </p>
            </div>
          </section>


          {/* ERROR */}

          {error && (
            <div
              className="enquiry-profile__error"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="enquiry-profile__updated">
            Last updated{" "}
            <strong>
              {formatEnquiryDate(
                enquiry.updatedAt,
              )}
            </strong>
          </div>
        </div>


        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="enquiry-profile__footer">

          <div className="enquiry-profile__footer-secondary">

            <a
              className="enquiry-profile__button"
              href={`tel:${telephoneNumber}`}
            >
              <Phone
                size={18}
                aria-hidden="true"
              />

              Call applicant
            </a>

            {enquiry.email && (
              <a
                className="enquiry-profile__button"
                href={`mailto:${enquiry.email}`}
              >
                <Mail
                  size={18}
                  aria-hidden="true"
                />

                Send email
              </a>
            )}
          </div>


          <div className="enquiry-profile__footer-primary">

            {!enquiry.studentId && (
              <button
                type="button"
                className="enquiry-profile__button enquiry-profile__button--admit"
                disabled={
                  isSaving
                }
                onClick={
                  onAdmit
                }
              >
                <GraduationCap
                  size={18}
                  aria-hidden="true"
                />

                Admit student
              </button>
            )}

            {enquiry.status ===
              "NEW" && (
              <button
                type="button"
                className="enquiry-profile__button enquiry-profile__button--primary"
                disabled={
                  isSaving
                }
                onClick={() =>
                  onStatusChange(
                    "CONTACTED",
                  )
                }
              >
                <Check
                  size={18}
                  aria-hidden="true"
                />

                Mark contacted
              </button>
            )}

            {enquiry.status ===
              "CONTACTED" && (
              <button
                type="button"
                className="enquiry-profile__button enquiry-profile__button--primary"
                disabled={
                  isSaving
                }
                onClick={() =>
                  onStatusChange(
                    "CLOSED",
                  )
                }
              >
                <Check
                  size={18}
                  aria-hidden="true"
                />

                Close enquiry
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
