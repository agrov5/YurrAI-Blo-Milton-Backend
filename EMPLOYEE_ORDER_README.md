# Employee Order Management System

## Overview

The Employee Order Management System allows you to create, view, and modify the order of employees for scheduling and display purposes. This system includes a drag-and-drop web interface and a RESTful API for managing employee ordering.

## Features

### 🎯 Web Dashboard

- **Drag & Drop Interface**: Intuitive drag-and-drop reordering
- **Real-time Updates**: Changes are automatically saved when you drop an item
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Authentication**: Secure login system with persistent sessions
- **Statistics**: Shows total employees and last update time
- **Reset Option**: Quickly reset to alphabetical order

### 🔧 API Endpoints

- **GET /api/order** - Get current employee order
- **PUT /api/order** - Update employee order
- **POST /api/order/reset** - Reset to alphabetical order
- **GET /api/all-employees** - Get all employees for reference

## Database Schema

### Order Model

```typescript
interface IOrder extends Document {
  EmployeeDisplayName: string; // Display name of the employee
  EmployeeID: number; // Unique employee ID
  OrderPosition: number; // Position in the order (1-based)
}
```

## API Usage

### Getting Employee Order

```http
GET /api/order
Authorization: Basic <credentials>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "EmployeeDisplayName": "John Doe",
      "EmployeeID": 123,
      "OrderPosition": 1
    },
    ...
  ],
  "message": "Employee order retrieved successfully"
}
```

### Updating Employee Order

```http
PUT /api/order
Authorization: Basic <credentials>
Content-Type: application/json

{
  "orderedEmployees": [
    {
      "EmployeeDisplayName": "Jane Smith",
      "EmployeeID": 456,
      "OrderPosition": 1
    },
    {
      "EmployeeDisplayName": "John Doe",
      "EmployeeID": 123,
      "OrderPosition": 2
    }
  ]
}
```

### Resetting to Alphabetical Order

```http
POST /api/order/reset
Authorization: Basic <credentials>
```

## Using the Dashboard

### 1. Access the Dashboard

Navigate to: `http://your-server:port/dashboard.html`

### 2. Login

- Enter your username and password
- Credentials are stored securely in local storage for convenience
- Click "Login" to authenticate

### 3. Manage Employee Order

- **View Current Order**: The dashboard automatically loads the current employee order
- **Drag & Drop**: Click and drag any employee to a new position
- **Auto-Save**: Changes are automatically saved when you release an item
- **Manual Save**: Click "💾 Save Order" to manually save changes
- **Reset**: Click "🔤 Reset to Alphabetical" to reset the order alphabetically
- **Refresh**: Click "🔄 Load Current Order" to reload from the database

### 4. Visual Feedback

- **Position Numbers**: Each employee shows their current position
- **Drag Indicators**: Visual feedback during drag operations
- **Status Messages**: Success/error messages for all operations
- **Loading States**: Clear loading indicators for all operations

## Installation & Setup

### 1. Backend Setup

The order management endpoints are automatically included in your existing API routes. No additional setup required.

### 2. Database

The system automatically creates the Order collection when first accessed. If no order exists, it creates a default order based on existing employees.

### 3. Environment Variables

No additional environment variables are required for the ordering system.

## Frontend Integration

### JavaScript API Client Example

```javascript
class EmployeeOrderAPI {
  constructor(baseUrl, authCredentials) {
    this.baseUrl = baseUrl;
    this.authCredentials = authCredentials;
  }

  async getOrder() {
    const response = await fetch(`${this.baseUrl}/api/order`, {
      headers: {
        Authorization: `Basic ${this.authCredentials}`,
      },
    });
    return response.json();
  }

  async updateOrder(orderedEmployees) {
    const response = await fetch(`${this.baseUrl}/api/order`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.authCredentials}`,
      },
      body: JSON.stringify({ orderedEmployees }),
    });
    return response.json();
  }

  async resetOrder() {
    const response = await fetch(`${this.baseUrl}/api/order/reset`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.authCredentials}`,
      },
    });
    return response.json();
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from "react";

function useEmployeeOrder(apiClient) {
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getOrder();
      if (result.success) {
        setOrder(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (newOrder) => {
    setLoading(true);
    try {
      const result = await apiClient.updateOrder(newOrder);
      if (result.success) {
        setOrder(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, []);

  return { order, loading, error, loadOrder, updateOrder };
}
```

## Security Features

### Authentication

- All endpoints require Basic Authentication
- Session persistence in dashboard for user convenience
- Secure credential storage

### Data Validation

- Server-side validation of all order data
- Type checking for employee IDs and positions
- Duplicate position detection and prevention

### Error Handling

- Comprehensive error messages
- Graceful degradation on API failures
- User-friendly error display in dashboard

## Performance Considerations

### Database Operations

- Efficient batch updates for order changes
- Indexed queries on OrderPosition field
- Minimal database round trips

### Frontend Optimization

- Smooth drag-and-drop animations
- Debounced auto-save functionality
- Responsive design for all devices

## Troubleshooting

### Common Issues

**1. "No employees found"**

- Ensure employees are loaded in the Employee collection
- Check database connectivity
- Verify Employee model structure

**2. "Order positions are duplicated"**

- Use the reset endpoint to fix corruption
- Ensure frontend sends correct position arrays

**3. "Drag and drop not working"**

- Check browser compatibility (HTML5 drag API required)
- Ensure JavaScript is enabled
- Verify CSS is loading correctly

**4. "Authentication failed"**

- Verify username/password credentials
- Check Basic Auth header format
- Ensure auth middleware is configured

### Debug Steps

1. Check browser developer console for JavaScript errors
2. Verify API endpoints return correct data structure
3. Test API endpoints directly with curl or Postman
4. Check database collections and document structure
5. Verify server logs for error details

## Future Enhancements

### Planned Features

- [ ] Bulk import/export of employee orders
- [ ] Multiple order templates (by department, skill, etc.)
- [ ] Order history and change tracking
- [ ] Advanced filtering and search
- [ ] Role-based permissions for order management
- [ ] Integration with scheduling systems
- [ ] Mobile app for order management

### Technical Improvements

- [ ] Real-time collaboration with WebSocket updates
- [ ] Offline support with conflict resolution
- [ ] Advanced drag-and-drop with nested groups
- [ ] Keyboard navigation support
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Performance optimization for large employee lists

## Support

For issues or questions regarding the Employee Order Management System:

1. Check this documentation first
2. Review server logs for error details
3. Test API endpoints independently
4. Verify database state and structure
5. Check browser compatibility and JavaScript console

The system is designed to be robust and user-friendly, with comprehensive error handling and clear feedback for all operations.
