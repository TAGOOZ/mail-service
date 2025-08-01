import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { Mailbox } from '../models/Mailbox';
import { Mail } from '../models/Mail';

export interface Migration {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration tracking collection
const MigrationSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
});

const MigrationModel = mongoose.model('Migration', MigrationSchema);

// Define migrations
const migrations: Migration[] = [
  {
    version: '001',
    description: 'Create initial indexes for Mailbox and Mail collections',
    up: async () => {
      logger.info('Creating indexes for Mailbox collection...');

      // Ensure indexes for Mailbox collection
      await Mailbox.collection.createIndex({ address: 1 }, { unique: true });
      await Mailbox.collection.createIndex({ token: 1 }, { unique: true });
      await Mailbox.collection.createIndex({ expiresAt: 1, isActive: 1 });
      await Mailbox.collection.createIndex({ token: 1, isActive: 1 });
      await Mailbox.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      logger.info('Creating indexes for Mail collection...');

      // Ensure indexes for Mail collection
      await Mail.collection.createIndex({ mailboxId: 1 });
      await Mail.collection.createIndex({ mailboxId: 1, receivedAt: -1 });
      await Mail.collection.createIndex({ mailboxId: 1, isRead: 1 });
      await Mail.collection.createIndex({
        subject: 'text',
        textContent: 'text',
        from: 'text',
      });

      logger.info('Initial indexes created successfully');
    },
    down: async () => {
      logger.info('Dropping indexes...');

      // Drop custom indexes (keep default _id index)
      const mailboxIndexes = await Mailbox.collection.listIndexes().toArray();
      for (const index of mailboxIndexes) {
        if (index.name !== '_id_') {
          await Mailbox.collection.dropIndex(index.name);
        }
      }

      const mailIndexes = await Mail.collection.listIndexes().toArray();
      for (const index of mailIndexes) {
        if (index.name !== '_id_') {
          await Mail.collection.dropIndex(index.name);
        }
      }

      logger.info('Indexes dropped successfully');
    },
  },
  {
    version: '002',
    description: 'Add validation rules and constraints',
    up: async () => {
      logger.info('Adding validation rules...');

      // Add validation for mailbox addresses
      await mongoose.connection.db.command({
        collMod: 'mailboxes',
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['address', 'token', 'expiresAt'],
            properties: {
              address: {
                bsonType: 'string',
                pattern: '^[a-zA-Z0-9._%+-]+@nnu\\.edu\\.kg$',
              },
              token: {
                bsonType: 'string',
                minLength: 10,
              },
              extensionCount: {
                bsonType: 'int',
                minimum: 0,
                maximum: 2,
              },
              isActive: {
                bsonType: 'bool',
              },
            },
          },
        },
        validationLevel: 'moderate',
        validationAction: 'error',
      });

      logger.info('Validation rules added successfully');
    },
    down: async () => {
      logger.info('Removing validation rules...');

      await mongoose.connection.db.command({
        collMod: 'mailboxes',
        validator: {},
        validationLevel: 'off',
      });

      logger.info('Validation rules removed successfully');
    },
  },
];

export class MigrationRunner {
  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');

      // Get applied migrations
      const appliedMigrations = await MigrationModel.find({}).sort({
        version: 1,
      });
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));

      // Find pending migrations
      const pendingMigrations = migrations.filter(
        m => !appliedVersions.has(m.version)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Run pending migrations
      for (const migration of pendingMigrations) {
        logger.info(
          `Running migration ${migration.version}: ${migration.description}`
        );

        try {
          await migration.up();

          // Record migration as applied
          await MigrationModel.create({
            version: migration.version,
            description: migration.description,
          });

          logger.info(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          logger.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  static async rollbackLastMigration(): Promise<void> {
    try {
      logger.info('Rolling back last migration...');

      // Get the last applied migration
      const lastMigration = await MigrationModel.findOne({}).sort({
        appliedAt: -1,
      });

      if (!lastMigration) {
        logger.info('No migrations to rollback');
        return;
      }

      // Find the migration definition
      const migrationDef = migrations.find(
        m => m.version === lastMigration.version
      );

      if (!migrationDef) {
        throw new Error(
          `Migration definition not found for version ${lastMigration.version}`
        );
      }

      logger.info(
        `Rolling back migration ${migrationDef.version}: ${migrationDef.description}`
      );

      // Run the down migration
      await migrationDef.down();

      // Remove migration record
      await MigrationModel.deleteOne({ version: lastMigration.version });

      logger.info(`Migration ${migrationDef.version} rolled back successfully`);
    } catch (error) {
      logger.error('Migration rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<{
    applied: Array<{ version: string; description: string; appliedAt: Date }>;
    pending: Array<{ version: string; description: string }>;
  }> {
    const appliedMigrations = await MigrationModel.find({}).sort({
      version: 1,
    });
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    const applied = appliedMigrations.map(m => ({
      version: m.version,
      description: m.description,
      appliedAt: m.appliedAt,
    }));

    const pending = migrations
      .filter(m => !appliedVersions.has(m.version))
      .map(m => ({
        version: m.version,
        description: m.description,
      }));

    return { applied, pending };
  }
}
