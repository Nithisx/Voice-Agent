# Assigned Tasks API Documentation

This API allows you to assign tasks to teammates and fetch tasks assigned to specific people by name.

## Base URL

```
/api/assigned-tasks
```

## Endpoints

### 1. Assign Task to Teammate

**POST** `/api/assigned-tasks/assign`

Assign a task to a specific teammate by name.

**Request Body:**

```json
{
  "assignedBy": "user123",
  "assignedTo": "Arjun",
  "taskDescription": "API testing"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task \"API testing\" has been assigned to Arjun",
  "task": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "assignedBy": "user123",
    "assignedTo": "Arjun",
    "taskDescription": "API testing",
    "status": "pending",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

**Example Voice Commands:**

- "Assign task API testing to Arjun"
- "Assign database migration to Sarah"
- "Give task code review to Mike"

---

### 2. Fetch Tasks Assigned to a Specific Person

**GET** `/api/assigned-tasks/to?assignedTo=Arjun`

Get all tasks assigned to a specific person by their name.

**Query Parameters:**

- `assignedTo` (required): Name of the person

**Response:**

```json
{
  "success": true,
  "message": "Found 2 task(s) assigned to Arjun",
  "tasks": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "assignedBy": "user123",
      "assignedTo": "Arjun",
      "taskDescription": "API testing",
      "status": "pending",
      "createdAt": "2025-12-01T10:30:00.000Z"
    },
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "assignedBy": "user456",
      "assignedTo": "Arjun",
      "taskDescription": "Review pull request",
      "status": "in-progress",
      "createdAt": "2025-12-01T09:15:00.000Z"
    }
  ]
}
```

**Example Voice Commands:**

- "Show me tasks assigned to Arjun"
- "Show tasks assigned to my name Arjun"
- "List all tasks for Sarah"
- "Fetch tasks assigned to Mike"

---

### 3. Fetch Tasks Assigned by a User

**GET** `/api/assigned-tasks/by?assignedBy=user123`

Get all tasks that you have assigned to others.

**Query Parameters:**

- `assignedBy` (required): User ID of the person who assigned tasks

**Response:**

```json
{
  "success": true,
  "message": "Found 3 task(s) you assigned",
  "tasks": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "assignedBy": "user123",
      "assignedTo": "Arjun",
      "taskDescription": "API testing",
      "status": "pending",
      "createdAt": "2025-12-01T10:30:00.000Z"
    },
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "assignedBy": "user123",
      "assignedTo": "Sarah",
      "taskDescription": "Database migration",
      "status": "completed",
      "createdAt": "2025-12-01T08:00:00.000Z",
      "completedAt": "2025-12-01T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Get All Tasks (with Filters)

**GET** `/api/assigned-tasks/all`

Get all tasks with optional filtering.

**Query Parameters (all optional):**

- `status`: Filter by status (pending, in-progress, completed)
- `assignedBy`: Filter by user who assigned the task
- `assignedTo`: Filter by person name to whom task is assigned

**Examples:**

```
GET /api/assigned-tasks/all
GET /api/assigned-tasks/all?status=pending
GET /api/assigned-tasks/all?assignedBy=user123&status=completed
GET /api/assigned-tasks/all?assignedTo=Arjun&status=in-progress
```

**Response:**

```json
{
  "success": true,
  "message": "Found 5 task(s)",
  "tasks": [...]
}
```

---

### 5. Update Task Status

**PUT** `/api/assigned-tasks/status`

Update the status of a task.

**Request Body:**

```json
{
  "taskId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "status": "completed"
}
```

**Valid Status Values:**

- `pending`
- `in-progress`
- `completed`

**Response:**

```json
{
  "success": true,
  "message": "Task status updated to completed",
  "task": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "assignedBy": "user123",
    "assignedTo": "Arjun",
    "taskDescription": "API testing",
    "status": "completed",
    "createdAt": "2025-12-01T10:30:00.000Z",
    "completedAt": "2025-12-01T14:30:00.000Z"
  }
}
```

---

### 6. Delete Assigned Task

**DELETE** `/api/assigned-tasks/delete`

Delete a specific assigned task.

**Request Body:**

```json
{
  "taskId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task deleted successfully",
  "task": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "assignedBy": "user123",
    "assignedTo": "Arjun",
    "taskDescription": "API testing",
    "status": "pending",
    "createdAt": "2025-12-01T10:30:00.000Z"
  }
}
```

---

## Data Model

### AssignedTask Schema

```javascript
{
  assignedBy: String,      // User ID of person assigning (required)
  assignedTo: String,      // Name of person assigned to (required)
  taskDescription: String, // Task description (required)
  status: String,          // pending, in-progress, completed (default: pending)
  createdAt: Date,         // Auto-generated timestamp
  completedAt: Date        // Set when status becomes completed
}
```

---

## Voice Intent Detection

The system now supports AI-powered intent detection for assigned tasks:

### ASSIGN_TASK Intent

Detects when user wants to assign a task to someone.

**Example Phrases:**

- "Assign task API testing to Arjun"
- "Assign database migration to Sarah"
- "Give task code review to Mike"

**Intent Response:**

```json
{
  "intent": "ASSIGN_TASK",
  "entity": "API testing",
  "assignedTo": "Arjun",
  "confidence": 0.95
}
```

### SHOW_ASSIGNED_TO Intent

Detects when user wants to see tasks assigned to a specific person.

**Example Phrases:**

- "Show me tasks assigned to Arjun"
- "Show tasks assigned to my name Arjun"
- "List all tasks for Sarah"
- "Fetch tasks assigned to Mike"

**Intent Response:**

```json
{
  "intent": "SHOW_ASSIGNED_TO",
  "entity": null,
  "assignedTo": "Arjun",
  "confidence": 0.95
}
```

---

## Usage Examples

### JavaScript/React Example

```javascript
// Assign a task
async function assignTask(userId, teammateName, taskDescription) {
  const response = await fetch("/api/assigned-tasks/assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assignedBy: userId,
      assignedTo: teammateName,
      taskDescription: taskDescription,
    }),
  });
  return await response.json();
}

// Get tasks assigned to a person
async function getTasksForPerson(personName) {
  const response = await fetch(
    `/api/assigned-tasks/to?assignedTo=${encodeURIComponent(personName)}`
  );
  return await response.json();
}

// Get tasks I assigned
async function getMyAssignedTasks(userId) {
  const response = await fetch(`/api/assigned-tasks/by?assignedBy=${userId}`);
  return await response.json();
}

// Update task status
async function updateTaskStatus(taskId, status) {
  const response = await fetch("/api/assigned-tasks/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, status }),
  });
  return await response.json();
}

// Usage
await assignTask("user123", "Arjun", "API testing");
const arjunTasks = await getTasksForPerson("Arjun");
const myTasks = await getMyAssignedTasks("user123");
await updateTaskStatus("64f1a2b3...", "completed");
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**

- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found (task doesn't exist)
- `500`: Internal Server Error

---

## Notes

1. **Case-Insensitive Name Search**: When searching for tasks by `assignedTo`, the search is case-insensitive.

   - "Arjun", "arjun", and "ARJUN" will all return the same results

2. **Name Storage**: Names are stored exactly as provided but searched case-insensitively.

3. **Task Entity Search**: The system uses AI to extract the task description and assignee name from voice commands.

4. **Status Workflow**:

   - New tasks start as `pending`
   - Can be moved to `in-progress` when work begins
   - Mark as `completed` when done (automatically sets `completedAt` timestamp)

5. **Indexing**: The database is indexed on `assignedBy`, `assignedTo`, and the combination of both for optimal query performance.
