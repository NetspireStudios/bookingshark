# BookingShark - Universal Service Booking Platform

A comprehensive web application for managing service bookings, designed to work for any service-based business (cleaning, snow removal, lawn care, etc.).

## Features

### Admin Dashboard
- **Universal Service Form Builder**: Create custom booking forms for any service type
- **Dynamic Pricing Engine**: Configure base prices, conditional pricing, multiply rules, and checkbox-based add-ons
- **Client Management**: Track all clients, their booking history, and service details
- **Staff Management**: Add, edit, and remove staff members
- **Schedule Calendar**: Visual calendar view of all bookings with color-coded status indicators
- **Booking Management**: Create, assign, and manage service bookings
- **Real-time Notifications**: Get notified of important events
- **Chat System**: Built-in messaging between admin, staff, and clients

### Staff Dashboard
- **Personal Schedule**: Calendar view of accepted bookings
- **Pending Requests**: Accept or decline job assignments
- **Booking Details**: View all job information (without payment details)
- **Job Completion**: Mark tasks as finished
- **Statistics**: Track hours worked and completed jobs
- **Chat System**: Communicate with admin and clients

### Client Dashboard
- **Booking History**: View all past and upcoming services
- **Service Statistics**: Track completed and upcoming services
- **Profile Management**: Update personal information
- **Notifications**: Get updates on booking status and upcoming appointments
- **Chat System**: Contact admin or assigned staff

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS (Tailwind CSS), Vanilla JavaScript
- **Data Storage**: File-based JSON storage (easily upgradable to database)
- **Session Management**: express-session
- **Authentication**: Session-based authentication

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NetspireStudios/bookingshark.git
   cd bookingshark
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Default Credentials

### Admin Login
- **Email**: huzaifa1@gmail.com
- **Password**: admin

## Project Structure

```
ServiceApp/
├── public/              # Frontend files
│   ├── admin.html      # Admin dashboard
│   ├── staff.html      # Staff dashboard
│   ├── client.html     # Client dashboard
│   ├── add-booking.html # Booking creation form
│   └── help.html       # Help page
├── data/               # Data storage (JSON files)
│   ├── admin.txt       # Admin credentials
│   ├── staff.txt       # Staff information
│   ├── clients.txt     # Client information
│   ├── bookings.json   # All bookings
│   ├── services.json   # Service definitions & forms
│   ├── notifications.json # Notifications
│   └── chats/          # Chat messages
├── server.js           # Express server & API
├── package.json        # Dependencies
└── login.html          # Login page

```

## Key Features Explained

### Service Form Builder
Admins can create completely custom booking forms for any service:
- **Form Fields**: text, number, dropdown, checkbox, multiselect
- **Pricing Rules**: 
  - Add Fixed Amount (always adds)
  - Add if Checkbox Checked (conditional)
  - Multiply by Number Field
  - Conditional (dropdown-based pricing)
- **Extras**: Optional add-ons with checkbox selection

### Dynamic Pricing
The system automatically calculates total price based on:
- Base service price
- Field-based pricing rules
- Selected extras
- Tax calculation (13%)
- Manual price adjustment option

### Calendar System
- Color-coded status indicators:
  - 🔴 Red: Not Assigned
  - 🟠 Orange: Pending (Awaiting Staff)
  - 🔵 Blue: Accepted
  - 🟢 Green: Completed
- Month navigation
- Click on bookings for details

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register` - Client registration

### Services
- `GET /api/services` - Get all services (admin only)
- `GET /api/services/active` - Get active service
- `POST /api/services/create` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `POST /api/services/set-active` - Set active service

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Staff & Clients
- `POST /api/staff` - Add staff member
- `DELETE /api/staff/:email` - Remove staff
- `GET /api/admin/clients` - Get all clients

### Notifications & Chat
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark notifications as read
- `GET /api/chats` - Get user's chat conversations
- `POST /api/messages` - Send a message

## Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- Payment processing (Stripe/PayPal)
- SMS/Email notifications
- Mobile app
- Advanced reporting & analytics
- Multi-language support

## License

This project is private and proprietary.

## Support

For questions or support, contact: [Your Contact Information]
