import Card from "../ui/Card";
import ModuleHeader from "./ModuleHeader";

function FormPageLayout({
  eyebrow,
  title,
  description,
  actions,
  children,
}) {
  return (
    <div className="form-page-layout">
      <ModuleHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      <Card className="form-page-card">{children}</Card>
    </div>
  );
}

export default FormPageLayout;