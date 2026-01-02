# Migrations: Usage Guide

This directory contains migration scripts for managing the MongoDB database schema using [migrate-mongo](https://github.com/seppevs/migrate-mongo).

## Core Commands

All commands are to be run from the `backend` directory.

### 1. Project Initialization (Already Completed)

The initial setup step (already done for this repo) generates the `migrations` directory and the `migrate-mongo-config.js` file:

```sh
npx migrate-mongo init
```

Initialization creates the `migrations` directory and config files.
**Already set up in this repo.**

### 2. Creating a New Migration

Creates a new migration file with a timestamp and specified name.

```sh
npx migrate-mongo create <migration-name>
```

_Example:_

```sh
npx migrate-mongo create add-Active-to-exercises
```

### 3. Running Migrations

Applies all pending migrations to the database.

```sh
npx migrate-mongo up
```

### 4. Rolling Back (Reverting) the Last Migration

Reverts the last applied migration.

```sh
npx migrate-mongo down
```

### 5. Viewing Migration Status

Shows which migrations have been run and which are pending.

```sh
npx migrate-mongo status
```

## Configuration

- All configuration is in `backend/migrate-mongo-config.js`
- Environment variables for the database are loaded from `.env.local` or as specified.

## Migrations Location

- All migration scripts are in this `backend/migrations/` folder.
- Files follow the format: `YYYYMMDDHHmmss-description.js`

## Writing a Migration

Each migration file exports two async functions:

- `up(db, client)`: Perform changes.
- `down(db, client)`: Undo changes.

_See existing migrations for reference._

## Notes

- Only **JavaScript** `.js` files are supported for migrations (see `migrationFileExtension` in config).
- Make sure your database connection info (`DB_URL` and `DB_NAME`) is set in `.env.local`.

For more, see the [migrate-mongo docs](https://github.com/seppevs/migrate-mongo/blob/master/README.md).
