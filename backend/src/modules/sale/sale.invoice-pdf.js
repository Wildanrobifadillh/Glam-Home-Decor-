const PDFDocument = require("pdfkit");

const {
  getStoreName,
  getStoreSocialMedia,
} = require("../../utils/storeBrand");

const PAPER_SIZES = {
  A4: [595.28, 841.89],
  F4: [595.28, 935.43],
  CONTINUOUS_95X11: [684, 792],
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
  doc.font("Helvetica-Bold").fontSize(9);
  drawText(doc, "Penerima", x, y, {
    width,
    align: "center",
  });

  const lineY = y + 44;

  drawLine(doc, x + 42, lineY, x + width - 42, lineY);

  return lineY + 8;
};

const drawInvoiceSenderSection = (doc, x, y, width, storeName) => {
  doc.font("Helvetica-Bold").fontSize(8);
  drawText(doc, "Hormat kami,", x, y, {
    width,
    align: "center",
  });

  doc.font("Helvetica-Bold").fontSize(8);
  drawText(doc, storeName, x, y + 14, {
    width,
    align: "center",
  });

  const lineY = y + 44;

  drawLine(doc, x + 42, lineY, x + width - 42, lineY);

  return lineY + 8;
};

const drawInvoiceCopy = ({ doc, invoicePreview, copyLabel }) => {
  const {
    invoice,
    store,
    customer,
    items,
    summary,
    payment,
    notes,
    authorization,
  } = invoicePreview;

  const storeName = getStoreName(store);
  const storeSocialMedia = getStoreSocialMedia(store);

  const pageWidth = doc.page.width;
  const margin = 24;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  doc.font("Helvetica-Bold").fontSize(14);
  drawText(doc, storeName, margin, y, { width: 340 });

  doc.font("Helvetica").fontSize(7);
  drawText(doc, store.address, margin, y + 16, { width: 300 });
  drawText(doc, `Telp: ${store.phone || "-"}`, margin, y + 30, { width: 220 });
  drawText(doc, `Email: ${store.email || "-"}`, margin, y + 42, { width: 260 });

  drawText(doc, storeSocialMedia, margin, y + 54, { width: 260 });

  doc.font("Helvetica-Bold").fontSize(16);
  drawText(doc, "INVOICE", pageWidth - margin - 180, y, {
    width: 180,
    align: "right",
  });

  if (invoice.invoiceCopies > 1 && copyLabel?.label) {
    doc.font("Helvetica").fontSize(8);
    drawText(doc, copyLabel.label, pageWidth - margin - 220, y + 20, {
      width: 220,
      align: "right",
    });
  }

  y += 72;
  drawLine(doc, margin, y, pageWidth - margin, y);
  y += 12;

  doc.font("Helvetica").fontSize(9);

  drawText(doc, "No. Invoice", margin, y);
  drawText(doc, `: ${invoice.invoiceNumber}`, margin + 92, y);

  drawText(doc, "Tanggal Invoice", margin, y + 14);
  drawText(doc, `: ${formatDate(invoice.invoiceDate)}`, margin + 92, y + 14);

  drawText(doc, "No. Penjualan", margin, y + 28);
  drawText(doc, `: ${invoice.saleNumber}`, margin + 92, y + 28);

  drawText(doc, "Jatuh Tempo", margin, y + 42);
  drawText(doc, `: ${formatDate(invoice.dueDate)}`, margin + 92, y + 42);

  const leftInfoBottom = y + 42;

  const rightBlockX = margin + 315;
  const rightLabelWidth = 62;
  const rightColonX = rightBlockX + rightLabelWidth;
  const rightValueX = rightColonX + 10;
  const rightValueWidth = pageWidth - margin - rightValueX;

  drawText(doc, "Kepada", rightBlockX, y);
  drawText(doc, ":", rightColonX, y);
  drawText(doc, customer.name || "-", rightValueX, y, {
    width: rightValueWidth,
    align: "left",
  });

  drawText(doc, "Telepon", rightBlockX, y + 14);
  drawText(doc, ":", rightColonX, y + 14);
  drawText(doc, customer.phone || "-", rightValueX, y + 14, {
    width: rightValueWidth,
    align: "left",
  });

  drawText(doc, "Alamat", rightBlockX, y + 28);
  drawText(doc, ":", rightColonX, y + 28);

  const addressText = customer.address || "-";
  const addressHeight = doc.heightOfString(addressText, {
    width: rightValueWidth,
    align: "left",
  });

  drawText(doc, addressText, rightValueX, y + 28, {
    width: rightValueWidth,
    align: "left",
  });

  const rightInfoBottom = y + 28 + addressHeight;
  y = Math.max(leftInfoBottom, rightInfoBottom) + 12;

  drawLine(doc, margin, y, pageWidth - margin, y);
  y += 12;

  const headerHeight = 18;
  const rowHeight = 17;

  const columnWidths = {
    no: 26,
    code: 70,
    name: 230,
    qty: 45,
    unit: 55,
    price: 85,
    subtotal: 95,
  };

  const tableWidth = Object.values(columnWidths).reduce(
    (total, width) => total + width,
    0
  );
  const tableX = margin + (contentWidth - tableWidth) / 2;

  const columns = {
    no: tableX,
    code: tableX + columnWidths.no,
    name: tableX + columnWidths.no + columnWidths.code,
    qty: tableX + columnWidths.no + columnWidths.code + columnWidths.name,
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

  (items || []).forEach((item) => {
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
        align: "center",
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
        align: "center",
      }
    );

    y += rowHeight;
  });

  y += 14;

  const summaryLabelWidth = 180;
  const summaryValueWidth = 120;
  const summaryX = pageWidth - margin - summaryLabelWidth - summaryValueWidth;
  const summaryRowHeight = 15;
  let summaryY = y;

  doc.font("Helvetica").fontSize(9);

  const drawSummaryRow = (label, value, isBold = false) => {
    doc.font(isBold ? "Helvetica-Bold" : "Helvetica");
    drawText(doc, label, summaryX, summaryY, { width: summaryLabelWidth });
    drawText(doc, formatCurrency(value), summaryX + summaryLabelWidth, summaryY, {
      width: summaryValueWidth,
      align: "right",
    });
    summaryY += summaryRowHeight;
  };

  drawSummaryRow("Subtotal Barang", summary.itemSubtotalAmount);
  drawSummaryRow("Diskon", summary.discountAmount);
  drawSummaryRow("Pajak", summary.taxAmount);

  (summary.additionalCosts || []).forEach((cost) => {
    drawSummaryRow(cost.name, cost.amount);
  });

  drawLine(
    doc,
    summaryX,
    summaryY,
    summaryX + summaryLabelWidth + summaryValueWidth,
    summaryY
  );
  summaryY += 5;

  drawSummaryRow("Total Tagihan", summary.totalAmount, true);
  drawSummaryRow("Dibayar", payment.paidAmount);
  drawSummaryRow("Sisa", payment.remainingAmount, true);

  const paymentInfoY = y;
  doc.font("Helvetica-Bold").fontSize(9);
  drawText(doc, "Informasi Pembayaran", margin, paymentInfoY);

  doc.font("Helvetica").fontSize(8);
  drawText(doc, `Metode: ${payment.paymentMethod || "-"}`, margin, paymentInfoY + 14);
  drawText(doc, `Status: ${payment.paymentStatus || "-"}`, margin, paymentInfoY + 28);

  y = Math.max(summaryY, paymentInfoY + 42) + 12;

  const shortNote = [
    notes.transactionProofNote ||
      "Invoice ini merupakan bukti transaksi resmi.",
    notes.paymentTerms ||
      `Pembayaran dianggap sah setelah dana diterima oleh pihak ${storeName}.`,
    notes.complaintTerms ||
      "Komplain maksimal 3 hari setelah barang diterima dan wajib menyertakan invoice.",
    notes.returnTerms ||
      "Barang yang sudah dibeli mengikuti ketentuan retur toko.",
  ]
    .filter(Boolean)
    .join(", ");

  doc.font("Helvetica-Bold").fontSize(8);
  drawText(doc, "Catatan:", margin, y, { width: 180 });
  y += 10;

  doc.font("Helvetica").fontSize(7);
  drawText(doc, shortNote, margin, y, {
    width: contentWidth,
    align: "left",
  });

  const footerY = y + 34;
  const blockWidth = 190;
  const leftX = margin;
  const rightXFooter = pageWidth - margin - blockWidth;

  drawInvoiceReceiverSection(doc, leftX, footerY, blockWidth);
  drawInvoiceSenderSection(
    doc,
    rightXFooter,
    footerY,
    blockWidth,
    storeName
  );
};

const generateSaleInvoicePdfBuffer = async (invoicePreview) => {
  return new Promise((resolve, reject) => {
    try {
      const paperSize = invoicePreview.invoice.paperSize || "CONTINUOUS_95X11";
      const pageSize = PAPER_SIZES[paperSize] || PAPER_SIZES.CONTINUOUS_95X11;
      const layout = "portrait";

      const doc = new PDFDocument({
        size: pageSize,
        layout,
        margin: 24,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const printScale = 0.88;
      const printOffsetX = 0;
      const printOffsetY = 0;

      doc.save();
      doc.translate(printOffsetX, printOffsetY);
      doc.scale(printScale);

      drawInvoiceCopy({
        doc,
        invoicePreview,
        copyLabel: invoicePreview.invoice.copyLabels[0] || null,
      });

      doc.restore();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateSaleInvoicePdfBuffer,
};