import clsx from "clsx";

function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={clsx("ui-badge", `ui-badge-${tone}`, className)}>
      {children}
    </span>
  );
}

export default Badge;