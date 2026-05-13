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

const drawReportHeader = ({ doc, storeProfile, filterLabel }) => {
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
  drawText(doc, "LAPORAN STOK BARANG", pageWidth - margin - 280, y + 5, {
    width: 280,
    align: "right",
  });

  doc.font("Helvetica").fontSize(9);
  drawText(doc, `Filter: ${filterLabel}`, pageWidth - margin - 280, y + 30, {
    width: 280,
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
      label: "Jumlah Barang",
      value: String(summary.productCount),
    },
    {
      label: "Total Stok",
      value: String(summary.totalStock),
    },
    {
      label: "Nilai Stok",
      value: formatCurrency(summary.totalStockValue),
    },
    {
      label: "Status Stok",
      value: `Aman ${summary.safeStockCount} | Menipis ${summary.lowStockCount} | Habis ${summary.outOfStockCount}`,
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

    doc.font("Helvetica-Bold").fontSize(index === 3 ? 8.5 : 10);
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
    no: 30,
    supplierCode: 82,
    searchCode: 74,
    name: 180,
    category: 95,
    unit: 56,
    stock: 48,
    minStock: 55,
    stockStatus: 85,
    stockValue: tableWidth - 30 - 82 - 74 - 180 - 95 - 56 - 48 - 55 - 85,
  };

  const columns = {};
  let currentX = margin;

  columns.no = {
    x: currentX,
    width: widths.no,
    label: "No",
  };
  currentX += widths.no;

  columns.supplierCode = {
    x: currentX,
    width: widths.supplierCode,
    label: "Kode Supplier",
  };
  currentX += widths.supplierCode;

  columns.searchCode = {
    x: currentX,
    width: widths.searchCode,
    label: "Kode Cari",
  };
  currentX += widths.searchCode;

  columns.name = {
    x: currentX,
    width: widths.name,
    label: "Nama Barang",
  };
  currentX += widths.name;

  columns.category = {
    x: currentX,
    width: widths.category,
    label: "Kategori",
  };
  currentX += widths.category;

  columns.unit = {
    x: currentX,
    width: widths.unit,
    label: "Unit",
  };
  currentX += widths.unit;

  columns.stock = {
    x: currentX,
    width: widths.stock,
    label: "Stok",
  };
  currentX += widths.stock;

  columns.minStock = {
    x: currentX,
    width: widths.minStock,
    label: "Min",
  };
  currentX += widths.minStock;

  columns.stockStatus = {
    x: currentX,
    width: widths.stockStatus,
    label: "Status",
  };
  currentX += widths.stockStatus;

  columns.stockValue = {
    x: currentX,
    width: widths.stockValue,
    label: "Nilai Stok",
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
  });

  drawCell(
    doc,
    row.supplierCode,
    columns.supplierCode.x,
    y,
    columns.supplierCode.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  drawCell(
    doc,
    row.searchCode,
    columns.searchCode.x,
    y,
    columns.searchCode.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  drawCell(doc, row.name, columns.name.x, y, columns.name.width, rowHeight, {
    align: "center",
    font,
  });

  drawCell(
    doc,
    row.category,
    columns.category.x,
    y,
    columns.category.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  drawCell(doc, row.unit, columns.unit.x, y, columns.unit.width, rowHeight, {
    align: "center",
    font,
  });

  drawCell(doc, row.stock, columns.stock.x, y, columns.stock.width, rowHeight, {
    align: "center",
    font,
  });

  drawCell(
    doc,
    row.minStock,
    columns.minStock.x,
    y,
    columns.minStock.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  drawCell(
    doc,
    row.stockStatus,
    columns.stockStatus.x,
    y,
    columns.stockStatus.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  drawCell(
    doc,
    row.stockValue,
    columns.stockValue.x,
    y,
    columns.stockValue.width,
    rowHeight,
    {
      align: "center",
      font,
    }
  );

  return y + rowHeight;
};

const generateStockReportPdfBuffer = async ({
  storeProfile,
  products,
  summary,
  filterLabel,
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
        filterLabel,
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

      products.forEach((product, index) => {
        if (y + 24 > bottomLimit) {
          doc.addPage();

          y = drawReportHeader({
            doc,
            storeProfile,
            filterLabel,
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
            supplierCode: product.supplierCode,
            searchCode: product.searchCode,
            name: product.name,
            category: product.categoryName,
            unit: product.unit,
            stock: String(product.stock),
            minStock: String(product.minStock),
            stockStatus: product.stockStatus,
            stockValue: formatCurrency(product.stockValue),
          },
        });
      });

      if (y + 24 > bottomLimit) {
        doc.addPage();

        y = drawReportHeader({
          doc,
          storeProfile,
          filterLabel,
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
          supplierCode: "",
          searchCode: "",
          name: "",
          category: "",
          unit: "TOTAL",
          stock: String(summary.totalStock),
          minStock: "",
          stockStatus: `Aman ${summary.safeStockCount} | Menipis ${summary.lowStockCount} | Habis ${summary.outOfStockCount}`,
          stockValue: formatCurrency(summary.totalStockValue),
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
  generateStockReportPdfBuffer,
};