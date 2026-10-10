import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeIndianRupee,
  CircleDollarSign,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  paidAmount,
  outstandingBalance,
  cancelFeePlan,
  createFeePlan,
  fetchFeePlans,
  formatIndianRupees,
  type CreateFeePlanInput,
  type FeePlan,
  type UpdateFeePlanInput,
  updateFeePlan,
} from "../../api/fees";

import { fetchCourses } from "../../api/courses";

import { fetchStudents } from "../../api/students";

import { FeePlanModal } from "../components/FeePlanModal";

import "../styles/Fees.css";

export function FeesPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedFeePlan, setSelectedFeePlan] = useState<FeePlan | null>(null);

  const [openMenuFeePlanId, setOpenMenuFeePlanId] = useState<string | null>(
    null,
  );

  const [mutationError, setMutationError] = useState("");

  const {
    data: feePlans = [],
    isLoading: isFeePlansLoading,
    isError: isFeePlansError,
    error: feePlansError,
  } = useQuery({
    queryKey: ["fee-plans"],
    queryFn: fetchFeePlans,
  });

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  const { data: courses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const createMutation = useMutation({
    mutationFn: createFeePlan,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fee-plans"],
      });

      setModalOpen(false);
      setSelectedFeePlan(null);
      setMutationError("");
    },

    onError: (error) => {
      setMutationError(
        error instanceof Error ? error.message : "Unable to create fee plan.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      feePlanId,
      input,
    }: {
      feePlanId: string;
      input: UpdateFeePlanInput;
    }) => updateFeePlan(feePlanId, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fee-plans"],
      });

      setModalOpen(false);
      setSelectedFeePlan(null);
      setMutationError("");
    },

    onError: (error) => {
      setMutationError(
        error instanceof Error ? error.message : "Unable to update fee plan.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelFeePlan,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fee-plans"],
      });

      setOpenMenuFeePlanId(null);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleCreate = async (input: CreateFeePlanInput) => {
    setMutationError("");

    await createMutation.mutateAsync(input);
  };

  const handleUpdate = async (feePlanId: string, input: UpdateFeePlanInput) => {
    setMutationError("");

    await updateMutation.mutateAsync({
      feePlanId,
      input,
    });
  };

  const handleAddFeePlan = () => {
    setSelectedFeePlan(null);
    setMutationError("");
    setModalOpen(true);
  };

  const handleEditFeePlan = (feePlan: FeePlan) => {
    setSelectedFeePlan(feePlan);

    setMutationError("");
    setOpenMenuFeePlanId(null);
    setModalOpen(true);
  };

  const handleCancelFeePlan = async (feePlan: FeePlan) => {
    setOpenMenuFeePlanId(null);

    if (feePlan.status === "CANCELLED") {
      return;
    }

    const confirmed = window.confirm(
      `Cancel the fee plan for ${feePlan.enrollment.student.firstName} ${feePlan.enrollment.student.lastName ?? ""}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await cancelMutation.mutateAsync(feePlan.id);
    } catch {
      // Mutation state handles failure.
    }
  };

  const filteredFeePlans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return feePlans;
    }

    return feePlans.filter((feePlan) => {
      const student = feePlan.enrollment.student;

      const course = feePlan.enrollment.course;

      const fullName = [student.firstName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        fullName.includes(query) ||
        student.admissionNumber.toLowerCase().includes(query) ||
        student.phone.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query)
      );
    });
  }, [feePlans, searchTerm]);

  const activeFeePlans = feePlans.filter(
    (feePlan) => feePlan.status === "ACTIVE",
  );

  const totalEffectiveFeePaise = activeFeePlans.reduce(
    (total, feePlan) =>
      total + Math.max(feePlan.totalFeePaise - feePlan.discountPaise, 0),
    0,
  );

  const totalDiscountPaise = activeFeePlans.reduce(
    (total, feePlan) => total + feePlan.discountPaise,
    0,
  );

  const formatDate = (value: string | null) => {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const pageIsLoading =
    isFeePlansLoading || isStudentsLoading || isCoursesLoading;

  return (
    <div className="fees-page">
      <div className="fees-page__heading">
        <div className="fees-page__heading-content">
          <span className="fees-page__eyebrow">Finance</span>

          <h1>Fees</h1>

          <p>
            Manage student course enrollments and fee plans. Payment tracking
            will be connected separately.
          </p>
        </div>

        <button
          className="fees-page__add-button"
          type="button"
          onClick={handleAddFeePlan}
          disabled={pageIsLoading}
        >
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Create Fee Plan
        </button>
      </div>

      <section className="fees-page__summary" aria-label="Fee overview">
        <article className="fee-summary-card">
          <div className="fee-summary-card__icon">
            <ReceiptIndianRupee
              size={20}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div className="fee-summary-card__content">
            <span>Fee Plans</span>

            <strong>{feePlans.length}</strong>
          </div>
        </article>

        <article className="fee-summary-card">
          <div className="fee-summary-card__icon">
            <CircleDollarSign size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="fee-summary-card__content">
            <span>Active Plans</span>

            <strong>{activeFeePlans.length}</strong>
          </div>
        </article>

        <article className="fee-summary-card">
          <div className="fee-summary-card__icon">
            <BadgeIndianRupee size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="fee-summary-card__content">
            <span>Effective Fees</span>

            <strong>{formatIndianRupees(totalEffectiveFeePaise)}</strong>
          </div>
        </article>

        <article className="fee-summary-card">
          <div className="fee-summary-card__icon">
            <BadgeIndianRupee size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="fee-summary-card__content">
            <span>Discounts</span>

            <strong>{formatIndianRupees(totalDiscountPaise)}</strong>
          </div>
        </article>
      </section>

      <section className="fees-page__panel">
        <div className="fees-page__toolbar">
          <div className="fees-page__search">
            <Search size={17} strokeWidth={1.8} aria-hidden="true" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student, admission no., phone or course"
              aria-label="Search fee plans"
            />
          </div>

          <span className="fees-page__count">
            {filteredFeePlans.length}{" "}
            {filteredFeePlans.length === 1 ? "record" : "records"}
          </span>
        </div>

        {isFeePlansError && (
          <div className="fees-page__error">
            {feePlansError instanceof Error
              ? feePlansError.message
              : "Unable to load fee plans."}
          </div>
        )}

        {pageIsLoading ? (
          <div className="fees-page__state">
            <ReceiptIndianRupee
              size={26}
              strokeWidth={1.6}
              aria-hidden="true"
            />

            <strong>Loading fee plans...</strong>
          </div>
        ) : filteredFeePlans.length === 0 ? (
          <div className="fees-page__state">
            <ReceiptIndianRupee
              size={26}
              strokeWidth={1.6}
              aria-hidden="true"
            />

            <strong>
              {searchTerm ? "No matching fee plans" : "No fee plans yet"}
            </strong>

            <p>
              {searchTerm
                ? "Try a different student name, admission number, phone number, or course."
                : "Create a fee plan by selecting a student and course."}
            </p>
          </div>
        ) : (
          <div className="fees-table-wrapper">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Student</th>

                  <th>Course</th>

                  <th>Total Fee</th>

                  <th>Discount</th>

                  <th>Effective Fee</th>

                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>

                  <th>Status</th>

                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredFeePlans.map((feePlan) => {
                  const student = feePlan.enrollment.student;

                  const course = feePlan.enrollment.course;

                  const studentName = [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(" ");

                  const effectiveFee = Math.max(
                    feePlan.totalFeePaise - feePlan.discountPaise,
                    0,
                  );

                  const menuOpen = openMenuFeePlanId === feePlan.id;

                  return (
                    <tr key={feePlan.id}>
                      <td>
                        <div className="fees-table__student">
                          <strong>{studentName}</strong>

                          <span>{student.admissionNumber}</span>
                        </div>
                      </td>

                      <td>
                        <span className="fees-table__course">
                          {course.title}
                        </span>
                      </td>

                      <td>
                        <span className="fees-table__money">
                          {formatIndianRupees(feePlan.totalFeePaise)}
                        </span>
                      </td>

                      <td>
                        <span className="fees-table__discount">
                          {formatIndianRupees(feePlan.discountPaise)}
                        </span>
                      </td>

                      <td>
                        <span className="fees-table__money">
                          {formatIndianRupees(effectiveFee)}
                        </span>
                      </td>

                      <td>{formatIndianRupees(paidAmount(feePlan))}</td>
                      <td>{formatIndianRupees(outstandingBalance(feePlan))}</td>
                      <td>
                        <span className="fees-table__date">
                          {formatDate(feePlan.dueDate)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`fees-table__status ${
                            feePlan.status === "ACTIVE"
                              ? "fees-table__status--active"
                              : "fees-table__status--cancelled"
                          }`}
                        >
                          {feePlan.status}
                        </span>
                      </td>

                      <td>
                        <div className="fee-actions">
                          <button
                            className="fee-actions__trigger"
                            type="button"
                            onClick={() =>
                              setOpenMenuFeePlanId(menuOpen ? null : feePlan.id)
                            }
                            aria-label={`Actions for ${studentName}`}
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </button>

                          {menuOpen && (
                            <div className="fee-actions__menu">
                              <button
                                type="button"
                                onClick={() => handleEditFeePlan(feePlan)}
                              >
                                <Pencil size={15} aria-hidden="true" />
                                Edit
                              </button>

                              {feePlan.status === "ACTIVE" && (
                                <button
                                  className="fee-actions__cancel"
                                  type="button"
                                  onClick={() =>
                                    void handleCancelFeePlan(feePlan)
                                  }
                                >
                                  <XCircle size={15} aria-hidden="true" />
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FeePlanModal
        open={modalOpen}
        feePlan={selectedFeePlan}
        students={students}
        courses={courses}
        isSubmitting={isSubmitting}
        serverError={mutationError}
        onClose={() => {
          if (isSubmitting) {
            return;
          }

          setModalOpen(false);

          setSelectedFeePlan(null);

          setMutationError("");
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
