const PDFDocument = require("pdfkit");

const { getStoreName } = require("../../utils/storeBrand");

const PAPER_SIZES = {
  A4: [595.28, 841.89],
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
  const margin = 40;

  let y = 36;

  doc.font("Helvetica-Bold").fontSize(14);
  drawText(doc, getStoreName(storeProfile), margin, y, {
    width: 260,
  });

  doc.font("Helvetica").fontSize(8);
  drawText(doc, storeProfile.address || "-", margin, y + 18, {
    width: 300,
  });

  drawText(doc, `Telp: ${storeProfile.phone || "-"}`, margin, y + 44);

  if (storeProfile.socialMedia) {
    drawText(doc, storeProfile.socialMedia, margin, y + 56);
  }

  doc.font("Helvetica-Bold").fontSize(16);
  drawText(doc, "LAPORAN NERACA", pageWidth - margin - 230, y + 6, {
    width: 230,
    align: "right",
  });

  doc.font("Helvetica").fontSize(9);
  drawText(doc, `Periode: ${periodLabel}`, pageWidth - margin - 230, y + 32, {
    width: 230,
    align: "right",
  });

  y += 80;
  drawLine(doc, margin, y, pageWidth - margin, y);

  return y + 18;
};

const drawSummary = ({ doc, summary, y }) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = 72;

  doc.rect(margin, y, boxWidth, boxHeight).stroke();

  const colWidth = boxWidth / 3;

  const summaryItems = [
    {
      label: "Total Aset",
      value: formatCurrency(summary.totalAssets),
    },
    {
      label: "Kewajiban + Ekuitas",
      value: formatCurrency(summary.totalLiabilitiesAndEquity),
    },
    {
      label: "Selisih Neraca",
      value: formatCurrency(summary.balanceDifference),
    },
  ];

  summaryItems.forEach((item, index) => {
    const x = margin + colWidth * index;

    if (index > 0) {
      drawLine(doc, x, y, x, y + boxHeight);
    }

    doc.font("Helvetica").fontSize(8);
    drawText(doc, item.label, x + 8, y + 16, {
      width: colWidth - 16,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(10);
    drawText(doc, item.value, x + 8, y + 40, {
      width: colWidth - 16,
      align: "center",
    });
  });

  return y + boxHeight + 20;
};

const drawSectionTitle = ({ doc, title, y }) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const width = pageWidth - margin * 2;
  const height = 22;

  doc.rect(margin, y, width, height).fillAndStroke("#D9EAF7", "#000000");

  drawCell(doc, title, margin, y, width, height, {
    align: "center",
    font: "Helvetica-Bold",
    fontSize: 9,
  });

  doc.fillColor("#000000");

  return y + height;
};

