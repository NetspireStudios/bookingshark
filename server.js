const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'service-app-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Create data directories if they don't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const clientsFile = path.join(dataDir, 'clients.txt');
const staffFile = path.join(dataDir, 'staff.txt');
const adminFile = path.join(dataDir, 'admin.txt');

// Initialize files if they don't exist
if (!fs.existsSync(clientsFile)) {
  fs.writeFileSync(clientsFile, '');
}
if (!fs.existsSync(staffFile)) {
  fs.writeFileSync(staffFile, '');
}
if (!fs.existsSync(adminFile)) {
  fs.writeFileSync(adminFile, 'admin|admin\n');
}

// Helper functions
function readUsers(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  if (!content.trim()) return [];
  return content.split('\n').filter(line => line.trim() !== '').map(line => {
    try {
      return JSON.parse(line);
    } catch {
      // Handle old format for admin
      const [email, password] = line.split('|');
      return { email, password };
    }
  });
}

function writeUser(filename, userData) {
  fs.appendFileSync(filename, JSON.stringify(userData) + '\n');
}

function userExists(filename, email) {
  const users = readUsers(filename);
  return users.some(user => user.email === email);
}

function validateUser(filename, email, password) {
  const users = readUsers(filename);
  const user = users.find(user => user.email === email && user.password === password);
  return user || null;
}

function updateUserPassword(filename, email, newPassword) {
  const users = readUsers(filename);
  const updatedUsers = users.map(user => {
    if (user.email === email) {
      return { ...user, password: newPassword };
    }
    return user;
  });
  fs.writeFileSync(filename, updatedUsers.map(u => JSON.stringify(u)).join('\n') + '\n');
}

// Bookings setup
const bookingsFile = path.join(dataDir, 'bookings.json');
if (!fs.existsSync(bookingsFile)) {
  fs.writeFileSync(bookingsFile, '[]');
}

// Services setup (new universal form builder)
const servicesFile = path.join(dataDir, 'services.json');
if (!fs.existsSync(servicesFile)) {
  const defaultServices = {
    activeServiceId: 'cleaning-1',
    services: [
      {
        id: 'cleaning-1',
        name: 'Cleaning Service',
        basePrice: 150,
        duration: 120,
        createdAt: new Date().toISOString(),
        formFields: [
          {
            id: 'rooms',
            label: 'Number of Bedrooms',
            fieldType: 'number',
            required: true,
            options: []
          },
          {
            id: 'bathrooms',
            label: 'Number of Bathrooms',
            fieldType: 'number',
            required: true,
            options: []
          },
          {
            id: 'sqft',
            label: 'Square Footage',
            fieldType: 'dropdown',
            required: true,
            options: ['500', '1000', '1500', '2000', '2500', '3000', '3500', '4000', '4500', '5000']
          }
        ],
        pricingRules: [
          {
            id: 'rule-rooms',
            fieldId: 'rooms',
            ruleType: 'multiply',
            value: 30
          },
          {
            id: 'rule-bathrooms',
            fieldId: 'bathrooms',
            ruleType: 'multiply',
            value: 35
          },
          {
            id: 'rule-sqft',
            fieldId: 'sqft',
            ruleType: 'conditional',
            value: 0,
            condition: { '500': 0, '1000': 60, '1500': 120, '2000': 180, '2500': 240, '3000': 300, '3500': 360, '4000': 420, '4500': 480, '5000': 540 }
          }
        ],
        extras: [
          {
            id: 'extra-pets',
            label: 'Pets in Home',
            price: 25
          },
          {
            id: 'extra-fridge',
            label: 'Clean Inside Fridge',
            price: 40
          },
          {
            id: 'extra-oven',
            label: 'Clean Inside Oven',
            price: 35
          },
          {
            id: 'extra-windows',
            label: 'Interior Windows',
            price: 50
          }
        ]
      }
    ]
  };
  fs.writeFileSync(servicesFile, JSON.stringify(defaultServices, null, 2));
}

// Notifications setup
const notificationsFile = path.join(dataDir, 'notifications.json');
if (!fs.existsSync(notificationsFile)) {
  fs.writeFileSync(notificationsFile, '[]');
}

