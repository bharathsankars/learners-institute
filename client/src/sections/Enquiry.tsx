import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MapPin, MessageCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitEnquiry, type CreateEnquiryInput } from "../api/enquiries";
import { usePublicCourses } from "../hooks/usePublicCourses";

import "./Enquiry.css";
import { contact } from "../data/contact";

const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(100, "Name must be under 100 characters."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Please enter a valid phone number.")
    .regex(/^[+\d\s().-]+$/, "Please enter a valid phone number.")
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Please enter a valid phone number.",
    ),
  email: z
    .union([
      z.string().trim().email("Please enter a valid email address."),
      z.literal(""),
    ])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  message: z.string().trim().max(500, "Message must be under 500 characters."),
});

type EnquiryFormValues = z.infer<typeof enquirySchema>;

type EnquiryProps = {
  courseSelection?: {
    courseId: string;
    requestId: number;
  } | null;
};

export function Enquiry({ courseSelection = null }: EnquiryProps) {
  const courseQuery = usePublicCourses();
  const courses = useMemo(() => courseQuery.data ?? [], [courseQuery.data]);
  const [submitError, setSubmitError] = useState("");
  const [courseError, setCourseError] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);

  const visibleCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(courseSearch.trim().toLowerCase())
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const lastAppliedCourseSelection = useRef<number | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  useEffect(() => {
    if (!courseSelection) {
      return;
    }

    if (lastAppliedCourseSelection.current === courseSelection.requestId) {
      return;
    }

    const courseExists = courses.some(
      (course) => course.id === courseSelection.courseId,
    );

    if (!courseExists) {
      return;
    }

    setSelectedCourseIds((current) =>
      current.includes(courseSelection.courseId)
        ? current
        : [...current, courseSelection.courseId],
    );
    setCourseError("");

    lastAppliedCourseSelection.current = courseSelection.requestId;
  }, [courseSelection, courses]);

  const onSubmit = async (data: EnquiryFormValues) => {
    if (submitting.current) return;

    if (selectedCourseIds.length === 0) {
      setCourseError("Please select at least one course.");
      return;
    }

    submitting.current = true;
    setCourseError("");
    setSubmitError("");
    setShowSuccess(false);
    try {
      // Resolve the stable course ID against the latest catalogue before saving.
      const latest = await courseQuery.refetch();
      if (latest.isError)
        throw new Error(
          "Unable to verify course availability. Please try again.",
        );
      const selectedCourses = selectedCourseIds.map((id) =>
        latest.data?.find((course) => course.id === id),
      );

      if (selectedCourses.some((course) => !course)) {
        throw new Error(
          "One or more selected courses are no longer available. Please review your selection.",
        );
      }

      const courseNames = selectedCourses
        .map((course) => course!.title)
        .join(", ");

      if (courseNames.length > 1000) {
        throw new Error("Please select fewer courses.");
      }

      const payload: CreateEnquiryInput = {
        name: data.name,
        phone: data.phone,
        email: data.email?.trim() || undefined,
        course: courseNames,
        message: data.message.trim() || undefined,
        requestId: requestId.current,
      };

      await submitEnquiry(payload);
      reset();
      setSelectedCourseIds([]);
      setCourseError("");
      requestId.current = crypto.randomUUID();

      setShowSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit your enquiry. Please try again.",
      );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <section id="enquiry" className="enquiry-section section">
      <div className="container enquiry-section__layout">
        <div className="enquiry-section__content">
          <span className="enquiry-section__eyebrow">
            Enquiries & Admissions
          </span>

          <h2 className="enquiry-section__title">Let’s find your next step.</h2>

          <p className="enquiry-section__description">
            Interested in a course? Submit your details and our team will get in
            touch about fees, batch timings and admissions. You can also chat
            with us directly on WhatsApp.
          </p>

          <div className="enquiry-section__location">
            <div className="enquiry-section__location-icon" aria-hidden="true">
              <MapPin size={22} strokeWidth={1.8} />
            </div>

            <div>
              <strong>Learners Commercial Institute</strong>
              <span>Thirunakkara, Kottayam, Kerala</span>
            </div>
          </div>
          <a
            className="enquiry-whatsapp"
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={19} aria-hidden="true" />
            WhatsApp
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="enquiry-section__form-card">
          <form
            className="enquiry-form"
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event);
            }}
            onChange={() => {
              requestId.current = crypto.randomUUID();
              setShowSuccess(false);
              setSubmitError("");
            }}
            noValidate
          >
            <fieldset className="enquiry-form__fields" disabled={isSubmitting}>
              <div className="enquiry-form__field">
                <label htmlFor="enquiry-name">Your name <span className="enquiry-required" aria-hidden="true">*</span></label>

                <input
                  id="enquiry-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />

                {errors.name && (
                  <span className="enquiry-form__error">
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div className="enquiry-form__field">
                <label htmlFor="enquiry-phone">Phone number <span className="enquiry-required" aria-hidden="true">*</span></label>

                <input
                  id="enquiry-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />

                {errors.phone && (
                  <span className="enquiry-form__error">
                    {errors.phone.message}
                  </span>
                )}
              </div>

              <div className="enquiry-form__field">
                <label htmlFor="enquiry-email">
                  Email address <span>Optional</span>
                </label>

                <input
                  id="enquiry-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />

                {errors.email && (
                  <span className="enquiry-form__error">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="enquiry-form__field">
                <span className="enquiry-course-label" id="enquiry-course-label">
                  Courses interested in <span className="enquiry-required" aria-hidden="true">*</span>
                </span>

                <div className="enquiry-course-toolbar">
                  <p className="enquiry-course-help">
                    Select one or more courses.
                  </p>

                  <div className="enquiry-course-actions">
                    <button
                      type="button"
                      className="enquiry-course-search-toggle"
                      aria-label={courseSearchOpen ? "Close course search" : "Search courses"}
                      aria-expanded={courseSearchOpen}
                      onClick={() => {
                        setCourseSearchOpen((current) => !current);
                        setCourseSearch("");
                      }}
                    >
                      {courseSearchOpen
                        ? <X size={17} aria-hidden="true" />
                        : <Search size={17} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || courses.length === 0 ||
                        courses.every((course) =>
                          selectedCourseIds.includes(course.id)
                        )}
                      onClick={() => {
                        setSelectedCourseIds(courses.map((course) => course.id));
                        setCourseError("");
                      }}
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting || selectedCourseIds.length === 0}
                      onClick={() => {
                        setSelectedCourseIds([]);
                        setCourseError("");
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {courseSearchOpen && (
                  <input
                    type="search"
                    className="enquiry-course-search-input"
                    placeholder="Search courses..."
                    aria-label="Search courses"
                    value={courseSearch}
                    onChange={(event) => setCourseSearch(event.target.value)}
                  />
                )}

                {visibleCourses.length === 0 && courses.length > 0 && (
                  <p className="enquiry-course-empty">
                    No matching courses found.
                  </p>
                )}

                <div
                  className={`enquiry-course-options${
                    showAllCourses || courseSearch.trim()
                      ? " enquiry-course-options--expanded"
                      : ""
                  }`}
                  role="group"
                  aria-labelledby="enquiry-course-label"
                  aria-describedby={
                    courseError ? "enquiry-course-error" : undefined
                  }
                >
                  {visibleCourses.map((course) => (
                    <label
                      key={course.id}
                      className="enquiry-course-option"
                    >
                      <input
                        type="checkbox"
                        value={course.id}
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={(event) => {
                          setSelectedCourseIds((current) =>
                            event.target.checked
                              ? [...current.filter((id) => id !== course.id), course.id]
                              : current.filter((id) => id !== course.id),
                          );
                          setCourseError("");
                        }}
                      />
                      <span>{course.title}</span>
                    </label>
                  ))}
                </div>

                {courses.length > 4 && !courseSearch.trim() && (
                  <button
                    type="button"
                    className="enquiry-course-view-more"
                    aria-expanded={showAllCourses}
                    onClick={() => setShowAllCourses((current) => !current)}
                  >
                    {showAllCourses
                      ? "Show fewer courses"
                      : `View all ${courses.length} courses`}
                    <span aria-hidden="true">
                      {showAllCourses ? "↑" : "↓"}
                    </span>
                  </button>
                )}

                <small className="enquiry-course-count" aria-live="polite">
                  {selectedCourseIds.length} selected
                </small>

                {courseQuery.isError && (
                  <span className="enquiry-form__error" role="alert">
                    Unable to refresh courses.{" "}
                    <button
                      type="button"
                      onClick={() => void courseQuery.refetch()}
                      disabled={courseQuery.isFetching}
                    >
                      Try again
                    </button>
                  </span>
                )}

                {courseQuery.isSuccess && courses.length === 0 && (
                  <small>
                    No courses available. Please contact us on WhatsApp.
                  </small>
                )}

                {courseError && (
                  <span
                    id="enquiry-course-error"
                    className="enquiry-form__error"
                    role="alert"
                  >
                    {courseError}
                  </span>
                )}
              </div>

              <div className="enquiry-form__field">
                <label htmlFor="enquiry-message">
                  Message <span>Optional</span>
                </label>

                <textarea
                  id="enquiry-message"
                  rows={4}
                  placeholder="Anything you would like to ask?"
                  {...register("message")}
                />

                {errors.message && (
                  <span className="enquiry-form__error">
                    {errors.message.message}
                  </span>
                )}
              </div>

              <button
                className="enquiry-form__submit"
                type="submit"
                disabled={
                  isSubmitting || courseQuery.isPending || courses.length === 0
                }
              >
                {isSubmitting ? "Submitting..." : "Submit enquiry"}

                {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </fieldset>
          {showSuccess && (
            <div
              className="enquiry-success-inline"
              role="status"
              aria-live="polite"
            >
              <span className="enquiry-success-inline__icon" aria-hidden="true">
                ✓
              </span>

              <div className="enquiry-success-inline__content">
                <strong>Enquiry submitted successfully!</strong>
                <p>
                  Thank you for contacting Learners Commercial Institute.
                  Our team will get in touch with you shortly.
                </p>
              </div>

              <button
                type="button"
                className="enquiry-success-inline__close"
                aria-label="Dismiss confirmation"
                onClick={() => setShowSuccess(false)}
              >
                ×
              </button>
            </div>
          )}
            {submitError && (
              <p className="enquiry-form__error" role="alert">
                {submitError}
              </p>
            )}

            <p className="enquiry-form__note">
              Your details will be used to respond to your course enquiry.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
