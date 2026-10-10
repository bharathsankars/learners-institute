import { useEffect, useRef } from "react";
import { BookOpen, Pencil, X } from "lucide-react";
import type { Course } from "../../api/courses";
import { courseCategory, courseDate } from "../utils/courses";
export function CourseDetailsDialog({ course, onClose, onEdit }: { course: Course; onClose: () => void; onEdit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="directory-profile course-profile" aria-labelledby="course-profile-title" onCancel={onClose}>
    <div className="directory-profile__header"><div className="directory-profile__identity"><span className="admin-directory-avatar" aria-hidden="true"><BookOpen size={22} /></span><div><span className="admin-directory-eyebrow">Course details</span><h2 id="course-profile-title">{course.title}</h2><p>{course.slug}</p></div></div><button className="admin-directory-icon-button" aria-label="Close course details" onClick={onClose}><X size={20} /></button></div>
    <div className="directory-profile__body"><div className="directory-profile__facts"><div><span>Status</span><span className={`admin-directory-badge admin-directory-badge--${course.isActive ? "active" : "inactive"}`}>{course.isActive ? "Active" : "Inactive"}</span></div><div><span>Category</span><strong>{courseCategory(course) || "Uncategorised"}</strong></div><div><span>Display order</span><strong>{course.displayOrder}</strong></div><div><span>Added on</span><strong>{courseDate(course.createdAt)}</strong></div></div>
      <section className="directory-profile__address"><h3>Course overview</h3><p>{course.shortDescription || "No short description provided."}</p></section><section className="course-profile__section"><h3>Full description</h3><p>{course.description || "No detailed description provided."}</p></section><section className="course-profile__section"><h3>Skills covered</h3>{course.skills.length ? <ul className="course-skills">{course.skills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul> : <p>No skills listed yet.</p>}</section><p className="directory-profile__updated">Last updated {courseDate(course.updatedAt)}</p></div>
    <div className="directory-profile__footer"><p className="course-profile__note">Display order controls catalogue ordering.</p><button className="admin-directory-button admin-directory-button--primary" onClick={onEdit}><Pencil size={15} aria-hidden="true" />Edit course</button></div>
  </dialog>;
}
