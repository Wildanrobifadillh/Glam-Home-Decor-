import 'package:flutter/material.dart';

import 'app/theme/app_colors.dart';
import 'app/theme/app_spacing.dart';
import 'app/theme/app_theme.dart';
import 'core/widgets/widgets.dart';

void main() {
  runApp(const GhdMobileApp());
}

class GhdMobileApp extends StatelessWidget {
  const GhdMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GHD',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const GhdPlaceholderPage(),
    );
  }
}

class GhdPlaceholderPage extends StatelessWidget {
  const GhdPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScaffoldPreview();
  }
}

class AppScaffoldPreview extends StatefulWidget {
  const AppScaffoldPreview({super.key});

  @override
  State<AppScaffoldPreview> createState() => _AppScaffoldPreviewState();
}

class _AppScaffoldPreviewState extends State<AppScaffoldPreview> {
  String _selectedFilter = 'all';
  String _searchKeyword = '';

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'GHD Mobile',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GhdCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Komponen UI Global',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.terracotta,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Phase 5A sampai 5D aktif: button, input, card, state UI, dialog, bottom sheet, search, dan filter.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.lg),
                SearchInput(
                  hint: 'Cari produk, pelanggan, transaksi...',
                  onChanged: (value) {
                    setState(() {
                      _searchKeyword = value;
                    });
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                FilterChipBar(
                  selectedValue: _selectedFilter,
                  onSelected: (value) {
                    setState(() {
                      _selectedFilter = value;
                    });
                  },
                  items: const [
                    FilterChipItem(
                      label: 'Semua',
                      value: 'all',
                      icon: Icons.apps_outlined,
                    ),
                    FilterChipItem(
                      label: 'Aktif',
                      value: 'active',
                      icon: Icons.check_circle_outline,
                    ),
                    FilterChipItem(
                      label: 'Stok Rendah',
                      value: 'low_stock',
                      icon: Icons.warning_amber_outlined,
                    ),
                    FilterChipItem(
                      label: 'Nonaktif',
                      value: 'inactive',
                      icon: Icons.block_outlined,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Search: ${_searchKeyword.isEmpty ? '-' : _searchKeyword}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(
                  'Filter: $_selectedFilter',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: AppSpacing.lg),
                const GhdTextField(
                  label: 'Nama produk',
                  hint: 'Contoh: Plafon PVC',
                  prefixIcon: Icon(Icons.inventory_2_outlined),
                ),
                const SizedBox(height: AppSpacing.lg),
                GhdButton(
                  label: 'Tombol Utama',
                  icon: Icons.check_circle_outline,
                  onPressed: () {},
                ),
                const SizedBox(height: AppSpacing.sm),
                GhdButton(
                  label: 'Tombol Secondary',
                  variant: GhdButtonVariant.secondary,
                  onPressed: () {},
                ),
                const SizedBox(height: AppSpacing.sm),
                GhdButton(
                  label: 'Tombol Danger',
                  variant: GhdButtonVariant.danger,
                  onPressed: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const GhdListTile(
            leading: Icon(Icons.receipt_long_outlined),
            title: 'Penjualan Hari Ini',
            subtitle: 'Contoh list tile standar GHD',
            trailing: StatusChip(label: 'Lunas', type: GhdStatusType.success),
          ),
          const SizedBox(height: AppSpacing.lg),
          GhdCard(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Omzet',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const CurrencyText(amount: 1250000),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          GhdCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Overlay Components',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                GhdButton(
                  label: 'Tampilkan Dialog',
                  variant: GhdButtonVariant.secondary,
                  icon: Icons.info_outline,
                  onPressed: () {
                    GhdDialog.show<void>(
                      context,
                      title: 'Informasi',
                      message: 'GhdDialog global sudah aktif.',
                      icon: Icons.info_outline,
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                GhdButton(
                  label: 'Tampilkan Confirm Dialog',
                  variant: GhdButtonVariant.secondary,
                  icon: Icons.help_outline,
                  onPressed: () async {
                    await ConfirmDialog.show(
                      context,
                      title: 'Konfirmasi Aksi',
                      message: 'Ini contoh ConfirmDialog untuk aksi penting.',
                      confirmLabel: 'Setuju',
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                GhdButton(
                  label: 'Tampilkan Bottom Sheet',
                  variant: GhdButtonVariant.secondary,
                  icon: Icons.tune,
                  onPressed: () {
                    AppBottomSheet.show<void>(
                      context,
                      title: 'Filter Produk',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Contoh AppBottomSheet untuk filter, pilihan data, atau aksi cepat.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          const Wrap(
                            spacing: AppSpacing.sm,
                            runSpacing: AppSpacing.sm,
                            children: [
                              StatusChip(label: 'Semua'),
                              StatusChip(
                                label: 'Aktif',
                                type: GhdStatusType.success,
                              ),
                              StatusChip(
                                label: 'Stok Rendah',
                                type: GhdStatusType.warning,
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          GhdButton(
                            label: 'Terapkan Filter',
                            onPressed: () {
                              Navigator.of(context).pop();
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const GhdCard(
            child: LoadingState(message: 'Memuat produk...', compact: true),
          ),
          const SizedBox(height: AppSpacing.lg),
          const GhdCard(
            child: EmptyState(
              title: 'Belum ada produk',
              message: 'Produk yang ditambahkan nanti akan muncul di sini.',
              icon: Icons.inventory_2_outlined,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          GhdCard(
            child: ErrorState(
              title: 'Gagal memuat data',
              message: 'Periksa koneksi internet atau coba beberapa saat lagi.',
              onRetry: () {},
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const GhdCard(
            child: NoAccessState(
              title: 'Akses dibatasi',
              message: 'Role Anda belum memiliki izin untuk membuka modul ini.',
            ),
          ),
        ],
      ),
    );
  }
}
