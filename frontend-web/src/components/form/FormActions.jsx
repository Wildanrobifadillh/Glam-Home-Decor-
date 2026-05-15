import Button from "../ui/Button";

function FormActions({
  submitLabel = "Simpan",
  cancelLabel = "Batal",
  isSubmitting = false,
  onCancel,
}) {
  return (
    <div className="form-actions">
      {onCancel ? (
        <Button variant="secondary" type="button" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : submitLabel}
      </Button>
    </div>
  );
}

export default FormActions;