# Voice Agent Todo Assistant

A complete voice-controlled todo management system that processes voice commands to create and manage todo lists.

## 🚀 Features

- **Voice Transcription**: Convert speech to text using Google's Gemini AI
- **Intent Recognition**: Understand user commands (create todo, show todos, help)
- **Todo Management**: Create and retrieve todo items per user
- **User Authentication**: OAuth integration with Zoho
- **RESTful API**: Complete API for voice and web interactions

## 📋 Workflow

1. **Voice Input**: User uploads audio file to `/api/transcribe`
2. **Transcription**: Audio converted to text using Gemini AI
3. **Intent Detection**: System identifies what user wants to do
4. **Action Execution**: Performs the requested action (create/show todos)
5. **Response**: Returns results in JSON format

## 🛠️ Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Run tests to verify setup:

```bash
node test.js
```

4. Start the server:

```bash
node index.js
```

## 📡 API Endpoints

### Main Voice Agent

**POST** `/api/transcribe`

- Upload audio file and get complete voice processing
- **Headers**: `userId: string` (required)
- **Body**: `multipart/form-data` with audio file
- **Response**: Action result based on voice command

### Transcription Only

**POST** `/api/transcribe-only`

- Just transcribe audio to text
- **Body**: `multipart/form-data` with audio file

### Todo Management

**POST** `/api/todos/create`

- Create new todo item
- **Body**: `{ userId: string, text: string }`

**GET** `/api/todos/list/:userId`

- Get all todos for user

### Documentation

**GET** `/api/docs`

- API documentation and usage guide

## 🎙️ Voice Commands

- **"Create todo buy groceries"** → Creates new todo item
- **"Add task call mom"** → Creates new task
- **"Show my todos"** → Lists all user's todos
- **"List my tasks"** → Shows current todo list
- **"What can you do?"** → Shows help information
- **"Help"** → Displays available commands

## 🧪 Testing

Test individual components:

```bash
node test.js
```

Test with cURL:

```bash
# Test transcription with userId header
curl -X POST http://localhost:3000/api/transcribe \
  -H "userId: test-user" \
  -F "audio=@path/to/audio.wav"

# Test todo creation
curl -X POST http://localhost:3000/api/todos/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "text": "Buy groceries"}'

# Test todo listing
curl http://localhost:3000/api/todos/list/test-user
```

## 📁 Project Structure

```
taskwithurl/
├── index.js              # Main Express app
├── routes/
│   ├── voiceroutes.js    # Voice processing endpoints
│   └── todoRoutes.js     # Todo CRUD endpoints
├── controller/
│   ├── voiceController.js # Voice workflow logic
│   └── todoController.js  # Todo operations
├── services/
│   └── intent.js         # Intent detection logic
├── Models/
│   └── todoModel.js      # MongoDB todo schema
├── Db/
│   └── db.js            # Database connection
├── middleware/
│   └── audioUpload.middleware.js # File upload handling
├── utils/
│   └── response.js      # Response formatting utilities
├── Transcriber.js       # Google Gemini transcription service
└── temp/audio/          # Temporary audio file storage
```

## 🔧 Configuration

### Required Environment Variables

- `GOOGLE_API_KEY`: Google AI API key for Gemini
- `OAUTH_*`: Zoho OAuth configuration
- `SESSION_SECRET`: Session encryption key
- Database connection is pre-configured but can be customized

### Supported Audio Formats

- WAV, MP3, OGG, WebM, M4A, AAC
- Max file size: 10MB
- Files stored temporarily and cleaned up automatically

## 🤖 Intent Recognition

The system recognizes these intents:

- **CREATE_TODO**: Create new todo items
  - Patterns: "create todo", "add task", "create reminder"
- **SHOW_TODOS**: Display user's todos
  - Patterns: "show todos", "list tasks", "see my reminders"
- **HELP**: Show available commands
  - Patterns: "help", "what can you do", "how to use"
- **UNKNOWN**: Fallback with suggestions

## 🔒 Security

- User identification via headers
- File upload validation and limits
- Session management for OAuth
- Input sanitization and validation

## 📝 Example Usage

```javascript
// Upload audio file with fetch
const formData = new FormData();
formData.append("audio", audioFile);

const response = await fetch("/api/transcribe", {
  method: "POST",
  headers: {
    userId: "user123",
  },
  body: formData,
});

const result = await response.json();
console.log(result.response); // "Created todo: buy groceries"
```

## 🚀 Deployment

The application is designed to work with Zoho Catalyst platform but can be deployed anywhere Node.js is supported.

For production:

1. Set proper environment variables
2. Configure HTTPS for OAuth redirects
3. Set up proper MongoDB connection
4. Configure file cleanup for temp audio files
