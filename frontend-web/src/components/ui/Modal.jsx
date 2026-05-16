import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

function Modal({
  open = false,
  title,
  description,
  children,
  footer,
  onClose,
  className = ""
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="ui-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className={clsx("ui-modal", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ui-modal-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>

          <button type="button" onClick={onClose} aria-label="Tutup modal">
            <X size={19} />
          </button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer ? <div className="ui-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export default Modal;