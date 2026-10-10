import { useEffect, useRef } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import "../styles/AddStudentModal.css";
import "../styles/DeleteConfirmationDialog.css";

type Props = {
  entity: "student" | "course";
  name: string;
  reference?: string;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationDialog({ entity, name, reference, isDeleting, error, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const close = () => { if (!isDeleting) onClose(); };

  return <dialog ref={dialogRef} className="student-modal delete-dialog" role="alertdialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" aria-busy={isDeleting} onCancel={event => { event.preventDefault(); close(); }}>
    <header className="student-modal__header">
      <div className="student-modal__heading">
        <span className="student-modal__heading-icon delete-dialog__icon"><Trash2 size={23} strokeWidth={1.6} aria-hidden="true" /></span>
        <div><span className="student-modal__eyebrow">Confirm deletion</span><h2 id="delete-dialog-title">Delete {entity}?</h2><p>This action cannot be undone.</p></div>
      </div>
      <button className="student-modal__close" type="button" onClick={close} disabled={isDeleting} aria-label="Close delete confirmation"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="student-modal__body">
      <div className="delete-dialog__record"><strong>{name}</strong>{reference && <span>{reference}</span>}</div>
      <p id="delete-dialog-description" className="delete-dialog__description">{entity === "course" ? "This will permanently remove the course from the catalogue and the homepage. You can mark it inactive instead to keep the record." : "This will permanently remove the student’s profile and contact details from the register."}</p>
      {error && <div className="student-modal__server-error" role="alert">{error}</div>}
    </div>
    <footer className="student-modal__actions"><span className="student-modal__save-note">Please review the record before deleting.</span><div>
      <button className="student-modal__cancel" type="button" onClick={close} disabled={isDeleting} autoFocus>Cancel</button>
      <button className="student-modal__submit delete-dialog__confirm" type="button" onClick={() => { if (!isDeleting) onConfirm(); }} disabled={isDeleting}>{isDeleting ? <LoaderCircle size={16} className="student-modal__spinner" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}{isDeleting ? "Deleting…" : `Delete ${entity}`}</button>
    </div></footer>
  </dialog>;
}
