import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

/**
 * Financial Data Import Function
 * Accepts Excel/CSV files, uses AI to map data to entities, and bulk imports them.
 * 
 * Supported entities: Revenue, Expense, Client, Project, Chapter
 */

Deno.serve(withAuth(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    // Only admin can import data
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    let fileUrl;
    try {
      const body = await req.json();
      fileUrl = body.file_url;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return Response.json({ 
        success: false,
        error: 'Invalid request format. Expected JSON with file_url property.' 
      }, { status: 400 });
    }

    if (!fileUrl) {
      return Response.json({ 
        success: false,
        error: 'No file_url provided in request body' 
      }, { status: 400 });
    }

    // Step 1: Extract raw data from Excel - multi-sheet structure
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
      console.log('Extract result received:', JSON.stringify(extractResult, null, 2));
    } catch (extractError) {
      console.error('Extract error:', extractError);
      return Response.json({ 
        success: false, 
        error: `File extraction failed: ${extractError.message}` 
      }, { status: 400 });
    }

    if (extractResult.status === 'error') {
      console.error('Extract status error:', extractResult.details);
      return Response.json({ 
        success: false, 
        error: `File extraction failed: ${extractResult.details}` 
      }, { status: 400 });
    }

    const sheetsData = extractResult.output?.sheets || extractResult.output;
    if (!sheetsData) {
      return Response.json({ 
        success: false, 
        error: 'No data found in file' 
      }, { status: 400 });
    }

    // Step 2: Use AI to analyze multi-sheet data and map to entities
    console.log('Analyzing multi-sheet Excel data with AI...');
    
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
   - Extract unique client names

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
   - channel (string): category name (Photo/Video, Website, Ads, etc.)
   - yearly_budget (number): total budget
   - spent (number): actual spend

7. **Forecast** (from PREVISIONE CASSA):
   - year (number): 2026
   - month (number): extract month if available
   - revenue_amount (number): expected revenue
   - expense_amount (number): expected expenses

**Sheets Data:**
${JSON.stringify(sheetsData, null, 2)}

**Task:**
1. Extract revenues from "Foglio2 Ricavi" - parse dates, amounts, descriptions, detect cash vs bank
2. Extract expenses from "Foglio3 Spese" - identify categories, parse dates, amounts
3. Extract clients and projects from "Foglio 5 previsionale incassi"
4. Extract fees from "Foglio 5 previsionale incassi"
5. Extract marketing budget from "BADGET PUBBLICITA"
6. Extract forecasts from "PREVISIONE CASSA"
7. Convert all dates to YYYY-MM-DD format
8. Match tags to our enum values

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
    console.log('AI mapped data:', JSON.stringify(mappedData, null, 2));

    // Step 3: Fetch existing entities for resolution
    const existingClients = await base44.asServiceRole.entities.Client.list();
    const clientMap = new Map(existingClients.map(c => [c.name.toLowerCase(), c.id]));

    const results = {
      revenues: 0,
      expenses: 0,
      clients: 0,
      projects: 0,
      fees: 0,
      marketing_budgets: 0,
      forecasts: 0
    };
    const errors = [];

    // Step 5: Create Clients (if any)
    if (mappedData.clients && mappedData.clients.length > 0) {
      for (const client of mappedData.clients) {
        try {
          const created = await base44.asServiceRole.entities.Client.create({ ...client, ...stampOwnerExtra(user.id) });
          clientMap.set(client.name.toLowerCase(), created.id);
          results.clients++;
        } catch (e) {
          errors.push(`Client creation failed: ${e.message}`);
        }
      }
    }

    // Step 6: Create Projects (if any)
    if (mappedData.projects && mappedData.projects.length > 0) {
      for (const project of mappedData.projects) {
        try {
          // Resolve client_id
          const clientId = clientMap.get(project.client_name?.toLowerCase());
          if (!clientId) {
            errors.push(`Project "${project.name}": Client "${project.client_name}" not found`);
            continue;
          }
          
          const projectData = {
            name: project.name,
            client_id: clientId,
            client_name: project.client_name,
            description: project.description,
            budget: project.budget,
            status: 'planning',
            ...stampOwnerExtra(user.id),
          };
          
          await base44.asServiceRole.entities.Project.create(projectData);
          results.projects++;
        } catch (e) {
          errors.push(`Project creation failed: ${e.message}`);
        }
      }
    }

    // Step 4: Create Revenues (if any)
    if (mappedData.revenues && mappedData.revenues.length > 0) {
      for (const revenue of mappedData.revenues) {
        try {
          const revenueData = {
            amount: revenue.amount,
            date: revenue.date,
            description: revenue.description,
            tag: revenue.tag || 'Other',
            payment_method: revenue.payment_method || 'bank_transfer',
            ...stampOwnerExtra(user.id),
          };

          await base44.asServiceRole.entities.Revenue.create(revenueData);
          results.revenues++;
        } catch (e) {
          errors.push(`Revenue creation failed: ${e.message}`);
        }
      }
    }

    // Step 5: Create Expenses (if any)
    if (mappedData.expenses && mappedData.expenses.length > 0) {
      for (const expense of mappedData.expenses) {
        try {
          const expenseData = {
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            tag: expense.tag || 'Other',
            payment_method: expense.payment_method || 'bank_transfer',
            ...stampOwnerExtra(user.id),
          };

          await base44.asServiceRole.entities.Expense.create(expenseData);
          results.expenses++;
        } catch (e) {
          errors.push(`Expense creation failed: ${e.message}`);
        }
      }
    }

    // Step 6: Create Fees (if any)
    if (mappedData.fees && mappedData.fees.length > 0) {
      const projectMap = new Map();
      
      for (const fee of mappedData.fees) {
        try {
          // Get or create client
          let clientId = clientMap.get(fee.client_name?.toLowerCase());
          if (!clientId && fee.client_name) {
            const newClient = await base44.asServiceRole.entities.Client.create({ name: fee.client_name, ...stampOwnerExtra(user.id) });
            clientId = newClient.id;
            clientMap.set(fee.client_name.toLowerCase(), clientId);
            results.clients++;
          }

          // Get or create project
          let projectId = projectMap.get(fee.project_name?.toLowerCase());
          if (!projectId && fee.project_name && clientId) {
            const newProject = await base44.asServiceRole.entities.Project.create({
              name: fee.project_name,
              client_id: clientId,
              client_name: fee.client_name,
              status: 'in_progress',
              ...stampOwnerExtra(user.id),
            });
            projectId = newProject.id;
            projectMap.set(fee.project_name.toLowerCase(), projectId);
            results.projects++;
          }

          // Create fee
          if (projectId) {
            await base44.asServiceRole.entities.Fee.create({
              project_id: projectId,
              total_amount: fee.total_amount,
              status: fee.status || 'agreed',
              ...stampOwnerExtra(user.id),
            });
            results.fees++;
          }
        } catch (e) {
          errors.push(`Fee creation failed: ${e.message}`);
        }
      }
    }

    // Step 7: Create Marketing Budgets (if any)
    if (mappedData.marketing_budgets && mappedData.marketing_budgets.length > 0) {
      for (const budget of mappedData.marketing_budgets) {
        try {
          await base44.asServiceRole.entities.MarketingBudget.create({
            year: budget.year || 2026,
            channel: budget.channel,
            yearly_budget: budget.yearly_budget,
            spent: budget.spent || 0,
            ...stampOwnerExtra(user.id),
          });
          results.marketing_budgets++;
        } catch (e) {
          errors.push(`Marketing budget creation failed: ${e.message}`);
        }
      }
    }

    // Step 8: Create Forecasts (if any)
    if (mappedData.forecasts && mappedData.forecasts.length > 0) {
      for (const forecast of mappedData.forecasts) {
        try {
          await base44.asServiceRole.entities.Forecast.create({
            year: forecast.year || 2026,
            month: forecast.month || 1,
            revenue_amount: forecast.revenue_amount || 0,
            expense_amount: forecast.expense_amount || 0,
            prestazioni: 'Progettazione',
            ...stampOwnerExtra(user.id),
          });
          results.forecasts++;
        } catch (e) {
          errors.push(`Forecast creation failed: ${e.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      imported: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}));