import Card from "../ui/Card";
import ModuleHeader from "./ModuleHeader";

function ListPageLayout({
  eyebrow,
  title,
  description,
  actions,
  filters,
  children,
  footer,
}) {
  return (
    <div className="list-page-layout">
      <ModuleHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {filters ? <Card className="list-filter-card">{filters}</Card> : null}

      <Card className="list-content-card">{children}</Card>

      {footer ? <div className="list-page-footer">{footer}</div> : null}
    </div>
  );
}

export default ListPageLayout;