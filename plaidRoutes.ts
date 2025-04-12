import { Request, Response, Router } from 'express';
import { 
  CountryCode, 
  Products, 
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  AccountsGetRequest,
  TransactionsGetRequest
} from 'plaid';
import { plaidClient, setAccessToken, setItemId, accessToken } from './plaidClient';
import { processTransactions } from './sustainabilityCalculator';
import { storage } from '../storage';

const plaidRouter = Router();

// Create a link token
plaidRouter.post('/create_link_token', async (req: Request, res: Response) => {
  try {
    // Get the client_user_id from authenticated user
    const userId = req.user?.id || 'user-123'; // Fallback for testing
    
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId.toString(),
      },
      client_name: 'EcoFinance App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };
    
    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: createTokenResponse.data.link_token });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exchange public token for access token
plaidRouter.post('/exchange_public_token', async (req: Request, res: Response) => {
  try {
    const { public_token } = req.body;
    
    const exchangeRequest: ItemPublicTokenExchangeRequest = {
      public_token,
    };
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest);
    const accessTokenValue = exchangeResponse.data.access_token;
    const itemIdValue = exchangeResponse.data.item_id;
    
    // Store the access token and item ID
    setAccessToken(accessTokenValue);
    setItemId(itemIdValue);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get accounts
plaidRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }
    
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };
    
    const accountsResponse = await plaidClient.accountsGet(request);
    res.json(accountsResponse.data);
  } catch (error: any) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transactions
plaidRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }
    
    const now = new Date();
    const start_date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end_date = now.toISOString().split('T')[0];
    
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date,
      end_date,
      options: {
        count: 100,
        offset: 0,
      },
    };
    
    const transactionsResponse = await plaidClient.transactionsGet(request);
    const transactions = transactionsResponse.data.transactions;
    
    // If user is authenticated, also process transactions for sustainability metrics
    if (req.isAuthenticated() && req.user?.id) {
      const userId = req.user.id;
      
      // Convert Plaid transactions to our CSV format for existing processor
      const csvRows = transactions.map(tx => ({
        date: tx.date,
        merchant: tx.merchant_name || tx.name,
        category: tx.category ? tx.category[0] : 'Unknown',
        amount: tx.amount.toString()
      }));
      
      // Process transactions using our existing sustainability calculator
      const { 
        transactions: processedTransactions, 
        sustainabilityScore, 
        categoryBreakdowns 
      } = processTransactions(csvRows, userId);
      
      // Store the processed data
      await storage.createTransactions(processedTransactions);
      await storage.createSustainabilityScore(sustainabilityScore);
      await storage.createCategoryBreakdowns(categoryBreakdowns);
    }
    
    res.json(transactionsResponse.data);
  } catch (error: any) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default plaidRouter;