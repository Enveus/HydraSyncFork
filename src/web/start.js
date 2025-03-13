// Start script for HydraSync UI
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { startServer } from './server.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we should open the browser
const shouldOpenBrowser = !process.argv.includes('--no-browser');

// Start the server
console.log('Starting HydraSync UI server...');
const { server } = startServer();

// Open the browser
const openBrowser = () => {
    const url = 'http://localhost:3000';
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
            console.error(`Failed to open browser: ${error}`);
            console.log(`Please open ${url} in your browser manually.`);
        }
    });
};

// Wait for server to start before opening browser
if (shouldOpenBrowser) {
    setTimeout(openBrowser, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
    server.close();
    process.exit();
});

// Export the server for use in other modules
export default server;
