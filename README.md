# EcoFinance - Sustainable Finance Tracker

A comprehensive web application designed to transform personal financial behavior into meaningful environmental impact through intelligent analysis, real-time tracking, and AI-powered sustainability insights.

## Core Features

- **Authentication System**: Secure user registration and login
- **Transaction Analysis**: Upload and analyze credit card transactions
- **Sustainability Scoring**: Calculate eco-scores for purchases with detailed metrics
- **Category Breakdowns**: Visualize spending patterns by category
- **Recommendations**: Get personalized suggestions for sustainable alternatives
- **Eco-Search**: Find eco-friendly alternatives to products using Google's Generative AI
- **Cashback Rewards**: Earn cashback based on sustainability scores
- **Green Investments**: Invest rewards in sustainable companies and green bonds
- **Risk Assessment**: Personalized investment recommendations based on risk profile
- **Responsive Design**: Optimized for mobile, tablet, and desktop

## Technology Stack

### Frontend
- React with TypeScript
- TanStack Query for data fetching
- @nivo/pie and Recharts for data visualization
- Shadcn UI components with Radix UI primitives
- Tailwind CSS for styling

### Backend
- Express.js server with Node.js
- Passport.js for authentication
- Session management with MemoryStore
- Google Generative AI integration
- In-memory data storage

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components organized by feature
│   │   │   ├── cashback/      # Cashback rewards components
│   │   │   ├── dashboard/     # Dashboard visualization components
│   │   │   ├── investments/   # Investment platform components
│   │   │   ├── layout/        # Layout and navigation components
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   └── ...
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main application component
│
├── server/               # Node.js backend
│   ├── utils/            # Utility functions
│   │   ├── csvParser.ts         # CSV parsing logic
│   │   ├── ecoSearch.ts         # Google AI integration
│   │   └── sustainabilityCalculator.ts  # Eco-score calculation
│   ├── auth.ts           # Authentication logic
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Data storage
│   └── index.ts          # Server entry point
│
└── shared/               # Shared code between frontend and backend
    └── schema.ts         # Data models and validation
```

## Getting Started

### Running the Application
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
# or
./start.sh
```

## Usage

1. Register a new account or log in
2. Upload a CSV file of your credit card transactions
   - Required columns: date, merchant, category, amount
3. View your sustainability score and spending analysis on the Dashboard
4. Explore detailed transaction history in the Transactions section
5. Get personalized recommendations to improve your sustainability
6. Search for eco-friendly product alternatives with EcoSearch
7. Earn and redeem cashback rewards based on your eco-score
8. Complete a risk assessment and invest in sustainable options

## Environment Variables

- `GEMINI_API_KEY`: Required for Google Generative AI integration
- `SESSION_SECRET`: Secret for session encryption (auto-generated for development)

## New Features

### Cashback Rewards
- Dynamic cashback based on eco-friendliness score
- Higher eco-scores earn larger multipliers (up to 3x for excellent scores)
- Clear visual indicators of eco-score impact on rewards

### Green Investment Platform
- Risk assessment survey to determine user's risk profile
- AI-powered recommendations for sustainable investments
- Green bond and eco-friendly company investment options
- Portfolio tracking and management