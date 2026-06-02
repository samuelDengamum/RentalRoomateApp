/**
 * One-time utility: promote an existing user to admin by email.
 *
 * Usage:
 *   npx ts-node src/scripts/makeAdmin.ts you@example.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User';

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Usage: npx ts-node src/scripts/makeAdmin.ts <email>');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-roommate';

(async () => {
  await mongoose.connect(MONGODB_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`${email} is already an admin.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  user.role = 'admin';
  user.banned = false;
  await user.save();

  console.log(`✓ ${user.firstName} ${user.lastName} (${email}) has been promoted to admin.`);
  await mongoose.disconnect();
  process.exit(0);
})();
