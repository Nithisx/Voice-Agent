# 🚧 Blocked / Stuck Task Management - Complete Backend Implementation

## Overview

This feature allows users to mark tasks as blocked/stuck with a reason, view all blocked tasks, and unblock them when ready. Perfect for tracking impediments and dependencies in your workflow.

---

## 🚀 Features

✅ **Mark Tasks as Blocked** - Track tasks that can't progress with specific reasons  
✅ **View Blocked Tasks** - See all your blocked tasks at a glance  
✅ **Unblock Tasks** - Mark tasks as unblocked when impediments are resolved  
✅ **Voice Commands** - Use natural language to manage blocked tasks  
✅ **AI-Powered Intent Detection** - Understands various ways of expressing blocked tasks  
✅ **Search & Suggestions** - Case-insensitive search with suggestions for similar tasks

---

## 📋 API Endpoints

### Base URL: `/api/blocked-tasks`

| Method | Endpoint           | Description                  |
| ------ | ------------------ | ---------------------------- |
| POST   | `/mark`            | Mark a task as blocked       |
| GET    | `/list?userId=xxx` | Get blocked tasks for a user |
| PUT    | `/unblock`         | Unblock a task               |
| GET    | `/all`             | Get all tasks with filters   |
| PUT    | `/update-reason`   | Update blocking reason       |
| DELETE | `/delete`          | Delete a blocked task record |

---

## 🎤 Voice Commands

### 1. Mark Task as Blocked

**Voice Commands:**

- "Mark the task fix login API as blocked because API is not responding"
- "Mark task database migration as stuck because waiting for DBA approval"
- "Set task deploy to production as blocked because security review pending"

**What Happens:**

1. Voice transcription extracts task title and reason
2. AI detects `MARK_BLOCKED` intent
3. Task is saved to database with blocked status
4. Confirmation response is returned

