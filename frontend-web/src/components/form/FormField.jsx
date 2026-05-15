import clsx from "clsx";

function FormField({
  label,
  required = false,
  helper,
  error,
  children,
  className = "",
}) {
  return (
    <div className={clsx("form-field", className)}>
      {label ? (
        <label className="form-field-label">
          {label}
          {required ? <span>*</span> : null}
        </label>
      ) : null}

      {children}

      {helper && !error ? <p className="form-field-helper">{helper}</p> : null}

      {error ? <p className="form-field-error">{error}</p> : null}
    </div>
  );
}

export default FormField;