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
    align = "center",
    font = "Helvetica",
    fontSize = 7.5,
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
  drawText(doc, "LAPORAN PAYROLL", pageWidth - margin - 260, y + 5, {
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
      label: "Jumlah Payroll",
      value: String(summary.payrollCount),
    },
    {
      label: "Total Gaji Kotor",
      value: formatCurrency(summary.totalGrossSalary),
    },
    {
      label: "Total Potongan",
      value: formatCurrency(summary.totalDeduction),
    },
    {
      label: "Total Gaji Bersih",
      value: formatCurrency(summary.totalNetSalary),
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
    no: 28,
    paidAt: 68,
    payrollNumber: 130,
    period: 62,
    employee: 115,
    position: 90,
    baseSalary: 75,
    allowanceBonus: 75,
    deduction: 65,
    netSalary:
      tableWidth - 28 - 68 - 130 - 62 - 115 - 90 - 75 - 75 - 65,
  };

  const columns = {};
  let currentX = margin;

  columns.no = {
    x: currentX,
    width: widths.no,
    label: "No",
  };
  currentX += widths.no;

  columns.paidAt = {
    x: currentX,
    width: widths.paidAt,
    label: "Tgl Bayar",
  };
  currentX += widths.paidAt;

  columns.payrollNumber = {
    x: currentX,
    width: widths.payrollNumber,
    label: "No Payroll",
  };
  currentX += widths.payrollNumber;

  columns.period = {
    x: currentX,
    width: widths.period,
    label: "Periode",
  };
  currentX += widths.period;

  columns.employee = {
    x: currentX,
    width: widths.employee,
    label: "Karyawan",
  };
  currentX += widths.employee;

  columns.position = {
    x: currentX,
    width: widths.position,
    label: "Jabatan",
  };
  currentX += widths.position;

  columns.baseSalary = {
    x: currentX,
    width: widths.baseSalary,
    label: "Gaji Pokok",
  };
  currentX += widths.baseSalary;

  columns.allowanceBonus = {
    x: currentX,
    width: widths.allowanceBonus,
    label: "Tunj+Bonus",
  };
  currentX += widths.allowanceBonus;

  columns.deduction = {
    x: currentX,
    width: widths.deduction,
    label: "Potongan",
  };
  currentX += widths.deduction;

  columns.netSalary = {
    x: currentX,
    width: widths.netSalary,
    label: "Gaji Bersih",
  };

  doc.rect(margin, y, tableWidth, rowHeight).fillAndStroke(
    "#1F4E78",
    "#000000"
  );

  Object.values(columns).forEach((column) => {
    drawCell(doc, column.label, column.x, y, column.width, rowHeight, {
      align: "center",
      font: "Helvetica-Bold",
      fontSize: 7.5,
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
    fontSize: 7.2,
  });

  drawCell(doc, row.paidAt, columns.paidAt.x, y, columns.paidAt.width, rowHeight, {
    align: "center",
    font,
    fontSize: 7.2,
  });

  drawCell(
    doc,
    row.payrollNumber,
    columns.payrollNumber.x,
    y,
    columns.payrollNumber.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(doc, row.period, columns.period.x, y, columns.period.width, rowHeight, {
    align: "center",
    font,
    fontSize: 7.2,
  });

  drawCell(
    doc,
    row.employee,
    columns.employee.x,
    y,
    columns.employee.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(
    doc,
    row.position,
    columns.position.x,
    y,
    columns.position.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(
    doc,
    row.baseSalary,
    columns.baseSalary.x,
    y,
    columns.baseSalary.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(
    doc,
    row.allowanceBonus,
    columns.allowanceBonus.x,
    y,
    columns.allowanceBonus.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(
    doc,
    row.deduction,
    columns.deduction.x,
    y,
    columns.deduction.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  drawCell(
    doc,
    row.netSalary,
    columns.netSalary.x,
    y,
    columns.netSalary.width,
    rowHeight,
    {
      align: "center",
      font,
      fontSize: 7.2,
    }
  );

  return y + rowHeight;
};

const generatePayrollReportPdfBuffer = async ({
  storeProfile,
  payrolls,
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

      payrolls.forEach((payroll, index) => {
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
            paidAt: formatDate(payroll.paidAt),
            payrollNumber: payroll.payrollNumber,
            period: payroll.periodLabel,
            employee: payroll.employeeName,
            position: payroll.position,
            baseSalary: formatCurrency(payroll.baseSalary),
            allowanceBonus: formatCurrency(payroll.allowance + payroll.bonus),
            deduction: formatCurrency(payroll.deduction),
            netSalary: formatCurrency(payroll.netSalary),
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
          paidAt: "",
          payrollNumber: "",
          period: "",
          employee: "",
          position: "TOTAL",
          baseSalary: formatCurrency(summary.totalBaseSalary),
          allowanceBonus: formatCurrency(
            summary.totalAllowance + summary.totalBonus
          ),
          deduction: formatCurrency(summary.totalDeduction),
          netSalary: formatCurrency(summary.totalNetSalary),
        },
      });

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
  generatePayrollReportPdfBuffer,
};