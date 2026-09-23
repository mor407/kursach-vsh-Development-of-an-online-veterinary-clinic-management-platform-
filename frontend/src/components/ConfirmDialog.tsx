import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Короткий поясняющий текст под заголовком */
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** У удаления — красная кнопка подтверждения */
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const body = message ? (
    <p id={descId} className="confirm-dialog-message">
      {message}
    </p>
  ) : children ? (
    <div id={descId} className="confirm-dialog-message confirm-dialog-message--custom">
      {children}
    </div>
  ) : (
    <p id={descId} className="confirm-dialog-message confirm-dialog-message--fallback">
      Вы уверены?
    </p>
  );

  return createPortal(
    <div
      className="modal-backdrop confirm-dialog-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <h2 id={titleId} className="confirm-dialog-title">
            {title}
          </h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Закрыть">
            ×
          </button>
        </div>
        {body}
        <div className="confirm-dialog-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost confirm-dialog-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              variant === "danger" ? "btn btn-confirm-danger" : "btn btn-primary"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
