import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { requireUser, withAuth } from '../_lib/authz.ts';

const ENTITY_CONFIG = [
  { name: 'Client', label: 'Clienti', fields: ['name', 'contact_person', 'email', 'phone', 'address', 'status'] },
  { name: 'Project', label: 'Progetti', fields: ['name', 'client_name', 'description', 'start_date', 'end_date', 'budget', 'status', 'priority'] },
  { name: 'Fee', label: 'Compensi', fields: ['client_name', 'project_name', 'amount', 'category', 'payment_status', 'payment_method', 'date', 'notes'] },
  { name: 'Revenue', label: 'Ricavi', fields: ['amount', 'date', 'description', 'tag', 'payment_method', 'project_name', 'installment_id'] },
  { name: 'Expense', label: 'Spese', fields: ['amount', 'date', 'description', 'tag', 'expense_type', 'payment_method', 'chapter_name', 'stato'] },
  { name: 'Quote', label: 'Preventivi', fields: ['client_name', 'project_name', 'amount', 'tag', 'status', 'sent_date', 'valid_until'] },
  { name: 'Installment', label: 'Rate', fields: ['fee_id', 'amount', 'due_date', 'paid_date', 'payment_method', 'status', 'kind'] },
  { name: 'Forecast', label: 'Previsioni', fields: ['month', 'year', 'revenue_amount', 'expense_amount', 'prestazioni', 'notes'] },
  { name: 'BankCash', label: 'Banca', fields: ['amount', 'date', 'description', 'category', 'type', 'reference'] },
  { name: 'PettyCash', label: 'Piccola Cassa', fields: ['amount', 'date', 'description', 'category', 'type'] },
  { name: 'MarketingBudget', label: 'Marketing', fields: ['month', 'year', 'budget', 'spent', 'conversions', 'channel'] },
];

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

  const { format: exportFormat } = await req.json();

  // Fetch all entity data
  const allData = {};
  for (const entity of ENTITY_CONFIG) {
    try {
      const records = await base44.entities[entity.name].filter({});
      allData[entity.name] = { label: entity.label, fields: entity.fields, records };
    } catch {
      allData[entity.name] = { label: entity.label, fields: entity.fields, records: [] };
    }
  }

  if (exportFormat === 'json') {
    const jsonExport = {};
    for (const entity of ENTITY_CONFIG) {
      jsonExport[entity.label] = allData[entity.name].records;
    }
    const jsonStr = JSON.stringify(jsonExport, null, 2);
    return new Response(jsonStr, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename=archfirm_export.json',
      },
    });
  }

  if (exportFormat === 'excel') {
    // Generate CSV-based Excel (TSV with BOM for Excel compatibility)
    const BOM = '\uFEFF';
    let csvContent = BOM;

    for (const entity of ENTITY_CONFIG) {
      const { label, fields, records } = allData[entity.name];
      if (records.length === 0) continue;

      csvContent += `\n=== ${label} ===\n`;
      csvContent += fields.join('\t') + '\n';

      for (const record of records) {
        const row = fields.map(f => {
          const val = record[f];
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') return val.toString();
          return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        });
        csvContent += row.join('\t') + '\n';
      }
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': 'attachment; filename=archfirm_export.xls',
      },
    });
  }

  if (exportFormat === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text('ArchFirm Manager - Export Dati', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, margin, y);
    doc.text(`Utente: ${user.full_name || user.email}`, margin, y + 5);
    y += 14;

    for (const entity of ENTITY_CONFIG) {
      const { label, fields, records } = allData[entity.name];
      if (records.length === 0) continue;

      // Check space for header
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      // Section header
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.text(label + ` (${records.length})`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 7;

      // Table header
      const colCount = Math.min(fields.length, 8);
      const usableWidth = pageWidth - margin * 2;
      const colWidth = usableWidth / colCount;

      doc.setFontSize(7);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 4, usableWidth, 6, 'F');
      for (let i = 0; i < colCount; i++) {
        doc.text(fields[i], margin + i * colWidth + 1, y);
      }
      y += 5;

      // Table rows
      doc.setFontSize(6.5);
      const maxRows = Math.min(records.length, 50);
      for (let r = 0; r < maxRows; r++) {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }

        if (r % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 3.5, usableWidth, 5, 'F');
        }

        for (let i = 0; i < colCount; i++) {
          let val = records[r][fields[i]];
          if (val === null || val === undefined) val = '';
          if (typeof val === 'number') val = val.toLocaleString('it-IT');
          const text = String(val).substring(0, 30);
          doc.text(text, margin + i * colWidth + 1, y);
        }
        y += 5;
      }

      if (records.length > maxRows) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`... e altri ${records.length - maxRows} record`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      y += 8;
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=archfirm_export.pdf',
      },
    });
  }

  return Response.json({ error: 'Formato non supportato. Usa: json, excel, pdf' }, { status: 400 });
}));