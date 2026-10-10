import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Hash, LoaderCircle, Mail, Phone, UserRound, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from "../../api/students";

import "../styles/AddStudentModal.css";

const studentFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters.")
    .max(100, "First name must be 100 characters or fewer."),

  lastName: z.string().trim(),

  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Please enter a valid phone number."),

  email: z.union([
    z.literal(""),
    z.string().trim().email("Please enter a valid email address."),
  ]),

  dateOfBirth: z.string(),

  gender: z.string(),

  address: z
    .string()
    .trim()
    .max(500, "Address must be 500 characters or fewer."),

  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

type AddStudentModalProps = {
  open: boolean;
  student?: Student | null;
  initialValues?: CreateStudentInput;
  isSubmitting: boolean;
  serverError?: string;
  onClose: () => void;
  onCreate: (input: CreateStudentInput) => Promise<void>;
  onUpdate: (studentId: string, input: UpdateStudentInput) => Promise<void>;
};

function getDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.split("T")[0] ?? "";
}

export function AddStudentModal({
  open,
  student,
  initialValues,
  isSubmitting,
  serverError,
  onClose,
  onCreate,
  onUpdate,
}: AddStudentModalProps) {
  const isEditing = Boolean(student);
  const dialog = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),

    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (student) {
      reset({
        firstName: student.firstName,
        lastName: student.lastName ?? "",
        phone: student.phone,
        email: student.email ?? "",
        dateOfBirth: getDateInputValue(student.dateOfBirth),
        gender: student.gender ?? "",
        address: student.address ?? "",
        status: student.status,
      });

      return;
    }

    reset({
      firstName: initialValues?.firstName ?? "",
      lastName: initialValues?.lastName ?? "",
      phone: initialValues?.phone ?? "",
      email: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      status: "ACTIVE",
    });
  }, [open, student, initialValues, reset]);

  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    return () => element?.close();
  }, [open]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    reset();
    onClose();
  };

  const handleFormSubmit = async (values: StudentFormValues) => {
    const commonInput = {
      firstName: values.firstName,
      phone: values.phone,

      ...(values.lastName && {
        lastName: values.lastName,
      }),

      ...(values.email && {
        email: values.email,
      }),

      ...(values.dateOfBirth && {
        dateOfBirth: values.dateOfBirth,
      }),

      ...(values.gender && {
        gender: values.gender,
      }),

      ...(values.address && {
        address: values.address,
      }),
    };

    try {
      if (student) {
        const updateInput: UpdateStudentInput = {
          ...commonInput,
          status: values.status,
        };

        await onUpdate(student.id, updateInput);
        return;
      }

      await onCreate(commonInput);
    } catch {
      // The parent mutation displays the API error and keeps the form open.
    }
  };

  return (
    <dialog
      ref={dialog}
      className="student-modal"
      aria-labelledby="student-modal-title"
      aria-describedby="student-modal-description"
      onCancel={event => { event.preventDefault(); handleClose(); }}
    >
      <header className="student-modal__header">
        <div className="student-modal__heading">
          <span className="student-modal__heading-icon" aria-hidden="true"><UserRound size={23} strokeWidth={1.6} /></span>
          <div>
            <span className="student-modal__eyebrow">Student management</span>
            <h2 id="student-modal-title">{isEditing ? "Edit student" : initialValues ? "Admit student" : "Add a student"}</h2>
            <p id="student-modal-description">{isEditing ? "Keep their profile and learning status up to date." : initialValues ? "Review the details. Saving creates the student profile and closes the enquiry." : "Create a profile to begin their learning journey."}</p>
          </div>
        </div>
        <button className="student-modal__close" type="button" onClick={handleClose} disabled={isSubmitting} aria-label="Close student form"><X size={20} aria-hidden="true" /></button>
      </header>

      <form className="student-modal__form" onSubmit={event => { void handleSubmit(handleFormSubmit)(event); }} noValidate aria-busy={isSubmitting}>
        <div className="student-modal__body">
          <div className="student-modal__admission">
            <span className="student-modal__admission-icon"><Hash size={19} aria-hidden="true" /></span>
            <div><span>Admission number</span><strong>{student?.admissionNumber ?? "Assigned automatically"}</strong><p>{isEditing ? "This number stays with the student and cannot be edited." : "A unique admission number is generated when you save."}</p></div>
            {!isEditing && <span className="student-modal__active-badge">Active on admission</span>}
          </div>
          <p className="student-modal__required-note">Fields marked <span aria-hidden="true">*</span> are required.</p>
          {Object.keys(errors).length > 0 && <p className="student-modal__validation-summary" role="alert">Please check the highlighted fields before saving.</p>}

          <fieldset className="student-modal__fields" disabled={isSubmitting}>
            <section className="student-modal__section" aria-labelledby="student-personal-heading">
              <div className="student-modal__section-heading"><span>01</span><div><h3 id="student-personal-heading">Personal details</h3><p>The student’s name and basic information.</p></div></div>
              <div className="student-modal__grid">
                <div className="student-modal__field">
                  <label htmlFor="student-first-name">First name <span className="student-modal__required" aria-hidden="true">*</span></label>
                  <input id="student-first-name" type="text" autoComplete="given-name" placeholder="Enter first name" autoFocus maxLength={100} aria-required="true" aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? "student-first-name-error" : undefined} {...register("firstName")} />
                  {errors.firstName && <span id="student-first-name-error" className="student-modal__error">{errors.firstName.message}</span>}
                </div>
                <div className="student-modal__field">
                  <label htmlFor="student-last-name">Last name <small>Optional</small></label>
                  <input id="student-last-name" type="text" autoComplete="family-name" placeholder="Enter last name" {...register("lastName")} />
                </div>
                <div className="student-modal__field">
                  <label htmlFor="student-date-of-birth">Date of birth <small>Optional</small></label>
                  <input id="student-date-of-birth" type="date" autoComplete="bday" {...register("dateOfBirth")} />
                </div>
                <div className="student-modal__field">
                  <label htmlFor="student-gender">Gender <small>Optional</small></label>
                  <select id="student-gender" {...register("gender")}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select>
                </div>
                {isEditing && <div className="student-modal__field student-modal__field--full"><label htmlFor="student-status">Learning status</label><select id="student-status" {...register("status")}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="COMPLETED">Completed</option></select><small className="student-modal__field-help">Update this as the student’s learning progresses.</small></div>}
              </div>
            </section>

            <section className="student-modal__section" aria-labelledby="student-contact-heading">
              <div className="student-modal__section-heading"><span>02</span><div><h3 id="student-contact-heading">Contact details</h3><p>How the institute can reach the student.</p></div></div>
              <div className="student-modal__grid">
                <div className="student-modal__field">
                  <label htmlFor="student-phone">Phone number <span className="student-modal__required" aria-hidden="true">*</span></label>
                  <div className="student-modal__input-icon"><Phone size={15} aria-hidden="true" /><input id="student-phone" type="tel" autoComplete="tel" placeholder="Enter phone number" maxLength={20} aria-required="true" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "student-phone-error" : "student-phone-help"} {...register("phone")} /></div>
                  {errors.phone ? <span id="student-phone-error" className="student-modal__error">{errors.phone.message}</span> : <small id="student-phone-help" className="student-modal__field-help">Use a number where the student can be contacted.</small>}
                </div>
                <div className="student-modal__field">
                  <label htmlFor="student-email">Email address <small>Optional</small></label>
                  <div className="student-modal__input-icon"><Mail size={15} aria-hidden="true" /><input id="student-email" type="email" autoComplete="email" placeholder="student@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "student-email-error" : undefined} {...register("email")} /></div>
                  {errors.email && <span id="student-email-error" className="student-modal__error">{errors.email.message}</span>}
                </div>
                <div className="student-modal__field student-modal__field--full">
                  <label htmlFor="student-address">Address <small>Optional</small></label>
                  <textarea id="student-address" rows={3} autoComplete="street-address" placeholder="House name, street, town and postal code" maxLength={500} aria-invalid={!!errors.address} aria-describedby={errors.address ? "student-address-error" : undefined} {...register("address")} />
                  {errors.address && <span id="student-address-error" className="student-modal__error">{errors.address.message}</span>}
                </div>
              </div>
            </section>
          </fieldset>
          {serverError && <div className="student-modal__server-error" role="alert">{serverError}</div>}
        </div>
        <footer className="student-modal__actions">
          <span className="student-modal__save-note"><Check size={14} aria-hidden="true" />{isEditing ? "Changes are saved to the student record" : "Student details are saved to the register"}</span>
          <div><button className="student-modal__cancel" type="button" onClick={handleClose} disabled={isSubmitting}>Cancel</button><button className="student-modal__submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle size={16} className="student-modal__spinner" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}{isSubmitting ? "Saving…" : isEditing ? "Save changes" : initialValues ? "Admit student" : "Add student"}</button></div>
        </footer>
      </form>
    </dialog>
  );
}
