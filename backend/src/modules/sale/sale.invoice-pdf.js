const PDFDocument = require("pdfkit");

const PAPER_SIZES = {
  A4: [595.28, 841.89],
  F4: [595.28, 935.43],
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
};

const drawText = (doc, text, x, y, options = {}) => {
  doc.text(text || "-", x, y, options);
};

const drawLine = (doc, x1, y1, x2, y2) => {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
};

const drawCell = (
  doc,
  text,
  x,
  y,
  width,
  height,
  options = {}
) => {
  const {
    align = "left",
    font = "Helvetica",
    fontSize = 8,
    paddingX = 4,
  } = options;

  doc.font(font).fontSize(fontSize);

  const stringText = text === null || text === undefined ? "-" : String(text);

  const textHeight = doc.heightOfString(stringText, {
    width: width - paddingX * 2,
    align,
  });

  const textY = y + (height - textHeight) / 2;

  doc.text(stringText, x + paddingX, textY, {
    width: width - paddingX * 2,
    align,
  });
};

const drawInvoiceReceiverSection = (doc, x, y, width) => {
  doc.font("Helvetica-Bold").fontSize(10);
  drawText(doc, "Penerima", x, y, {
    width,
    align: "center",
  });

  const lineY = y + 92;

  drawLine(doc, x + 55, lineY, x + width - 55, lineY);

  doc.font("Helvetica").fontSize(9);
  drawText(doc, "(__________________________)", x, lineY + 8, {
    width,
    align: "center",
  });

  drawText(doc, "Nama Jelas & Tanda Tangan", x, lineY + 26, {
    width,
    align: "center",
  });

  return lineY + 42;
};

const drawInvoiceSenderSection = (
  doc,
  x,
  y,
  width,
  storeName,
  responsiblePersonName,
  responsiblePersonTitle
) => {
  doc.font("Helvetica").fontSize(9);
  drawText(doc, "Hormat kami,", x, y, {
    width,
    align: "center",
  });

  drawText(doc, storeName || "Glam Home Decor", x, y + 18, {
    width,
    align: "center",
  });

  const lineY = y + 92;

  drawLine(doc, x + 55, lineY, x + width - 55, lineY);

  doc.font("Helvetica-Bold").fontSize(9);
  drawText(doc, responsiblePersonName || "-", x, lineY + 10, {
    width,
    align: "center",
  });

  doc.font("Helvetica").fontSize(8);
  drawText(doc, responsiblePersonTitle || "Penanggung Jawab", x, lineY + 28, {
    width,
    align: "center",
  });

  return lineY + 42;
};

