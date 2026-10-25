import {
  CalendarDays,
  CircleUserRound,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
} from "react";

import type {
  Student,
} from "../../api/students";

import {
  studentDate,
  studentName,
  studentStatusLabels,
} from "../utils/students";

import "../styles/StudentDetailsDialog.css";

type StudentDetailsDialogProps = {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
};

export function StudentDetailsDialog({
  student,
  onClose,
  onEdit,
}: StudentDetailsDialogProps) {
  const dialog =
    useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element =
      dialog.current;

    element?.showModal();

    return () =>
      element?.close();
  }, []);

  const phoneHref =
    `tel:${student.phone.replace(
      /[^+\d]/g,
      "",
    )}`;

  return (
    <dialog
      ref={dialog}
      className="student-profile-dialog"
      aria-labelledby="student-profile-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="student-profile">

        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="student-profile__header">
          <div className="student-profile__identity">

            <div
              className="student-profile__avatar"
              aria-hidden="true"
            >
              {student.firstName
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div className="student-profile__heading">
              <span className="student-profile__eyebrow">
                Student profile
              </span>

              <h2 id="student-profile-title">
                {studentName(student)}
              </h2>

              <div className="student-profile__admission">
                <Hash
                  size={15}
                  aria-hidden="true"
                />

                <span>
                  Admission no.
                </span>

                <strong>
                  {student.admissionNumber}
                </strong>
              </div>
            </div>
          </div>

          <button
            className="student-profile__close"
            type="button"
            aria-label="Close student profile"
            onClick={onClose}
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

        <div className="student-profile__status-row">
          <div>
            <span>
              Learning status
            </span>

            <strong>
              Current student status
            </strong>
          </div>

          <span
            className={`student-profile__status student-profile__status--${student.status.toLowerCase()}`}
          >
            {studentStatusLabels[
              student.status
            ]}
          </span>
        </div>


        {/* ===================================================
            BODY
            =================================================== */}

        <div className="student-profile__body">

          {/* Personal details */}

          <section
            className="student-profile__section"
            aria-labelledby="student-profile-personal"
          >
            <div className="student-profile__section-heading">
              <span className="student-profile__section-icon">
                <UserRound
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="student-profile-personal">
                  Personal details
                </h3>

                <p>
                  Basic information about
                  the student.
                </p>
              </div>
            </div>

            <div className="student-profile__details-grid">

              <div className="student-profile__detail">
                <span>
                  Full name
                </span>

                <strong>
                  {studentName(student)}
                </strong>
              </div>

              <div className="student-profile__detail">
                <span>
                  Date of birth
                </span>

                <strong>
                  {student.dateOfBirth
                    ? studentDate(
                        student.dateOfBirth,
                        true,
                      )
                    : "Not provided"}
                </strong>
              </div>

              <div className="student-profile__detail">
                <span>
                  Gender
                </span>

                <strong>
                  {student.gender ||
                    "Not provided"}
                </strong>
              </div>

              <div className="student-profile__detail">
                <span>
                  Added to register
                </span>

                <strong>
                  {studentDate(
                    student.createdAt,
                  )}
                </strong>
              </div>

            </div>
          </section>


          {/* Contact details */}

          <section
            className="student-profile__section"
            aria-labelledby="student-profile-contact"
          >
            <div className="student-profile__section-heading">
              <span className="student-profile__section-icon">
                <CircleUserRound
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="student-profile-contact">
                  Contact details
                </h3>

                <p>
                  How the institute can
                  contact this student.
                </p>
              </div>
            </div>

            <div className="student-profile__contact-list">

              <a
                className="student-profile__contact-card"
                href={phoneHref}
              >
                <span className="student-profile__contact-icon">
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
                    {student.phone}
                  </strong>
                </span>
              </a>

              {student.email ? (
                <a
                  className="student-profile__contact-card"
                  href={`mailto:${student.email}`}
                >
                  <span className="student-profile__contact-icon">
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
                      {student.email}
                    </strong>
                  </span>
                </a>
              ) : (
                <div className="student-profile__contact-card student-profile__contact-card--empty">
                  <span className="student-profile__contact-icon">
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


          {/* Address */}

          <section
            className="student-profile__section"
            aria-labelledby="student-profile-address"
          >
            <div className="student-profile__section-heading">
              <span className="student-profile__section-icon">
                <MapPin
                  size={19}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="student-profile-address">
                  Address
                </h3>

                <p>
                  Student address on
                  record.
                </p>
              </div>
            </div>

            <div className="student-profile__address">
              <MapPin
                size={19}
                aria-hidden="true"
              />

              <p>
                {student.address ||
                  "No address provided."}
              </p>
            </div>
          </section>


          {/* Last updated */}

          <div className="student-profile__updated">
            <CalendarDays
              size={15}
              aria-hidden="true"
            />

            <span>
              Last updated{" "}
              <strong>
                {studentDate(
                  student.updatedAt,
                )}
              </strong>
            </span>
          </div>
        </div>


        {/* ===================================================
            ACTIONS
            =================================================== */}

        <footer className="student-profile__footer">

          <div className="student-profile__contact-actions">
            <a
              className="student-profile__button"
              href={phoneHref}
            >
              <Phone
                size={18}
                aria-hidden="true"
              />

              Call student
            </a>

            {student.email && (
              <a
                className="student-profile__button"
                href={`mailto:${student.email}`}
              >
                <Mail
                  size={18}
                  aria-hidden="true"
                />

                Send email
              </a>
            )}
          </div>

          <button
            className="student-profile__button student-profile__button--primary"
            type="button"
            onClick={onEdit}
          >
            <Pencil
              size={18}
              aria-hidden="true"
            />

            Edit student
          </button>

        </footer>
      </div>
    </dialog>
  );
}
