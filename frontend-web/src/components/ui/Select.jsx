import clsx from "clsx";

function Select({ label, error, children, className = "", ...props }) {
  return (
    <div className="ui-field">
      {label ? <label>{label}</label> : null}

      <select className={clsx("ui-input", className)} {...props}>
        {children}
      </select>

      {error ? <p className="ui-error-text">{error}</p> : null}
    </div>
  );
}

export default Select;