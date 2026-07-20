import 'package:flutter/material.dart';

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
      home: const GhdPlaceholderPage(),
    );
  }
}

class GhdPlaceholderPage extends StatelessWidget {
  const GhdPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          'GHD Mobile',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}