import axios from 'axios';
import { NextFunction, Request, Response } from 'express';

// API key for Google Gemini
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDP5xs9wfpIj1xqh8ABXDzaarwXMapZIDA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

/**
 * Find environmentally sustainable alternatives for a product
 * @param productQuery User's product search query
 * @returns Information about sustainable product alternatives
 */
export async function findSustainableAlternative(productQuery: string) {
  try {
    // Create the prompt for Gemini
    const prompt = `
      I'm looking for an environmentally sustainable alternative for: ${productQuery}

      Please respond with a JSON object only (no explanation text) that includes:
      1. The name of the most sustainable option you can find
      2. A brief description of why it's sustainable (under 100 words)
      3. An estimated price range
      4. A direct purchase URL
      5. An environmental rating from 1-10

      Format the response as valid JSON like this:
      {
          "product_name": "Sustainable Product Name",
          "description": "Brief description of why it's sustainable...",
          "price_range": "$XX - $XX",
          "purchase_url": "https://example.com/product",
          "eco_rating": 8.5
      }
    `;

    // Call Gemini API
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      }
    );

    // Extract response text
    let resultText = response.data.candidates[0].content.parts[0].text.trim();
    
    // Handle potential JSON formatting in code blocks
    if (resultText.includes("```json")) {
      resultText = resultText.split("```json")[1].split("```")[0].trim();
    } else if (resultText.includes("```")) {
      resultText = resultText.split("```")[1].split("```")[0].trim();
    }

    // Parse JSON response
    const result = JSON.parse(resultText);
    
    // Add search query to result
    return {
      ...result,
      query: productQuery
    };
    
  } catch (error) {
    // Return error information
    return {
      error: `Error finding sustainable alternative: ${error instanceof Error ? error.message : String(error)}`,
      query: productQuery
    };
  }
}

/**
 * Express middleware to handle eco-search requests
 */
export function ecoSearchHandler(req: Request, res: Response, next: NextFunction) {
  const productQuery = req.query.query as string;
  
  if (!productQuery) {
    return res.status(400).json({ error: "Search query is required" });
  }
  
  findSustainableAlternative(productQuery)
    .then(result => res.json(result))
    .catch(error => {
      console.error("Eco-search error:", error);
      res.status(500).json({ 
        error: `Error searching for alternatives: ${error instanceof Error ? error.message : String(error)}` 
      });
    });
}