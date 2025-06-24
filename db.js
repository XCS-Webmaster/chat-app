const knex = require("knex")({
  client: "sqlite3",
  connection: { filename: "./chat.sqlite" },
  useNullAsDefault: true,
});

async function init() {
  const exists = await knex.schema.hasTable("messages");
  if (!exists) {
    await knex.schema.createTable("messages", (t) => {
      t.increments("id").primary();
      t.string("sender");
      t.string("receiver").nullable();
      t.text("message").nullable();
      t.text("file").nullable();
      t.timestamp("timestamp").defaultTo(knex.fn.now());
    });
  }
}

module.exports = { knex, init };
