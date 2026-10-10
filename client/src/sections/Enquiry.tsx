import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ChevronDown, MapPin, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitEnquiry } from "../api/enquiries";
import { usePublicCourses } from "../hooks/usePublicCourses";

import "./Enquiry.css";

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "Name must be under 100 characters."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Please enter a valid phone number.")
    .regex(/^[+\d\s().-]+$/, "Please enter a valid phone number.")
    .refine(value => value.replace(/\D/g, "").length >= 7, "Please enter a valid phone number."),
  course: z.string().min(1, "Please select a course."),
  message: z.string().trim().max(500, "Message must be under 500 characters."),
});

type EnquiryFormValues = z.infer<typeof enquirySchema>;

export function Enquiry() {
  const courseQuery = usePublicCourses();
  const courses = courseQuery.data ?? [];
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submitting = useRef(false);
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
      course: "",
      message: "",
    },
  });

  const onSubmit = async (data: EnquiryFormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitError("");
    setSubmitted(false);
    try {
      // Resolve the stable course ID against the latest catalogue before saving.
      const latest = await courseQuery.refetch();
      if (latest.isError) throw new Error("Unable to verify course availability. Please try again.");
      const selectedCourse = latest.data?.find(course => course.id === data.course);
      if (!selectedCourse) throw new Error("This course is no longer available. Please select another course.");
      await submitEnquiry({ ...data, course: selectedCourse.title, requestId: requestId.current });
      reset();
      requestId.current = crypto.randomUUID();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit your enquiry. Please try again.");
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

          <h2 className="enquiry-section__title">
            Let’s find your next step.
          </h2>

          <p className="enquiry-section__description">
            Interested in a course? Submit your details and our team will
            get in touch about fees, batch timings and admissions.
            You can also chat with us directly on WhatsApp.
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
          <a className="enquiry-whatsapp" href="https://wa.me/919446125964" target="_blank" rel="noopener noreferrer">
            <MessageCircle size={19} aria-hidden="true" />
            WhatsApp
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="enquiry-section__form-card">
          <form
            className="enquiry-form"
            onSubmit={event => { void handleSubmit(onSubmit)(event); }}
            onChange={() => { requestId.current = crypto.randomUUID(); setSubmitted(false); setSubmitError(""); }}
            noValidate
          >
            <fieldset className="enquiry-form__fields" disabled={isSubmitting}>
            <div className="enquiry-form__field">
              <label htmlFor="enquiry-name">Your name</label>

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
              <label htmlFor="enquiry-phone">Phone number</label>

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
              <label htmlFor="enquiry-course">Course interested in</label>

              <div className="enquiry-form__select-wrapper">
                <select
                  id="enquiry-course"
                  className="enquiry-form__select"
                  disabled={courseQuery.isPending || courses.length === 0}
                  aria-invalid={Boolean(errors.course)}
                  {...register("course")}
                >
                  <option value="" disabled>
                    {courseQuery.isPending ? "Loading courses…" : courses.length ? "Select a course" : "No courses available"}
                  </option>

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="enquiry-form__select-icon"
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>

              {courseQuery.isError && <span className="enquiry-form__error" role="alert">Unable to refresh course options. <button type="button" onClick={() => void courseQuery.refetch()} disabled={courseQuery.isFetching}>Try again</button></span>}
              {courseQuery.isSuccess && courses.length === 0 && <small>No courses are currently available. Please contact us on WhatsApp.</small>}
              {errors.course && (
                <span className="enquiry-form__error">
                  {errors.course.message}
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
              disabled={isSubmitting || courseQuery.isPending || courses.length === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit enquiry"}

              {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
            </button>

            </fieldset>
            {submitted && <div className="enquiry-feedback" role="status"><strong>Thank you for your enquiry.</strong><p>Your request has been submitted. Our team will contact you about your course.</p></div>}
            {submitError && <p className="enquiry-form__error" role="alert">{submitError}</p>}

            <p className="enquiry-form__note">
              Your details will be used to respond to your course enquiry.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
