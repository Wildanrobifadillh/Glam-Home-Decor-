import clsx from "clsx";

function Textarea({ label, error, className = "", ...props }) {
  return (
    <div className="ui-field">
      {label ? <label>{label}</label> : null}

      <textarea className={clsx("ui-textarea", className)} {...props} />

      {error ? <p className="ui-error-text">{error}</p> : null}
    </div>
  );
}

export default Textarea;