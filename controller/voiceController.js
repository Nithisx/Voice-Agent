import { getTranscriberService } from "../Transcriber.js";
import detectIntent from "../services/intent.js";
import { createTodo, listTodos, completeTodo } from "./todoController.js";
import formatResponse from "../utils/response.js";
import connectDB from "../Db/db.js";

// Initialize transcriber service
const transcriber = getTranscriberService(
  process.env.GOOGLE_API_KEY,
  process.env.GENAI_MODEL || "gemini-2.0-flash-lite"
);

export const processVoice = async (req, res) => {
  try {
    // Ensure database connection
    await connectDB();

    // Get userId from headers
    const userId = req.headers["userid"] || req.headers["userId"];
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId in headers",
      });
    }

    // Check if audio file exists
    if (!req.file && !req.audioFile) {
      return res.status(400).json({
        success: false,
        error: "No audio file provided",
      });
    }

    // 1. Transcribe the audio file
    const audioPath = req.audioFile ? req.audioFile.path : req.file.path;
    const transcription = await transcriber.transcribe(audioPath);

    console.log("📝 Transcription:", transcription);

    // 2. Detect intent from transcription using AI
    const { intent, entity, confidence, aiGenerated } = await detectIntent(
      transcription,
      userId
    );

    console.log("🎯 Intent:", intent, "| Entity:", entity, "| User:", userId);
    console.log("🤖 AI Generated:", aiGenerated, "| Confidence:", confidence); // 3. Process based on intent
    let result;

    if (intent === "CREATE_TODO") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify what todo item you want to create",
          transcription,
        });
      }

      // Create todo using controller
      const mockReq = { body: { userId, text: entity } };
      const mockRes = formatResponse();
      result = await createTodo(mockReq, mockRes);

      return res.json({
        success: true,
        intent,
        transcription,
        response: `Created todo: "${entity}"`,
        data: result,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "SHOW_TODOS") {
      const mockReq = { params: { userId } };
      const mockRes = formatResponse();
      result = await listTodos(mockReq, mockRes);

      const todos = result.todos || [];
      const todoCount = todos.length;

      let response;
      if (todoCount === 0) {
        response = "You have no todo items";
      } else {
        response = `Here are your ${todoCount} todo item(s):\n`;
        todos.forEach((todo, index) => {
          response += `${index + 1}. ${todo.text}\n`;
        });
        response = response.trim(); // Remove trailing newline
      }

      return res.json({
        success: true,
        intent,
        transcription,
        response: response,
        data: result,
        todoList: todos, // Include the actual todo list for easy access
        count: todoCount,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "COMPLETE_TODO") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify which todo item you want to complete",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Complete todo using controller
      const mockReq = { body: { userId, text: entity } };
      const mockRes = formatResponse();
      result = await completeTodo(mockReq, mockRes);

      if (result.error) {
        return res.json({
          success: false,
          intent,
          transcription,
          response: result.message,
          suggestions: result.suggestions || null,
          data: result,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      return res.json({
        success: true,
        intent,
        transcription,
        response: result.message,
        data: result,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "HELP") {
      return res.json({
        success: true,
        intent,
        transcription,
        response:
          "I can help you create and manage todo items. Say 'create todo [your task]' to add a new task, 'show my todos' to see your list, or 'completed [task]' to mark a task as done.",
        availableCommands: [
          "Create todo [task description]",
          "Add task [task description]",
          "Show my todos",
          "List my tasks",
          "Completed [task description]",
          "Done with [task description]",
          "Finished [task description]",
        ],
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "OTHER") {
      return res.json({
        success: true,
        intent,
        transcription,
        response:
          entity ||
          "I'm a todo assistant. I can help you create and manage todo items, but I can also try to answer general questions!",
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    // Unknown intent (fallback)
    return res.json({
      success: true,
      intent: intent || "UNKNOWN",
      transcription,
      response: `I heard: "${transcription}". I can help you create todos or show your todo list. Try saying "create todo buy groceries" or "show my todos".`,
      confidence: confidence || 0.3,
    });
  } catch (err) {
    console.error("❌ Voice processing error:", err);
    res.status(500).json({
      success: false,
      error: "Voice processing failed",
      message: err.message,
    });
  }
};
