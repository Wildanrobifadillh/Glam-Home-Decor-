import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_radius.dart';
import '../../app/theme/app_spacing.dart';
import 'ghd_button.dart';

class GhdDialog extends StatelessWidget {
  const GhdDialog({
    super.key,
    required this.title,
    this.message,
    this.icon,
    this.actions,
  });

  final String title;
  final String? message;
  final IconData? icon;
  final List<Widget>? actions;

  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    String? message,
    IconData? icon,
    List<Widget>? actions,
  }) {
    return showDialog<T>(
      context: context,
      builder: (_) {
        return GhdDialog(
          title: title,
          message: message,
          icon: icon,
          actions: actions,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dialogActions =
        actions ??
        [
          GhdButton(
            label: 'Mengerti',
            fullWidth: false,
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
        ];

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(AppSpacing.xl),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.xl,
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 42, color: AppColors.terracotta),
              const SizedBox(height: AppSpacing.lg),
            ],
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: dialogActions,
            ),
          ],
        ),
      ),
    );
  }
}
