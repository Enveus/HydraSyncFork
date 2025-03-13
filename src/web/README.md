# HydraSync UI

A web-based user interface for configuring and managing the HydraSync Discord bot.

## Overview

The HydraSync UI provides a visual interface for configuring role synchronization between Discord servers. It allows you to:

1. Select the synchronization mode (Main → Many or Many to Main)
2. Choose the main server and synced servers
3. Select which roles to synchronize
4. Save the configuration

## Features

- **Mode Selection**: Choose between "Main → Many" or "Many to Main" synchronization modes
- **Server Selection**: Select the main server and add multiple synced servers
- **Role Management**: Add specific roles to synchronize for each server
- **Configuration Saving**: Save your configuration for the bot to use

## Getting Started

### Prerequisites

- Node.js v16.x or later
- HydraSync bot properly set up and running

### Installation

The UI is included as part of the HydraSync bot. No separate installation is required.

### Running the UI

To start the UI, run:

```bash
npm run ui
```

This will start the web server and automatically open the UI in your default browser.

If you only want to start the server without opening the browser:

```bash
npm run ui:server
```

Then manually navigate to `http://localhost:3000` in your browser.

## Usage

1. **Select Mode**: Choose between "Main → Many" or "Many to Main" from the dropdown at the top.

2. **Configure Main Server**:
   - Click "Select Server" to choose your main server
   - Add roles to synchronize by clicking the "Add Role" button

3. **Configure Synced Servers**:
   - Click "Add Synced Server" to add a server to synchronize with
   - Select the server from the list
   - Add roles to synchronize by clicking the "Add Role" button
   - Add multiple synced servers as needed

4. **Save Configuration**:
   - Click "Save Configuration" to save your settings
   - The bot will use this configuration for role synchronization

## Development

### Project Structure

```
src/web/
├── public/           # Static files
│   └── index.html    # Main HTML file
├── css/              # Stylesheets
│   └── styles.css    # Main CSS file
├── js/               # JavaScript files
│   ├── app.js        # Main application logic
│   └── api.js        # API communication module
├── server.js         # Express server
└── start.js          # Server startup script
```

### Mock Data

The UI currently uses mock data for development purposes. In a production environment, it would connect to the Discord bot's API to fetch real servers and roles.

### Future Improvements

- Real-time synchronization status
- Role mapping for different role names
- Selective role synchronization options
- User authentication and authorization
- Audit logging of configuration changes