// Booking helper functions
function readBookings() {
  try {
    const content = fs.readFileSync(bookingsFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
}

function createBooking(bookingData) {
  const bookings = readBookings();
  const newBooking = {
    id: Date.now().toString(),
    ...bookingData,
    status: 'pending',
    assignedTo: null,
    createdAt: new Date().toISOString()
  };
  bookings.push(newBooking);
  writeBookings(bookings);
  return newBooking;
}

function getBookingById(id) {
  const bookings = readBookings();
  return bookings.find(b => b.id === id);
}

function updateBooking(id, updates) {
  const bookings = readBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return null;
  bookings[index] = { ...bookings[index], ...updates, updatedAt: new Date().toISOString() };
  writeBookings(bookings);
  return bookings[index];
}

function deleteBooking(id) {
  const bookings = readBookings();
  const filtered = bookings.filter(b => b.id !== id);
  writeBookings(filtered);
  return filtered.length < bookings.length;
}

function assignBooking(id, staffEmail) {
  return updateBooking(id, { assignedTo: staffEmail, status: 'pending_acceptance' });
}

// Notification helper functions
function readNotifications() {
  try {
    const content = fs.readFileSync(notificationsFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeNotifications(notifications) {
  fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
}

function createNotification(userEmail, message, type, bookingId = null) {
  const notifications = readNotifications();
  const newNotification = {
    id: Date.now().toString(),
    userEmail,
    message,
    type,
    bookingId,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(newNotification);
  writeNotifications(notifications);
  return newNotification;
}

function markNotificationAsRead(notificationId, userEmail) {
  const notifications = readNotifications();
  const notification = notifications.find(n => n.id === notificationId && n.userEmail === userEmail);
  if (notification) {
    notification.read = true;
    writeNotifications(notifications);
    return true;
  }
  return false;
}

function getUserNotifications(userEmail) {
  const notifications = readNotifications();
  return notifications.filter(n => n.userEmail === userEmail).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// Services helper functions
function readServices() {
  try {
    const content = fs.readFileSync(servicesFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return { activeServiceId: null, services: [] };
  }
}

function writeServices(servicesData) {
  fs.writeFileSync(servicesFile, JSON.stringify(servicesData, null, 2));
}

function getActiveService() {
  const servicesData = readServices();
  return servicesData.services.find(s => s.id === servicesData.activeServiceId);
}

function getServiceById(serviceId) {
  const servicesData = readServices();
  return servicesData.services.find(s => s.id === serviceId);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Client registration
app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, phone, city, password } = req.body;
  
  if (!firstName || !lastName || !email || !phone || !city || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (userExists(clientsFile, email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  const clientData = {
    firstName,
    lastName,
    email,
    phone,
    city,
    password
  };
  
  writeUser(clientsFile, clientData);
  res.json({ success: true, message: 'Registration successful' });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Check admin first
  let user = validateUser(adminFile, email, password);
  if (user) {
    req.session.user = { ...user, userType: 'admin', password: undefined };
    return res.json({ success: true, redirectUrl: '/admin.html' });
  }
  
  // Check staff
  user = validateUser(staffFile, email, password);
  if (user) {
    req.session.user = { ...user, userType: 'staff', password: undefined };
    return res.json({ success: true, redirectUrl: '/staff.html' });
  }
  
  // Check clients
  user = validateUser(clientsFile, email, password);
  if (user) {
    req.session.user = { ...user, userType: 'client', password: undefined };
    return res.json({ success: true, redirectUrl: '/client.html' });
  }
  
  // No match found
  res.status(401).json({ error: 'Invalid credentials' });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check session
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Admin: Add staff
app.post('/api/admin/add-staff', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { firstName, lastName, email, phone, location, password } = req.body;
  
  if (!firstName || !lastName || !email || !phone || !location || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (userExists(staffFile, email)) {
    return res.status(400).json({ error: 'Staff member already exists' });
  }
  
  const staffData = {
    firstName,
    lastName,
    email,
    phone,
    location,
    password
  };
  
  writeUser(staffFile, staffData);
  res.json({ success: true, message: 'Staff member added successfully' });
});

// Admin: Get all staff
app.get('/api/admin/staff', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const staff = readUsers(staffFile);
  res.json(staff.map(s => ({
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    location: s.location
  })));
});

// Staff: Change password
app.post('/api/staff/change-password', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const user = validateUser(staffFile, req.session.user.email, oldPassword);
  if (!user) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  
  updateUserPassword(staffFile, req.session.user.email, newPassword);
  res.json({ success: true, message: 'Password updated successfully' });
});

// Admin: Remove staff
app.post('/api/admin/remove-staff', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const staff = readUsers(staffFile);
  const updatedStaff = staff.filter(s => s.email !== email);
  
  if (staff.length === updatedStaff.length) {
    return res.status(404).json({ error: 'Staff member not found' });
  }
  
  fs.writeFileSync(staffFile, updatedStaff.map(s => JSON.stringify(s)).join('\n') + (updatedStaff.length > 0 ? '\n' : ''));
  res.json({ success: true, message: 'Staff member removed successfully' });
});

// Chat endpoints
const chatsDir = path.join(dataDir, 'chats');
if (!fs.existsSync(chatsDir)) {
  fs.mkdirSync(chatsDir);
}

// Helper function to get chat filename
function getChatFilename(user1Email, user2Email) {
  const emails = [user1Email, user2Email].sort();
  return path.join(chatsDir, `${emails[0]}_${emails[1]}.txt`);
}

// Search for user by email
app.post('/api/chat/search-user', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Search in all user types
  let user = null;
  let userType = null;
  
  const admins = readUsers(adminFile);
  const admin = admins.find(u => u.email === email);
  if (admin) {
    user = admin;
    userType = 'admin';
  } else {
    const staff = readUsers(staffFile);
    const staffUser = staff.find(u => u.email === email);
    if (staffUser) {
      user = staffUser;
      userType = 'staff';
    } else {
      const clients = readUsers(clientsFile);
      const client = clients.find(u => u.email === email);
      if (client) {
        user = client;
        userType = 'client';
      }
    }
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const name = user.firstName ? `${user.firstName} ${user.lastName}` : user.email;
  res.json({ email: user.email, name, userType });
});

// Send message
app.post('/api/chat/send', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { recipientEmail, message } = req.body;
  
  if (!recipientEmail || !message) {
    return res.status(400).json({ error: 'Recipient email and message are required' });
  }
  
  const chatFile = getChatFilename(req.session.user.email, recipientEmail);
  const timestamp = new Date().toISOString();
  const chatMessage = {
    from: req.session.user.email,
    to: recipientEmail,
    message,
    timestamp
  };
  
  fs.appendFileSync(chatFile, JSON.stringify(chatMessage) + '\n');
  res.json({ success: true, message: 'Message sent' });
});

// Get all chats for current user
app.get('/api/chat/list', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const userEmail = req.session.user.email;
  const chatFiles = fs.readdirSync(chatsDir);
  const chats = [];
  
  chatFiles.forEach(file => {
    if (file.includes(userEmail)) {
      const emails = file.replace('.txt', '').split('_');
      const otherEmail = emails[0] === userEmail ? emails[1] : emails[0];
      
      // Get last message
      const chatFilePath = path.join(chatsDir, file);
      const content = fs.readFileSync(chatFilePath, 'utf8');
      const messages = content.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
      
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => m.to === userEmail && !m.read).length;
        
        // Get other user info
        let otherUser = null;
        let userType = null;
        
        const admins = readUsers(adminFile);
        const admin = admins.find(u => u.email === otherEmail);
        if (admin) {
          otherUser = admin;
          userType = 'admin';
        } else {
          const staff = readUsers(staffFile);
          const staffUser = staff.find(u => u.email === otherEmail);
          if (staffUser) {
            otherUser = staffUser;
            userType = 'staff';
          } else {
            const clients = readUsers(clientsFile);
            const client = clients.find(u => u.email === otherEmail);
            if (client) {
              otherUser = client;
              userType = 'client';
            }
          }
        }
        
        const name = otherUser && otherUser.firstName ? `${otherUser.firstName} ${otherUser.lastName}` : otherEmail;
        
        chats.push({
          email: otherEmail,
          name,
          userType,
          lastMessage: lastMessage.message,
          timestamp: lastMessage.timestamp,
          unreadCount
        });
      }
    }
  });
  
  // Sort by most recent
  chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(chats);
});

// Get messages with specific user
app.get('/api/chat/messages/:email', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const otherEmail = req.params.email;
  const chatFile = getChatFilename(req.session.user.email, otherEmail);
  
  if (!fs.existsSync(chatFile)) {
    return res.json([]);
  }
  
  const content = fs.readFileSync(chatFile, 'utf8');
  const messages = content.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  
  // Mark messages as read
  const updatedMessages = messages.map(m => {
    if (m.to === req.session.user.email) {
      return { ...m, read: true };
    }
    return m;
  });
  
  fs.writeFileSync(chatFile, updatedMessages.map(m => JSON.stringify(m)).join('\n') + '\n');
  
  res.json(messages);
});

// Get unread count
app.get('/api/chat/unread-count', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const userEmail = req.session.user.email;
  const chatFiles = fs.readdirSync(chatsDir);
  let totalUnread = 0;
  
  chatFiles.forEach(file => {
    if (file.includes(userEmail)) {
      const chatFilePath = path.join(chatsDir, file);
      const content = fs.readFileSync(chatFilePath, 'utf8');
      const messages = content.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
      totalUnread += messages.filter(m => m.to === userEmail && !m.read).length;
    }
  });
  
  res.json({ unreadCount: totalUnread });
});

// Booking endpoints
app.post('/api/bookings/create', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const bookingData = req.body;
  
  if (!bookingData.client || !bookingData.frequency || !bookingData.service || !bookingData.serviceDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if client email exists in clients database
  const clientEmail = bookingData.client.email;
  const existingClient = validateUser(clientsFile, clientEmail, null);
  
  if (existingClient) {
    // Update booking data with existing client info
    bookingData.client = {
      ...existingClient,
      password: undefined // Don't include password in booking data
    };
    bookingData.clientExists = true;
  } else {
    bookingData.clientExists = false;
  }
  
  const booking = createBooking(bookingData);
  res.json({ success: true, booking });
});

app.get('/api/bookings/all', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const bookings = readBookings();
  
  // If staff, only return their assigned bookings
  if (req.session.user.userType === 'staff') {
    const staffEmail = req.session.user.email;
    const filtered = bookings.filter(b => b.assignedTo === staffEmail);
    return res.json({ bookings: filtered });
  }
  
  // If client, only return their bookings
  if (req.session.user.userType === 'client') {
    const clientEmail = req.session.user.email;
    const filtered = bookings.filter(b => b.client.email === clientEmail);
    return res.json({ bookings: filtered });
  }
  
  // Admin gets all bookings
  res.json({ bookings });
});

app.get('/api/bookings/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const booking = getBookingById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  // Staff can only see their assigned bookings
  if (req.session.user.userType === 'staff' && booking.assignedTo !== req.session.user.email) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json({ booking });
});

