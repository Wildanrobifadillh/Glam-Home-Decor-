function ModuleHeader({
  eyebrow = "Module",
  title,
  description,
  actions,
}) {
  return (
    <div className="module-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <span>{description}</span> : null}
      </div>

      {actions ? <div className="module-header-actions">{actions}</div> : null}
    </div>
  );
}

export default ModuleHeader;