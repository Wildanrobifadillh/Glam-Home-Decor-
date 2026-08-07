const PDFDocument = require("pdfkit");

const { getStoreName } = require("../../utils/storeBrand");

const PAPER_SIZES = {
  A4_LANDSCAPE: [841.89, 595.28],
};

const formatCurrency = (value) => {
  const formattedValue = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(value || 0);

  return `Rp. ${formattedValue}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const drawText = (doc, text, x, y, options = {}) => {
  doc.text(text || "-", x, y, options);
};

const drawLine = (doc, x1, y1, x2, y2) => {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
};

const drawCell = (doc, text, x, y, width, height, options = {}) => {
  const {
    align = "left",
    font = "Helvetica",
    fontSize = 8,
    paddingX = 5,
    color = "#000000",
  } = options;

  doc.font(font).fontSize(fontSize).fillColor(color);

  const value = text === null || text === undefined ? "-" : String(text);

  const textHeight = doc.heightOfString(value, {
    width: width - paddingX * 2,
    align,
  });

  const textY = y + (height - textHeight) / 2;

  doc.text(value, x + paddingX, textY, {
    width: width - paddingX * 2,
    align,
  });

  doc.fillColor("#000000");
};

const drawReportHeader = ({ doc, storeProfile, periodLabel }) => {
  const pageWidth = doc.page.width;
  const margin = 36;

  let y = 32;

  doc.font("Helvetica-Bold").fontSize(14);
  drawText(doc, getStoreName(storeProfile), margin, y, {
    width: 300,
  });

  doc.font("Helvetica").fontSize(8);
  drawText(doc, storeProfile.address || "-", margin, y + 18, {
    width: 360,
  });

  drawText(doc, `Telp: ${storeProfile.phone || "-"}`, margin, y + 42);

  if (storeProfile.socialMedia) {
    drawText(doc, storeProfile.socialMedia, margin, y + 54);
  }

  doc.font("Helvetica-Bold").fontSize(16);
  drawText(doc, "LAPORAN PENJUALAN", pageWidth - margin - 260, y + 5, {
    width: 260,
    align: "right",
  });

  doc.font("Helvetica").fontSize(9);
  drawText(doc, `Periode: ${periodLabel}`, pageWidth - margin - 260, y + 30, {
    width: 260,
    align: "right",
  });

  y += 76;
  drawLine(doc, margin, y, pageWidth - margin, y);

  return y + 16;
};

const drawSummary = ({ doc, summary, y }) => {
  const pageWidth = doc.page.width;
  const margin = 36;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = 58;

  doc.rect(margin, y, boxWidth, boxHeight).stroke();

  const colWidth = boxWidth / 4;

  const summaryItems = [
    {
      label: "Jumlah Transaksi",
      value: String(summary.saleCount),
    },
    {
      label: "Total Penjualan",
      value: formatCurrency(summary.totalAmount),
    },
    {
      label: "Total Dibayar",
      value: formatCurrency(summary.totalPaidAmount),
    },
    {
      label: "Total Sisa",
      value: formatCurrency(summary.totalRemainingAmount),
    },
  ];

  summaryItems.forEach((item, index) => {
    const x = margin + colWidth * index;

    if (index > 0) {
      drawLine(doc, x, y, x, y + boxHeight);
    }

    doc.font("Helvetica").fontSize(8);
    drawText(doc, item.label, x + 10, y + 12, {
      width: colWidth - 20,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(index === 0 ? 12 : 10);
    drawText(doc, item.value, x + 10, y + 32, {
      width: colWidth - 20,
      align: "center",
    });
  });

  return y + boxHeight + 18;
};

const drawTableHeader = ({ doc, y }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableRight = pageWidth - margin;
  const tableWidth = tableRight - margin;
  const rowHeight = 24;

  const widths = {
    no: 32,
    date: 76,
    saleNumber: 150,
    customer: 180,
    paymentStatus: 66,
    total: 88,
    paid: 88,
    remaining: 89,
  };

  const columns = {};

  let currentX = margin;

  columns.no = {
    x: currentX,
    width: widths.no,
    label: "No",
  };
  currentX += widths.no;

  columns.date = {
    x: currentX,
    width: widths.date,
    label: "Tanggal",
  };
  currentX += widths.date;

  columns.saleNumber = {
    x: currentX,
    width: widths.saleNumber,
    label: "No Penjualan",
  };
  currentX += widths.saleNumber;

  columns.customer = {
    x: currentX,
    width: widths.customer,
    label: "Customer",
  };
  currentX += widths.customer;

  columns.paymentStatus = {
    x: currentX,
    width: widths.paymentStatus,
    label: "Status",
  };
  currentX += widths.paymentStatus;

  columns.total = {
    x: currentX,
    width: widths.total,
    label: "Total",
  };
  currentX += widths.total;

  columns.paid = {
    x: currentX,
    width: widths.paid,
    label: "Dibayar",
  };
  currentX += widths.paid;

  columns.remaining = {
    x: currentX,
    width: widths.remaining,
    label: "Sisa",
  };

  doc.rect(margin, y, tableWidth, rowHeight).fillAndStroke(
    "#1F4E78",
    "#000000"
  );

  Object.values(columns).forEach((column) => {
    drawCell(doc, column.label, column.x, y, column.width, rowHeight, {
      align: "center",
      font: "Helvetica-Bold",
      fontSize: 8,
      color: "#FFFFFF",
    });
  });

  doc.fillColor("#000000");

  return {
    columns,
    nextY: y + rowHeight,
  };
};

const drawTableRow = ({ doc, row, columns, y, isTotal = false }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableRight = pageWidth - margin;
  const rowHeight = 23;

  doc.rect(margin, y, tableRight - margin, rowHeight).stroke();

  const font = isTotal ? "Helvetica-Bold" : "Helvetica";

  drawCell(doc, row.no, columns.no.x, y, columns.no.width, rowHeight, {
    align: "center",
    font,
    fontSize: 8,
  });

  drawCell(doc, row.date, columns.date.x, y, columns.date.width, rowHeight, {
    align: "center",
    font,
    fontSize: 8,
  });

  drawCell(
    doc,
    row.saleNumber,
    columns.saleNumber.x,
    y,
    columns.saleNumber.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 8,
    }
  );

  drawCell(
    doc,
    row.customer,
    columns.customer.x,
    y,
    columns.customer.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 8,
    }
  );

  drawCell(
    doc,
    row.paymentStatus,
    columns.paymentStatus.x,
    y,
    columns.paymentStatus.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 8,
    }
  );

  drawCell(doc, row.total, columns.total.x, y, columns.total.width, rowHeight, {
    align: "center",
    font,
    fontSize: 8,
  });

  drawCell(doc, row.paid, columns.paid.x, y, columns.paid.width, rowHeight, {
    align: "center",
    font,
    fontSize: 8,
  });

  drawCell(
    doc,
    row.remaining,
    columns.remaining.x,
    y,
    columns.remaining.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 8,
    }
  );

  return y + rowHeight;
};

const generateSalesReportPdfBuffer = async ({
  storeProfile,
  sales,
  summary,
  periodLabel,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PAPER_SIZES.A4_LANDSCAPE,
        margin: 36,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageHeight = doc.page.height;
      const margin = 36;
      const bottomLimit = pageHeight - 46;

      let y = drawReportHeader({
        doc,
        storeProfile,
        periodLabel,
      });

      y = drawSummary({
        doc,
        summary,
        y,
      });

      let table = drawTableHeader({
        doc,
        y,
      });

      y = table.nextY;
      let columns = table.columns;

      sales.forEach((sale, index) => {
        if (y + 24 > bottomLimit) {
          doc.addPage();

          y = drawReportHeader({
            doc,
            storeProfile,
            periodLabel,
          });

          table = drawTableHeader({
            doc,
            y,
          });

          y = table.nextY;
          columns = table.columns;
        }

        y = drawTableRow({
          doc,
          columns,
          y,
          row: {
            no: String(index + 1),
            date: formatDate(sale.createdAt),
            saleNumber: sale.saleNumber,
            customer: sale.customer
              ? sale.customer.name
              : sale.customerName || "-",
            paymentStatus: sale.paymentStatus,
            total: formatCurrency(sale.totalAmount),
            paid: formatCurrency(sale.paidAmount),
            remaining: formatCurrency(sale.remainingAmount),
          },
        });
      });

      if (y + 24 > bottomLimit) {
        doc.addPage();

        y = drawReportHeader({
          doc,
          storeProfile,
          periodLabel,
        });

        table = drawTableHeader({
          doc,
          y,
        });

        y = table.nextY;
        columns = table.columns;
      }

      y = drawTableRow({
        doc,
        columns,
        y,
        isTotal: true,
        row: {
          no: "",
          date: "",
          saleNumber: "",
          customer: "",
          paymentStatus: "TOTAL",
          total: formatCurrency(summary.totalAmount),
          paid: formatCurrency(summary.totalPaidAmount),
          remaining: formatCurrency(summary.totalRemainingAmount),
        },
      });

      doc.font("Helvetica").fontSize(7);
      drawText(
        doc,
        `Dicetak pada ${formatDate(new Date())}`,
        margin,
        pageHeight - 30,
        {
          width: 300,
        }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateSalesReportPdfBuffer,
};