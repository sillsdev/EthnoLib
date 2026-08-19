# Migrations

SQL that changes the deployed database, applied with `npx supabase db push`
against the linked project. One file per change, named the way the CLI requires:
a 14-digit timestamp, then a name.

Anything here is also folded back into
[`supporting-data/sql/create-tables.sql`](../../supporting-data/sql/create-tables.sql),
which is what a new database is built from. A migration is how an existing
database catches up; it is not the description of the schema.

`supporting-data/sql/` still holds the files that were applied before this
directory existed — `002-approved-sources.sql`, `003-opentype-features.sql` and
`create-tables.sql` — by pasting them into the Supabase SQL editor. They are
left where they are because they have already run everywhere they need to, and
because `db push` would try to apply `create-tables.sql` to a database that
already has those tables. New SQL goes here.
