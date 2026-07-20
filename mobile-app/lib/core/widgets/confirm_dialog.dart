import 'package:flutter/material.dart';

import 'ghd_button.dart';
import 'ghd_dialog.dart';

class ConfirmDialog {
  const ConfirmDialog._();

  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String message,
    String confirmLabel = 'Ya, lanjutkan',
    String cancelLabel = 'Batal',
    bool isDanger = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return GhdDialog(
          title: title,
          message: message,
          icon: isDanger
              ? Icons.warning_amber_rounded
              : Icons.help_outline_rounded,
          actions: [
            GhdButton(
              label: cancelLabel,
              variant: GhdButtonVariant.secondary,
              fullWidth: false,
              onPressed: () {
                Navigator.of(dialogContext).pop(false);
              },
            ),
            GhdButton(
              label: confirmLabel,
              variant: isDanger
                  ? GhdButtonVariant.danger
                  : GhdButtonVariant.primary,
              fullWidth: false,
              onPressed: () {
                Navigator.of(dialogContext).pop(true);
              },
            ),
          ],
        );
      },
    );

    return result ?? false;
  }
}