const drawAccountHeader = ({ doc, y }) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const height = 22;

  // NOTE:
  // Kode dan Saldo dibuat sama lebar supaya kolom Nama Akun
  // tepat berada di tengah tabel, sejajar dengan judul ASET / KEWAJIBAN / EKUITAS.
  const codeWidth = 110;
  const balanceWidth = 110;
  const nameWidth = tableWidth - codeWidth - balanceWidth;

  const columns = {
    code: {
      x: margin,
      width: codeWidth,
      label: "Kode",
    },
    name: {
      x: margin + codeWidth,
      width: nameWidth,
      label: "Nama Akun",
    },
    balance: {
      x: margin + codeWidth + nameWidth,
      width: balanceWidth,
      label: "Saldo",
    },
  };

  doc.rect(margin, y, tableWidth, height).fillAndStroke("#1F4E78", "#000000");

  drawCell(doc, columns.code.label, columns.code.x, y, columns.code.width, height, {
    font: "Helvetica-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  });

  drawCell(doc, columns.name.label, columns.name.x, y, columns.name.width, height, {
    font: "Helvetica-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  });

  drawCell(
    doc,
    columns.balance.label,
    columns.balance.x,
    y,
    columns.balance.width,
    height,
    {
      font: "Helvetica-Bold",
      fontSize: 8,
      color: "#FFFFFF",
    }
  );

  doc.fillColor("#000000");

  return {
    columns,
    nextY: y + height,
  };
};

const drawAccountRow = ({ doc, account, columns, y, isTotal = false }) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const height = 21;
  const font = isTotal ? "Helvetica-Bold" : "Helvetica";

  doc.rect(margin, y, tableWidth, height).stroke();

  drawCell(doc, account.code, columns.code.x, y, columns.code.width, height, {
    align: "center",
    font,
    fontSize: 8,
  });

  drawCell(doc, account.name, columns.name.x, y, columns.name.width, height, {
    align: "center",
    font,
    fontSize: 8,
    });

  drawCell(
    doc,
    account.balance,
    columns.balance.x,
    y,
    columns.balance.width,
    height,
    {
      align: "center",
      font,
      fontSize: 8,
    }
  );

  return y + height;
};

const ensureSpace = ({ doc, y, requiredHeight }) => {
  const bottomLimit = doc.page.height - 50;

  if (y + requiredHeight <= bottomLimit) {
    return y;
  }

  doc.addPage();

  return 40;
};

const drawSection = ({ doc, title, accounts, totalLabel, totalValue, y }) => {
  y = ensureSpace({
    doc,
    y,
    requiredHeight: 90,
  });

  y = drawSectionTitle({
    doc,
    title,
    y,
  });

  const table = drawAccountHeader({
    doc,
    y,
  });

  y = table.nextY;

  if (accounts.length === 0) {
    y = drawAccountRow({
      doc,
      columns: table.columns,
      y,
      account: {
        code: "-",
        name: "Tidak ada data",
        balance: formatCurrency(0),
      },
    });
  } else {
    accounts.forEach((account) => {
      y = ensureSpace({
        doc,
        y,
        requiredHeight: 45,
      });

      y = drawAccountRow({
        doc,
        columns: table.columns,
        y,
        account: {
          code: account.accountCode,
          name: account.accountName,
          balance: formatCurrency(account.balance),
        },
      });
    });
  }

  y = ensureSpace({
    doc,
    y,
    requiredHeight: 45,
  });

  y = drawAccountRow({
    doc,
    columns: table.columns,
    y,
    isTotal: true,
    account: {
      code: "",
      name: totalLabel,
      balance: formatCurrency(totalValue),
    },
  });

  return y + 12;
};

const drawFinalResult = ({ doc, label, value, y, isBalanced }) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const width = pageWidth - margin * 2;
  const height = 30;

  doc.rect(margin, y, width, height).fillAndStroke(
    isBalanced ? "#E2F0D9" : "#FFC7CE",
    "#000000"
  );

  drawCell(doc, label, margin, y, width - 150, height, {
    align: "center",
    font: "Helvetica-Bold",
    fontSize: 10,
  });

  drawCell(doc, formatCurrency(value), margin + width - 150, y, 150, height, {
    align: "center",
    font: "Helvetica-Bold",
    fontSize: 10,
  });

  doc.fillColor("#000000");

  return y + height;
};

const generateBalanceSheetReportPdfBuffer = async ({
  storeProfile,
  report,
  periodLabel,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PAPER_SIZES.A4,
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

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

      y = drawSection({
        doc,
        title: "ASET",
        accounts: report.assets,
        totalLabel: "Total Aset",
        totalValue: report.summary.totalAssets,
        y,
      });

      y = drawSection({
        doc,
        title: "KEWAJIBAN",
        accounts: report.liabilities,
        totalLabel: "Total Kewajiban",
        totalValue: report.summary.totalLiabilities,
        y,
      });

      const equityAccounts = [
        ...report.equities,
        {
          accountCode: "-",
          accountName: "Laba/Rugi Periode Berjalan",
          balance: report.summary.currentPeriodProfit,
        },
      ];

      y = drawSection({
        doc,
        title: "EKUITAS",
        accounts: equityAccounts,
        totalLabel: "Total Ekuitas",
        totalValue: report.summary.totalEquity,
        y,
      });

      y = ensureSpace({
        doc,
        y,
        requiredHeight: 90,
      });

      y = drawFinalResult({
        doc,
        label: "TOTAL KEWAJIBAN + EKUITAS",
        value: report.summary.totalLiabilitiesAndEquity,
        y,
        isBalanced: true,
      });

      y += 8;

      y = drawFinalResult({
        doc,
        label:
          report.summary.balanceDifference === 0
            ? "NERACA SEIMBANG"
            : "SELISIH NERACA",
        value: report.summary.balanceDifference,
        y,
        isBalanced: report.summary.balanceDifference === 0,
      });

      doc.font("Helvetica").fontSize(7);
      drawText(doc, `Dicetak pada ${formatDate(new Date())}`, 40, doc.page.height - 30, {
        width: 300,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateBalanceSheetReportPdfBuffer,
};