app.put('/api/bookings/:id', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const updates = req.body;
  const booking = updateBooking(req.params.id, updates);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  res.json({ success: true, booking });
});

app.delete('/api/bookings/:id', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const deleted = deleteBooking(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  res.json({ success: true });
});

app.post('/api/bookings/:id/assign', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { staffEmail } = req.body;
  
  if (!staffEmail) {
    return res.status(400).json({ error: 'Staff email required' });
  }
  
  // Verify staff exists
  if (!userExists(staffFile, staffEmail)) {
    return res.status(400).json({ error: 'Staff member not found' });
  }
  
  const booking = assignBooking(req.params.id, staffEmail);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  // Create notification for staff
  const staffUser = validateUser(staffFile, staffEmail, null);
  const clientName = `${booking.client.firstName} ${booking.client.lastName}`;
  const serviceDate = new Date(booking.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  createNotification(
    staffEmail,
    `You have been assigned a new booking for ${clientName} on ${serviceDate}. Please accept or decline.`,
    'booking_assigned',
    booking.id
  );
  
  res.json({ success: true, booking });
});

app.post('/api/bookings/:id/accept', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const booking = getBookingById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (booking.assignedTo !== req.session.user.email) {
    return res.status(403).json({ error: 'This booking is not assigned to you' });
  }
  
  const updatedBooking = updateBooking(req.params.id, { status: 'accepted' });
  
  // Get staff info
  const staffUser = validateUser(staffFile, req.session.user.email, null);
  const staffName = staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : req.session.user.email;
  const clientName = `${updatedBooking.client.firstName} ${updatedBooking.client.lastName}`;
  const serviceDate = new Date(updatedBooking.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Notify client if they have an account
  const clientExists = userExists(clientsFile, updatedBooking.client.email);
  if (clientExists) {
    createNotification(
      updatedBooking.client.email,
      `${staffName} has accepted your booking for ${serviceDate}. Your service is confirmed!`,
      'booking_accepted',
      updatedBooking.id
    );
  }
  
  // Notify admin
  const adminUsers = readUsers(adminFile);
  if (adminUsers.length > 0) {
    adminUsers.forEach(admin => {
      createNotification(
        admin.email,
        `${staffName} has accepted the booking for ${clientName} on ${serviceDate}.`,
        'booking_accepted',
        updatedBooking.id
      );
    });
  }
  
  res.json({ success: true, booking: updatedBooking });
});

