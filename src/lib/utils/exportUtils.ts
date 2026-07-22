import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'number' | 'percentage';
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}

export const exportToExcel = async ({ filename, sheetName = 'Data', title, columns, data }: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add title if provided
  if (title) {
    worksheet.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.addRow([]); // empty row
  }

  // Add Headers
  const headerRow = worksheet.addRow(columns.map(c => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' } // Tailwind gray-800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Freeze header
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: title ? 3 : 1 }
  ];

  // Set columns width & format
  worksheet.columns = columns.map((col) => {
    let numFmt = undefined;
    if (col.type === 'currency') numFmt = '"Rp"#,##0;[Red]\-"Rp"#,##0';
    else if (col.type === 'number') numFmt = '#,##0';
    else if (col.type === 'percentage') numFmt = '0.00%';

    return {
      key: col.key,
      width: col.width || 20,
      style: { numFmt }
    };
  });

  // Add Data
  data.forEach((row) => {
    const rowData = columns.map(c => {
      let val = row[c.key];
      if (val === undefined || val === null) return '';
      if (c.type === 'currency' || c.type === 'number') {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      }
      if (c.type === 'percentage') {
        const num = Number(val);
        return isNaN(num) ? 0 : num / 100; // Excel percentage is 0-1
      }
      return val;
    });
    
    const addedRow = worksheet.addRow(rowData);
    addedRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      // Top align text
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  // Generate File
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};

export const exportToCSV = ({ filename, columns, data }: ExportOptions) => {
  const headers = columns.map(c => c.label).join(';');
  
  const rows = data.map(row => 
    columns.map(c => {
      let val = row[c.key];
      if (val === undefined || val === null) return '';
      // Escape quotes
      const stringVal = String(val).replace(/"/g, '""');
      // Wrap in quotes if contains comma, newline, or semicolon
      if (stringVal.search(/("|,|;|\n)/g) >= 0) {
        return `"${stringVal}"`;
      }
      return stringVal;
    }).join(';')
  ).join('\n');

  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToPDF = ({ filename, title, columns, data }: ExportOptions) => {
  // Use landscape if many columns
  const orientation = columns.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF(orientation, 'pt', 'a4');

  const tableColumn = columns.map(c => c.label);
  const tableRows = data.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === undefined || val === null) return '-';
      if (c.type === 'currency') {
        const num = Number(val);
        return isNaN(num) ? 'Rp 0' : `Rp ${num.toLocaleString('id-ID')}`;
      }
      if (c.type === 'percentage') {
        const num = Number(val);
        return isNaN(num) ? '0%' : `${num.toFixed(2)}%`;
      }
      return String(val);
    });
  });

  if (title) {
    doc.setFontSize(14);
    doc.text(title, 40, 40);
  }

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: title ? 60 : 40,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  doc.save(`${filename}.pdf`);
};
