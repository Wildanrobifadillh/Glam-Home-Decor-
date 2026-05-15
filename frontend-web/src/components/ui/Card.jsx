import clsx from "clsx";

function Card({ children, className = "" }) {
  return <section className={clsx("ui-card", className)}>{children}</section>;
}

export default Card;