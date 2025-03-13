/**
 * Processes members in batches to improve performance and avoid rate limits
 * @param {Object} interaction - The interaction from discord command message
 * @param {Function} action - The function to call with each member
 * @param {Function} callback - The function to execute after all members have been processed
 * @param {any} options - Any options that need to be passed through to the action or callback
 * @param {number} batchSize - Number of members to process in each batch (default: 20)
 */
export let iterateThroughMembers = async (interaction, action, callback, options, batchSize = 20) => {
  let data = { membersAnalyzed: 0, membersWithDifferences: [], errors: [] };
  let startTime = Date.now();
  
  try {
    // Send initial response for long operations
    if (interaction.guild.memberCount > 100) {
      await interaction.editReply({
        content: `Processing ${interaction.guild.memberCount} members. This may take some time...`,
      });
    }

    const members = await interaction.guild.members.fetch();
    const membersArray = Array.from(members.values());
    const totalMembers = membersArray.length;
    let processedCount = 0;
    
    // Process members in batches
    for (let i = 0; i < totalMembers; i += batchSize) {
      const batch = membersArray.slice(i, i + batchSize);
      
      // Process each member in the current batch
      for (const member of batch) {
        try {
          if (member.manageable && !member.user.bot) {
            data = await action(member, interaction, data, options);
          } else {
            let error = `Unable to apply action: ${action.name || 'unknown'} to ${member.user.username}`;

            if (!member.manageable) {
              error += ". Member is not manageable.";
            }

            if (member.user.bot) {
              error += ". Member is a bot.";
            }

            console.log(error);
            data.errors.push(error);
          }
        } catch (memberError) {
          const errorMsg = `Error processing member ${member.user.username}: ${memberError.message}`;
          console.error(errorMsg, memberError);
          data.errors.push(errorMsg);
        }
        
        processedCount++;
      }
      
      // Update progress every batch
      if (totalMembers > 100 && i % (batchSize * 5) === 0 && i > 0) {
        const progress = Math.floor((processedCount / totalMembers) * 100);
        await interaction.editReply({
          content: `Progress: ${progress}% (${processedCount}/${totalMembers} members processed)`,
        });
      }
      
      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < totalMembers) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Processed ${totalMembers} members in ${executionTime} seconds`);
    
    // Call the callback with the collected data
    await callback(interaction, data, options);
    
  } catch (error) {
    console.error('Error in iterateThroughMembers:', error);
    data.errors.push(`General error: ${error.message}`);
    
    try {
      await callback(interaction, data, options);
    } catch (callbackError) {
      console.error('Error in callback:', callbackError);
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: 'An error occurred while processing members. Check the logs for details.',
          ephemeral: true
        });
      }
    }
  }
};

/**
 * Logs a message with color coding based on severity
 * @param {string} color - The severity level ('error', 'warning', 'info', 'success', 'debug')
 * @param {string} message - The message to log
 * @param {Error} [error] - Optional error object for additional details
 */
export let colorLog = (color, message, error = null) => {
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
export let logToDiscord = async (client, message, level = 'info', config, error = null) => {
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

/**
 * Handles rate limits by implementing exponential backoff
 * @param {Function} fn - The function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<any>} - Result of the function
 */
export let withRateLimitHandling = async (fn, maxRetries = 3, initialDelay = 1000) => {
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
