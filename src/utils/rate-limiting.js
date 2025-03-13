/**
 * Utility functions for handling rate limits
 */

import { colorLog } from './logging.js';

/**
 * Handles rate limits by implementing exponential backoff
 * @param {Function} fn - The function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<any>} - Result of the function
 */
export const withRateLimitHandling = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error
      if (error.httpStatus === 429 && retries < maxRetries) {
        retries++;
        colorLog('warning', `Rate limited. Retrying in ${delay}ms (Attempt ${retries}/${maxRetries})`);
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff
        delay *= 2;
      } else {
        // Not a rate limit error or max retries reached
        throw error;
      }
    }
  }
};
