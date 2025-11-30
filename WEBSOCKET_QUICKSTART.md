# ✅ WebSocket Voice Agent - Quick Start

## 🎯 What's New?

Your voice agent now uses **WebSocket** for real-time communication with:

- ✅ **Auto-silence detection** (stops after 2 seconds of silence)
- ✅ **Single chunk upload** (saves 95% of Gemini credits)
- ✅ **Continuous listening** (auto-resumes after processing)
- ✅ **Real-time feedback** (listening, processing, done animations)
- ✅ **WebM/Opus format** (optimized compression)

## 🚀 How to Run

### 1. Start Backend

```bash
npm start
# or
nodemon index.js
```

Server will start on:

- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/voice-agent`

### 2. Open Frontend

```
http://localhost:3001/?cliq_user_id=user123
```

### 3. Use Voice Agent

1. Click **"Start Voice Agent"** → Connects to WebSocket
2. Click **"Start Listening"** → Begins recording
3. **Speak your command** → "Create a todo to buy milk"
4. **Wait 2 seconds** → Auto-stops when silent
5. **See result** → Transcription + Response displayed
6. **Auto-resumes** → Starts listening again automatically

## 🎤 Voice Commands

### Todos

- "Create a todo to buy groceries"
- "Show my todos"
- "Completed buy milk"

### Notes

- "Create a note called React is a frontend framework"
- "Fetch my notes"
- "Delete note about React"

## 📁 New Files Created

1. **websocket/voiceWebSocket.js** - WebSocket server
2. **voiceagent.jsx** - Updated frontend with WebSocket + silence detection
3. **WEBSOCKET_VOICE_AGENT_GUIDE.md** - Full documentation

## 📁 Modified Files

1. **index.js** - Added WebSocket initialization
2. **package.json** - Added `ws` package

## 🎨 UI Features

### Visual States

- 🔵 **Blue circle** - Idle
- 🟢 **Green circle** - Connected & ready
- 🔴 **Red pulsing** - Actively listening
- 🟣 **Purple box** - Shows what you said
- 🟢 **Green box** - Shows assistant response

### Buttons

- **Start Voice Agent** - Connects to server
- **Stop Voice Agent** - Disconnects
- **Start Listening** - Manual recording start
- **Stop Listening** - Manual recording stop

## 🔧 Configuration

### Adjust Silence Detection

In `voiceagent.jsx`:

```javascript
const SILENCE_THRESHOLD = -50; // dB level (-50 = fairly quiet)
const SILENCE_DURATION = 2000; // 2000ms = 2 seconds
```

### Change WebSocket URL

In `voiceagent.jsx`:

```javascript
const wsUrl = "ws://localhost:3000/voice-agent";
// For production: "wss://your-domain.com/voice-agent"
```

## 🐛 Troubleshooting

### WebSocket Not Connecting?

- ✅ Check backend is running
- ✅ Check console for errors
- ✅ Try refreshing the page

### Microphone Not Working?

- ✅ Grant microphone permissions
- ✅ Use Chrome or Edge browser
- ✅ Check browser security settings

### Recording Doesn't Stop?

- ✅ Speak louder (might be too quiet)
- ✅ Lower SILENCE_THRESHOLD
- ✅ Use manual stop button

## 💡 How It Saves Credits

### Before (Streaming):

```
Audio chunk 1 → API call 1
Audio chunk 2 → API call 2
Audio chunk 3 → API call 3
...
Total: 20+ API calls per recording
```

### After (Single Chunk):

```
Complete audio → 1 API call
Total: 1 API call per recording
Savings: ~95%!
```

## 📊 Flow Diagram

```
User → "Start Voice Agent"
  → WebSocket connects
  → "Start Listening"
  → Microphone records (WebM/Opus)
  → Silence detected (2 sec)
  → Auto-stop
  → Send to server
  → Gemini transcribes
  → AI detects intent
  → Process command
  → Send response
  → Display result
  → Auto-start listening again
```

## 🎯 Next Steps

1. Test all voice commands (todos, notes)
2. Adjust silence threshold if needed
3. Try continuous conversation mode
4. Deploy to production with WSS (secure WebSocket)

## 📚 Documentation

See **WEBSOCKET_VOICE_AGENT_GUIDE.md** for:

- Complete protocol specification
- API reference
- Advanced configuration
- Deployment guide
- Troubleshooting

---

**Ready to use! Just start the server and click "Start Voice Agent"** 🚀
