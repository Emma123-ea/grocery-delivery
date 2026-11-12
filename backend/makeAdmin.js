const { query, pool } = require('./db');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.log('Usage: node makeAdmin.js user@example.com');
    return;
  }

  const result = await query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
  console.log(result.rowCount ? `${email} is now an admin` : 'No user with that email');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());