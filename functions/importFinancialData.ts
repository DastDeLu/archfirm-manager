import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Financial Data Import Function
 * Accepts Excel/CSV files, uses AI to map data to entities, and bulk imports them.
 * 
 * Supported entities: Revenue, Expense, Client, Project, Chapter
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can import data
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Step 1: Upload file to get URL
    console.log('Uploading file...');
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;

    // Step 2: Extract raw data from Excel/CSV
    console.log('Extracting data from file...');
    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    });

    if (extractResult.status === 'error') {
      return Response.json({ 
        success: false, 
        error: `File extraction failed: ${extractResult.details}` 
      }, { status: 400 });
    }

    const rawData = extractResult.output.rows || extractResult.output;
    if (!rawData || rawData.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'No data found in file' 
      }, { status: 400 });
    }

    // Step 3: Use AI to analyze and map data to our schema
    console.log(`Analyzing ${rawData.length} rows with AI...`);
    
    const aiPrompt = `You are a financial data import assistant. Analyze the following spreadsheet data and map it to our entity schemas.

**Available Entities:**

1. **Revenue** (ricavi):
   - amount (number, required): importo in EUR
   - date (string, required): data in formato YYYY-MM-DD
   - description (string): descrizione
   - tag (string): uno tra ["Progettazione", "Direzione Lavori", "Provvigione", "Burocrazia", "Other"]
   - chapter_name (string): nome del capitolo di entrata

2. **Expense** (spese):
   - amount (number, required): importo in EUR
   - date (string, required): data in formato YYYY-MM-DD
   - description (string): descrizione
   - tag (string): uno tra ["Spese Fisse", "Collaborazioni", "Stipendi", "Spese variabili", "Tasse", "Other"]
   - chapter_name (string): nome del capitolo di spesa
   - payment_method (string): uno tra ["cash", "bank_transfer", "card", "other"]

3. **Client** (clienti):
   - name (string, required): nome del cliente
   - contact_person (string): persona di contatto
   - email (string): email
   - phone (string): telefono

4. **Project** (progetti):
   - name (string, required): nome del progetto
   - client_name (string, required): nome del cliente
   - description (string): descrizione
   - budget (number): budget totale

5. **Chapter** (capitoli):
   - name (string, required): nome del capitolo
   - code (string): codice
   - type (string): uno tra ["revenue", "expense"]

**Raw Data:**
${JSON.stringify(rawData.slice(0, 50), null, 2)}

**Task:**
1. Identify which entity type each row represents (Revenue, Expense, Client, Project, or Chapter)
2. Map the columns to our schema fields
3. Ensure required fields are present
4. Convert dates to YYYY-MM-DD format
5. Normalize tag values to match our enums
6. Extract chapter_name and client_name for later resolution

Return a JSON object with this structure:
{
  "revenues": [{ amount, date, description, tag, chapter_name }],
  "expenses": [{ amount, date, description, tag, chapter_name, payment_method }],
  "clients": [{ name, contact_person, email, phone }],
  "projects": [{ name, client_name, description, budget }],
  "chapters": [{ name, code, type }]
}

Only include arrays that have data. Skip empty arrays.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          revenues: { type: 'array', items: { type: 'object' } },
          expenses: { type: 'array', items: { type: 'object' } },
          clients: { type: 'array', items: { type: 'object' } },
          projects: { type: 'array', items: { type: 'object' } },
          chapters: { type: 'array', items: { type: 'object' } }
        }
      }
    });

    const mappedData = aiResponse;
    console.log('AI mapped data:', JSON.stringify(mappedData, null, 2));

    // Step 4: Fetch existing entities for resolution
    const [existingChapters, existingClients] = await Promise.all([
      base44.asServiceRole.entities.Chapter.list(),
      base44.asServiceRole.entities.Client.list()
    ]);

    const chapterMap = new Map(existingChapters.map(c => [c.name.toLowerCase(), c.id]));
    const clientMap = new Map(existingClients.map(c => [c.name.toLowerCase(), c.id]));

    const results = {
      revenues: 0,
      expenses: 0,
      clients: 0,
      projects: 0,
      chapters: 0
    };
    const errors = [];

    // Step 5: Create Chapters first (if any)
    if (mappedData.chapters && mappedData.chapters.length > 0) {
      for (const chapter of mappedData.chapters) {
        try {
          const created = await base44.asServiceRole.entities.Chapter.create(chapter);
          chapterMap.set(chapter.name.toLowerCase(), created.id);
          results.chapters++;
        } catch (e) {
          errors.push(`Chapter creation failed: ${e.message}`);
        }
      }
    }

    // Step 6: Create Clients (if any)
    if (mappedData.clients && mappedData.clients.length > 0) {
      for (const client of mappedData.clients) {
        try {
          const created = await base44.asServiceRole.entities.Client.create(client);
          clientMap.set(client.name.toLowerCase(), created.id);
          results.clients++;
        } catch (e) {
          errors.push(`Client creation failed: ${e.message}`);
        }
      }
    }

    // Step 7: Create Projects (if any)
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
            status: 'planning'
          };
          
          await base44.asServiceRole.entities.Project.create(projectData);
          results.projects++;
        } catch (e) {
          errors.push(`Project creation failed: ${e.message}`);
        }
      }
    }

    // Step 8: Create Revenues (if any)
    if (mappedData.revenues && mappedData.revenues.length > 0) {
      for (const revenue of mappedData.revenues) {
        try {
          const revenueData = {
            amount: revenue.amount,
            date: revenue.date,
            description: revenue.description,
            tag: revenue.tag || 'Other'
          };

          // Resolve chapter_id if chapter_name provided
          if (revenue.chapter_name) {
            const chapterId = chapterMap.get(revenue.chapter_name.toLowerCase());
            if (chapterId) {
              revenueData.chapter_id = chapterId;
              revenueData.chapter_name = revenue.chapter_name;
            }
          }

          await base44.asServiceRole.entities.Revenue.create(revenueData);
          results.revenues++;
        } catch (e) {
          errors.push(`Revenue creation failed: ${e.message}`);
        }
      }
    }

    // Step 9: Create Expenses (if any)
    if (mappedData.expenses && mappedData.expenses.length > 0) {
      for (const expense of mappedData.expenses) {
        try {
          const expenseData = {
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            tag: expense.tag || 'Other',
            payment_method: expense.payment_method || 'bank_transfer'
          };

          // Resolve chapter_id if chapter_name provided
          if (expense.chapter_name) {
            const chapterId = chapterMap.get(expense.chapter_name.toLowerCase());
            if (chapterId) {
              expenseData.chapter_id = chapterId;
              expenseData.chapter_name = expense.chapter_name;
            }
          }

          await base44.asServiceRole.entities.Expense.create(expenseData);
          results.expenses++;
        } catch (e) {
          errors.push(`Expense creation failed: ${e.message}`);
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
});