app.post('/api/bookings/:id/decline', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const booking = getBookingById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (booking.assignedTo !== req.session.user.email) {
    return res.status(403).json({ error: 'This booking is not assigned to you' });
  }
  
  const updatedBooking = updateBooking(req.params.id, { assignedTo: null, status: 'pending' });
  res.json({ success: true, booking: updatedBooking });
});

app.post('/api/bookings/:id/complete', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const booking = getBookingById(req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (booking.assignedTo !== req.session.user.email) {
    return res.status(403).json({ error: 'This booking is not assigned to you' });
  }
  
  if (booking.status !== 'accepted') {
    return res.status(400).json({ error: 'Booking must be accepted before it can be completed' });
  }
  
  const { hoursWorked } = req.body;
  
  if (!hoursWorked || hoursWorked <= 0) {
    return res.status(400).json({ error: 'Hours worked is required' });
  }
  
  const updatedBooking = updateBooking(req.params.id, { 
    status: 'completed',
    hoursWorked: parseFloat(hoursWorked),
    completedAt: new Date().toISOString()
  });
  
  // Get staff info
  const staffUser = validateUser(staffFile, req.session.user.email, null);
  const staffName = staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : req.session.user.email;
  const clientName = `${updatedBooking.client.firstName} ${updatedBooking.client.lastName}`;
  const serviceDate = new Date(updatedBooking.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Notify admin
  const adminUsers = readUsers(adminFile);
  if (adminUsers.length > 0) {
    adminUsers.forEach(admin => {
      createNotification(
        admin.email,
        `${staffName} has completed the service for ${clientName} on ${serviceDate}. (${hoursWorked} hours worked)`,
        'booking_completed',
        updatedBooking.id
      );
    });
  }
  
  res.json({ success: true, booking: updatedBooking });
});

// Notification endpoints
app.get('/api/notifications', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const notifications = getUserNotifications(req.session.user.email);
  res.json({ notifications });
});

