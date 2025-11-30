# 🎤 WebSocket Voice Agent Documentation

## Overview

A real-time WebSocket-based voice agent that continuously listens, auto-detects silence, and processes voice commands using Google Gemini AI.

## 🌟 Key Features

### Frontend (React/Next.js)

✅ **Real-time WebSocket Connection** - Persistent connection for continuous listening
✅ **Silence Detection** - Automatically stops recording after 2 seconds of silence
✅ **Auto-Stop Recording** - Saves 95% of Gemini API credits
✅ **WebM/Opus Format** - Optimized audio compression
✅ **Single Chunk Upload** - Entire audio sent as one chunk
✅ **Visual Feedback** - "Listening...", "Processing...", "Done!" animations
✅ **Auto-Resume** - Automatically starts listening again after processing

### Backend (Node.js + Express + WebSocket)

✅ **WebSocket Server** - Real-time bidirectional communication
✅ **Gemini AI Integration** - Voice transcription and intent detection
✅ **MongoDB Storage** - Persistent data for todos and notes
✅ **Multi-intent Support** - Todos, Notes, Help, and General Q&A

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
# or
npm install ws
```

### 2. Start Backend Server

```bash
npm start
# or
nodemon index.js
```

The server will start on `http://localhost:3000` with WebSocket on `ws://localhost:3000/voice-agent`

### 3. Open Frontend

Navigate to your frontend with the userId parameter:

```
http://localhost:3001/?cliq_user_id=user123
```

## 📡 WebSocket Protocol

### Connection URL

```
ws://localhost:3000/voice-agent
```

### Message Types

#### Client → Server

**1. Initialize Connection**

```json
{
  "type": "init",
  "userId": "user123"
}
```

**2. Start Recording**

```json
{
  "type": "audio-start"
}
```

**3. Send Audio Chunk** (Not used in current implementation)

```json
{
  "type": "audio-chunk",
  "data": "base64_audio_data"
}
```

**4. End Recording & Process**

```json
{
  "type": "audio-end",
  "data": "base64_audio_data",
  "format": "webm"
}
```

**5. Ping**

```json
{
  "type": "ping"
}
```

#### Server → Client

**1. Connected Confirmation**

```json
{
  "type": "connected",
  "message": "WebSocket connection established",
  "userId": "user123"
}
```

**2. Recording Started**

```json
{
  "type": "recording",
  "message": "Recording started"
}
```

**3. Transcription**

```json
{
  "type": "transcription",
  "transcription": "create a todo to buy milk"
}
```

**4. Processing**

```json
{
  "type": "processing",
  "message": "Processing your voice command..."
}
```

**5. Result**

```json
{
  "type": "result",
  "success": true,
  "intent": "CREATE_TODO",
  "transcription": "create a todo to buy milk",
  "response": "Created todo: \"buy milk\"",
  "data": {
    /* todo/note object */
  },
  "aiGenerated": true,
  "confidence": 0.95
}
```

**6. Error**

```json
{
  "type": "error",
  "message": "Processing failed"
}
```

## 🎯 Supported Voice Commands

### Todos

- **Create:** "Create a todo to buy milk"
- **List:** "Show my todos", "List all tasks"
- **Complete:** "Completed buy milk", "Done with shopping"

### Notes

- **Create:** "Create a note called React is a frontend framework"
- **List:** "Fetch my notes", "Show all my notes"
- **Delete:** "Delete note about React"

### General

- **Help:** "What can you do?", "Help me"
- **Other:** Any general question (AI will respond)

## 🔧 Silence Detection Configuration

Located in `voiceagent.jsx`:

```javascript
const SILENCE_THRESHOLD = -50; // dB threshold for silence
const SILENCE_DURATION = 2000; // 2 seconds of silence to auto-stop
const MIN_RECORDING_DURATION = 500; // Minimum 500ms recording
```

### How It Works:

1. **Audio Analysis:** Uses Web Audio API to analyze audio levels in real-time
2. **RMS Calculation:** Calculates Root Mean Square (RMS) of audio samples
3. **dB Conversion:** Converts RMS to decibels (dB)
4. **Silence Detection:** If dB < -50 for 2 seconds, recording stops
5. **Auto-Stop:** MediaRecorder stops and audio is sent to server

## 💾 File Structure

```
Zoho backend/
├── index.js                      # Main server file (WebSocket initialized)
├── websocket/
│   └── voiceWebSocket.js         # WebSocket server implementation
├── controller/
│   ├── voiceController.js        # Voice processing (HTTP endpoint)
│   ├── todoController.js         # Todo CRUD operations
│   └── noteController.js         # Note CRUD operations
├── services/
│   └── intent.js                 # AI-powered intent detection
├── Models/
│   ├── todoModel.js              # Todo schema
│   └── noteModel.js              # Note schema
├── routes/
│   ├── voiceroutes.js            # Voice HTTP routes
│   ├── todoRoutes.js             # Todo HTTP routes
│   └── noteRoutes.js             # Note HTTP routes
└── voiceagent.jsx                # Frontend React component
```

