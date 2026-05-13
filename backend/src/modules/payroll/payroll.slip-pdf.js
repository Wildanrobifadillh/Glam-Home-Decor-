const PDFDocument = require("pdfkit");
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

const generatePayrollSlipPdfBuffer = async (slipPreview) => {
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

      const { slip, store, employee, salary, authorization } = slipPreview;

      const pageWidth = doc.page.width;
      const margin = 42;
      const contentWidth = pageWidth - margin * 2;

      let y = 42;

      const headerTopY = y;

      doc.font("Helvetica-Bold").fontSize(14);
      drawText(doc, store.name, margin, headerTopY, {
        width: 230,
      });

      doc.font("Helvetica").fontSize(8);
      drawText(doc, store.address, margin, headerTopY + 18, {
        width: 250,
      });

      drawText(doc, `Telp: ${store.phone || "-"}`, margin, headerTopY + 44);

      if (store.socialMedia) {
        drawText(doc, store.socialMedia, margin, headerTopY + 56);
      }

      const headerRightX = pageWidth - margin - 190;

      doc.font("Helvetica").fontSize(8.5);

      drawText(doc, "Tanggal", headerRightX, headerTopY + 4, {
        width: 60,
      });

      drawText(doc, `: ${formatDate(slip.paidAt)}`, headerRightX + 65, headerTopY + 4, {
        width: 125,
      });

      drawText(doc, "No. Slip", headerRightX, headerTopY + 20, {
        width: 60,
      });

      drawText(doc, `: ${slip.slipNumber}`, headerRightX + 65, headerTopY + 20, {
        width: 125,
      });

      drawText(doc, "Periode", headerRightX, headerTopY + 36, {
        width: 60,
      });

      drawText(doc, `: ${slip.periodLabel}`, headerRightX + 65, headerTopY + 36, {
        width: 125,
      });

      y = headerTopY + 86;

      doc.font("Helvetica-Bold").fontSize(18);
      drawText(doc, "SLIP GAJI", margin, y, {
        width: contentWidth,
        align: "center",
      });

      y += 28;

      drawLine(doc, margin, y, pageWidth - margin, y);
      y += 16;

      const employeeInfoY = y;
      const employeeInfoHeight = 54;

      const leftInfoX = margin + 28;
      const rightInfoX = margin + 315;

      const infoLabelWidth = 58;
      const infoColonWidth = 10;
      const infoValueGap = 6;

      const leftValueWidth = 170;
      const rightValueWidth = 150;

      const drawInfoRow = ({ label, value, x, rowY, valueWidth }) => {
        doc.font("Helvetica").fontSize(9);

        drawText(doc, label, x, rowY, {
          width: infoLabelWidth,
        });

        drawText(doc, ":", x + infoLabelWidth, rowY, {
          width: infoColonWidth,
        });

        drawText(
          doc,
          value || "-",
          x + infoLabelWidth + infoColonWidth + infoValueGap,
          rowY,
          {
            width: valueWidth,
          }
        );
      };

      drawInfoRow({
        label: "Nama",
        value: employee.name,
        x: leftInfoX,
        rowY: employeeInfoY,
        valueWidth: leftValueWidth,
      });

      drawInfoRow({
        label: "Jabatan",
        value: employee.position,
        x: leftInfoX,
        rowY: employeeInfoY + 22,
        valueWidth: leftValueWidth,
      });

      drawInfoRow({
        label: "Alamat",
        value: employee.address || "-",
        x: rightInfoX,
        rowY: employeeInfoY,
        valueWidth: rightValueWidth,
      });

      drawInfoRow({
        label: "Telepon",
        value: employee.phone || "-",
        x: rightInfoX,
        rowY: employeeInfoY + 22,
        valueWidth: rightValueWidth,
      });

      y += employeeInfoHeight;

      drawLine(doc, margin, y, pageWidth - margin, y);
      y += 10;

      const tableX = margin;
      const tableRightX = pageWidth - margin;
      const tableWidth = tableRightX - tableX;

      const noWidth = 38;

      const amountRpX = tableRightX - 86;
      const amountRpWidth = 26;
      const amountValueX = amountRpX + amountRpWidth;
      const amountValueWidth = tableRightX - amountValueX;

      const amountHeaderX = amountRpX - 12;
      const amountHeaderWidth = tableRightX - amountHeaderX;

      const descriptionWidth = amountHeaderX - tableX - noWidth;
      const noX = tableX;
      const descriptionX = noX + noWidth;

      const getCurrencyNumberOnly = (value) => {
        return formatCurrency(value).replace(/^Rp\.?\s*/i, "");
      };

      const drawCurrencyAmount = ({
        amount,
        rowY,
        font = "Helvetica",
        fontSize = 9,
      }) => {
        doc.font(font).fontSize(fontSize);

        drawText(doc, "Rp.", amountRpX, rowY, {
          width: amountRpWidth,
          align: "left",
        });

        drawText(doc, getCurrencyNumberOnly(amount), amountValueX, rowY, {
          width: amountValueWidth,
          align: "right",
        });
      };

      doc.font("Helvetica-Bold").fontSize(9);

      drawText(doc, "NO", noX, y, {
        width: noWidth,
        align: "center",
      });

      drawText(doc, "KETERANGAN", descriptionX + 6, y, {
        width: descriptionWidth,
      });

      drawText(doc, "JUMLAH", amountHeaderX, y, {
        width: amountHeaderWidth,
        align: "center",
      });

      y += 14;

      drawLine(doc, tableX, y, tableRightX, y);
      y += 12;

      const salaryRows = [
        {
          no: 1,
          label: "Gaji Pokok",
          amount: salary.baseSalary,
        },
        {
          no: 2,
          label: "Tunjangan",
          amount: salary.allowance,
        },
        {
          no: 3,
          label: "Bonus",
          amount: salary.bonus,
        },
        {
          no: 4,
          label: "Potongan",
          amount: salary.deduction,
        },
      ];

      doc.font("Helvetica").fontSize(9);

      salaryRows.forEach((row) => {
        drawText(doc, String(row.no), noX, y, {
          width: noWidth,
          align: "center",
        });

        drawText(doc, row.label, descriptionX + 6, y, {
          width: descriptionWidth,
        });

        drawCurrencyAmount({
          amount: row.amount,
          rowY: y,
          font: "Helvetica",
          fontSize: 9,
        });

        y += 22;
      });

      y += 4;

      const summaryX = amountRpX - 180;
      const summaryRightX = tableRightX;
      const summaryLabelWidth = amountRpX - summaryX - 12;

      drawLine(doc, summaryX, y, summaryRightX, y);
      y += 9;

      doc.font("Helvetica-Bold").fontSize(9);

      drawText(doc, "GAJI KOTOR", summaryX, y, {
        width: summaryLabelWidth,
        align: "right",
      });

      drawCurrencyAmount({
        amount: salary.grossSalary,
        rowY: y,
        font: "Helvetica-Bold",
        fontSize: 9,
      });

      y += 20;

      drawText(doc, "TOTAL POTONGAN", summaryX, y, {
        width: summaryLabelWidth,
        align: "right",
      });

      drawCurrencyAmount({
        amount: salary.deduction,
        rowY: y,
        font: "Helvetica-Bold",
        fontSize: 9,
      });

      y += 12;

      drawLine(doc, summaryX, y, summaryRightX, y);
      y += 9;

      doc.font("Helvetica-Bold").fontSize(11);

      drawText(doc, "TOTAL DITERIMA :", summaryX, y, {
        width: summaryLabelWidth,
        align: "right",
      });

      drawCurrencyAmount({
        amount: salary.netSalary,
        rowY: y,
        font: "Helvetica-Bold",
        fontSize: 11,
      });

      y += 16;

      drawLine(doc, summaryX, y, summaryRightX, y);

      y += 52;

      const signatureY = y;
      const leftSignatureX = margin + 34;
      const rightSignatureX = pageWidth - margin - 205;

      doc.font("Helvetica").fontSize(9);

      drawText(doc, "Penerima,", leftSignatureX, signatureY, {
        width: 170,
        align: "center",
      });

      drawText(doc, "Hormat kami,", rightSignatureX, signatureY, {
        width: 190,
        align: "center",
      });

      drawText(doc, store.name || "Glam Home Decor", rightSignatureX, signatureY + 14, {
        width: 190,
        align: "center",
      });

      const signatureNameY = signatureY + 78;

      doc.font("Helvetica-Bold").fontSize(9);

      drawText(doc, employee.name || "-", leftSignatureX, signatureNameY, {
        width: 170,
        align: "center",
      });

      drawText(
        doc,
        authorization.responsiblePersonName || "Zaid Ishmatul Fawaid",
        rightSignatureX,
        signatureNameY,
        {
          width: 190,
          align: "center",
        }
      );

      doc.font("Helvetica").fontSize(8);

      drawText(
        doc,
        authorization.responsiblePersonTitle || "Penanggung Jawab / Owner",
        rightSignatureX,
        signatureNameY + 14,
        {
          width: 190,
          align: "center",
        }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePayrollSlipPdfBuffer,
};