app.get('/api/notifications/unread-count', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const notifications = getUserNotifications(req.session.user.email);
  const unreadCount = notifications.filter(n => !n.read).length;
  res.json({ unreadCount });
});

app.post('/api/notifications/:id/read', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const success = markNotificationAsRead(req.params.id, req.session.user.email);
  
  if (!success) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const notifications = readNotifications();
  notifications.forEach(n => {
    if (n.userEmail === req.session.user.email && !n.read) {
      n.read = true;
    }
  });
  writeNotifications(notifications);
  
  res.json({ success: true });
});

// Services management endpoints
// Get all services
app.get('/api/services', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const servicesData = readServices();
  // Ensure backwards compatibility: add extras array if it doesn't exist
  servicesData.services.forEach(service => {
    if (!service.extras) {
      service.extras = [];
    }
  });
  res.json(servicesData);
});

// Get active service
app.get('/api/services/active', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const activeService = getActiveService();
  // Ensure backwards compatibility: add extras array if it doesn't exist
  if (activeService && !activeService.extras) {
    activeService.extras = [];
  }
  res.json({ service: activeService });
});

// Set active service
app.post('/api/services/set-active', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { serviceId } = req.body;
  const servicesData = readServices();
  
  if (!servicesData.services.find(s => s.id === serviceId)) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  servicesData.activeServiceId = serviceId;
  writeServices(servicesData);
  res.json({ success: true, activeServiceId: serviceId });
});

// Create new service
app.post('/api/services/create', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { name, basePrice, duration } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }
  
  const servicesData = readServices();
  const newService = {
    id: Date.now().toString(),
    name,
    basePrice: parseFloat(basePrice) || 0,
    duration: parseInt(duration) || 60,
    createdAt: new Date().toISOString(),
    formFields: [],
    pricingRules: [],
    extras: []
  };
  
  servicesData.services.push(newService);
  writeServices(servicesData);
  res.json({ success: true, service: newService });
});

// Update service
app.put('/api/services/:id', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { name, basePrice, duration, formFields, pricingRules, extras } = req.body;
  const servicesData = readServices();
  const service = servicesData.services.find(s => s.id === req.params.id);
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  if (name !== undefined) service.name = name;
  if (basePrice !== undefined) service.basePrice = parseFloat(basePrice);
  if (duration !== undefined) service.duration = parseInt(duration);
  if (formFields !== undefined) service.formFields = formFields;
  if (pricingRules !== undefined) service.pricingRules = pricingRules;
  if (extras !== undefined) service.extras = extras;
  
  writeServices(servicesData);
  res.json({ success: true, service });
});

