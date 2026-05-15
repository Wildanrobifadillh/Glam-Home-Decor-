import clsx from "clsx";

function Input({ label, error, className = "", ...props }) {
  return (
    <div className="ui-field">
      {label ? <label>{label}</label> : null}

      <input className={clsx("ui-input", className)} {...props} />

      {error ? <p className="ui-error-text">{error}</p> : null}
    </div>
  );
}

export default Input;