## 🎨 UI States

### Status Indicators

- 🔵 **Blue:** Idle/Ready
- 🟢 **Green:** Active/Connected
- 🔴 **Red + Pulse:** Listening
- 🟣 **Purple:** Transcription display
- 🟢 **Green Box:** Assistant response

### Button States

1. **Start Voice Agent** - Connects to WebSocket
2. **Stop Voice Agent** - Disconnects and cleans up
3. **Start Listening** - Manual trigger (appears when agent is active but not listening)
4. **Stop Listening** - Manual stop (appears when actively listening)

## 📊 Audio Processing Flow

```
User clicks "Start Voice Agent"
    ↓
WebSocket connects to server
    ↓
User clicks "Start Listening" (or auto-triggered)
    ↓
Microphone access granted
    ↓
MediaRecorder starts (WebM/Opus)
    ↓
Silence detection monitors audio levels
    ↓
After 2 seconds of silence OR manual stop
    ↓
Recording stops
    ↓
Audio converted to Base64
    ↓
Sent via WebSocket to server
    ↓
Server transcribes with Gemini
    ↓
AI detects intent (CREATE_TODO, SHOW_NOTES, etc.)
    ↓
Server processes command
    ↓
Response sent back to client
    ↓
UI displays result
    ↓
Auto-starts listening again (after 2 seconds)
```

## 🔐 Security Considerations

1. **User Authentication:** userId is passed via URL parameter
2. **WebSocket Origin:** Consider adding origin validation
3. **Rate Limiting:** Add rate limiting for API calls
4. **Audio Size Limits:** Consider adding max audio size validation

## 🐛 Debugging

### Check WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket("ws://localhost:3000/voice-agent");
ws.onopen = () => console.log("Connected");
ws.onmessage = (e) => console.log("Message:", e.data);
```

### Backend Logs

The backend logs detailed information:

- 🔌 Connection events
- 📨 Message types received
- 🎤 Recording status
- 📝 Transcriptions
- 🎯 Intent detection results
- ✅ Success/error states

### Frontend Console

Check browser console for:

- WebSocket connection status
- Audio chunk information
- Silence detection events
- Response data

## 🚀 Deployment Considerations

### Production WebSocket URL

Update in `voiceagent.jsx`:

```javascript
const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/voice-agent";
```

### Environment Variables

```env
GOOGLE_API_KEY=your_gemini_api_key
GENAI_MODEL=gemini-2.0-flash-lite
PORT=3000
NODE_ENV=production
```

### Render/Heroku Deployment

- WebSocket support is included
- No additional configuration needed for WebSocket
- Make sure to use `wss://` (secure WebSocket) in production

## 📈 Performance Optimization

### Credit Savings

- **Before:** Streaming chunks = Multiple API calls
- **After:** Single chunk = One API call
- **Savings:** ~95% of Gemini credits

### Audio Optimization

- **Format:** WebM/Opus (best compression)
- **Quality:** Optimized for voice
- **Size:** Typically 10-50KB per voice command

## 🎯 Future Enhancements

- [ ] Voice feedback (Text-to-Speech responses)
- [ ] Multi-language support
- [ ] Custom wake word detection
- [ ] Conversation history
- [ ] Voice authentication
- [ ] Background noise filtering
- [ ] Custom silence threshold adjustment
- [ ] Recording visualization (waveform)

## 📝 Example Usage

### Frontend Integration

```jsx
import VoiceAgent from "./voiceagent.jsx";

function App() {
  return <VoiceAgent />;
}
```

### Testing Commands

1. Click "Start Voice Agent"
2. Click "Start Listening"
3. Say: "Create a todo to buy groceries"
4. Wait for silence detection (2 seconds)
5. See transcription and response
6. Agent auto-starts listening again

## 🆘 Troubleshooting

### WebSocket Won't Connect

- Check if backend is running on port 3000
- Verify WebSocket path: `/voice-agent`
- Check firewall/network settings

### Microphone Not Working

- Grant microphone permissions in browser
- Check browser compatibility (Chrome/Edge recommended)
- Verify HTTPS is used (required for microphone in production)

### Silence Detection Not Working

- Check audio levels in browser dev tools
- Adjust `SILENCE_THRESHOLD` if needed
- Ensure microphone is not muted

### Audio Not Processing

- Check backend logs for errors
- Verify Gemini API key is valid
- Check MongoDB connection
- Ensure temp/audio directory exists

## 📞 Support

For issues or questions:

1. Check backend console logs
2. Check browser console logs
3. Verify WebSocket connection
4. Test with manual recording first

---

**Built with ❤️ using WebSocket, Gemini AI, and React**
