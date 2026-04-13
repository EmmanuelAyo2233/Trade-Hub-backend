DROP TABLE IF EXISTS Disputes;
DROP TABLE IF EXISTS OrderItems;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS BuyerProfiles;
DROP TABLE IF EXISTS VendorProfiles;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('buyer', 'vendor', 'admin') DEFAULT 'buyer',
    walletBalance DECIMAL(10, 2) DEFAULT 0.00,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE BuyerProfiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    avatar VARCHAR(255),
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE VendorProfiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    storeName VARCHAR(255),
    storeSlug VARCHAR(255) UNIQUE,
    storeDescription TEXT,
    location VARCHAR(255),
    avatar VARCHAR(255),
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendorId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    image VARCHAR(255),
    category VARCHAR(255),
    countInStock INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendorId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyerId INT NOT NULL,
    vendorId INT NOT NULL,
    paymentMethod VARCHAR(255) NOT NULL DEFAULT 'Paystack',
    paymentResultId VARCHAR(255),
    paymentResultStatus VARCHAR(255),
    paymentResultUpdateTime VARCHAR(255),
    paymentResultEmailAddress VARCHAR(255),
    itemsPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    shippingPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    totalPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    isPaid BOOLEAN NOT NULL DEFAULT FALSE,
    paidAt TIMESTAMP NULL,
    isShipped BOOLEAN NOT NULL DEFAULT FALSE,
    shippedAt TIMESTAMP NULL,
    isDelivered BOOLEAN NOT NULL DEFAULT FALSE,
    deliveredAt TIMESTAMP NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'disputed') DEFAULT 'pending',
    shippingAddress TEXT NOT NULL,
    shippingCity VARCHAR(255) NOT NULL,
    shippingPostalCode VARCHAR(255),
    shippingCountry VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyerId) REFERENCES Users(id),
    FOREIGN KEY (vendorId) REFERENCES Users(id)
);

CREATE TABLE OrderItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    productId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    qty INT NOT NULL,
    image VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Products(id)
);

CREATE TABLE Disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    buyerId INT NOT NULL,
    vendorId INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('open', 'resolved_buyer', 'resolved_vendor') DEFAULT 'open',
    resolutionNotes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (buyerId) REFERENCES Users(id),
    FOREIGN KEY (vendorId) REFERENCES Users(id)
);
