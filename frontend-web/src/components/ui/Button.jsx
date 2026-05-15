import clsx from "clsx";

function Button({
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        "ui-button",
        `ui-button-${variant}`,
        `ui-button-${size}`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;