// Delete service
app.delete('/api/services/:id', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const servicesData = readServices();
  const serviceIndex = servicesData.services.findIndex(s => s.id === req.params.id);
  
  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  // Don't allow deletion if it's the active service
  if (servicesData.activeServiceId === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete active service' });
  }
  
  servicesData.services.splice(serviceIndex, 1);
  writeServices(servicesData);
  res.json({ success: true });
});

// Get service by ID
app.get('/api/services/:id', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const service = getServiceById(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  // Ensure backwards compatibility: add extras array if it doesn't exist
  if (!service.extras) {
    service.extras = [];
  }
  
  res.json({ service });
});

// Client management endpoints
app.get('/api/admin/clients', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const clients = readUsers(clientsFile);
  const bookings = readBookings();
  
  // Add service history to each client
  const clientsWithHistory = clients.map(client => {
    const clientBookings = bookings.filter(b => b.client.email === client.email);
    const completedServices = clientBookings.filter(b => b.status === 'completed').length;
    const upcomingServices = clientBookings.filter(b => b.status !== 'completed' && new Date(b.serviceDate) >= new Date()).length;
    const totalSpent = clientBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.payment?.grandTotal || 0), 0);
    
    return {
      ...client,
      password: undefined, // Don't send password
      serviceHistory: {
        total: clientBookings.length,
        completed: completedServices,
        upcoming: upcomingServices,
        totalSpent: totalSpent,
        lastService: clientBookings.length > 0 ? clientBookings[clientBookings.length - 1].serviceDate : null
      }
    };
  });
  
  res.json({ clients: clientsWithHistory });
});

app.delete('/api/admin/clients/:email', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const email = decodeURIComponent(req.params.email);
  const clients = readUsers(clientsFile);
  const filtered = clients.filter(c => c.email !== email);
  
  if (filtered.length === clients.length) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  fs.writeFileSync(clientsFile, filtered.map(c => JSON.stringify(c)).join('\n') + '\n');
  res.json({ success: true });
});

app.put('/api/admin/clients/:email', (req, res) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const email = decodeURIComponent(req.params.email);
  const { firstName, lastName, phone, city } = req.body;
  
  const clients = readUsers(clientsFile);
  const clientIndex = clients.findIndex(c => c.email === email);
  
  if (clientIndex === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  clients[clientIndex] = {
    ...clients[clientIndex],
    firstName,
    lastName,
    phone,
    city
  };
  
  fs.writeFileSync(clientsFile, clients.map(c => JSON.stringify(c)).join('\n') + '\n');
  res.json({ success: true, client: { ...clients[clientIndex], password: undefined } });
});

// Reminder System - Check for upcoming bookings and send 24-hour reminders
function checkAndSendReminders() {
  try {
    const bookings = readBookings();
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const twentyThreeHoursFromNow = new Date(now.getTime() + (23 * 60 * 60 * 1000));
    
    bookings.forEach(booking => {
      // Only send reminders for accepted bookings
      if (booking.status !== 'accepted') {
        return;
      }
      
      const serviceDate = new Date(booking.serviceDate + 'T00:00:00');
      
      // Check if service is between 23-24 hours away and reminder hasn't been sent
      if (serviceDate >= twentyThreeHoursFromNow && serviceDate <= twentyFourHoursFromNow) {
        // Check if reminder was already sent
        const notifications = readNotifications();
        const reminderExists = notifications.some(n => 
          n.bookingId === booking.id && 
          n.type === 'booking_reminder' &&
          n.userEmail === booking.client.email
        );
        
        if (!reminderExists) {
          // Check if client has an account
          const clientExists = userExists(clientsFile, booking.client.email);
          if (clientExists) {
            const serviceDate = new Date(booking.serviceDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            });
            
            createNotification(
              booking.client.email,
              `Reminder: Your cleaning service is scheduled for tomorrow, ${serviceDate}. ${booking.assignedTo ? `Your cleaner is ${booking.assignedTo}.` : ''}`,
              'booking_reminder',
              booking.id
            );
            
            console.log(`Sent 24-hour reminder to ${booking.client.email} for booking ${booking.id}`);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

// Check for reminders every hour
setInterval(checkAndSendReminders, 60 * 60 * 1000);

// Check reminders on server start
checkAndSendReminders();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
