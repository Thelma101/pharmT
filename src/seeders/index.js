require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Drug = require('../models/Drug');
const connectDB = require('../config/database');

// Sample data
const seedData = {
  users: [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@pharmacy.com',
      password: 'Admin123!',
      phone: '+1-555-0101',
      address: {
        street: '123 Admin Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      role: 'admin',
      isEmailVerified: true
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'User123!',
      phone: '+1-555-0102',
      address: {
        street: '456 Customer Lane',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA'
      },
      role: 'user',
      isEmailVerified: true
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      password: 'User123!',
      phone: '+1-555-0103',
      address: {
        street: '789 Main Street',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      },
      role: 'user',
      isEmailVerified: true
    }
  ],

  categories: [
    {
      name: 'Pain Relief',
      description: 'Medications for pain management and relief',
    },
    {
      name: 'Antibiotics',
      description: 'Prescription antibiotics for bacterial infections',
    },
    {
      name: 'Vitamins & Supplements',
      description: 'Essential vitamins and dietary supplements',
    },
    {
      name: 'Heart & Blood Pressure',
      description: 'Medications for cardiovascular health',
    },
    {
      name: 'Diabetes Care',
      description: 'Medications and supplies for diabetes management',
    },
    {
      name: 'Respiratory Health',
      description: 'Medications for asthma, allergies, and respiratory conditions',
    },
    {
      name: 'Skin Care',
      description: 'Topical medications and skin care products',
    },
    {
      name: 'Mental Health',
      description: 'Medications for mental health conditions',
    }
  ],

  drugs: [
    // Pain Relief
    {
      name: 'Ibuprofen 200mg',
      genericName: 'Ibuprofen',
      brand: 'Advil',
      description: 'Nonsteroidal anti-inflammatory drug (NSAID) used to reduce fever and treat pain or inflammation.',
      price: 12.99,
      comparePrice: 15.99,
      dosage: { strength: 200, unit: 'mg' },
      form: 'tablet',
      manufacturer: 'Pfizer',
      stock: { quantity: 150, minStock: 20, maxStock: 500 },
      prescriptionRequired: false,
      schedule: 'OTC',
      expiryDate: new Date('2025-12-31'),
      manufactureDate: new Date('2023-06-15'),
      batchNumber: 'IBU2024001',
      activeIngredients: [{ name: 'Ibuprofen', concentration: '200mg' }],
      indications: ['Pain relief', 'Fever reduction', 'Inflammation'],
      sideEffects: ['Stomach upset', 'Nausea', 'Dizziness'],
      isFeatured: true
    },
    {
      name: 'Acetaminophen 500mg',
      genericName: 'Acetaminophen',
      brand: 'Tylenol',
      description: 'Pain reliever and fever reducer commonly used for headaches, muscle aches, and arthritis.',
      price: 9.99,
      comparePrice: 12.99,
      dosage: { strength: 500, unit: 'mg' },
      form: 'tablet',
      manufacturer: 'Johnson & Johnson',
      stock: { quantity: 200, minStock: 25, maxStock: 600 },
      prescriptionRequired: false,
      schedule: 'OTC',
      expiryDate: new Date('2025-10-31'),
      manufactureDate: new Date('2023-05-20'),
      batchNumber: 'ACE2024002',
      activeIngredients: [{ name: 'Acetaminophen', concentration: '500mg' }],
      indications: ['Pain relief', 'Fever reduction'],
      sideEffects: ['Rare allergic reactions'],
      isFeatured: true
    },

    // Antibiotics
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      brand: 'Amoxil',
      description: 'Penicillin antibiotic used to treat bacterial infections.',
      price: 24.99,
      comparePrice: 29.99,
      dosage: { strength: 500, unit: 'mg' },
      form: 'capsule',
      manufacturer: 'GlaxoSmithKline',
      stock: { quantity: 80, minStock: 15, maxStock: 300 },
      prescriptionRequired: true,
      schedule: 'II',
      expiryDate: new Date('2025-08-31'),
      manufactureDate: new Date('2023-04-10'),
      batchNumber: 'AMX2024003',
      activeIngredients: [{ name: 'Amoxicillin', concentration: '500mg' }],
      indications: ['Bacterial infections', 'Respiratory tract infections'],
      sideEffects: ['Nausea', 'Diarrhea', 'Allergic reactions'],
      warnings: ['Allergic to penicillin']
    },

    // Vitamins & Supplements
    {
      name: 'Vitamin D3 1000 IU',
      genericName: 'Cholecalciferol',
      brand: 'Nature Made',
      description: 'Essential vitamin for bone health and immune system support.',
      price: 16.99,
      comparePrice: 19.99,
      dosage: { strength: 1000, unit: 'IU' },
      form: 'tablet',
      manufacturer: 'Nature Made',
      stock: { quantity: 120, minStock: 30, maxStock: 400 },
      prescriptionRequired: false,
      schedule: 'OTC',
      expiryDate: new Date('2026-03-31'),
      manufactureDate: new Date('2023-08-01'),
      batchNumber: 'VD32024004',
      activeIngredients: [{ name: 'Cholecalciferol', concentration: '1000 IU' }],
      indications: ['Bone health', 'Immune support', 'Vitamin D deficiency'],
      sideEffects: ['Rare side effects when taken as directed'],
      isFeatured: true
    },
    {
      name: 'Multivitamin Complete',
      genericName: 'Multivitamin',
      brand: 'Centrum',
      description: 'Complete multivitamin and multimineral supplement for daily nutritional support.',
      price: 22.99,
      comparePrice: 26.99,
      dosage: { strength: 1, unit: 'tablet' },
      form: 'tablet',
      manufacturer: 'Pfizer',
      stock: { quantity: 95, minStock: 20, maxStock: 350 },
      prescriptionRequired: false,
      schedule: 'OTC',
      expiryDate: new Date('2025-11-30'),
      manufactureDate: new Date('2023-07-15'),
      batchNumber: 'MV2024005',
      activeIngredients: [
        { name: 'Vitamin A', concentration: '3000 mcg' },
        { name: 'Vitamin C', concentration: '90 mg' },
        { name: 'Vitamin D', concentration: '20 mcg' }
      ],
      indications: ['Daily nutrition', 'General health support'],
      sideEffects: ['Mild stomach upset if taken on empty stomach']
    },

    // Heart & Blood Pressure
    {
      name: 'Lisinopril 10mg',
      genericName: 'Lisinopril',
      brand: 'Prinivil',
      description: 'ACE inhibitor used to treat high blood pressure and heart failure.',
      price: 18.99,
      comparePrice: 23.99,
      dosage: { strength: 10, unit: 'mg' },
      form: 'tablet',
      manufacturer: 'Merck',
      stock: { quantity: 60, minStock: 10, maxStock: 200 },
      prescriptionRequired: true,
      schedule: 'III',
      expiryDate: new Date('2025-09-30'),
      manufactureDate: new Date('2023-03-20'),
      batchNumber: 'LIS2024006',
      activeIngredients: [{ name: 'Lisinopril', concentration: '10mg' }],
      indications: ['High blood pressure', 'Heart failure'],
      sideEffects: ['Dry cough', 'Dizziness', 'Fatigue'],
      warnings: ['Monitor blood pressure regularly']
    },

    // Diabetes Care
    {
      name: 'Metformin 500mg',
      genericName: 'Metformin HCl',
      brand: 'Glucophage',
      description: 'First-line medication for type 2 diabetes management.',
      price: 14.99,
      comparePrice: 18.99,
      dosage: { strength: 500, unit: 'mg' },
      form: 'tablet',
      manufacturer: 'Bristol Myers Squibb',
      stock: { quantity: 100, minStock: 20, maxStock: 400 },
      prescriptionRequired: true,
      schedule: 'III',
      expiryDate: new Date('2025-07-31'),
      manufactureDate: new Date('2023-02-10'),
      batchNumber: 'MET2024007',
      activeIngredients: [{ name: 'Metformin HCl', concentration: '500mg' }],
      indications: ['Type 2 diabetes', 'Blood sugar control'],
      sideEffects: ['Nausea', 'Diarrhea', 'Metallic taste'],
      isFeatured: true
    },

    // Respiratory Health
    {
      name: 'Albuterol Inhaler',
      genericName: 'Albuterol Sulfate',
      brand: 'ProAir HFA',
      description: 'Bronchodilator used to treat asthma and other breathing conditions.',
      price: 45.99,
      comparePrice: 52.99,
      dosage: { strength: 90, unit: 'mcg' },
      form: 'inhaler',
      manufacturer: 'Teva',
      stock: { quantity: 35, minStock: 8, maxStock: 150 },
      prescriptionRequired: true,
      schedule: 'III',
      expiryDate: new Date('2025-05-31'),
      manufactureDate: new Date('2023-01-15'),
      batchNumber: 'ALB2024008',
      activeIngredients: [{ name: 'Albuterol Sulfate', concentration: '90mcg/actuation' }],
      indications: ['Asthma', 'Bronchospasm', 'COPD'],
      sideEffects: ['Nervousness', 'Shakiness', 'Headache']
    },

    // Skin Care
    {
      name: 'Hydrocortisone Cream 1%',
      genericName: 'Hydrocortisone',
      brand: 'Cortaid',
      description: 'Topical corticosteroid for treating skin inflammation and itching.',
      price: 8.99,
      comparePrice: 11.99,
      dosage: { strength: 1, unit: '%' },
      form: 'cream',
      manufacturer: 'Johnson & Johnson',
      stock: { quantity: 75, minStock: 15, maxStock: 250 },
      prescriptionRequired: false,
      schedule: 'OTC',
      expiryDate: new Date('2025-12-31'),
      manufactureDate: new Date('2023-09-05'),
      batchNumber: 'HYD2024009',
      activeIngredients: [{ name: 'Hydrocortisone', concentration: '1%' }],
      indications: ['Skin inflammation', 'Itching', 'Eczema'],
      sideEffects: ['Skin irritation', 'Burning sensation'],
      storageInstructions: 'Store at room temperature, avoid freezing'
    }
  ]
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Drug.deleteMany({})
    ]);

    // Seed users
    console.log('👥 Seeding users...');
    const hashedUsers = await Promise.all(
      seedData.users.map(async (user) => {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return { ...user, password: hashedPassword };
      })
    );
    const users = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${users.length} users`);

    // Seed categories
    console.log('📂 Seeding categories...');
    const categories = await Category.insertMany(seedData.categories);
    console.log(`✅ Created ${categories.length} categories`);

    // Add category IDs to drugs
    console.log('💊 Seeding drugs...');
    const categoryMap = {
      'Pain Relief': categories.find(c => c.name === 'Pain Relief')._id,
      'Antibiotics': categories.find(c => c.name === 'Antibiotics')._id,
      'Vitamins & Supplements': categories.find(c => c.name === 'Vitamins & Supplements')._id,
      'Heart & Blood Pressure': categories.find(c => c.name === 'Heart & Blood Pressure')._id,
      'Diabetes Care': categories.find(c => c.name === 'Diabetes Care')._id,
      'Respiratory Health': categories.find(c => c.name === 'Respiratory Health')._id,
      'Skin Care': categories.find(c => c.name === 'Skin Care')._id
    };

    const drugsWithCategories = seedData.drugs.map((drug, index) => {
      const categoryNames = Object.keys(categoryMap);
      let categoryName;
      
      if (index < 2) categoryName = 'Pain Relief';
      else if (index < 3) categoryName = 'Antibiotics';
      else if (index < 5) categoryName = 'Vitamins & Supplements';
      else if (index < 6) categoryName = 'Heart & Blood Pressure';
      else if (index < 7) categoryName = 'Diabetes Care';
      else if (index < 8) categoryName = 'Respiratory Health';
      else categoryName = 'Skin Care';

      return {
        ...drug,
        category: categoryMap[categoryName]
      };
    });

    const drugs = await Drug.insertMany(drugsWithCategories);
    console.log(`✅ Created ${drugs.length} drugs`);

    // Update category drug counts
    console.log('🔢 Updating category drug counts...');
    for (const category of categories) {
      const drugCount = await Drug.countDocuments({ category: category._id });
      category.drugCount = drugCount;
      await category.save();
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Seeding Summary:
👥 Users: ${users.length}
📂 Categories: ${categories.length}
💊 Drugs: ${drugs.length}

🔐 Test Accounts:
📧 Admin: admin@pharmacy.com (Password: Admin123!)
📧 User 1: john.doe@example.com (Password: User123!)
📧 User 2: jane.smith@example.com (Password: User123!)
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;