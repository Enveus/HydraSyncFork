/**
 * Utility functions for role management
 */

import { withRateLimitHandling } from './rate-limiting.js';

/**
 * Creates a role cache object for performance optimization
 * @returns {Object} Cache object
 */
export const createRoleCache = () => {
  return {
    roles: new Map(),
    roleExpiry: 60000, // Role cache expiry time in ms (1 minute)
    clearCache: function() {
      this.roles.clear();
      console.log('Cache cleared');
    }
  };
};

/**
 * Throttles updates to prevent duplicate operations
 * @param {Object} state - State object containing triggeredByIntention
 */
export const throttleUpdate = (state) => {
  if (!state.triggeredByIntention) return;
  
  setTimeout(() => {
    state.triggeredByIntention = false;
  }, 2000);
};

/**
 * Logs debug messages if debug mode is enabled
 * @param {string} message - Message to log
 * @param {boolean} isDebug - Whether debug mode is enabled
 */
export const debugLog = (message, isDebug) => {
  if (isDebug) {
    console.log(message);
  }
};

/**
 * Gets or fetches roles for a guild with caching
 * @param {Object} guild - Discord guild
 * @param {Object} cache - Role cache object
 * @param {boolean} isDebug - Whether debug mode is enabled
 * @returns {Promise<Collection>} Collection of roles
 */
export const getGuildRoles = async (guild, cache, isDebug) => {
  if (cache.roles.has(guild.id) && (Date.now() - cache.roles.get(guild.id).timestamp < cache.roleExpiry)) {
    debugLog(`Using cached roles for ${guild.name}`, isDebug);
    return cache.roles.get(guild.id).roles;
  } else {
    const roles = await guild.roles.fetch();
    cache.roles.set(guild.id, { roles, timestamp: Date.now() });
    debugLog(`Fetched and cached roles for ${guild.name}`, isDebug);
    return roles;
  }
};

/**
 * Adds a role to a member with rate limit handling
 * @param {Object} member - Discord member
 * @param {Object} role - Discord role
 * @returns {Promise<void>}
 */
export const addRoleToMember = async (member, role) => {
  await withRateLimitHandling(async () => {
    await member.roles.add(role);
  });
};

/**
 * Removes a role from a member with rate limit handling
 * @param {Object} member - Discord member
 * @param {Object} role - Discord role
 * @returns {Promise<void>}
 */
export const removeRoleFromMember = async (member, role) => {
  await withRateLimitHandling(async () => {
    await member.roles.remove(role);
  });
};
