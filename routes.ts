import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  csvUploadSchema, 
  insertTransactionSchema, 
  insertSustainabilityScoreSchema,
  insertCashbackRewardSchema,
  insertInvestmentProfileSchema,
  insertInvestmentSchema,
  insertRiskAssessmentSchema,
  insertGreenInvestmentSchema
} from "@shared/schema";
import { parseCSV, CSVParseError } from "./utils/csvParser";
import { processTransactions } from "./utils/sustainabilityCalculator";
import { ecoSearchHandler } from "./utils/ecoSearch";
import plaidRouter from "./utils/plaidRoutes";
import { ZodError } from "zod";
import { setupAuth } from "./auth";

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // CSV Upload endpoint
  app.post("/api/upload-csv", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.body.csvData) {
        return res.status(400).json({ message: "No CSV data provided" });
      }
      
      // Parse CSV data
      const csvRows = parseCSV(req.body.csvData);
      
      // Get user ID from authenticated session
      const userId = req.user!.id;
      
      // Process CSV into transactions and calculate sustainability metrics
      const { 
        transactions, 
        sustainabilityScore, 
        categoryBreakdowns 
      } = processTransactions(csvRows, userId);
      
      // Store transactions
      const savedTransactions = await storage.createTransactions(transactions);
      
      // Store sustainability score
      const savedScore = await storage.createSustainabilityScore(sustainabilityScore);
      
      // Store category breakdowns
      const savedBreakdowns = await storage.createCategoryBreakdowns(categoryBreakdowns);
      
      res.status(200).json({
        message: "CSV data processed successfully",
        transactionsCount: savedTransactions.length,
        sustainabilityScore: savedScore
      });
    } catch (error) {
      if (error instanceof CSVParseError) {
        return res.status(400).json({ 
          message: `CSV parsing error: ${error.message}`, 
          lineNumber: error.lineNumber 
        });
      }
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: `Validation error: ${error.message}`
        });
      }
      
      console.error("Error processing CSV:", error);
      res.status(500).json({ message: "Failed to process CSV data" });
    }
  });
  
  // Get sustainability score
  app.get("/api/sustainability-score", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const score = await storage.getLatestSustainabilityScore(userId);
      
      if (!score) {
        return res.status(404).json({ message: "No sustainability score found" });
      }
      
      res.status(200).json(score);
    } catch (error) {
      console.error("Error fetching sustainability score:", error);
      res.status(500).json({ message: "Failed to fetch sustainability score" });
    }
  });
  
  // Get transactions
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { category, minScore, maxScore } = req.query;
      let transactions;
      
      if (category) {
        transactions = await storage.getTransactionsByCategory(
          category as string, 
          userId
        );
      } else if (minScore && maxScore) {
        transactions = await storage.getTransactionsByEcoScore(
          parseInt(minScore as string),
          parseInt(maxScore as string),
          userId
        );
      } else {
        transactions = await storage.getTransactions(userId);
      }
      
      res.status(200).json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Get category breakdowns
  app.get("/api/category-breakdowns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const breakdowns = await storage.getCategoryBreakdowns(userId);
      res.status(200).json(breakdowns);
    } catch (error) {
      console.error("Error fetching category breakdowns:", error);
      res.status(500).json({ message: "Failed to fetch category breakdowns" });
    }
  });
  
  // Get recommendations
  app.get("/api/recommendations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const recommendations = await storage.getRecommendations(userId);
      res.status(200).json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Search for sustainable product alternatives
  app.get("/api/eco-search", isAuthenticated, ecoSearchHandler);

  // Calculate and get monthly cashback rewards
  app.get("/api/cashback-rewards", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const rewards = await storage.getCashbackRewards(userId);
      res.status(200).json(rewards);
    } catch (error) {
      console.error("Error fetching cashback rewards:", error);
      res.status(500).json({ message: "Failed to fetch cashback rewards" });
    }
  });

  // Calculate and store cashback reward for the month
  app.post("/api/calculate-cashback", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      // Check if we already calculated cashback for this month
      const existingReward = await storage.getCashbackRewardsByMonth(userId, month, year);
      if (existingReward) {
        return res.status(200).json(existingReward);
      }

      // Get the latest sustainability score
      const score = await storage.getLatestSustainabilityScore(userId);
      if (!score) {
        return res.status(404).json({ message: "No sustainability score found" });
      }

      // Calculate cashback amount based on eco-score
      // Higher score = higher cashback percentage with more tiers
      const baseAmount = 25; // $25 base amount
      
      // More dynamic cashback calculation based on eco-score
      let cashbackMultiplier = 1.0;
      if (score.overallScore >= 80) {
        // Excellent eco-score (80-100) - highest rewards
        cashbackMultiplier = 3.0;
      } else if (score.overallScore >= 60) {
        // Good eco-score (60-79) - medium rewards
        cashbackMultiplier = 2.0; 
      } else if (score.overallScore >= 40) {
        // Average eco-score (40-59) - modest rewards
        cashbackMultiplier = 1.5;
      }
      
      // Calculate final amount
      const amount = baseAmount * cashbackMultiplier;

      // Create cashback reward
      const reward = await storage.createCashbackReward({
        userId,
        month,
        year,
        ecoScore: score.overallScore,
        amount,
        redeemed: false,
        invested: false,
        date: new Date()
      });

      res.status(201).json(reward);
    } catch (error) {
      console.error("Error calculating cashback:", error);
      res.status(500).json({ message: "Failed to calculate cashback" });
    }
  });

  // Redeem cashback reward
  app.post("/api/redeem-cashback/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const rewardId = parseInt(req.params.id);

      // Get the reward
      // Direct map access doesn't work, we need to create a method in our storage interface
      const rewards = await storage.getCashbackRewards(userId);
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        return res.status(404).json({ message: "Cashback reward not found" });
      }

      if (reward.redeemed) {
        return res.status(400).json({ message: "Cashback reward already redeemed" });
      }

      // Update the reward
      const updatedReward = await storage.updateCashbackReward(rewardId, { redeemed: true });
      res.status(200).json(updatedReward);
    } catch (error) {
      console.error("Error redeeming cashback:", error);
      res.status(500).json({ message: "Failed to redeem cashback" });
    }
  });

  // Get total unredeemed cashback amount
  app.get("/api/cashback-total", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const total = await storage.getUnredeemedCashbackAmount(userId);
      res.status(200).json({ total });
    } catch (error) {
      console.error("Error fetching total cashback:", error);
      res.status(500).json({ message: "Failed to fetch total cashback" });
    }
  });

  // Risk assessment survey
  app.post("/api/risk-assessment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertRiskAssessmentSchema.parse(req.body);

      // Calculate recommended risk level based on survey answers
      const { riskTolerance, environmentalPriority, investmentTimeframe } = validatedData;
      let recommendedRiskLevel = "low";

      // Simple algorithm to determine risk level based on risk tolerance, environmental priority and timeframe
      const riskScore = riskTolerance * 0.5 + environmentalPriority * 0.2;
      if (riskScore >= 7 && investmentTimeframe === "long_term") {
        recommendedRiskLevel = "high";
      } else if (riskScore >= 5 || investmentTimeframe === "medium_term") {
        recommendedRiskLevel = "medium";
      }

      // Create or update risk assessment
      const assessment = await storage.createRiskAssessment({
        ...validatedData,
        userId,
        recommendedRiskLevel
      });

      res.status(201).json(assessment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: `Validation error: ${error.message}` });
      }
      console.error("Error creating risk assessment:", error);
      res.status(500).json({ message: "Failed to create risk assessment" });
    }
  });

  // Get user's risk assessment
  app.get("/api/risk-assessment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const assessment = await storage.getRiskAssessment(userId);
      
      if (!assessment) {
        return res.status(404).json({ message: "No risk assessment found" });
      }
      
      res.status(200).json(assessment);
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      res.status(500).json({ message: "Failed to fetch risk assessment" });
    }
  });

  // Create investment profile
  app.post("/api/investment-profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertInvestmentProfileSchema.parse(req.body);
      
      // Check if user already has a profile
      const existingProfile = await storage.getInvestmentProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Investment profile already exists" });
      }
      
      const profile = await storage.createInvestmentProfile({
        ...validatedData,
        userId
      });
      
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: `Validation error: ${error.message}` });
      }
      console.error("Error creating investment profile:", error);
      res.status(500).json({ message: "Failed to create investment profile" });
    }
  });

  // Get user's investment profile
  app.get("/api/investment-profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getInvestmentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "No investment profile found" });
      }
      
      res.status(200).json(profile);
    } catch (error) {
      console.error("Error fetching investment profile:", error);
      res.status(500).json({ message: "Failed to fetch investment profile" });
    }
  });

  // Update investment profile
  app.patch("/api/investment-profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getInvestmentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "No investment profile found" });
      }
      
      const updatedProfile = await storage.updateInvestmentProfile(userId, req.body);
      res.status(200).json(updatedProfile);
    } catch (error) {
      console.error("Error updating investment profile:", error);
      res.status(500).json({ message: "Failed to update investment profile" });
    }
  });

  // Get green investment opportunities
  app.get("/api/green-investments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { riskLevel } = req.query;
      const investments = await storage.getGreenInvestments(riskLevel as string | undefined);
      res.status(200).json(investments);
    } catch (error) {
      console.error("Error fetching green investments:", error);
      res.status(500).json({ message: "Failed to fetch green investments" });
    }
  });

  // Create green investment (for admin purposes)
  app.post("/api/green-investments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertGreenInvestmentSchema.parse(req.body);
      const investment = await storage.createGreenInvestment(validatedData);
      res.status(201).json(investment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: `Validation error: ${error.message}` });
      }
      console.error("Error creating green investment:", error);
      res.status(500).json({ message: "Failed to create green investment" });
    }
  });

  // Make an investment
  app.post("/api/investments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertInvestmentSchema.parse(req.body);
      
      // Ensure user has a profile
      const profile = await storage.getInvestmentProfile(userId);
      if (!profile) {
        return res.status(400).json({ message: "Investment profile required before investing" });
      }
      
      // Create the investment
      const investment = await storage.createInvestment({
        ...validatedData,
        userId,
        profileId: profile.id
      });
      
      // Update profile's current value
      const totalValue = await storage.getTotalInvestmentValue(userId);
      await storage.updateInvestmentProfile(userId, { currentValue: totalValue });
      
      res.status(201).json(investment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: `Validation error: ${error.message}` });
      }
      console.error("Error creating investment:", error);
      res.status(500).json({ message: "Failed to create investment" });
    }
  });

  // Get user's investments
  app.get("/api/investments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { type } = req.query;
      
      let investments;
      if (type) {
        investments = await storage.getInvestmentsByType(userId, type as string);
      } else {
        investments = await storage.getInvestments(userId);
      }
      
      res.status(200).json(investments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      res.status(500).json({ message: "Failed to fetch investments" });
    }
  });

  // Get investment news and recommendations using Gemini API
  app.get("/api/investment-news", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { riskLevel } = req.query;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ message: "Gemini API key not configured" });
      }
      
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Generate sustainable investment recommendations based on risk level
      const riskLevelParam = riskLevel || "medium";
      const prompt = `Provide 3 current investment opportunities in sustainable or environmentally-friendly companies or green bonds that match a ${riskLevelParam} risk profile. For each, include: 
      1. Name of company/fund/bond 
      2. Environmental sector (e.g., renewable energy, conservation) 
      3. Current price range 
      4. Risk level (low, medium, high) 
      5. Potential annual return percentage 
      6. Brief explanation of environmental impact
      7. Recent news or developments affecting this investment
      
      Format as JSON with the following structure:
      {
        "investments": [
          {
            "name": "",
            "sector": "",
            "priceRange": "",
            "riskLevel": "",
            "returnPercentage": "",
            "environmentalImpact": "",
            "recentNews": ""
          }
        ]
      }`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const textResult = response.text();
      
      // Parse the JSON from the text response
      const jsonMatch = textResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ message: "Failed to parse investment recommendations" });
      }
      
      const investmentData = JSON.parse(jsonMatch[0]);
      res.status(200).json(investmentData);
    } catch (error) {
      console.error("Error fetching investment news:", error);
      res.status(500).json({ message: "Failed to fetch investment recommendations" });
    }
  });

  // Register Plaid routes
  app.use('/api/plaid', plaidRouter);

  // Check for Plaid environment variables
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    console.warn("Warning: Plaid credentials not configured. Bank connection feature will not work properly.");
  }

  const httpServer = createServer(app);
  return httpServer;
}
