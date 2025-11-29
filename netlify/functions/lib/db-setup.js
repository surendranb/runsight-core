// netlify/functions/lib/db-setup.js
const fs = require('fs/promises');
const path = require('path');

// A simple flag to prevent this from running multiple times in a single invocation
let hasSchemaBeenChecked = false;

/**
 * Checks if the required 'runs' table exists. If not, it reads all .sql files
 * from the migrations directory, sorts them, and executes them against the database.
 * @param {SupabaseClient} supabase - The Supabase admin client.
 */
async function ensureSchemaIsReady(supabase) {
  if (hasSchemaBeenChecked) {
    console.log('[db-setup] Schema check already performed in this invocation. Skipping.');
    return;
  }

  console.log('[db-setup] Checking if database schema is initialized...');

  try {
    // Check for the existence of a key table, e.g., 'runs'
    const { data, error } = await supabase
      .from('runs')
      .select('id')
      .limit(1);

    // If there's an error and it's because the table doesn't exist (42P01), we need to set it up.
    if (error && error.code === '42P01') {
      console.log('[db-setup] "runs" table not found. Initializing database schema from migration files...');
      
      // Construct the path to the migrations directory
      // Netlify functions run from /var/task/ so we need to go up to the repo root
      const migrationsDir = path.join(__dirname, '../../../../supabase/migrations');
      
      console.log(`[db-setup] Reading migration files from: ${migrationsDir}`);
      
      const files = await fs.readdir(migrationsDir);
      
      const sqlFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort alphabetically/chronologically
      
      if (sqlFiles.length === 0) {
        throw new Error('No .sql migration files found in the supabase/migrations directory.');
      }

      console.log(`[db-setup] Found ${sqlFiles.length} migration files to execute.`);

      // Execute each migration file in order
      for (const file of sqlFiles) {
        console.log(`[db-setup] Executing migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sqlContent = await fs.readFile(filePath, 'utf8');

        // Execute the entire SQL file content as an RPC call
        // This is safer than splitting by ';' which can fail on complex functions or comments.
        // We will create a helper function in a new migration to execute raw SQL.
        // For now, let's assume we can run it directly.
        // NOTE: supabase-js v2 doesn't have a direct `supabase.query()` or `supabase.raw()`.
        // A common workaround is to create a plpgsql function in Supabase that takes SQL as a string.
        // We will create this function in a new migration, then call it here.
        // Let's call a hypothetical 'execute_sql' function.
        const { error: rpcError } = await supabase.rpc('execute_sql', { sql_string: sqlContent });

        if (rpcError) {
          console.error(`[db-setup] Error executing migration file ${file}:`, rpcError);
          throw new Error(`Failed to execute migration ${file}: ${rpcError.message}`);
        }
        console.log(`[db-setup] Successfully executed ${file}.`);
      }

      console.log('[db-setup] Database schema initialized successfully.');
      hasSchemaBeenChecked = true;

    } else if (error) {
      // Another type of error occurred when checking for the table
      console.error('[db-setup] Error checking for "runs" table:', error);
      throw error; // Propagate other errors
    } else {
      // No error, table exists.
      console.log('[db-setup] Database schema is already initialized.');
      hasSchemaBeenChecked = true;
    }

  } catch (err) {
    console.error('[db-setup] Failed to ensure database schema is ready:', err);
    // Re-throw the error to be caught by the calling function
    throw err;
  }
}

module.exports = { ensureSchemaIsReady };
