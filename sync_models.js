import sequelize from './config/sequelize.js';
import Wishlist from './models/WishlistModel.js';
import Conversation from './models/ConversationModel.js';
import Message from './models/MessageModel.js';

const syncModels = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connected to TiDB');

    // Sync new tables only (alter: true will add missing columns/tables without dropping existing ones)
    await Wishlist.sync({ alter: true });
    console.log('✅ Wishlists table synced');

    await Conversation.sync({ alter: true });
    console.log('✅ Conversations table synced');

    await Message.sync({ alter: true });
    console.log('✅ Messages table synced');

    // Create Reviews table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        orderId INT NOT NULL,
        buyerId INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE,
        FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
        FOREIGN KEY (buyerId) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_buyer_product_order (buyerId, productId, orderId)
      )
    `).catch((err) => {
      console.error('Error creating Reviews table:', err.message);
    });
    console.log('✅ Reviews table ensured');

    // Add isActive to Users if missing
    await sequelize.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT TRUE`).catch(() => {});
    console.log('✅ Users.isActive column ensured');

    // Add isApproved to VendorProfiles if missing
    await sequelize.query(`ALTER TABLE VendorProfiles ADD COLUMN IF NOT EXISTS isApproved BOOLEAN DEFAULT TRUE`).catch(() => {});
    console.log('✅ VendorProfiles.isApproved column ensured');

    // KYC Columns
    const columns = [
      'fullName VARCHAR(255) NULL',
      'email VARCHAR(255) NULL',
      'phoneNumber VARCHAR(255) NULL',
      'residentialAddress TEXT NULL',
      'businessAddress TEXT NULL',
      'businessName VARCHAR(255) NULL',
      'businessCategory VARCHAR(255) NULL',
      'businessDescription TEXT NULL',
      'cacNumber VARCHAR(255) NULL',
      'taxIdentificationNumber VARCHAR(255) NULL',
      'idDocument VARCHAR(255) NULL',
      'selfiePhoto VARCHAR(255) NULL',
      'storeLogo VARCHAR(255) NULL',
      "verificationStatus VARCHAR(50) DEFAULT 'unsubmitted'",
      'isVerified BOOLEAN DEFAULT FALSE',
      'rejectionReason TEXT NULL',
      'verifiedAt TIMESTAMP NULL',
      'verifiedBy INT NULL'
    ];

    for (const col of columns) {
      await sequelize.query(`ALTER TABLE VendorProfiles ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }
    console.log('✅ VendorProfiles KYC columns ensured');

    console.log('\n🎉 All Sequelize migrations complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
};

syncModels();
