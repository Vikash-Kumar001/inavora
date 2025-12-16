/**
 * Migration script to fix institution users who have 'pro' plan instead of 'institution' plan
 * 
 * Usage: node backend/scripts/fixInstitutionUsersPlans.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { fixInstitutionUsersPlans } = require('../src/services/institutionPlanService');
const Logger = require('../src/utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    Logger.info('MongoDB connected successfully');
  } catch (error) {
    Logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const runMigration = async () => {
  try {
    await connectDB();
    
    Logger.info('Starting migration to fix institution users plans...');
    
    const result = await fixInstitutionUsersPlans();
    
    if (result.success) {
      Logger.info(`Migration completed successfully. Fixed ${result.fixedCount} users.`);
      console.log(`\n✅ Migration completed successfully!`);
      console.log(`   Fixed ${result.fixedCount} institution users`);
      console.log(`   User IDs: ${result.userIds.join(', ')}\n`);
    } else {
      Logger.error('Migration failed:', result.error);
      console.error(`\n❌ Migration failed: ${result.error}\n`);
      process.exit(1);
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    Logger.error('Migration error:', error);
    console.error(`\n❌ Migration error: ${error.message}\n`);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runMigration();

