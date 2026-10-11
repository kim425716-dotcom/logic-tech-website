/**
 * Application Entry Point for cPanel / Phusion Passenger / PM2
 * 
 * cPanel's "Setup Node.js App" defaults to searching for app.js in the application root.
 * This file delegates to the full Express server in backend/server.js.
 */
require('./backend/server.js');
