# Notes API Documentation

## Overview

A complete notes management system has been added to the Zoho backend, similar to the existing todo functionality.

## API Endpoints

### 1. Create Note

**Endpoint:** `POST /api/notes/create`

**Request Body:**

```json
{
  "userId": "user123",
  "title": "react is a front end",
  "content": "react is a front end" // optional
}
```

**Response:**

```json
{
  "message": "Created note: react is a front end",
  "note": {
    "_id": "...",
    "userId": "user123",
    "title": "react is a front end",
    "content": "react is a front end",
    "createdAt": "2025-11-30T...",
    "updatedAt": "2025-11-30T..."
  }
}
```

### 2. Fetch All Notes

**Endpoint:** `GET /api/notes/list/:userId`

**Example:** `GET /api/notes/list/user123`

**Response:**

```json
{
  "message": "Here are your notes",
  "notes": [
    {
      "_id": "...",
      "userId": "user123",
      "title": "react is a front end",
      "content": "react is a front end",
      "createdAt": "2025-11-30T...",
      "updatedAt": "2025-11-30T..."
    }
  ],
  "count": 1
}
```

### 3. Delete Note

**Endpoint:** `POST /api/notes/delete`

**Request Body:**

```json
{
  "userId": "user123",
  "title": "react" // Partial match supported
}
```

**Response:**

```json
{
  "message": "Deleted note: react is a front end",
  "deletedNote": {
    "_id": "...",
    "userId": "user123",
    "title": "react is a front end",
    "content": "react is a front end"
  }
}
```

## Voice Commands

The AI-powered intent detection system now supports the following note-related commands:

### Create Note

- "Create me a note called react is a front end"
- "Create a note about JavaScript"
- "Add note meeting summary"
- "Make a note called project ideas"

### Fetch Notes

- "Fetch my notes"
- "Show all my notes"
- "List my notes"
- "Get my notes"

### Delete Note

- "Delete note react"
- "Remove note JavaScript"
- "Delete the note about meetings"

## Files Created/Modified

### New Files:

1. **Models/noteModel.js** - MongoDB schema for notes
2. **controller/noteController.js** - Business logic for note operations
3. **routes/noteRoutes.js** - Express routes for note endpoints

### Modified Files:

1. **services/intent.js** - Added CREATE_NOTE, SHOW_NOTES, DELETE_NOTE intents
2. **controller/voiceController.js** - Added handlers for note intents
3. **index.js** - Registered note routes

## Database Schema

```javascript
{
  userId: String (required),
  title: String (required),
  content: String (default: ""),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## Usage Examples

### Direct API Call:

```bash
# Create a note
curl -X POST http://localhost:3000/api/notes/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","title":"react is a front end"}'

# Fetch all notes
curl http://localhost:3000/api/notes/list/user123

# Delete a note
curl -X POST http://localhost:3000/api/notes/delete \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","title":"react"}'
```

### Voice Command (through /api/transcribe):

The voice endpoint will automatically detect intents and route to the appropriate note controller based on what the user says.

## Features

✅ AI-powered intent detection (using Gemini)
✅ Fallback rule-based detection
✅ Case-insensitive partial matching for delete
✅ Automatic timestamps
✅ Similar note suggestions if exact match not found
✅ Full voice assistant integration

## Ready to Use!

All code is production-ready and follows the same patterns as the todo system. Simply restart your server and start using the notes API!
