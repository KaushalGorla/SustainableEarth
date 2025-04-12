import { CSVRow, csvUploadSchema } from "@shared/schema";
import { ZodError } from "zod";

export class CSVParseError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(message);
    this.name = "CSVParseError";
  }
}

export function parseCSV(csvContent: string): CSVRow[] {
  const rows = csvContent.split(/\r?\n/);
  
  // Check if CSV is empty
  if (rows.length <= 1) {
    throw new CSVParseError("CSV file is empty or contains only headers");
  }
  
  // Parse headers and validate expected format
  const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
  
  // Validate expected headers exist
  const requiredHeaders = ['date', 'merchant', 'category', 'amount'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    throw new CSVParseError(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  // Get column indices
  const dateIndex = headers.indexOf('date');
  const merchantIndex = headers.indexOf('merchant');
  const categoryIndex = headers.indexOf('category');
  const amountIndex = headers.indexOf('amount');
  
  const parsedRows: CSVRow[] = [];
  
  // Parse data rows
  for (let i = 1; i < rows.length; i++) {
    // Skip empty rows
    if (!rows[i].trim()) continue;
    
    const values = rows[i].split(',').map(v => v.trim());
    
    // Ensure row has enough columns
    if (values.length < requiredHeaders.length) {
      throw new CSVParseError(`Row ${i + 1} has insufficient columns`, i + 1);
    }
    
    try {
      // Create row object with proper field mapping
      const row = {
        date: values[dateIndex],
        merchant: values[merchantIndex],
        category: values[categoryIndex],
        amount: values[amountIndex]
      };
      
      // Validate with Zod schema
      const validatedRow = csvUploadSchema.parse(row);
      parsedRows.push(validatedRow);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new CSVParseError(`Row ${i + 1} has invalid data: ${error.message}`, i + 1);
      }
      throw error;
    }
  }
  
  return parsedRows;
}
