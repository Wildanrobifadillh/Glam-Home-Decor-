const PDFDocument = require("pdfkit");

const {
  getStoreName,
  getStoreSocialMedia,
} = require("../../utils/storeBrand");

const PAPER_SIZES = {
  A4: [595.28, 841.89],
  F4: [612, 936],
  CONTINUOUS_95X11: [684, 792],
};


const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const drawText = (
  doc,
  text,
  x,
  y,
  options = {}
) => {
  doc.text(text ?? "-", x, y, options);
};

const drawLine = (doc, startX, startY, endX, endY) => {
  doc
    .moveTo(startX, startY)
    .lineTo(endX, endY)
    .stroke();
};

const drawBox = (doc, x, y, width, height, options = {}) => {
  const {
    fillColor = null,
    lineWidth = 0.8,
    stroke = true,
  } = options;

  doc.save();
  doc.lineWidth(lineWidth);

  if (fillColor) {
    doc.rect(x, y, width, height).fillAndStroke(fillColor, "#000000");
  } else if (stroke) {
    doc.rect(x, y, width, height).stroke();
  }

  doc.restore();
};

const drawCell = (
  doc,
  text,
  x,
  y,
  width,
  align = "left",
  options = {}
) => {
  doc.text(text ?? "-", x, y, {
    width,
    align,
    ...options,
  });
};

const getSafeStoreName = (store) => getStoreName(store);

