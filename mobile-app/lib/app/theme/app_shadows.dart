import 'package:flutter/material.dart';

class AppShadows {
  const AppShadows._();

  static const BoxShadow soft = BoxShadow(
    color: Color(0x14000000),
    blurRadius: 16,
    offset: Offset(0, 6),
  );

  static const BoxShadow medium = BoxShadow(
    color: Color(0x1F000000),
    blurRadius: 24,
    offset: Offset(0, 10),
  );

  static const List<BoxShadow> card = <BoxShadow>[soft];

  static const List<BoxShadow> floating = <BoxShadow>[medium];
}
