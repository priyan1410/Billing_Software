/**
 * Kish Mandhi — Mobile Web App API Bridge Server
 * Light-weight HTTP server that connects directly to Aiven Cloud MySQL via mysql2
 * and serves live data (orders, expenses, tokens, menu_items, categories) to the mobile web app.
 */

const http = require('http');
const mysql = require('mysql2/promise');
const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-DB-Host, X-DB-Port, X-DB-User, X-DB-Pass, X-DB-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse Database credentials strictly from headers (NO FALLBACK DEFAULTS)
  const dbHost = req.headers['x-db-host'];
  const dbPort = req.headers['x-db-port'] ? Number(req.headers['x-db-port']) : null;
  const dbUser = req.headers['x-db-user'];
  const dbPass = req.headers['x-db-pass'];
  const dbName = req.headers['x-db-name'];

  if (!dbHost || !dbPort || !dbUser || dbPass === undefined || !dbName) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: false, 
      message: 'No Database Connection. Please enter and connect database credentials in Step 1 first.' 
    }));
    return;
  }

  try {
    const isRemote = dbHost !== 'localhost' && dbHost !== '127.0.0.1';
    const connOpts = {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      connectTimeout: 8000
    };
    if (isRemote) {
      connOpts.ssl = { rejectUnauthorized: false };
    }

    const conn = await mysql.createConnection(connOpts);

    if (req.url === '/api/test' || req.url === '/api/test/') {
      const [rows] = await conn.query('SELECT 1 as connected');
      await conn.end();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Cloud Database Connected Successfully!' }));
      return;
    }

    // POST /api/login - Resilient verification against users table
    if (req.url === '/api/login' && req.method === 'POST') {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(bodyData);
          const identifier = (payload.emailOrPhone || payload.email || payload.username || '').trim();
          const password = (payload.password || '').trim();

          if (!identifier) {
            await conn.end();
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Please enter Name, Username, Email, or Phone number.' }));
            return;
          }

          // Check if users table exists
          const [tableRows] = await conn.query(`SHOW TABLES LIKE 'users'`).catch(() => [[]]);
          if (!Array.isArray(tableRows) || tableRows.length === 0) {
            await conn.end();
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              message: `Table 'users' does not exist in database '${dbName}'. Please verify database setup.` 
            }));
            return;
          }

          // Fetch all user records
          const [users] = await conn.query(`SELECT * FROM users`).catch((err) => {
            throw new Error('Failed to query users table: ' + err.message);
          });

          await conn.end();

          if (!Array.isArray(users) || users.length === 0) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              message: `Database table 'users' is empty. No registered users found in '${dbName}'.` 
            }));
            return;
          }

          // Helper to check if a row value matches the identifier
          const matchesIdentifier = (u) => {
            const idLower = identifier.toLowerCase();
            const fieldsToCheck = [u.username, u.name, u.email, u.phone, u.user, u.user_name, u.login, u.email_address, u.mobile];
            return fieldsToCheck.some(val => val !== undefined && val !== null && String(val).trim().toLowerCase() === idLower);
          };

          // Helper to check password
          const matchesPassword = (u) => {
            const passFields = [u.password, u.pass, u.user_password, u.pwd, u.pin];
            return passFields.some(val => val !== undefined && val !== null && String(val).trim() === password);
          };

          // Find candidate user matching identifier
          const candidateUser = users.find(matchesIdentifier);

          if (!candidateUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              message: `No user account matching '${identifier}' was found in database '${dbName}'.` 
            }));
            return;
          }

          if (matchesPassword(candidateUser)) {
            // Clean sensitive password properties
            const cleanUser = { ...candidateUser };
            delete cleanUser.password;
            delete cleanUser.pass;
            delete cleanUser.user_password;
            delete cleanUser.pwd;
            delete cleanUser.pin;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, user: cleanUser, message: 'Login successful!' }));
            return;
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              message: `Incorrect password entered for '${identifier}'.` 
            }));
            return;
          }
        } catch (e) {
          await conn.end();
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Database Login Error: ' + e.message }));
        }
      });
      return;
    }

    if (req.url === '/api/live-data' || req.url === '/api/live-data/') {
      const [ordersRows] = await conn.query('SELECT * FROM orders ORDER BY id DESC').catch(() => [[]]);
      const [expensesRows] = await conn.query('SELECT * FROM expenses ORDER BY id DESC').catch(() => [[]]);
      const [tokensRows] = await conn.query('SELECT * FROM tokens WHERE status = "Active" ORDER BY id DESC').catch(() => [[]]);
      const [categoriesRows] = await conn.query('SELECT * FROM categories ORDER BY id ASC').catch(() => [[]]);
      const [menuItemsRows] = await conn.query('SELECT * FROM menu_items ORDER BY id ASC').catch(() => [[]]);

      const formatRow = (row) => {
        const out = { ...row };
        if (out.created_at instanceof Date) out.created_at = out.created_at.toISOString();
        if (out.expense_date instanceof Date) out.expense_date = out.expense_date.toISOString().split('T')[0];
        return out;
      };

      const orders = Array.isArray(ordersRows) ? ordersRows.map(formatRow) : [];
      const expenses = Array.isArray(expensesRows) ? expensesRows.map(formatRow) : [];
      const tokens = Array.isArray(tokensRows) ? tokensRows.map(formatRow) : [];
      const categories = Array.isArray(categoriesRows) ? categoriesRows.map(formatRow) : [];
      const menuItems = Array.isArray(menuItemsRows) ? menuItemsRows.map(formatRow) : [];

      // Calculate physical database storage size
      let bytes = 0;
      let totalRecords = (orders.length + expenses.length + tokens.length + categories.length + menuItems.length);
      
      const [statusRows] = await conn.query(`SHOW TABLE STATUS FROM \`${dbName}\``).catch(() => [[]]);
      if (Array.isArray(statusRows)) {
        for (const row of statusRows) {
          bytes += Number(row.Data_length || 0) + Number(row.Index_length || 0) + Number(row.Data_free || 0);
        }
      }

      const sizeKb = (bytes / 1024).toFixed(1);
      const storageFormatted = bytes > 1048576 
        ? `${(bytes / 1048576).toFixed(2)} MB` 
        : `${sizeKb} KB`;

      await conn.end();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          orders,
          expenses,
          tokens,
          categories,
          menuItems,
          storage: `${storageFormatted} • ${totalRecords} Records (Cloud DB)`
        }
      }));
      return;
    }

    await conn.end();
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Endpoint not found.' }));

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Database Connection Error: ' + err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`✓ Mobile Companion API Bridge running on http://localhost:${PORT}`);
});
