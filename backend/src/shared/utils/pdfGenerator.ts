import PDFDocument from 'pdfkit';

export function generarPDFReporte(
  titulo: string,
  columnas: string[],
  datos: any[],
): Buffer {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Título
    doc.fontSize(16).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.moveDown(0.5);

    // Fecha
    doc.fontSize(9).font('Helvetica').text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, { align: 'right' });
    doc.moveDown(0.5);

    // Tabla
    const colWidths = columnas.map(() => (doc.page.width - 80) / columnas.length);
    const startX = 40;
    let y = doc.y;

    // Header
    doc.font('Helvetica-Bold').fontSize(8);
    columnas.forEach((col, i) => {
      doc.text(col, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
        width: colWidths[i],
        align: 'left',
      });
    });
    y += 20;

    // Line
    doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
    y += 5;

    // Data
    doc.font('Helvetica').fontSize(8);
    for (const row of datos) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      columnas.forEach((col, i) => {
        const valor = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        doc.text(valor, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
          width: colWidths[i],
          align: i === 0 ? 'left' : 'right',
        });
      });
      y += 15;
    }

    doc.end();
  }) as unknown as Buffer;
}