import { CSVRow } from "@shared/schema";
import type { 
  InsertTransaction, 
  InsertSustainabilityScore, 
  InsertCategoryBreakdown 
} from "@shared/schema";

// Sustainable ratings based on merchants
const MERCHANT_RATINGS: Record<string, number> = {
  "whole foods": 85,
  "trader joe's": 80,
  "farmers market": 95,
  "amazon": 60,
  "walmart": 55,
  "target": 65,
  "h&m": 45,
  "zara": 40,
  "patagonia": 90,
  "uber": 60,
  "lyft": 62,
  "public transit": 90,
  "starbucks": 65,
  "local coffee": 85,
  "mcdonald's": 40,
  "chipotle": 70,
};

// Category ratings for fallback when merchant is not found
const CATEGORY_RATINGS: Record<string, number> = {
  "groceries": 75,
  "shopping": 50,
  "transportation": 60,
  "dining": 65,
  "utilities": 70,
  "entertainment": 65,
  "housing": 55,
  "health": 80,
  "education": 85,
  "travel": 45,
  "other": 60,
};

// Calculate eco score for a given merchant and category
export function calculateEcoScore(merchant: string, category: string): number {
  // Check for merchant rating first
  for (const [key, rating] of Object.entries(MERCHANT_RATINGS)) {
    if (merchant.toLowerCase().includes(key.toLowerCase())) {
      return rating;
    }
  }
  
  // Fallback to category rating
  for (const [key, rating] of Object.entries(CATEGORY_RATINGS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return rating;
    }
  }
  
  // Default rating if no matches
  return 60;
}

// Check if sustainable alternatives should be suggested
export function hasAlternatives(merchant: string, category: string, ecoScore: number): boolean {
  // If eco score is already high, no alternatives needed
  if (ecoScore >= 80) return false;
  
  // Categories that typically have alternatives
  const categoriesWithAlternatives = ['shopping', 'transportation', 'dining', 'groceries'];
  
  // Check for low-rated merchants that have known alternatives
  const merchantsWithAlternatives = ['h&m', 'zara', 'uber', 'lyft', 'starbucks', 'walmart', 'mcdonald\'s'];
  
  // Check if the category has alternatives
  for (const cat of categoriesWithAlternatives) {
    if (category.toLowerCase().includes(cat)) {
      return true;
    }
  }
  
  // Check if the merchant has alternatives
  for (const m of merchantsWithAlternatives) {
    if (merchant.toLowerCase().includes(m)) {
      return true;
    }
  }
  
  return false;
}

// Process CSV rows into transaction data
export function processTransactions(csvRows: CSVRow[], userId: number): {
  transactions: InsertTransaction[];
  sustainabilityScore: InsertSustainabilityScore;
  categoryBreakdowns: InsertCategoryBreakdown[];
} {
  const transactions: InsertTransaction[] = [];
  const categoryMap = new Map<string, { amount: number; ecoScore: number; count: number }>();
  let totalEcoScore = 0;
  let totalCarbonFootprint = 0;
  let sustainablePurchasesCount = 0;
  let totalWaterUsage = 0;
  
  // Process each transaction
  for (const row of csvRows) {
    // Parse date and amount
    const date = new Date(row.date);
    const amount = parseFloat(row.amount.replace('$', '').replace(',', ''));
    
    if (isNaN(amount)) {
      throw new Error(`Invalid amount format: ${row.amount}`);
    }
    
    // Calculate eco score
    const ecoScore = calculateEcoScore(row.merchant, row.category);
    
    // Determine if alternatives should be suggested
    const hasAlts = hasAlternatives(row.merchant, row.category, ecoScore);
    
    // Create transaction
    const transaction: InsertTransaction = {
      date,
      merchant: row.merchant,
      category: row.category,
      amount,
      ecoScore,
      hasAlternatives: hasAlts,
      userId
    };
    
    transactions.push(transaction);
    
    // Update statistics
    totalEcoScore += ecoScore;
    
    // Calculate carbon footprint (simplified model)
    const carbonImpact = (100 - ecoScore) * 0.05 * amount; // kg CO2
    totalCarbonFootprint += carbonImpact;
    
    // Calculate water usage (simplified model)
    const waterUsage = (100 - ecoScore) * 0.001 * amount; // kL
    totalWaterUsage += waterUsage;
    
    // Count sustainable purchases (eco score >= 70)
    if (ecoScore >= 70) {
      sustainablePurchasesCount++;
    }
    
    // Update category breakdown
    const category = row.category.toLowerCase();
    const categoryData = categoryMap.get(category) || { amount: 0, ecoScore: 0, count: 0 };
    categoryData.amount += amount;
    categoryData.ecoScore += ecoScore;
    categoryData.count += 1;
    categoryMap.set(category, categoryData);
  }
  
  // Calculate overall sustainability score
  const overallScore = Math.round(totalEcoScore / transactions.length);
  const sustainablePurchasesPercentage = Math.round((sustainablePurchasesCount / transactions.length) * 100);
  
  // Create sustainability score record
  const sustainabilityScore: InsertSustainabilityScore = {
    userId,
    overallScore,
    carbonFootprint: Math.round(totalCarbonFootprint * 10) / 10, // Round to 1 decimal place
    sustainablePurchases: sustainablePurchasesPercentage,
    waterUsage: Math.round(totalWaterUsage * 10) / 10, // Round to 1 decimal place
    date: new Date()
  };
  
  // Create category breakdowns
  const categoryBreakdowns: InsertCategoryBreakdown[] = [];
  
  for (const [category, data] of categoryMap.entries()) {
    categoryBreakdowns.push({
      userId,
      category,
      amount: Math.round(data.amount * 100) / 100, // Round to 2 decimal places
      ecoScore: Math.round(data.ecoScore / data.count) // Average eco score for category
    });
  }
  
  return {
    transactions,
    sustainabilityScore,
    categoryBreakdowns
  };
}
