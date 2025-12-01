import { getTranscriberService } from "../Transcriber.js";
import detectIntent from "../services/intent.js";
import { createTodo, listTodos, completeTodo } from "./todoController.js";
import { createNote, listNotes, deleteNote } from "./noteController.js";
import {
  assignTask,
  getTasksAssignedToName,
} from "./assignedTaskController.js";
import {
  markTaskAsBlocked,
  getBlockedTasks,
  unblockTask,
} from "./blockedTaskController.js";
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
    const { intent, entity, assignedTo, reason, confidence, aiGenerated } =
      await detectIntent(transcription, userId);

    console.log(
      "🎯 Intent:",
      intent,
      "| Entity:",
      entity,
      "| AssignedTo:",
      assignedTo,
      "| Reason:",
      reason,
      "| User:",
      userId
    );
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

    if (intent === "CREATE_NOTE") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify what note you want to create",
          transcription,
        });
      }

      // Create note using controller
      const mockReq = { body: { userId, title: entity, content: entity } };
      const mockRes = formatResponse();
      result = await createNote(mockReq, mockRes);

      return res.json({
        success: true,
        intent,
        transcription,
        response: `Created note: "${entity}"`,
        data: result,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "SHOW_NOTES") {
      const mockReq = { params: { userId } };
      const mockRes = formatResponse();
      result = await listNotes(mockReq, mockRes);

      const notes = result.notes || [];
      const noteCount = notes.length;

      let response;
      if (noteCount === 0) {
        response = "You have no notes";
      } else {
        response = `Here are your ${noteCount} note(s):\n`;
        notes.forEach((note, index) => {
          response += `${index + 1}. ${note.title}\n`;
        });
        response = response.trim(); // Remove trailing newline
      }

      return res.json({
        success: true,
        intent,
        transcription,
        response: response,
        data: result,
        noteList: notes, // Include the actual note list for easy access
        count: noteCount,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "DELETE_NOTE") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify which note you want to delete",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Delete note using controller
      const mockReq = { body: { userId, title: entity } };
      const mockRes = formatResponse();
      result = await deleteNote(mockReq, mockRes);

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

    if (intent === "ASSIGN_TASK") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify what task you want to assign",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      if (!assignedTo || assignedTo.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify who you want to assign the task to",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Assign task using controller
      const mockReq = {
        body: {
          assignedBy: userId,
          assignedTo: assignedTo.trim(),
          taskDescription: entity.trim(),
        },
      };
      const mockRes = formatResponse();
      result = await assignTask(mockReq, mockRes);

      return res.json({
        success: true,
        intent,
        transcription,
        response: `Assigned task "${entity}" to ${assignedTo}`,
        data: result,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "SHOW_ASSIGNED_TO") {
      if (!assignedTo || assignedTo.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify whose tasks you want to see",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Get tasks assigned to a person using controller
      const mockReq = { query: { assignedTo: assignedTo.trim() } };
      const mockRes = formatResponse();
      result = await getTasksAssignedToName(mockReq, mockRes);

      const tasks = result.tasks || [];
      const taskCount = tasks.length;

      let response;
      if (taskCount === 0) {
        response = `No tasks found assigned to ${assignedTo}`;
      } else {
        response = `Found ${taskCount} task(s) assigned to ${assignedTo}:\n`;
        tasks.forEach((task, index) => {
          response += `${index + 1}. ${task.taskDescription} (Status: ${
            task.status
          })\n`;
        });
        response = response.trim(); // Remove trailing newline
      }

      return res.json({
        success: true,
        intent,
        transcription,
        response: response,
        data: result,
        taskList: tasks,
        count: taskCount,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "MARK_BLOCKED") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify which task you want to mark as blocked",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      if (!reason || reason.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify the reason why the task is blocked",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Mark task as blocked using controller
      const mockReq = {
        body: {
          userId: userId,
          taskTitle: entity.trim(),
          reason: reason.trim(),
        },
      };
      const mockRes = formatResponse();
      result = await markTaskAsBlocked(mockReq, mockRes);

      return res.json({
        success: true,
        intent,
        transcription,
        response: `Task "${entity}" has been marked as blocked. Reason: ${reason}`,
        data: result,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "SHOW_BLOCKED") {
      // Get blocked tasks using controller
      const mockReq = { query: { userId: userId } };
      const mockRes = formatResponse();
      result = await getBlockedTasks(mockReq, mockRes);

      const tasks = result.tasks || [];
      const taskCount = tasks.length;

      let response;
      if (taskCount === 0) {
        response = "You have no blocked tasks";
      } else {
        response = `You have ${taskCount} blocked task(s):\n`;
        tasks.forEach((task, index) => {
          response += `${index + 1}. ${task.taskTitle} - Reason: ${
            task.reason
          }\n`;
        });
        response = response.trim();
      }

      return res.json({
        success: true,
        intent,
        transcription,
        response: response,
        data: result,
        taskList: tasks,
        count: taskCount,
        aiGenerated: aiGenerated,
        confidence: confidence,
      });
    }

    if (intent === "UNBLOCK_TASK") {
      if (!entity || entity.trim() === "") {
        return res.json({
          success: false,
          message: "Please specify which task you want to unblock",
          transcription,
          aiGenerated: aiGenerated,
          confidence: confidence,
        });
      }

      // Unblock task using controller
      const mockReq = {
        body: {
          userId: userId,
          taskTitle: entity.trim(),
        },
      };
      const mockRes = formatResponse();
      result = await unblockTask(mockReq, mockRes);

      if (result.success === false) {
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
          "I can help you create and manage todo items, notes, assign tasks to teammates, and track blocked tasks. Say 'create todo [your task]' to add a task, 'show my todos' to see your list, 'assign task [description] to [name]' to assign tasks, 'mark task [name] as blocked because [reason]' to track blockers, or 'show blocked tasks' to see what's stuck.",
        availableCommands: [
          "Create todo [task description]",
          "Add task [task description]",
          "Show my todos",
          "List my tasks",
          "Completed [task description]",
          "Done with [task description]",
          "Finished [task description]",
          "Create note [note content]",
          "Add note [note content]",
          "Fetch my notes",
          "Show my notes",
          "Delete note [note title]",
          "Assign task [description] to [name]",
          "Show tasks assigned to [name]",
          "Mark task [name] as blocked because [reason]",
          "Show me the blocked tasks",
          "Unblock task [name]",
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
      response: `I heard: "${transcription}". I can help you create todos, notes, or show your lists. Try saying "create todo buy groceries", "create note react is a front end", "show my todos", or "fetch my notes".`,
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
