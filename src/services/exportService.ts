import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
  filename: string;
}

export const exportService = {
  exportToPDF: (options: ExportOptions) => {
    const { title, subtitle, columns, data, filename } = options;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 20);

    if (subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 28);
    }

    const tableData = data.map(row => 
      columns.map(col => row[col.key] ?? '')
    );

    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData,
      startY: subtitle ? 32 : 25,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save(`${filename}.pdf`);
  },

  exportToExcel: (options: ExportOptions) => {
    const { columns, data, filename } = options;

    const worksheetData = [
      columns.map(col => col.header),
      ...data.map(row => columns.map(col => row[col.key] ?? ''))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },
};
