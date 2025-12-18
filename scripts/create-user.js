require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const createUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test user
    const email = 'user@test.com';
    const password = 'password123';

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists!');
      console.log('Email:', email);
      console.log('Password:', password);
      process.exit(0);
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: 'Test User',
      email: email,
      phone: '1234567890',
      password: hashedPassword,
      role: 'user',
      isActive: true
    });

    console.log('\n✅ User created successfully!');
    console.log('------------------------');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createUser();
