import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_radius.dart';
import '../../app/theme/app_spacing.dart';

class FilterChipItem {
  const FilterChipItem({required this.label, required this.value, this.icon});

  final String label;
  final String value;
  final IconData? icon;
}

class FilterChipBar extends StatelessWidget {
  const FilterChipBar({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onSelected,
  });

  final List<FilterChipItem> items;
  final String selectedValue;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final item in items) ...[
            _FilterChipButton(
              item: item,
              selected: item.value == selectedValue,
              onTap: () => onSelected(item.value),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final FilterChipItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final backgroundColor = selected ? AppColors.terracotta : AppColors.surface;
    final foregroundColor = selected ? AppColors.white : AppColors.textPrimary;
    final borderColor = selected ? AppColors.terracotta : AppColors.border;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.pill,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: AppRadius.pill,
          border: Border.all(color: borderColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (item.icon != null) ...[
              Icon(item.icon, size: 16, color: foregroundColor),
              const SizedBox(width: AppSpacing.xs),
            ],
            Text(
              item.label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: foregroundColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
