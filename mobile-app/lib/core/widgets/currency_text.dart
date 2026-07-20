import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../app/theme/app_typography.dart';

class CurrencyText extends StatelessWidget {
  const CurrencyText({
    super.key,
    required this.amount,
    this.style,
    this.textAlign,
  });

  final num amount;
  final TextStyle? style;
  final TextAlign? textAlign;

  static final NumberFormat _rupiahFormatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  Widget build(BuildContext context) {
    return Text(
      _rupiahFormatter.format(amount),
      textAlign: textAlign,
      style: style ?? AppTypography.rupiah,
    );
  }
}
