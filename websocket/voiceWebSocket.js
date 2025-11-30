import { WebSocketServer } from "ws";
import { getTranscriberService } from "../Transcriber.js";
import detectIntent from "../services/intent.js";
import {
  createTodo,
  listTodos,
  completeTodo,
} from "../controller/todoController.js";
import {
  createNote,
  listNotes,
  deleteNote,
} from "../controller/noteController.js";
import formatResponse from "../utils/response.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize transcriber service
const transcriber = getTranscriberService(
  process.env.GOOGLE_API_KEY,
  process.env.GENAI_MODEL || "gemini-2.0-flash-lite"
);

export function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: "/voice-agent",
  });

  console.log("✅ WebSocket server initialized on path: /voice-agent");

  wss.on("connection", (ws, req) => {
    console.log("🔌 New WebSocket connection established");

    let userId = null;
    let audioChunks = [];
    let isProcessing = false;

    ws.on("message", async (data) => {
      try {
        // Parse the message
        const message = JSON.parse(data.toString());

        console.log("📨 Received message type:", message.type);

        // Handle different message types
        switch (message.type) {
          case "init":
            // Initialize connection with userId
            userId = message.userId;
            console.log(`👤 User ID set: ${userId}`);
            ws.send(
              JSON.stringify({
                type: "connected",
                message: "WebSocket connection established",
                userId: userId,
              })
            );
            break;

          case "audio-start":
            // Start receiving audio
            console.log("🎤 Audio recording started");
            audioChunks = [];
            isProcessing = false;
            ws.send(
              JSON.stringify({
                type: "recording",
                message: "Recording started",
              })
            );
            break;

          case "audio-chunk":
            // Receive audio chunk
            if (!isProcessing) {
              const audioData = Buffer.from(message.data, "base64");
              audioChunks.push(audioData);
              console.log(`📦 Audio chunk received: ${audioData.length} bytes`);
            }
            break;

          case "audio-end":
            // Process the complete audio
            if (isProcessing) {
              console.log(
                "⚠️ Already processing, ignoring duplicate audio-end"
              );
              return;
            }

            isProcessing = true;
            console.log(
              `🔄 Processing audio... Total chunks: ${audioChunks.length}`
            );

            ws.send(
              JSON.stringify({
                type: "processing",
                message: "Processing your voice command...",
              })
            );

            if (audioChunks.length === 0) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "No audio data received",
                })
              );
              isProcessing = false;
              break;
            }

            // Combine all audio chunks
            const audioBuffer = Buffer.concat(audioChunks);
            console.log(`📊 Total audio size: ${audioBuffer.length} bytes`);

            // Save audio to temp file
            const tempDir = path.join(__dirname, "..", "temp", "audio");
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `voice-${Date.now()}.webm`);
            fs.writeFileSync(tempFilePath, audioBuffer);
            console.log(`💾 Audio saved to: ${tempFilePath}`);

            try {
              // Transcribe audio
              console.log("🎯 Transcribing audio...");
              const transcription = await transcriber.transcribe(tempFilePath);
              console.log("📝 Transcription:", transcription);

              // Send transcription immediately
              ws.send(
                JSON.stringify({
                  type: "transcription",
                  transcription: transcription,
                })
              );

              // Detect intent
              console.log("🧠 Detecting intent...");
              const { intent, entity, confidence, aiGenerated } =
                await detectIntent(transcription, userId);
              console.log(
                `🎯 Intent: ${intent} | Entity: ${entity} | Confidence: ${confidence}`
              );

              // Process based on intent
              let result = await processIntent(intent, entity, userId);

              // Send result to client
              ws.send(
                JSON.stringify({
                  type: "result",
                  success: true,
                  intent: intent,
                  transcription: transcription,
                  response: result.response,
                  data: result.data,
                  aiGenerated: aiGenerated,
                  confidence: confidence,
                })
              );

              console.log("✅ Processing complete");
            } catch (error) {
              console.error("❌ Processing error:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: error.message || "Processing failed",
                })
              );
            } finally {
              // Cleanup
              try {
                fs.unlinkSync(tempFilePath);
                console.log("🗑️ Temp file cleaned up");
              } catch (err) {
                console.error("⚠️ Failed to cleanup temp file:", err);
              }
              audioChunks = [];
              isProcessing = false;
            }
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.log("⚠️ Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("❌ WebSocket message error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to process message",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("🔌 WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });
  });

  return wss;
}