**Example Response:**
\`\`\`json
{
"success": true,
"intent": "MARK_BLOCKED",
"transcription": "Mark the task fix login API as blocked because API is not responding",
"response": "Task \"fix login API\" has been marked as blocked. Reason: API is not responding",
"data": {
"task": {
"\_id": "...",
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding",
"status": "blocked",
"blockedAt": "2025-12-01T10:30:00.000Z"
}
}
}
\`\`\`

---

### 2. Show Blocked Tasks

**Voice Commands:**

- "Show me the blocked tasks"
- "List all blocked tasks"
- "Show my stuck tasks"
- "What tasks are blocked?"

**What Happens:**

1. AI detects `SHOW_BLOCKED` intent
2. Queries database for all blocked tasks
3. Returns formatted list

**Example Response:**
\`\`\`json
{
"success": true,
"intent": "SHOW_BLOCKED",
"transcription": "Show me the blocked tasks",
"response": "You have 3 blocked task(s):\\n1. fix login API - Reason: API is not responding\\n2. database migration - Reason: waiting for DBA approval\\n3. deploy to production - Reason: security review pending",
"taskList": [
{
"_id": "...",
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding",
"status": "blocked",
"blockedAt": "2025-12-01T10:30:00.000Z"
}
],
"count": 3
}
\`\`\`

---

### 3. Unblock Task

**Voice Commands:**

- "Unblock the task fix login API"
- "Unblock task database migration"
- "Remove block from deploy to production"

**What Happens:**

1. AI detects `UNBLOCK_TASK` intent
2. Finds blocked task by title (case-insensitive)
3. Updates status to unblocked
4. Sets unblockedAt timestamp

**Example Response:**
\`\`\`json
{
"success": true,
"intent": "UNBLOCK_TASK",
"transcription": "Unblock the task fix login API",
"response": "Task \"fix login API\" has been unblocked",
"data": {
"task": {
"\_id": "...",
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding",
"status": "unblocked",
"blockedAt": "2025-12-01T10:30:00.000Z",
"unblockedAt": "2025-12-01T14:30:00.000Z"
}
}
}
\`\`\`

---

## 🔌 Direct API Usage

### 1. Mark Task as Blocked

**Endpoint:** `POST /api/blocked-tasks/mark`

**Request:**
\`\`\`json
{
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding"
}
\`\`\`

**Response:**
\`\`\`json
{
"success": true,
"message": "Task \"fix login API\" has been marked as blocked. Reason: API is not responding",
"task": {
"\_id": "64f1a2b3c4d5e6f7g8h9i0j1",
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding",
"status": "blocked",
"blockedAt": "2025-12-01T10:30:00.000Z"
}
}
\`\`\`

---

### 2. Get Blocked Tasks

**Endpoint:** `GET /api/blocked-tasks/list?userId=user123`

**Response:**
\`\`\`json
{
"success": true,
"message": "Found 3 blocked task(s)",
"tasks": [
{
"_id": "...",
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding",
"status": "blocked",
"blockedAt": "2025-12-01T10:30:00.000Z"
}
]
}
\`\`\`

---

### 3. Unblock Task

**Endpoint:** `PUT /api/blocked-tasks/unblock`

**Request:**
\`\`\`json
{
"userId": "user123",
"taskTitle": "fix login API"
}
\`\`\`

**Response:**
\`\`\`json
{
"success": true,
"message": "Task \"fix login API\" has been unblocked",
"task": {
"\_id": "...",
"status": "unblocked",
"unblockedAt": "2025-12-01T14:30:00.000Z"
}
}
\`\`\`

---

### 4. Get All Blocked Tasks (with filters)

**Endpoint:** `GET /api/blocked-tasks/all?status=blocked&userId=user123`

**Query Parameters:**

- `userId` (optional): Filter by user
- `status` (optional): Filter by status (blocked/unblocked)

---

### 5. Update Blocked Reason

**Endpoint:** `PUT /api/blocked-tasks/update-reason`

**Request:**
\`\`\`json
{
"taskId": "64f1a2b3c4d5e6f7g8h9i0j1",
"reason": "Updated reason: API team is working on the fix"
}
\`\`\`

---

### 6. Delete Blocked Task

**Endpoint:** `DELETE /api/blocked-tasks/delete`

**Request:**
\`\`\`json
{
"taskId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
\`\`\`

---

## 📊 Database Schema

### BlockedTask Collection

\`\`\`javascript
{
\_id: ObjectId,
userId: String, // User who owns the task (required)
taskTitle: String, // Task name (required)
reason: String, // Why it's blocked (required)
status: String, // 'blocked' or 'unblocked' (default: 'blocked')
blockedAt: Date, // When task was blocked (auto-generated)
unblockedAt: Date, // When task was unblocked (set on unblock)
originalTaskRef: String // Optional reference to original todo/task ID
}
\`\`\`

**Indexes:**

- `userId` (for fast user queries)
- `status` (for filtering blocked/unblocked)
- `userId + status` (compound index for filtered queries)

---

## 🎯 Use Cases

### 1. Development Team Blocker Tracking

\`\`\`
Developer: "Mark task implement payment gateway as blocked because waiting for API keys"
→ Task tracked with specific reason
→ Team knows what's blocking progress

Later: "Unblock task implement payment gateway"
→ Task can now proceed
\`\`\`

### 2. Daily Standup Reporting

\`\`\`
Team Member: "Show me the blocked tasks"
→ Quickly see all impediments
→ Discuss in standup meeting
→ Assign responsibility to unblock
\`\`\`

### 3. Dependency Management

\`\`\`
PM: "Mark task frontend integration as blocked because backend API not ready"
Backend Dev: (completes API) "Unblock task frontend integration"
→ Clear dependency tracking
\`\`\`

---

## 🧪 Testing

### Test with cURL

\`\`\`bash

# Mark task as blocked

curl -X POST http://localhost:3000/api/blocked-tasks/mark \\
-H "Content-Type: application/json" \\
-d '{
"userId": "user123",
"taskTitle": "fix login API",
"reason": "API is not responding"
}'

# Get blocked tasks

curl "http://localhost:3000/api/blocked-tasks/list?userId=user123"

# Unblock task

curl -X PUT http://localhost:3000/api/blocked-tasks/unblock \\
-H "Content-Type: application/json" \\
-d '{
"userId": "user123",
"taskTitle": "fix login API"
}'
\`\`\`

### Test with Node.js

\`\`\`bash
node test-blocked-tasks.js
\`\`\`

---

## 🎨 Frontend Integration Example

### React Component

\`\`\`jsx
import { useState, useEffect } from 'react';

function BlockedTasksManager() {
const [blockedTasks, setBlockedTasks] = useState([]);
const userId = "user123"; // From auth context

useEffect(() => {
fetchBlockedTasks();
}, []);

const fetchBlockedTasks = async () => {
const response = await fetch(
\`/api/blocked-tasks/list?userId=\${userId}\`
);
const data = await response.json();
setBlockedTasks(data.tasks || []);
};

const markAsBlocked = async (taskTitle, reason) => {
await fetch('/api/blocked-tasks/mark', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ userId, taskTitle, reason })
});
fetchBlockedTasks();
};

const unblockTask = async (taskTitle) => {
await fetch('/api/blocked-tasks/unblock', {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ userId, taskTitle })
});
fetchBlockedTasks();
};

return (
<div className="blocked-tasks">
<h2>🚧 Blocked Tasks</h2>

      {blockedTasks.length === 0 ? (
        <p>No blocked tasks! 🎉</p>
      ) : (
        <ul>
          {blockedTasks.map(task => (
            <li key={task._id} className="blocked-task-item">
              <div>
                <strong>{task.taskTitle}</strong>
                <p>Reason: {task.reason}</p>
                <small>Blocked since: {new Date(task.blockedAt).toLocaleDateString()}</small>
              </div>
              <button onClick={() => unblockTask(task.taskTitle)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

);
}

export default BlockedTasksManager;
\`\`\`

---

## ✅ Features Implemented

- [x] Database model created
- [x] Controller with all operations
- [x] API routes registered
- [x] Voice controller integration
- [x] AI intent detection (MARK_BLOCKED)
- [x] AI intent detection (SHOW_BLOCKED)
- [x] AI intent detection (UNBLOCK_TASK)
- [x] Case-insensitive task search
- [x] Fuzzy matching with suggestions
- [x] Duplicate prevention
- [x] Timestamp tracking
- [x] Database indexing
- [x] Error handling
- [x] Documentation
- [x] Test files

---

## 🎉 Ready to Use!

Your blocked task management feature is **100% complete** and ready to use!

### Quick Test

1. **Start server:** \`npm start\`
2. **Mark a task as blocked:**  
   Voice: "Mark the task fix login API as blocked because API is not responding"
3. **View blocked tasks:**  
   Voice: "Show me the blocked tasks"
4. **Unblock when ready:**  
   Voice: "Unblock the task fix login API"

**That's it! The feature is fully functional.** 🚀
