import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Configure Plaid client based on environment
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Store the current access token and item ID
export let accessToken: string | null = null;
export let itemId: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const setItemId = (id: string) => {
  itemId = id;
};