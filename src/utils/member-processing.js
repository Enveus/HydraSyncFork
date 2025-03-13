/**
 * Utility functions for processing Discord server members
 */

/**
 * Processes members in batches to improve performance and avoid rate limits
 * @param {Object} interaction - The interaction from discord command message
 * @param {Function} action - The function to call with each member
 * @param {Function} callback - The function to execute after all members have been processed
 * @param {any} options - Any options that need to be passed through to the action or callback
 * @param {number} batchSize - Number of members to process in each batch (default: 20)
 */
export const iterateThroughMembers = async (interaction, action, callback, options, batchSize = 20) => {
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
