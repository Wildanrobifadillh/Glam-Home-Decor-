const PDFDocument = require("pdfkit");

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
    align = "center",
    font = "Helvetica",
    fontSize = 7,
    paddingX = 4,
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
  drawText(doc, storeProfile.name || "Glam Home Decor", margin, y, {
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
  drawText(doc, "LAPORAN ARUS KAS", pageWidth - margin - 260, y + 5, {
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

  const colWidth = boxWidth / 3;

  const summaryItems = [
    {
      label: "Total Kas Masuk",
      value: formatCurrency(summary.totalCashInflow),
    },
    {
      label: "Total Kas Keluar",
      value: formatCurrency(summary.totalCashOutflow),
    },
    {
      label: "Arus Kas Bersih",
      value: formatCurrency(summary.netCashFlow),
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

    doc.font("Helvetica-Bold").fontSize(10);
    drawText(doc, item.value, x + 10, y + 32, {
      width: colWidth - 20,
      align: "center",
    });
  });

  return y + boxHeight + 18;
};

const drawCashFlowTableHeader = ({ doc, y }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableRight = pageWidth - margin;
  const tableWidth = tableRight - margin;
  const rowHeight = 24;

  const widths = {
    no: 28,
    date: 65,
    entryNumber: 120,
    sourceType: 75,
    description: 145,
    accountName: 105,
    inflow: 75,
    outflow: 75,
    netChange: tableWidth - 28 - 65 - 120 - 75 - 145 - 105 - 75 - 75,
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

  columns.entryNumber = {
    x: currentX,
    width: widths.entryNumber,
    label: "No Jurnal",
  };
  currentX += widths.entryNumber;

  columns.sourceType = {
    x: currentX,
    width: widths.sourceType,
    label: "Sumber",
  };
  currentX += widths.sourceType;

  columns.description = {
    x: currentX,
    width: widths.description,
    label: "Deskripsi",
  };
  currentX += widths.description;

  columns.accountName = {
    x: currentX,
    width: widths.accountName,
    label: "Akun",
  };
  currentX += widths.accountName;

  columns.inflow = {
    x: currentX,
    width: widths.inflow,
    label: "Kas Masuk",
  };
  currentX += widths.inflow;

  columns.outflow = {
    x: currentX,
    width: widths.outflow,
    label: "Kas Keluar",
  };
  currentX += widths.outflow;

  columns.netChange = {
    x: currentX,
    width: widths.netChange,
    label: "Bersih",
  };

  doc.rect(margin, y, tableWidth, rowHeight).fillAndStroke(
    "#1F4E78",
    "#000000"
  );

  Object.values(columns).forEach((column) => {
    drawCell(doc, column.label, column.x, y, column.width, rowHeight, {
      align: "center",
      font: "Helvetica-Bold",
      fontSize: 7,
      color: "#FFFFFF",
    });
  });

  doc.fillColor("#000000");

  return {
    columns,
    nextY: y + rowHeight,
  };
};

const drawCashFlowTableRow = ({ doc, row, columns, y, isTotal = false }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableRight = pageWidth - margin;
  const rowHeight = 23;

  doc.rect(margin, y, tableRight - margin, rowHeight).stroke();

  const font = isTotal ? "Helvetica-Bold" : "Helvetica";

  drawCell(doc, row.no, columns.no.x, y, columns.no.width, rowHeight, {
    align: "center",
    font,
    fontSize: 6.7,
  });

  drawCell(doc, row.date, columns.date.x, y, columns.date.width, rowHeight, {
    align: "center",
    font,
    fontSize: 6.7,
  });

  drawCell(
    doc,
    row.entryNumber,
    columns.entryNumber.x,
    y,
    columns.entryNumber.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  drawCell(
    doc,
    row.sourceType,
    columns.sourceType.x,
    y,
    columns.sourceType.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  drawCell(
    doc,
    row.description,
    columns.description.x,
    y,
    columns.description.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  drawCell(
    doc,
    row.accountName,
    columns.accountName.x,
    y,
    columns.accountName.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  drawCell(doc, row.inflow, columns.inflow.x, y, columns.inflow.width, rowHeight, {
    align: "center",
    font,
    fontSize: 6.7,
  });

  drawCell(
    doc,
    row.outflow,
    columns.outflow.x,
    y,
    columns.outflow.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  drawCell(
    doc,
    row.netChange,
    columns.netChange.x,
    y,
    columns.netChange.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 6.7,
    }
  );

  return y + rowHeight;
};

const drawSourceSummaryTitle = ({ doc, y }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const width = pageWidth - margin * 2;
  const height = 24;

  doc.rect(margin, y, width, height).fillAndStroke("#1F4E78", "#000000");

  drawCell(doc, "RINGKASAN PER SUMBER", margin, y, width, height, {
    align: "center",
    font: "Helvetica-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  });

  doc.fillColor("#000000");

  return y + height;
};

const drawSourceSummaryHeader = ({ doc, y }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  const widths = {
    sourceType: tableWidth - 100 - 100 - 100,
    inflow: 100,
    outflow: 100,
    netChange: 100,
  };

  const columns = {};
  let currentX = margin;

  columns.sourceType = {
    x: currentX,
    width: widths.sourceType,
    label: "Sumber",
  };
  currentX += widths.sourceType;

  columns.inflow = {
    x: currentX,
    width: widths.inflow,
    label: "Kas Masuk",
  };
  currentX += widths.inflow;

  columns.outflow = {
    x: currentX,
    width: widths.outflow,
    label: "Kas Keluar",
  };
  currentX += widths.outflow;

  columns.netChange = {
    x: currentX,
    width: widths.netChange,
    label: "Perubahan Bersih",
  };

  doc.rect(margin, y, tableWidth, rowHeight).fillAndStroke(
    "#D9EAF7",
    "#000000"
  );

  Object.values(columns).forEach((column) => {
    drawCell(doc, column.label, column.x, y, column.width, rowHeight, {
      align: "center",
      font: "Helvetica-Bold",
      fontSize: 7.5,
    });
  });

  return {
    columns,
    nextY: y + rowHeight,
  };
};

const drawSourceSummaryRow = ({ doc, row, columns, y }) => {
  const margin = 36;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  doc.rect(margin, y, tableWidth, rowHeight).stroke();

  drawCell(
    doc,
    row.sourceType,
    columns.sourceType.x,
    y,
    columns.sourceType.width,
    rowHeight,
    {
      align: "center",
      fontSize: 7.3,
    }
  );

  drawCell(doc, row.inflow, columns.inflow.x, y, columns.inflow.width, rowHeight, {
    align: "center",
    fontSize: 7.3,
  });

  drawCell(
    doc,
    row.outflow,
    columns.outflow.x,
    y,
    columns.outflow.width,
    rowHeight,
    {
      align: "center",
      fontSize: 7.3,
    }
  );

  drawCell(
    doc,
    row.netChange,
    columns.netChange.x,
    y,
    columns.netChange.width,
    rowHeight,
    {
      align: "center",
      fontSize: 7.3,
    }
  );

  return y + rowHeight;
};

const generateCashFlowReportPdfBuffer = async ({
  storeProfile,
  report,
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
        summary: report.summary,
        y,
      });

      let table = drawCashFlowTableHeader({
        doc,
        y,
      });

      y = table.nextY;
      let columns = table.columns;

      report.movements.forEach((movement, index) => {
        if (y + 24 > bottomLimit) {
          doc.addPage();

          y = drawReportHeader({
            doc,
            storeProfile,
            periodLabel,
          });

          table = drawCashFlowTableHeader({
            doc,
            y,
          });

          y = table.nextY;
          columns = table.columns;
        }

        y = drawCashFlowTableRow({
          doc,
          columns,
          y,
          row: {
            no: String(index + 1),
            date: formatDate(movement.entryDate),
            entryNumber: movement.entryNumber,
            sourceType: movement.sourceType,
            description: movement.description,
            accountName: movement.accountName,
            inflow: formatCurrency(movement.inflow),
            outflow: formatCurrency(movement.outflow),
            netChange: formatCurrency(movement.netChange),
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

        table = drawCashFlowTableHeader({
          doc,
          y,
        });

        y = table.nextY;
        columns = table.columns;
      }

      y = drawCashFlowTableRow({
        doc,
        columns,
        y,
        isTotal: true,
        row: {
          no: "",
          date: "",
          entryNumber: "",
          sourceType: "",
          description: "",
          accountName: "TOTAL",
          inflow: formatCurrency(report.summary.totalCashInflow),
          outflow: formatCurrency(report.summary.totalCashOutflow),
          netChange: formatCurrency(report.summary.netCashFlow),
        },
      });

      y += 18;

      if (y + 90 > bottomLimit) {
        doc.addPage();

        y = drawReportHeader({
          doc,
          storeProfile,
          periodLabel,
        });
      }

      y = drawSourceSummaryTitle({
        doc,
        y,
      });

      let sourceTable = drawSourceSummaryHeader({
        doc,
        y,
      });

      y = sourceTable.nextY;

      Object.entries(report.summary.bySourceType).forEach(
        ([sourceType, value]) => {
          if (y + 24 > bottomLimit) {
            doc.addPage();

            y = drawReportHeader({
              doc,
              storeProfile,
              periodLabel,
            });

            y = drawSourceSummaryTitle({
              doc,
              y,
            });

            sourceTable = drawSourceSummaryHeader({
              doc,
              y,
            });

            y = sourceTable.nextY;
          }

          y = drawSourceSummaryRow({
            doc,
            columns: sourceTable.columns,
            y,
            row: {
              sourceType,
              inflow: formatCurrency(value.inflow),
              outflow: formatCurrency(value.outflow),
              netChange: formatCurrency(value.net),
            },
          });
        }
      );

      doc.font("Helvetica").fontSize(7);
      drawText(doc, `Dicetak pada ${formatDate(new Date())}`, margin, pageHeight - 30, {
        width: 300,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateCashFlowReportPdfBuffer,
};