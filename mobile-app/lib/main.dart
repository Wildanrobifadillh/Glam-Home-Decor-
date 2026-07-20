import 'package:flutter/material.dart';

import 'app/theme/app_colors.dart';
import 'app/theme/app_spacing.dart';
import 'app/theme/app_theme.dart';

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
    return Scaffold(
      appBar: AppBar(title: const Text('GHD Mobile')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.pagePadding),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'GHD Mobile',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: AppColors.terracotta,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Pondasi theme, font, dan design tokens aktif.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  const TextField(
                    enabled: false,
                    decoration: InputDecoration(
                      labelText: 'Contoh input',
                      hintText: 'Produk / pelanggan',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      child: const Text('Tombol Utama'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
