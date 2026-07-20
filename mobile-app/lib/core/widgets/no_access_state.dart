import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_spacing.dart';
import 'ghd_button.dart';

class NoAccessState extends StatelessWidget {
  const NoAccessState({
    super.key,
    this.title = 'Tidak ada akses',
    this.message = 'Anda tidak memiliki izin untuk membuka halaman ini.',
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.lock_outline,
            size: 48,
            color: AppColors.terracottaDark,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.lg),
            GhdButton(
              label: actionLabel!,
              variant: GhdButtonVariant.secondary,
              fullWidth: false,
              onPressed: onAction,
            ),
          ],
        ],
      ),
    );
  }
}
