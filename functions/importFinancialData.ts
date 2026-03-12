import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// V4 – Whitelist domini accettati per file_url
const ALLOWED_FILE_URL_HOSTS = [
  'media.base44.com',
  'storage.base44.com',
  'files.base44.com',
  'api.base44.com',
];

function isAllowedFileUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    return ALLOWED_FILE_URL_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Sviluppatore') {
      return Response.json({ error: 'Forbidden: accesso riservato agli Sviluppatori' }, { status: 403 });
    }

    let fileUrl;
    try {
      const body = await req.json();
      fileUrl = body.file_url;
    } catch (parseError) {
      return Response.json({ success: false, error: 'Formato richiesta non valido. Atteso JSON con file_url.' }, { status: 400 });
    }

    if (!fileUrl) {
      return Response.json({ success: false, error: 'Nessun file_url fornito' }, { status: 400 });
    }

    // V4 – Blocca SSRF: solo URL da domini Base44
    if (!isAllowedFileUrl(fileUrl)) {
      return Response.json({ success: false, error: 'file_url non consentito. Usa solo file caricati tramite Base44.' }, { status: 400 });
    }

    console.log('Extracting data from multi-sheet Excel file...');
    let extractResult;
    try {
      extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            sheets: {
              type: 'object',
              properties: {
                'Foglio2 Ricavi': { type: 'array', items: { type: 'object', additionalProperties: true } },
                'Foglio3 Spese': { type: 'array', items: { type: 'object', additionalProperties: true } },
                'Foglio 5 previsionale incassi': { type: 'array', items: { type: 'object', additionalProperties: true } },
                'Capitoli di spesa': { type: 'array', items: { type: 'object', additionalProperties: true } },
                'BADGET PUBBLICITA': { type: 'array', items: { type: 'object', additionalProperties: true } },
                'PREVISIONE CASSA': { type: 'array', items: { type: 'object', additionalProperties: true } }
              }
            }
          }
        }
      });
    } catch (extractError) {
      return Response.json({ success: false, error: `File extraction failed: ${extractError.message}` }, { status: 400 });
    }

    if (extractResult.status === 'error') {
      return Response.json({ success: false, error: `File extraction failed: ${extractResult.details}` }, { status: 400 });
    }

    const sheetsData = extractResult.output?.sheets || extractResult.output;
    if (!sheetsData) {
      return Response.json({ success: false, error: 'No data found in file' }, { status: 400 });
    }

    const aiPrompt = `You are a financial data import assistant for an architecture firm. Analyze this multi-sheet Excel workbook and map it to our entity schemas.

**Excel Structure Provided:**
- **Foglio2 Ricavi**: Monthly revenue tracking with Date, Item (Voce), Euro, Cash vs Bank Transfers
- **Foglio3 Spese**: Monthly expenses in 4 categories (Spese fisse, Collaborazioni/stipendi, Contributi/Tasse, Spese Varie)
- **Foglio 5 previsionale incassi**: Project pipeline with Service type (PG, PB, DL, PR), Client Name, Amount
- **Capitoli di spesa**: Expense budgeting with Budget vs Actual
- **BADGET PUBBLICITA**: Marketing budget breakdown
- **PREVISIONE CASSA**: Cash flow forecast for 2026

**Available Entities to Map:**

1. **Revenue** (from Foglio2 Ricavi):
   - amount (number, required): importo in EUR
   - date (string, required): data in formato YYYY-MM-DD
   - description (string): voce/item
   - tag (string): "Progettazione", "Direzione Lavori", "Provvigione", "Burocrazia", or "Other"
   - payment_method (string): "cash" if from Contanti, "bank_transfer" if from Bonifici, "other" otherwise

2. **Expense** (from Foglio3 Spese):
   - amount (number, required): importo in EUR
   - date (string, required): data in formato YYYY-MM-DD
   - description (string): voce/item
   - tag (string): "Spese Fisse", "Collaborazioni", "Stipendi", "Spese variabili", "Tasse", or "Other"
   - payment_method (string): "cash" if from Contanti/Liquid, "bank_transfer" if from Banca, "other" otherwise

3. **Client** (from Foglio 5 previsionale incassi):
   - name (string, required): client name from the sheet

4. **Project** (from Foglio 5 previsionale incassi):
   - name (string, required): service description as project name
   - client_name (string, required): client name
   - description (string): service type (PG, PB, DL, PR)
   - budget (number): total invoice amount

5. **Fee** (from Foglio 5 previsionale incassi):
   - project_name (string): service description
   - client_name (string): client name
   - total_amount (number): total invoice amount
   - status (string): "agreed" by default

6. **MarketingBudget** (from BADGET PUBBLICITA):
   - year (number): 2026
   - channel (string): category name
   - yearly_budget (number): total budget
   - spent (number): actual spend

7. **Forecast** (from PREVISIONE CASSA):
   - year (number): 2026
   - month (number): extract month if available
   - revenue_amount (number): expected revenue
   - expense_amount (number): expected expenses

**Sheets Data:**
${JSON.stringify(sheetsData, null, 2)}

Return JSON:
{
  "revenues": [{ amount, date, description, tag, payment_method }],
  "expenses": [{ amount, date, description, tag, payment_method }],
  "clients": [{ name }],
  "projects": [{ name, client_name, description, budget }],
  "fees": [{ project_name, client_name, total_amount, status }],
  "marketing_budgets": [{ year, channel, yearly_budget, spent }],
  "forecasts": [{ year, month, revenue_amount, expense_amount }]
}

Only include arrays that have data.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          revenues: { type: 'array', items: { type: 'object' } },
          expenses: { type: 'array', items: { type: 'object' } },
          clients: { type: 'array', items: { type: 'object' } },
          projects: { type: 'array', items: { type: 'object' } },
          fees: { type: 'array', items: { type: 'object' } },
          marketing_budgets: { type: 'array', items: { type: 'object' } },
          forecasts: { type: 'array', items: { type: 'object' } }
        }
      }
    });

    const mappedData = aiResponse;

    const existingClients = await base44.asServiceRole.entities.Client.list();
    const clientMap = new Map(existingClients.map(c => [c.name.toLowerCase(), c.id]));

    const results = { revenues: 0, expenses: 0, clients: 0, projects: 0, fees: 0, marketing_budgets: 0, forecasts: 0 };
    const errors = [];

    if (mappedData.clients?.length > 0) {
      for (const client of mappedData.clients) {
        try {
          const created = await base44.asServiceRole.entities.Client.create(client);
          clientMap.set(client.name.toLowerCase(), created.id);
          results.clients++;
        } catch (e) { errors.push(`Client creation failed: ${e.message}`); }
      }
    }

    if (mappedData.projects?.length > 0) {
      for (const project of mappedData.projects) {
        try {
          const clientId = clientMap.get(project.client_name?.toLowerCase());
          if (!clientId) { errors.push(`Project "${project.name}": Client "${project.client_name}" not found`); continue; }
          await base44.asServiceRole.entities.Project.create({ name: project.name, client_id: clientId, client_name: project.client_name, description: project.description, budget: project.budget, status: 'planning' });
          results.projects++;
        } catch (e) { errors.push(`Project creation failed: ${e.message}`); }
      }
    }

    if (mappedData.revenues?.length > 0) {
      for (const revenue of mappedData.revenues) {
        try {
          await base44.asServiceRole.entities.Revenue.create({ amount: revenue.amount, date: revenue.date, description: revenue.description, tag: revenue.tag || 'Other', payment_method: revenue.payment_method || 'bank_transfer' });
          results.revenues++;
        } catch (e) { errors.push(`Revenue creation failed: ${e.message}`); }
      }
    }

    if (mappedData.expenses?.length > 0) {
      for (const expense of mappedData.expenses) {
        try {
          await base44.asServiceRole.entities.Expense.create({ amount: expense.amount, date: expense.date, description: expense.description, tag: expense.tag || 'Other', payment_method: expense.payment_method || 'bank_transfer' });
          results.expenses++;
        } catch (e) { errors.push(`Expense creation failed: ${e.message}`); }
      }
    }

    if (mappedData.fees?.length > 0) {
      const projectMap = new Map();
      for (const fee of mappedData.fees) {
        try {
          let clientId = clientMap.get(fee.client_name?.toLowerCase());
          if (!clientId && fee.client_name) {
            const newClient = await base44.asServiceRole.entities.Client.create({ name: fee.client_name });
            clientId = newClient.id;
            clientMap.set(fee.client_name.toLowerCase(), clientId);
            results.clients++;
          }
          let projectId = projectMap.get(fee.project_name?.toLowerCase());
          if (!projectId && fee.project_name && clientId) {
            const newProject = await base44.asServiceRole.entities.Project.create({ name: fee.project_name, client_id: clientId, client_name: fee.client_name, status: 'in_progress' });
            projectId = newProject.id;
            projectMap.set(fee.project_name.toLowerCase(), projectId);
            results.projects++;
          }
          if (projectId) {
            await base44.asServiceRole.entities.Fee.create({ project_id: projectId, total_amount: fee.total_amount, status: fee.status || 'agreed' });
            results.fees++;
          }
        } catch (e) { errors.push(`Fee creation failed: ${e.message}`); }
      }
    }

    if (mappedData.marketing_budgets?.length > 0) {
      for (const budget of mappedData.marketing_budgets) {
        try {
          await base44.asServiceRole.entities.MarketingBudget.create({ year: budget.year || 2026, channel: budget.channel, yearly_budget: budget.yearly_budget, spent: budget.spent || 0 });
          results.marketing_budgets++;
        } catch (e) { errors.push(`Marketing budget creation failed: ${e.message}`); }
      }
    }

    if (mappedData.forecasts?.length > 0) {
      for (const forecast of mappedData.forecasts) {
        try {
          await base44.asServiceRole.entities.Forecast.create({ year: forecast.year || 2026, month: forecast.month || 1, revenue_amount: forecast.revenue_amount || 0, expense_amount: forecast.expense_amount || 0, prestazioni: 'Progettazione' });
          results.forecasts++;
        } catch (e) { errors.push(`Forecast creation failed: ${e.message}`); }
      }
    }

    return Response.json({ success: true, imported: results, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});