// Process intent and return response
async function processIntent(intent, entity, userId) {
  let result;

  switch (intent) {
    case "CREATE_TODO":
      if (!entity || entity.trim() === "") {
        return {
          response: "Please specify what todo item you want to create",
          data: null,
        };
      }
      const mockReqTodo = { body: { userId, text: entity } };
      const mockResTodo = formatResponse();
      result = await createTodo(mockReqTodo, mockResTodo);
      return {
        response: `Created todo: "${entity}"`,
        data: result,
      };

    case "SHOW_TODOS":
      const mockReqList = { params: { userId } };
      const mockResList = formatResponse();
      result = await listTodos(mockReqList, mockResList);
      const todos = result.todos || [];
      let todoResponse =
        todos.length === 0
          ? "You have no todo items"
          : `Here are your ${todos.length} todo item(s):\n${todos
              .map((t, i) => `${i + 1}. ${t.text}`)
              .join("\n")}`;
      return {
        response: todoResponse,
        data: result,
      };

    case "COMPLETE_TODO":
      if (!entity || entity.trim() === "") {
        return {
          response: "Please specify which todo item you want to complete",
          data: null,
        };
      }
      const mockReqComplete = { body: { userId, text: entity } };
      const mockResComplete = formatResponse();
      result = await completeTodo(mockReqComplete, mockResComplete);
      return {
        response: result.message || `Completed todo: "${entity}"`,
        data: result,
      };

    case "CREATE_NOTE":
      if (!entity || entity.trim() === "") {
        return {
          response: "Please specify what note you want to create",
          data: null,
        };
      }
      const mockReqNote = { body: { userId, title: entity, content: entity } };
      const mockResNote = formatResponse();
      result = await createNote(mockReqNote, mockResNote);
      return {
        response: `Created note: "${entity}"`,
        data: result,
      };

    case "SHOW_NOTES":
      const mockReqNoteList = { params: { userId } };
      const mockResNoteList = formatResponse();
      result = await listNotes(mockReqNoteList, mockResNoteList);
      const notes = result.notes || [];
      let noteResponse =
        notes.length === 0
          ? "You have no notes"
          : `Here are your ${notes.length} note(s):\n${notes
              .map((n, i) => `${i + 1}. ${n.title}`)
              .join("\n")}`;
      return {
        response: noteResponse,
        data: result,
      };

    case "DELETE_NOTE":
      if (!entity || entity.trim() === "") {
        return {
          response: "Please specify which note you want to delete",
          data: null,
        };
      }
      const mockReqDeleteNote = { body: { userId, title: entity } };
      const mockResDeleteNote = formatResponse();
      result = await deleteNote(mockReqDeleteNote, mockResDeleteNote);
      return {
        response: result.message || `Deleted note: "${entity}"`,
        data: result,
      };

    case "HELP":
      return {
        response:
          "I can help you create and manage todo items and notes. Say 'create todo buy groceries', 'show my todos', 'create note about React', or 'fetch my notes'.",
        data: null,
      };

    case "OTHER":
      return {
        response:
          entity ||
          "I'm a todo and notes assistant. I can help you create and manage your tasks and notes!",
        data: null,
      };

    default:
      return {
        response:
          "I can help you create todos, notes, or show your lists. Try saying 'create todo buy groceries' or 'fetch my notes'.",
        data: null,
      };
  }
}
