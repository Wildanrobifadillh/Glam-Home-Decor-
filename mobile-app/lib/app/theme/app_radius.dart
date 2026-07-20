import 'package:flutter/material.dart';

class AppRadius {
  const AppRadius._();

  static const double xsValue = 4;
  static const double smValue = 8;
  static const double mdValue = 12;
  static const double lgValue = 16;
  static const double xlValue = 24;
  static const double pillValue = 999;

  static BorderRadius get xs => BorderRadius.circular(xsValue);
  static BorderRadius get sm => BorderRadius.circular(smValue);
  static BorderRadius get md => BorderRadius.circular(mdValue);
  static BorderRadius get lg => BorderRadius.circular(lgValue);
  static BorderRadius get xl => BorderRadius.circular(xlValue);
  static BorderRadius get pill => BorderRadius.circular(pillValue);
}
