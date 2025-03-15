# Enhanced Chat API Documentation

A comprehensive chat API supporting individual and group chats with features like authentication, file uploads, message status tracking, and user presence.

## Table of Contents
- [Authentication](#authentication)
- [Users](#users)
- [Messages](#messages)
- [Groups](#groups)
- [File Upload](#file-upload)
- [Rate Limiting](#rate-limiting)

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "email": "string"
}

Response: 201 Created
{
  "message": "User registered successfully",
  "userId": "uuid"
}
```

### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response: 200 OK
{
  "token": "jwt_token",
  "sessionId": "uuid"
}
```

## Messages

### Send Individual Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "recipientId": "uuid",
  "content": "string",
  "type": "text|image",
  "file": (optional) File
}

Response: 201 Created
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "content": "string",
  "type": "text|image",
  "file": {
    "filename": "string",
    "path": "string",
    "size": number
  },
  "status": {
    "sent": boolean,
    "delivered": boolean,
    "seen": boolean,
    "timestamp": "ISO-8601"
  },
  "createdAt": "ISO-8601"
}
```

### Get User Messages
```http
GET /api/messages/:userId
Authorization: Bearer <token>

Response: 200 OK
[
  {
    // Message object
  }
]
```

### Update Message Status
```http
PATCH /api/messages/:messageId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": {
    "delivered": boolean,
    "seen": boolean
  }
}

Response: 200 OK
{
  // Updated message object
}
```

## Groups

### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "members": ["uuid"]
}

Response: 201 Created
{
  "id": "uuid",
  "name": "string",
  "creator": "uuid",
  "members": ["uuid"],
  "createdAt": "ISO-8601"
}
```

### Send Group Message
```http
POST /api/groups/:groupId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "content": "string",
  "type": "text|image",
  "file": (optional) File
}

Response: 201 Created
{
  "id": "uuid",
  "groupId": "uuid",
  "senderId": "uuid",
  "content": "string",
  "type": "text|image",
  "file": {
    "filename": "string",
    "path": "string",
    "size": number
  },
  "status": {
    "sent": boolean,
    "delivered": boolean,
    "seen": {
      "userId": boolean
    },
    "timestamp": "ISO-8601"
  },
  "createdAt": "ISO-8601"
}
```

## User Status

### Get Active Users
```http
GET /api/users/status
Authorization: Bearer <token>

Response: 200 OK
{
  "activeUsers": ["uuid"]
}
```

## File Upload

- Supports image uploads (JPEG, JPG, PNG, GIF)
- Maximum file size: 50KB
- Files are stored in the `uploads/` directory
- Unique filename generation using UUID

## Rate Limiting

- 100 requests per IP address per 15 minutes
- Applies to all endpoints
- Status 429 returned when limit exceeded

## Error Responses

```http
400 Bad Request
{
  "error": "Error description"
}

401 Unauthorized
{
  "error": "Authentication required"
}

403 Forbidden
{
  "error": "Invalid or expired token"
}

404 Not Found
{
  "error": "Resource not found"
}

500 Internal Server Error
{
  "error": "Error description"
}
```

## Best Practices

1. Always handle token expiration and refresh
2. Implement proper error handling
3. Use appropriate content types for requests
4. Monitor file upload sizes
5. Implement proper cleanup for uploaded files
6. Handle offline message delivery
7. Implement message encryption for security

## Developer Guidelines

1. Use unique user IDs for each client application
2. Implement proper retry mechanisms for failed requests
3. Handle network errors gracefully
4. Implement proper message queuing
5. Use appropriate error codes and messages
6. Implement proper logging
7. Handle timezone differences
8. Implement proper message ordering
9. Handle message delivery status updates
10. Implement proper user presence handling

## Security Considerations

1. Always use HTTPS in production
2. Implement proper input validation
3. Use proper session management
4. Implement rate limiting
5. Handle file uploads securely
6. Implement proper access control
7. Use secure password hashing
8. Implement proper token management
9. Handle sensitive data properly
10. Implement proper error handling

## Testing

To test the API endpoints:

1. Register a new user
2. Login to get the JWT token
3. Use the token for authenticated requests
4. Test file uploads with appropriate size limits
5. Test group creation and messaging
6. Test message status updates
7. Test user presence functionality

## Deployment Considerations

1. Use environment variables for sensitive data
2. Implement proper logging
3. Use proper error handling
4. Implement proper monitoring
5. Use proper security measures
6. Implement proper backup strategies
7. Use proper scaling strategies
8. Implement proper caching
9. Use proper load balancing
10. Implement proper failover strategies
