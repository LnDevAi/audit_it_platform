#!/usr/bin/env node

/**
 * Simple migrate script: synchronizes all Sequelize models with the database.
 * - Uses alter in non-destructive mode by default
 * - Use FORCE=true to drop and recreate tables (dangerous)
 */

/* eslint-disable no-console */
const { sequelize } = require('../models');

const force = process.env.FORCE === 'true';

async function run() {
  try {
    console.log(`➡️  Running migrations (force=${force}, alter=${!force})...`);
    await sequelize.sync({ force, alter: !force });
    console.log('✅ Database synchronized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();

