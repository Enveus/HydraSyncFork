#!/usr/bin/env node

/**
 * SyncBot CLI
 * 
 * This script provides a command-line interface for SyncBot.
 * It allows users to start the bot in regular or reverse mode,
 * and register commands locally or globally.
 */

import { startBot } from '../src/index.js';
import { colorLog } from '../src/utils/logging.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();
const options = args.slice(1);

// Parse UI options
const uiOptions = {
  startUi: options.includes('--ui'),
  uiPort: options.includes('--ui-port') ? parseInt(options[options.indexOf('--ui-port') + 1]) : 3000,
  openBrowser: options.includes('--open-browser')
};

// Display help message
const showHelp = () => {
  console.log(`
SyncBot CLI

Usage:
  syncbot <command> [options]

Commands:
  start           Start the bot in regular mode (main → synced)
  start-reverse   Start the bot in reverse mode (synced → main)
  register        Register commands for the main server
  register-global Register commands globally
  ui              Start the UI server only (without the bot)

Options:
  --debug         Enable debug mode
  --help          Show this help message
  --ui            Start the UI dashboard with the bot
  --ui-port       Specify the port for the UI dashboard (default: 3000)
  --open-browser  Open the UI dashboard in the default browser

Examples:
  syncbot start
  syncbot start-reverse --debug
  syncbot start --ui --open-browser
  syncbot start --ui --ui-port 8080
  syncbot register
  syncbot register-global
  syncbot ui
  `);
};

// Main function
const main = async () => {
  // Show help if requested or no command provided
  if (!command || options.includes('--help')) {
    showHelp();
    return;
  }

  // Set debug mode
  const isDebug = options.includes('--debug');
  if (isDebug) {
    process.argv.push('debug');
  }

  // Execute the requested command
  switch (command) {
    case 'start':
      colorLog('info', '🤖 Starting SyncBot in Regular Mode (Main → Synced)');
      if (uiOptions.startUi) {
        colorLog('info', `🌐 Starting UI dashboard on port ${uiOptions.uiPort}`);
        if (uiOptions.openBrowser) {
          colorLog('info', '🌐 Opening UI dashboard in browser');
        }
      }
      await startBot(false, false, false, uiOptions);
      break;

    case 'start-reverse':
      colorLog('info', '🤖 Starting SyncBot in Reverse Mode (Synced → Main)');
      if (uiOptions.startUi) {
        colorLog('info', `🌐 Starting UI dashboard on port ${uiOptions.uiPort}`);
        if (uiOptions.openBrowser) {
          colorLog('info', '🌐 Opening UI dashboard in browser');
        }
      }
      await startBot(true, false, false, uiOptions);
      break;

    case 'register':
      colorLog('info', '🤖 Registering commands for main server');
      await startBot(false, true, false, uiOptions);
      break;

    case 'register-global':
      colorLog('info', '🤖 Registering commands globally');
      await startBot(false, true, true, uiOptions);
      break;
      
    case 'ui':
      colorLog('info', `🌐 Starting UI dashboard on port ${uiOptions.uiPort}`);
      // Import and start the UI server directly
      const { startServer } = await import('../src/web/server.js');
      startServer(uiOptions.uiPort);
      if (uiOptions.openBrowser) {
        colorLog('info', '🌐 Opening UI dashboard in browser');
        const { exec } = await import('child_process');
        const url = `http://localhost:${uiOptions.uiPort}`;
        let command;
        
        switch (process.platform) {
          case 'darwin': // macOS
            command = `open ${url}`;
            break;
          case 'win32': // Windows
            command = `start ${url}`;
            break;
          default: // Linux and others
            command = `xdg-open ${url}`;
            break;
        }
        
        exec(command, (error) => {
          if (error) {
            colorLog('error', `Failed to open browser: ${error.message}`);
            colorLog('info', `Please open ${url} in your browser manually.`);
          }
        });
      }
      break;

    default:
      colorLog('error', `Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
};

// Run the CLI
main().catch(error => {
  colorLog('error', 'An error occurred:');
  console.error(error);
  process.exit(1);
});
