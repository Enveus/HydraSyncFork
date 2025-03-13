/**
 * Event handlers index
 */

import { setupCommonEvents } from './common.js';
import { setupRegularModeEvents } from './regular-mode.js';
import { setupReverseModeEvents } from './reverse-mode.js';

/**
 * Sets up all event handlers for the bot
 * @param {Object} client - Discord client
 * @param {Object} state - Bot state
 * @param {boolean} isReverseMode - Whether the bot is in reverse mode
 */
export const setupEventHandlers = (client, state, isReverseMode) => {
  // Set up common event handlers
  setupCommonEvents(client, state, isReverseMode);
  
  // Set up mode-specific event handlers
  if (isReverseMode) {
    setupReverseModeEvents(client, state);
  } else {
    setupRegularModeEvents(client, state);
  }
};
