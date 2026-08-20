import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const sqlite = (database, input) => spawnSync("sqlite3", [database], {
  input,
  encoding: "utf8",
});

const normalizeMigration = (sql) => sql.replaceAll("--> statement-breakpoint", "\n");

async function migratedDatabase(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "maestro-stage1-db-"));
  const database = path.join(directory, "commerce.sqlite");
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of ["0000_product_catalog.sql", "0001_premium_rocket_raccoon.sql", "0002_absurd_meggan.sql"]) {
    const sql = normalizeMigration(await readFile(path.join(root, "drizzle", file), "utf8"));
    const result = sqlite(database, `.bail on\nPRAGMA foreign_keys=ON;\n${sql}`);
    assert.equal(result.status, 0, result.stderr);
  }
  return database;
}

const fixtures = `
PRAGMA foreign_keys=ON;
INSERT INTO products (id,name,short_name,sku,slug,category,main_photo_url,description,features_json,bundle_json,status,created_at,updated_at)
VALUES ('p','P','P','P','p','T','/p.png','P','[]','[]','active','now','now');
INSERT INTO product_variants (id,product_id,name,sku,photo_url,stock_quantity,reserved_quantity,reorder_point,status,created_at,updated_at)
VALUES ('v','p','V','V','/p.png',1,0,0,'active','now','now');
`;

const orderInsert = (id) => `INSERT INTO orders (
id,public_token,idempotency_key,payload_hash,customer_name,customer_phone,customer_city,customer_comment,
fulfilment_method,payment_method,subtotal_kzt,discount_kzt,total_kzt,currency,status,is_test,created_at,updated_at)
VALUES ('${id}','token-${id}','key-${id}','hash-${id}','T','+77000000000','A','','pickup','Kaspi',100,0,100,'KZT','awaiting_payment',1,'now','now');`;

test("Integration DB: migration is additive and guarded reservation prevents oversell", async (t) => {
  const database = await migratedDatabase(t);
  const guardedReservation = (reservationId, orderId, quantity) => `
INSERT INTO stock_reservations (id,order_id,variant_id,variant_sku,quantity,status,expires_at,created_at,updated_at)
VALUES ('${reservationId}','${orderId}','v','V',(
  SELECT CASE WHEN stock_quantity - reserved_quantity >= ${quantity} THEN ${quantity} ELSE NULL END
  FROM product_variants WHERE id='v' AND sku='V'
),'reserved','later','now','now');
UPDATE product_variants SET reserved_quantity=reserved_quantity+${quantity} WHERE id='v' AND sku='V';`;
  let result = sqlite(database, `.bail on\n${fixtures}\nBEGIN IMMEDIATE;\n${orderInsert("o1")}\n${guardedReservation("r1", "o1", 1)}\nCOMMIT;`);
  assert.equal(result.status, 0, result.stderr);
  result = sqlite(database, `.bail on\nPRAGMA foreign_keys=ON;\nBEGIN IMMEDIATE;\n${orderInsert("o2")}\n${guardedReservation("r2", "o2", 1)}\nCOMMIT;`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NOT NULL constraint failed: stock_reservations.quantity/);
  const counts = sqlite(database, "SELECT reserved_quantity FROM product_variants WHERE id='v'; SELECT count(*) FROM stock_reservations WHERE status='reserved';");
  assert.equal(counts.stdout.trim(), "1\n1");
});

test("Integration DB: failed transactional create leaves no partial order or reservation", async (t) => {
  const database = await migratedDatabase(t);
  const result = sqlite(database, `.bail on\nPRAGMA foreign_keys=ON;\n${fixtures}\nBEGIN IMMEDIATE;\n${orderInsert("rollback")}\nINSERT INTO stock_reservations (id,order_id,variant_id,variant_sku,quantity,status,expires_at,created_at,updated_at) VALUES ('rollback-r','rollback','v','V',(SELECT CASE WHEN stock_quantity-reserved_quantity >= 2 THEN 2 ELSE NULL END FROM product_variants WHERE id='v' AND sku='V'),'reserved','later','now','now');\nUPDATE product_variants SET reserved_quantity=reserved_quantity+2 WHERE id='v';\nCOMMIT;`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NOT NULL constraint failed: stock_reservations.quantity/);
  const counts = sqlite(database, "SELECT count(*) FROM orders; SELECT count(*) FROM stock_reservations; SELECT reserved_quantity FROM product_variants WHERE id='v';");
  assert.equal(counts.stdout.trim(), "0\n0\n0");
});
