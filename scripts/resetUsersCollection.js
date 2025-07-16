const mongoose = require('mongoose');
const config = require('../config/config');

async function resetUsersCollection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Drop the users collection
    await mongoose.connection.collection('users').drop();
    console.log('Successfully dropped users collection');

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    if (error.code === 26) {
      console.log('Collection does not exist, which is fine');
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Run the script
resetUsersCollection(); 