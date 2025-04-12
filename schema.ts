import { pgTable, text, serial, integer, timestamp, real, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  ecoScore: integer("eco_score").notNull(),
  hasAlternatives: boolean("has_alternatives").notNull().default(false),
  userId: integer("user_id").references(() => users.id)
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Sustainability score schema
export const sustainabilityScores = pgTable("sustainability_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  overallScore: integer("overall_score").notNull(),
  carbonFootprint: real("carbon_footprint").notNull(),
  sustainablePurchases: integer("sustainable_purchases").notNull(),
  waterUsage: real("water_usage").notNull(),
  date: timestamp("date").notNull(),
});

export const insertSustainabilityScoreSchema = createInsertSchema(sustainabilityScores).omit({
  id: true,
});

export type InsertSustainabilityScore = z.infer<typeof insertSustainabilityScoreSchema>;
export type SustainabilityScore = typeof sustainabilityScores.$inferSelect;

// Category breakdown schema
export const categoryBreakdowns = pgTable("category_breakdowns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  ecoScore: integer("eco_score").notNull(),
});

export const insertCategoryBreakdownSchema = createInsertSchema(categoryBreakdowns).omit({
  id: true,
});

export type InsertCategoryBreakdown = z.infer<typeof insertCategoryBreakdownSchema>;
export type CategoryBreakdown = typeof categoryBreakdowns.$inferSelect;

// Recommendation schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  potentialImpact: text("potential_impact").notNull(),
  category: text("category").notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// CSV upload schema
export const csvUploadSchema = z.object({
  date: z.string(),
  merchant: z.string(),
  category: z.string(),
  amount: z.string()
});

export type CSVRow = z.infer<typeof csvUploadSchema>;

// Cashback rewards schema
export const cashbackRewards = pgTable("cashback_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  ecoScore: integer("eco_score").notNull(),
  amount: real("amount").notNull(),
  redeemed: boolean("redeemed").notNull().default(false),
  invested: boolean("invested").notNull().default(false),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertCashbackRewardSchema = createInsertSchema(cashbackRewards).omit({
  id: true,
});

export type InsertCashbackReward = z.infer<typeof insertCashbackRewardSchema>;
export type CashbackReward = typeof cashbackRewards.$inferSelect;

// Investment profile schema
export const investmentProfiles = pgTable("investment_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique(),
  riskLevel: text("risk_level").notNull(), // low, medium, high
  initialInvestment: real("initial_investment").notNull().default(0),
  currentValue: real("current_value").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvestmentProfileSchema = createInsertSchema(investmentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvestmentProfile = z.infer<typeof insertInvestmentProfileSchema>;
export type InvestmentProfile = typeof investmentProfiles.$inferSelect;

// Investments schema
export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  profileId: integer("profile_id").references(() => investmentProfiles.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // green_bond, eco_stock, sustainable_fund
  amount: real("amount").notNull(),
  purchaseValue: real("purchase_value").notNull(),
  currentValue: real("current_value").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  esgRating: text("esg_rating").notNull(),
  description: text("description").notNull(),
  performanceData: json("performance_data").$type<number[]>(),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  lastUpdated: true,
});

export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

// Green investment recommendations schema
export const greenInvestments = pgTable("green_investments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // green_bond, eco_stock, sustainable_fund
  description: text("description").notNull(),
  minInvestment: real("min_investment").notNull(),
  projectedReturn: real("projected_return").notNull(), // annual percentage
  riskLevel: text("risk_level").notNull(), // low, medium, high
  esgRating: text("esg_rating").notNull(),
  company: text("company").notNull(),
  sector: text("sector").notNull(),
  logoUrl: text("logo_url"),
  performanceHistory: json("performance_history").$type<number[]>(),
});

export const insertGreenInvestmentSchema = createInsertSchema(greenInvestments).omit({
  id: true,
});

export type InsertGreenInvestment = z.infer<typeof insertGreenInvestmentSchema>;
export type GreenInvestment = typeof greenInvestments.$inferSelect;

// Risk assessment survey schema
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique(),
  ageGroup: text("age_group").notNull(),
  investmentTimeframe: text("investment_timeframe").notNull(),
  riskTolerance: integer("risk_tolerance").notNull(), // 1-10 scale
  financialGoals: text("financial_goals").notNull(),
  existingInvestments: boolean("existing_investments").notNull(),
  incomeLevel: text("income_level").notNull(),
  savingsPercentage: integer("savings_percentage").notNull(),
  environmentalPriority: integer("environmental_priority").notNull(), // 1-10 scale
  recommendedRiskLevel: text("recommended_risk_level").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
  id: true,
  recommendedRiskLevel: true,
  date: true,
});

export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