const buildStoreMetaLines = (store) => {
  const lines = [];

  if (store?.address) {
    lines.push(store.address);
  }

  if (store?.phone || store?.email) {
    const contactLine = [
      store?.phone ? `Telp: ${store.phone}` : null,
      store?.email ? `Email: ${store.email}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    if (contactLine) {
      lines.push(contactLine);
    }
  }

  lines.push(getStoreSocialMedia(store));

  return lines;
};

const drawHeader = (doc, preview, pageWidth, margin, startY) => {
  const store = preview.store || {};
  const contentWidth = pageWidth - margin * 2;

  const gap = 20;
  const leftWidth = contentWidth * 0.68;
  const rightWidth = contentWidth - leftWidth - gap;
  const rightX = margin + leftWidth + gap;

  let leftY = startY;

  const storeName = getSafeStoreName(store);

  doc.font("Helvetica-Bold").fontSize(16);
  drawText(doc, storeName, margin, leftY, {
    width: leftWidth,
  });

  doc.font("Helvetica-Bold").fontSize(15);
  drawText(doc, "SURAT JALAN", rightX, startY, {
    width: rightWidth,
    align: "right",
  });

  leftY += doc.heightOfString(storeName, {
    width: leftWidth,
  }) + 10;

  doc.font("Helvetica").fontSize(9);
  const storeMetaLines = buildStoreMetaLines(store);

  storeMetaLines.forEach((line) => {
    const lineHeight = doc.heightOfString(line, {
      width: leftWidth,
    });

    drawText(doc, line, margin, leftY, {
      width: leftWidth,
    });

    leftY += lineHeight + 4;
  });

  const dividerY = leftY + 10;
  drawLine(doc, margin, dividerY, pageWidth - margin, dividerY);

  return dividerY + 14;
};

const drawDocumentAndDestinationSection = (
  doc,
  preview,
  pageWidth,
  margin,
  startY
) => {
  const deliveryOrder = preview.deliveryOrder || {};
  const customer = preview.customer || {};
  const contentWidth = pageWidth - margin * 2;

  const gap = 28;
  const leftWidth = contentWidth * 0.56;
  const rightWidth = contentWidth - leftWidth - gap;
  const rightX = margin + leftWidth + gap;

  let leftY = startY;
  let rightY = startY;

  // KIRI = info dokumen
  doc.font("Helvetica").fontSize(9);

  const documentRows = [
    ["No. Surat Jalan", deliveryOrder.deliveryOrderNumber || deliveryOrder.previewNumber || "-"],
    ["Tgl. Surat Jalan", formatDate(deliveryOrder.deliveryOrderDate)],
    ["No. Penjualan", deliveryOrder.saleNumber || "-"],
    ["No. Invoice", deliveryOrder.invoiceNumber || "-"],
  ];

  const leftLabelWidth = 98;
  const leftValueWidth = leftWidth - leftLabelWidth - 8;

  documentRows.forEach(([label, value]) => {
    const valueText = String(value || "-");

    const rowHeight = Math.max(
      doc.heightOfString(label, { width: leftLabelWidth }),
      doc.heightOfString(`: ${valueText}`, { width: leftValueWidth })
    );

    drawText(doc, label, margin, leftY, {
      width: leftLabelWidth,
    });

    drawText(doc, `: ${valueText}`, margin + leftLabelWidth, leftY, {
      width: leftValueWidth,
    });

    leftY += rowHeight + 6;
  });

  // KANAN = tujuan pengiriman
  doc.font("Helvetica-Bold").fontSize(10);
  drawText(doc, "Kepada / Tujuan Pengiriman", rightX, rightY, {
    width: rightWidth,
  });

  rightY += 18;

  doc.font("Helvetica").fontSize(9);

  const customerRows = [
    ["Nama", customer?.name || "-"],
    ["Telepon", customer?.phone || "-"],
    ["Alamat", customer?.address || "-"],
  ];

  const rightLabelWidth = 62;
  const rightValueWidth = rightWidth - rightLabelWidth - 8;

  customerRows.forEach(([label, value]) => {
    const valueText = String(value || "-");

    const rowHeight = Math.max(
      doc.heightOfString(label, { width: rightLabelWidth }),
      doc.heightOfString(`: ${valueText}`, { width: rightValueWidth })
    );

    drawText(doc, label, rightX, rightY, {
      width: rightLabelWidth,
    });

    drawText(doc, `: ${valueText}`, rightX + rightLabelWidth, rightY, {
      width: rightValueWidth,
    });

    rightY += rowHeight + 6;
  });

  return Math.max(leftY, rightY) + 14;
};

const drawTableHeader = (doc, margin, y, widths) => {
  doc.font("Helvetica-Bold").fontSize(9);

  drawCell(doc, "No", margin, y, widths.no, "center");
  drawCell(doc, "Kode", margin + widths.no, y, widths.code, "left");
  drawCell(
    doc,
    "Nama Barang",
    margin + widths.no + widths.code,
    y,
    widths.name,
    "left"
  );
  drawCell(
    doc,
    "Qty",
    margin + widths.no + widths.code + widths.name,
    y,
    widths.qty,
    "center"
  );
  drawCell(
    doc,
    "Unit",
    margin + widths.no + widths.code + widths.name + widths.qty,
    y,
    widths.unit,
    "center"
  );

  drawLine(doc, margin, y + 14, margin + widths.total, y + 14);

  return y + 20;
};

const getRowHeight = (doc, item, widths) => {
  const codeHeight = doc.heightOfString(
    item.supplierCode || item.productCode || "-",
    {
      width: widths.code,
    }
  );

  const nameHeight = doc.heightOfString(item.productName || "-", {
    width: widths.name,
  });

  const qtyHeight = doc.heightOfString(String(item.quantity ?? "-"), {
    width: widths.qty,
    align: "center",
  });

  const unitHeight = doc.heightOfString(item.unit || "-", {
    width: widths.unit,
    align: "center",
  });

  return Math.max(codeHeight, nameHeight, qtyHeight, unitHeight, 14) + 6;
};

const drawTableHeaderGrid = (doc, x, y, widths) => {
  const headerHeight = 24;

  drawBox(doc, x, y, widths.total, headerHeight, {
    fillColor: "#f2f2f2",
  });

  const col1 = x + widths.no;
  const col2 = col1 + widths.code;
  const col3 = col2 + widths.name;
  const col4 = col3 + widths.qty;

  drawLine(doc, col1, y, col1, y + headerHeight);
  drawLine(doc, col2, y, col2, y + headerHeight);
  drawLine(doc, col3, y, col3, y + headerHeight);
  drawLine(doc, col4, y, col4, y + headerHeight);

  doc.font("Helvetica-Bold").fontSize(9);

  drawCell(doc, "No", x, y + 7, widths.no, "center");
  drawCell(doc, "Kode", col1, y + 7, widths.code, "center");
  drawCell(doc, "Nama Barang", col2, y + 7, widths.name, "center");
  drawCell(doc, "Qty", col3, y + 7, widths.qty, "center");
  drawCell(doc, "Unit", col4, y + 7, widths.unit, "center");

  return y + headerHeight;
};

const drawItemsTable = (doc, preview, pageWidth, pageHeight, margin, startY) => {
  const items = preview.items || [];
  const contentWidth = pageWidth - margin * 2;

  const widths = {
    no: 42,
    code: 130,
    name: contentWidth - (42 + 130 + 70 + 80),
    qty: 70,
    unit: 80,
  };

  widths.total =
    widths.no + widths.code + widths.name + widths.qty + widths.unit;

  const tableX = margin;
  let y = startY;

  y = drawTableHeaderGrid(doc, tableX, y, widths);

  doc.font("Helvetica").fontSize(9);

  items.forEach((item) => {
    const rowHeight =
      Math.max(
        doc.heightOfString(String(item.no ?? "-"), {
          width: widths.no,
          align: "center",
        }),
        doc.heightOfString(item.supplierCode || item.productCode || "-", {
          width: widths.code - 8,
        }),
        doc.heightOfString(item.productName || "-", {
          width: widths.name - 8,
        }),
        doc.heightOfString(String(item.quantity ?? "-"), {
          width: widths.qty,
          align: "center",
        }),
        doc.heightOfString(item.unit || "-", {
          width: widths.unit,
          align: "center",
        }),
        14
      ) + 10;

    if (y + rowHeight > pageHeight - margin - 24) {
      doc.addPage();
      y = margin;
      y = drawTableHeaderGrid(doc, tableX, y, widths);
      doc.font("Helvetica").fontSize(9);
    }

    drawBox(doc, tableX, y, widths.total, rowHeight);

    const col1 = tableX + widths.no;
    const col2 = col1 + widths.code;
    const col3 = col2 + widths.name;
    const col4 = col3 + widths.qty;

    drawLine(doc, col1, y, col1, y + rowHeight);
    drawLine(doc, col2, y, col2, y + rowHeight);
    drawLine(doc, col3, y, col3, y + rowHeight);
    drawLine(doc, col4, y, col4, y + rowHeight);

    drawCell(doc, String(item.no ?? "-"), tableX, y + 6, widths.no, "center");
    drawCell(
      doc,
      item.supplierCode || item.productCode || "-",
      col1 + 4,
      y + 6,
      widths.code - 8,
      "left"
    );
    drawCell(
      doc,
      item.productName || "-",
      col2 + 4,
      y + 6,
      widths.name - 8,
      "left"
    );
    drawCell(
      doc,
      String(item.quantity ?? "-"),
      col3,
      y + 6,
      widths.qty,
      "center"
    );
    drawCell(
      doc,
      item.unit || "-",
      col4,
      y + 6,
      widths.unit,
      "center"
    );

    y += rowHeight;
  });

  return y + 14;
};

const drawSummaryAndNotes = (
  doc,
  preview,
  pageWidth,
  pageHeight,
  margin,
  startY
) => {
  const summary = preview.summary || {};
  const notes = preview.notes || {};
  const contentWidth = pageWidth - margin * 2;

  const documentNote =
    typeof notes.additionalNote === "string" &&
    !/invoice/i.test(notes.additionalNote)
      ? notes.additionalNote
      : "";

  const saleNoteText = notes.saleNote
    ? `Catatan Penjualan: ${notes.saleNote}`
    : "";

  const docNoteText = documentNote
    ? `Catatan Dokumen: ${documentNote}`
    : "";

  doc.font("Helvetica").fontSize(9);

  const saleNoteHeight = saleNoteText
    ? doc.heightOfString(saleNoteText, {
        width: contentWidth,
      })
    : 0;

  const docNoteHeight = docNoteText
    ? doc.heightOfString(docNoteText, {
        width: contentWidth,
      })
    : 0;

  const hasNotes = Boolean(saleNoteText || docNoteText);

  const requiredHeight =
    58 +
    (hasNotes ? 18 : 0) +
    (saleNoteText ? saleNoteHeight + 6 : 0) +
    (docNoteText ? docNoteHeight + 6 : 0);

  let y = startY;

  if (y + requiredHeight > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  doc.font("Helvetica-Bold").fontSize(10);
  drawText(doc, "Ringkasan Pengiriman", margin, y);
  y += 18;

  doc.font("Helvetica").fontSize(9);
  drawText(doc, `Total Item: ${summary.totalItemCount ?? 0} jenis`, margin, y, {
    width: contentWidth,
  });
  y += 14;

  drawText(doc, `Total Kuantitas: ${summary.totalQuantity ?? 0}`, margin, y, {
    width: contentWidth,
  });
  y += 18;

  if (hasNotes) {
    doc.font("Helvetica-Bold").fontSize(10);
    drawText(doc, "Catatan", margin, y);
    y += 18;

    doc.font("Helvetica").fontSize(9);

    if (saleNoteText) {
      drawText(doc, saleNoteText, margin, y, {
        width: contentWidth,
      });
      y += saleNoteHeight + 6;
    }

    if (docNoteText) {
      drawText(doc, docNoteText, margin, y, {
        width: contentWidth,
      });
      y += docNoteHeight + 6;
    }
  }

  return y + 8;
};
const drawSignatureSection = (
  doc,
  preview,
  pageWidth,
  pageHeight,
  margin,
  startY
) => {
  const storeName = getSafeStoreName(preview.store);
  const contentWidth = pageWidth - margin * 2;
  const blockWidth = 260;
  const gap = contentWidth - blockWidth * 2;

  let y = startY;

  if (y + 120 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  const leftX = margin;
  const rightX = margin + blockWidth + gap;

  // KIRI = PENERIMA BARANG
  doc.font("Helvetica-Bold").fontSize(10);
  drawText(doc, "Penerima Barang", leftX, y, {
    width: blockWidth,
    align: "center",
  });

  const receiverLineY = y + 92;

  drawLine(doc, leftX + 55, receiverLineY, leftX + blockWidth - 55, receiverLineY);

  // KANAN = HORMAT KAMI
  doc.font("Helvetica-Bold").fontSize(10);
  drawText(doc, "Hormat kami,", rightX, y, {
    width: blockWidth,
    align: "center",
  });

  drawText(doc, storeName, rightX, y + 18, {
    width: blockWidth,
    align: "center",
  });

  const senderLineY = y + 92;

  drawLine(doc, rightX + 55, senderLineY, rightX + blockWidth - 55, senderLineY);

  return senderLineY + 8;
};

const drawDeliveryOrder = (doc, preview) => {
  const paperSize = preview.deliveryOrder?.paperSize || "CONTINUOUS_95X11";
  const [pageWidth, pageHeight] =
    PAPER_SIZES[paperSize] || PAPER_SIZES.CONTINUOUS_95X11;
  const margin = 24;

  let y = margin;

 y = drawHeader(doc, preview, pageWidth, margin, y);
 y = drawDocumentAndDestinationSection(doc, preview, pageWidth, margin, y);
 y = drawItemsTable(doc, preview, pageWidth, pageHeight, margin, y);
y = drawSummaryAndNotes(
  doc,
  preview,
  pageWidth,
  pageHeight,
  margin,
  y
);
  drawSignatureSection(doc, preview, pageWidth, pageHeight, margin, y);
};

const generateSaleDeliveryOrderPdfBuffer = async (deliveryOrderPreview) => {
  return new Promise((resolve, reject) => {
    try {
      const paperSize =
        deliveryOrderPreview.deliveryOrder?.paperSize || "CONTINUOUS_95X11";

      const size =
        PAPER_SIZES[paperSize] || PAPER_SIZES.CONTINUOUS_95X11;

      const printScale =
        paperSize === "CONTINUOUS_95X11" ? 0.88 : 1;

      const doc = new PDFDocument({
        size,
        layout: "portrait",
        margin: 24,
        compress: true,
      });

      if (printScale !== 1) {
        doc.scale(printScale);

        doc.on("pageAdded", () => {
          doc.scale(printScale);
        });
      }

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });

      drawDeliveryOrder(doc, deliveryOrderPreview);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateSaleDeliveryOrderPdfBuffer,
};