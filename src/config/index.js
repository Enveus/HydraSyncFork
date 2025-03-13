/**
 * Configuration module
 * Provides access to both static and merged configurations
 */

import { verifyConfig, verifyBotInServers } from './validation.js';
import mergedConfig, { 
  loadUiConfig, 
  validateUiConfig, 
  convertUiConfigFormat, 
  mergeConfigurations 
} from './merged-config.js';

// Export both the static config and the merged config
export { 
  mergedConfig as config, // Merged config from both config.json and ui-config.json
  verifyConfig, 
  verifyBotInServers,
  loadUiConfig,
  validateUiConfig,
  convertUiConfigFormat,
  mergeConfigurations
};

// Export the merged config as default
export default mergedConfig;
