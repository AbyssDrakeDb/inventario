import ExcelJS from 'exceljs';
import prisma from '../prisma/client';

interface CatalogoRow {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  presentacion?: string;
  precioContado: number;
  precioRevendedora: number;
  precioCredito?: number;
  precioOferta?: number;
  stockMinimo?: number;
}

/** Busca una categoría por nombre o la crea si no existe */
async function findOrCreateCategoria(marcaId: number, nombre: string): Promise<number | null> {
  const trimmed = nombre.trim();
  if (!trimmed) return null;

  let cat = await prisma.categoria.findFirst({
    where: { nombre: trimmed, marcaId },
  });

  if (!cat) {
    cat = await prisma.categoria.create({
      data: { nombre: trimmed, marcaId },
    });
  }

  return cat.id;
}

/** Crea un registro de stock en 0 para el producto si no existe */
async function ensureStockActual(productoId: number) {
  await prisma.stockActual.upsert({
    where: { productoId },
    create: { productoId, cantidad: 0, comprometida: 0 },
    update: {},
  });
}

export async function importarCatalogoDesdeExcel(
  filePath: string,
  marcaId: number,
  campanaId: number,
): Promise<{ productosCreados: number; preciosCreados: number; errores: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) throw new Error('El archivo Excel no tiene hojas');

  const rows: CatalogoRow[] = [];
  const errores: string[] = [];

  // Asumir primera fila como header
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    try {
      const codigo = String(row.getCell(1).value || '').trim();
      const nombre = String(row.getCell(2).value || '').trim();
      if (!codigo || !nombre) {
        errores.push(`Fila ${rowNumber}: código o nombre vacío`);
        return;
      }

      const precioContado = Number(row.getCell(4).value) || 0;
      const precioRevendedora = Number(row.getCell(5).value) || 0;

      if (precioContado <= 0 || precioRevendedora <= 0) {
        errores.push(`Fila ${rowNumber}: precios inválidos`);
        return;
      }

      rows.push({
        codigo,
        nombre,
        descripcion: String(row.getCell(3).value || '') || undefined,
        categoria: String(row.getCell(6).value || '') || undefined,
        presentacion: String(row.getCell(7).value || '') || undefined,
        precioContado,
        precioRevendedora,
        precioCredito: Number(row.getCell(8).value) || undefined,
        precioOferta: Number(row.getCell(9).value) || undefined,
        stockMinimo: Number(row.getCell(10).value) || undefined,
      });
    } catch (e: any) {
      errores.push(`Fila ${rowNumber}: ${e.message}`);
    }
  });

  let productosCreados = 0;
  let preciosCreados = 0;

  for (const row of rows) {
    try {
      // Resolver categoría (crear si no existe)
      const categoriaId = row.categoria
        ? await findOrCreateCategoria(marcaId, row.categoria)
        : undefined;

      // Upsert producto
      const producto = await prisma.producto.upsert({
        where: { marcaId_codigo: { marcaId, codigo: row.codigo } },
        create: {
          marcaId,
          codigo: row.codigo,
          nombre: row.nombre,
          descripcion: row.descripcion,
          presentacion: row.presentacion,
          stockMinimo: row.stockMinimo || 0,
          ...(categoriaId ? { categoriaId } : {}),
        },
        update: {
          nombre: row.nombre,
          descripcion: row.descripcion,
          presentacion: row.presentacion,
          stockMinimo: row.stockMinimo || 0,
          ...(categoriaId ? { categoriaId } : {}),
        },
      });
      productosCreados++;

      // Crear stock inicial si no existe (para que aparezca en inventario)
      await ensureStockActual(producto.id);

      // Upsert precio en campaña
      await prisma.precioProducto.upsert({
        where: { productoId_campanaId: { productoId: producto.id, campanaId } },
        create: {
          productoId: producto.id,
          campanaId,
          precioContado: row.precioContado,
          precioRevendedora: row.precioRevendedora,
          precioCredito: row.precioCredito,
          precioOferta: row.precioOferta,
          esOferta: !!row.precioOferta,
        },
        update: {
          precioContado: row.precioContado,
          precioRevendedora: row.precioRevendedora,
          precioCredito: row.precioCredito,
          precioOferta: row.precioOferta,
        },
      });
      preciosCreados++;
    } catch (e: any) {
      errores.push(`Producto ${row.codigo}: ${e.message}`);
    }
  }

  return { productosCreados, preciosCreados, errores };
}

export async function exportarAExcel(datos: any[], columnas: string[], titulo: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(titulo);

  // Header
  const headerRow = worksheet.addRow(columnas);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Data rows
  for (const row of datos) {
    worksheet.addRow(columnas.map(col => row[col] ?? ''));
  }

  // Auto-width
  worksheet.columns.forEach((col, i) => {
    let maxLength = columnas[i].length;
    worksheet.getColumn(i + 1).eachCell({ includeEmpty: true }, (cell) => {
      const cellLen = String(cell.value || '').length;
      if (cellLen > maxLength) maxLength = cellLen;
    });
    col.width = Math.min(maxLength + 4, 50);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}