const drawInvoiceCopy = ({ doc, invoicePreview, copyLabel }) => {
  const { invoice, store, customer, items, summary, payment, invoiceBankAccount, notes, authorization, createdBy } =
    invoicePreview;

  const pageWidth = doc.page.width;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  doc.font("Helvetica-Bold").fontSize(16);
  drawText(doc, store.name, margin, y, { width: 300 });
  doc.font("Helvetica").fontSize(8);
  drawText(doc, store.address, margin, y + 20, { width: 330 });
  drawText(doc, `Telp: ${store.phone || "-"}`, margin, y + 42, { width: 220 });
  drawText(doc, store.socialMedia || "", margin, y + 54, { width: 260 });

  doc.font("Helvetica-Bold").fontSize(18);
  drawText(doc, "INVOICE", pageWidth - margin - 170, y, {
    width: 170,
    align: "right",
  });

  doc.font("Helvetica").fontSize(9);
  drawText(doc, copyLabel.label, pageWidth - margin - 220, y + 26, {
    width: 220,
    align: "right",
  });

  y += 78;
  drawLine(doc, margin, y, pageWidth - margin, y);
  y += 12;

  doc.font("Helvetica").fontSize(9);

  drawText(doc, "No. Invoice", margin, y);
  drawText(doc, `: ${invoice.invoiceNumber}`, margin + 95, y);

  drawText(doc, "Tanggal Invoice", margin, y + 14);
  drawText(doc, `: ${formatDate(invoice.invoiceDate)}`, margin + 95, y + 14);

  drawText(doc, "No. Penjualan", margin, y + 28);
  drawText(doc, `: ${invoice.saleNumber}`, margin + 95, y + 28);

  drawText(doc, "Jatuh Tempo", margin, y + 42);
  drawText(doc, `: ${formatDate(invoice.dueDate)}`, margin + 95, y + 42);

  const rightX = pageWidth / 2 + 20;

  drawText(doc, "Kepada", rightX, y);
  drawText(doc, `: ${customer.name || "-"}`, rightX + 85, y);

  drawText(doc, "Telepon", rightX, y + 14);
  drawText(doc, `: ${customer.phone || "-"}`, rightX + 85, y + 14);

  drawText(doc, "Alamat", rightX, y + 28);
  drawText(doc, `: ${customer.address || "-"}`, rightX + 85, y + 28, {
    width: 180,
  });

  y += 70;

    const tableX = margin;
    const tableWidth = contentWidth;
    const headerHeight = 24;
    const rowHeight = 24;

    const columnWidths = {
    no: 28,
    code: 78,
    name: 185,
    qty: 38,
    unit: 48,
    price: 72,
    subtotal: 74,
    };

    const columns = {
    no: tableX,
    code: tableX + columnWidths.no,
    name: tableX + columnWidths.no + columnWidths.code,
    qty:
        tableX +
        columnWidths.no +
        columnWidths.code +
        columnWidths.name,
    unit:
        tableX +
        columnWidths.no +
        columnWidths.code +
        columnWidths.name +
        columnWidths.qty,
    price:
        tableX +
        columnWidths.no +
        columnWidths.code +
        columnWidths.name +
        columnWidths.qty +
        columnWidths.unit,
    subtotal:
        tableX +
        columnWidths.no +
        columnWidths.code +
        columnWidths.name +
        columnWidths.qty +
        columnWidths.unit +
        columnWidths.price,
    };

    const drawTableVerticalLines = (rowY, rowH) => {
    const linePositions = [
        columns.no,
        columns.code,
        columns.name,
        columns.qty,
        columns.unit,
        columns.price,
        columns.subtotal,
        tableX + tableWidth,
    ];

    linePositions.forEach((lineX) => {
        drawLine(doc, lineX, rowY, lineX, rowY + rowH);
    });
    };

    doc.rect(tableX, y, tableWidth, headerHeight).stroke();
    drawTableVerticalLines(y, headerHeight);

    drawCell(doc, "No", columns.no, y, columnWidths.no, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(doc, "Kode", columns.code, y, columnWidths.code, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(doc, "Nama Barang", columns.name, y, columnWidths.name, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(doc, "Qty", columns.qty, y, columnWidths.qty, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(doc, "Satuan", columns.unit, y, columnWidths.unit, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(doc, "Harga", columns.price, y, columnWidths.price, headerHeight, {
    align: "center",
    font: "Helvetica-Bold",
    });

    drawCell(
    doc,
    "Subtotal",
    columns.subtotal,
    y,
    columnWidths.subtotal,
    headerHeight,
    {
        align: "center",
        font: "Helvetica-Bold",
    }
    );

    y += headerHeight;

    items.forEach((item) => {
    doc.rect(tableX, y, tableWidth, rowHeight).stroke();
    drawTableVerticalLines(y, rowHeight);

    drawCell(doc, item.no, columns.no, y, columnWidths.no, rowHeight, {
        align: "center",
    });

    drawCell(doc, item.productCode, columns.code, y, columnWidths.code, rowHeight, {
        align: "center",
    });

    drawCell(
        doc,
        item.productName,
        columns.name,
        y,
        columnWidths.name,
        rowHeight,
        {
        align: "left",
        }
    );

    drawCell(doc, item.quantity, columns.qty, y, columnWidths.qty, rowHeight, {
        align: "center",
    });

    drawCell(doc, item.unit, columns.unit, y, columnWidths.unit, rowHeight, {
        align: "center",
    });

    drawCell(
        doc,
        formatCurrency(item.sellingPrice),
        columns.price,
        y,
        columnWidths.price,
        rowHeight,
        {
        align: "right",
        }
    );

    drawCell(
        doc,
        formatCurrency(item.subtotal),
        columns.subtotal,
        y,
        columnWidths.subtotal,
        rowHeight,
        {
        align: "right",
        }
    );

    y += rowHeight;
    });

    y += 12;

  const summaryX = pageWidth - margin - 230;
  const labelWidth = 115;
  const valueWidth = 110;
  const summaryRow = 15;

  doc.font("Helvetica").fontSize(9);

  const drawSummaryRow = (label, value, isBold = false) => {
    if (isBold) {
      doc.font("Helvetica-Bold");
    } else {
      doc.font("Helvetica");
    }

    drawText(doc, label, summaryX, y, { width: labelWidth });
    drawText(doc, formatCurrency(value), summaryX + labelWidth, y, {
      width: valueWidth,
      align: "right",
    });

    y += summaryRow;
  };

  drawSummaryRow("Subtotal Barang", summary.itemSubtotalAmount);
  drawSummaryRow("Diskon", summary.discountAmount);
  drawSummaryRow("Pajak", summary.taxAmount);

  summary.additionalCosts.forEach((cost) => {
    drawSummaryRow(cost.name, cost.amount);
  });

  drawLine(doc, summaryX, y, summaryX + labelWidth + valueWidth, y);
  y += 5;

  drawSummaryRow("Total Tagihan", summary.totalAmount, true);
  drawSummaryRow("Dibayar", payment.paidAmount);
  drawSummaryRow("Sisa", payment.remainingAmount, true);

  y += 10;

  const paymentInfoY = y;
  doc.font("Helvetica-Bold").fontSize(9);
  drawText(doc, "Informasi Pembayaran", margin, paymentInfoY);

  doc.font("Helvetica").fontSize(8);
  drawText(doc, `Metode: ${payment.paymentMethod}`, margin, paymentInfoY + 14);
  drawText(doc, `Status: ${payment.paymentStatus}`, margin, paymentInfoY + 28);

  if (invoiceBankAccount) {
    drawText(
      doc,
      `Transfer: ${invoiceBankAccount.bankName || "-"} ${invoiceBankAccount.accountNumber || "-"} a.n. ${invoiceBankAccount.accountHolderName || "-"}`,
      margin,
      paymentInfoY + 42,
      { width: 330 }
    );
  }

  y += 70;

  doc.font("Helvetica-Bold").fontSize(8);
  drawText(doc, "Note:", margin, y, { width: contentWidth });
  y += 12;

  doc.font("Helvetica").fontSize(8);
  drawText(doc, notes.transactionProofNote, margin, y, { width: contentWidth });
  y += 12;
  drawText(doc, notes.paymentTerms, margin, y, { width: contentWidth });
  y += 12;
  drawText(doc, notes.complaintTerms, margin, y, { width: contentWidth });
  y += 12;
  drawText(doc, notes.returnTerms, margin, y, { width: contentWidth });
  y += 18;

  drawText(doc, notes.thankYouNote, margin, y, { width: contentWidth });

    const footerY = y + 28;
    const blockWidth = 220;
    const gap = contentWidth - blockWidth * 2;

    const leftX = margin;
    const rightXFooter = margin + blockWidth + gap;

    // kiri
    drawInvoiceReceiverSection(doc, leftX, footerY, blockWidth);

    // kanan
    drawInvoiceSenderSection(
      doc,
      rightXFooter,
      footerY,
      blockWidth,
      store.name,
      authorization.responsiblePersonName,
      authorization.responsiblePersonTitle
    );

  // doc.font("Helvetica").fontSize(7);
  // drawText(doc, `Dicetak oleh: ${createdBy.name}`, margin, doc.page.height - 40);
};

const generateSaleInvoicePdfBuffer = async (invoicePreview) => {
  return new Promise((resolve, reject) => {
    try {
      const paperSize = invoicePreview.invoice.paperSize || "F4";
      const pageSize = PAPER_SIZES[paperSize] || PAPER_SIZES.F4;

      const doc = new PDFDocument({
        size: pageSize,
        margin: 36,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      invoicePreview.invoice.copyLabels.forEach((copyLabel, index) => {
        if (index > 0) {
          doc.addPage();
        }

        drawInvoiceCopy({
          doc,
          invoicePreview,
          copyLabel,
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateSaleInvoicePdfBuffer,
};