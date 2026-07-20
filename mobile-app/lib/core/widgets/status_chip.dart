import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_radius.dart';
import '../../app/theme/app_spacing.dart';

enum GhdStatusType { neutral, success, warning, error, info }

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.type = GhdStatusType.neutral,
  });

  final String label;
  final GhdStatusType type;

  @override
  Widget build(BuildContext context) {
    final colors = _colors;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: AppRadius.pill,
        border: Border.all(color: colors.border),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: colors.foreground,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  _StatusChipColors get _colors {
    return switch (type) {
      GhdStatusType.neutral => const _StatusChipColors(
        background: AppColors.warmWhite,
        foreground: AppColors.textSecondary,
        border: AppColors.stone,
      ),
      GhdStatusType.success => const _StatusChipColors(
        background: Color(0xFFEAF5EA),
        foreground: AppColors.success,
        border: Color(0xFFCDE8CD),
      ),
      GhdStatusType.warning => const _StatusChipColors(
        background: Color(0xFFFFF4DE),
        foreground: AppColors.warning,
        border: Color(0xFFF5D59D),
      ),
      GhdStatusType.error => const _StatusChipColors(
        background: Color(0xFFFDEDEC),
        foreground: AppColors.error,
        border: Color(0xFFF5B7B1),
      ),
      GhdStatusType.info => const _StatusChipColors(
        background: Color(0xFFEAF3FA),
        foreground: AppColors.info,
        border: Color(0xFFC9DFF0),
      ),
    };
  }
}

class _StatusChipColors {
  const _StatusChipColors({
    required this.background,
    required this.foreground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final Color border;
}
