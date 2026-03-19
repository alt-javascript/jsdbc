# @alt-javascript/jsdbc-mysql

JSDBC driver for MySQL and MariaDB via [mysql2](https://github.com/sidorares/node-mysql2). Pure JavaScript, no native dependencies.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-mysql
```

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-mysql'; // self-registers with DriverManager

const ds = new DataSource({
  url: 'jsdbc:mysql://localhost:3306/mydb',
  username: 'myuser',
  password: 'mypass',
});

const conn = await ds.getConnection();
const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
ps.setParameter(1, 42);
const rs = await ps.executeQuery();
console.log(rs.getRows());
rs.close();
await conn.close();
```

## URL Scheme

```
jsdbc:mysql://<host>:<port>/<database>
```

mysql2 uses `?` placeholders natively — no conversion needed.

## Compatibility

Works with MySQL 5.7+, MySQL 8.x, and MariaDB 10.x+.

## License

MIT
