/**
 * Utility functions for logging
 */

/**
 * Logs a message with color coding based on severity
 * @param {string} color - The severity level ('error', 'warning', 'info', 'success', 'debug')
 * @param {string} message - The message to log
 * @param {Error} [error] - Optional error object for additional details
 */
export const colorLog = (color, message, error = null) => {
  const timestamp = new Date().toISOString();
  let colorCode;
  
  // Color codes
  switch (color) {
    case 'error':
      colorCode = '\x1b[91m'; // Red
      break;
    case 'warning':
      colorCode = '\x1b[93m'; // Yellow
      break;
    case 'info':
      colorCode = '\x1b[94m'; // Blue
      break;
    case 'success':
      colorCode = '\x1b[92m'; // Green
      break;
    case 'debug':
      colorCode = '\x1b[95m'; // Magenta
      break;
    default:
      colorCode = '\x1b[0m'; // Default
  }
  
  // Log the message with timestamp
  console.log(`${colorCode}[${timestamp}] ${message}\x1b[0m`);
  
  // Log additional error details if provided
  if (error) {
    console.error(`${colorCode}Error details:\x1b[0m`, error);
  }
};

/**
 * Logs a message to both console and Discord log channel
 * @param {Object} client - Discord.js client
 * @param {string} message - Message to log
 * @param {string} level - Log level ('error', 'warning', 'info', 'success', 'debug')
 * @param {Object} config - Bot configuration
 * @param {Error} [error] - Optional error object
 */
export const logToDiscord = async (client, message, level = 'info', config, error = null) => {
  // Log to console first
  colorLog(level, message, error);
  
  // Skip Discord logging if no log channel is configured
  if (!config.logChannelId) return;
  
  try {
    const mainServer = await client.guilds.fetch(config.mainServer);
    const logChannel = await mainServer.channels.fetch(config.logChannelId);
    
    // Format the message with emoji based on level
    let emoji = '📝';
    switch (level) {
      case 'error':
        emoji = '❌';
        break;
      case 'warning':
        emoji = '⚠️';
        break;
      case 'info':
        emoji = 'ℹ️';
        break;
      case 'success':
        emoji = '✅';
        break;
      case 'debug':
        emoji = '🔍';
        break;
    }
    
    // Send the message to Discord
    await logChannel.send(`${emoji} **${level.toUpperCase()}**: ${message}`);
    
    // If there's an error, send the details
    if (error && level === 'error') {
      await logChannel.send(`\`\`\`\nError: ${error.message}\nStack: ${error.stack}\n\`\`\``);
    }
  } catch (err) {
    // If Discord logging fails, just log to console
    colorLog('error', `Failed to log to Discord: ${err.message}`, err);
  }
};
