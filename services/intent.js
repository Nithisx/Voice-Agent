import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
let genAI = null;
let model = null;

function initializeAI() {
  if (!genAI && process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  }
}

// AI-powered intent detection
async function detectIntentWithAI(text, userId = null) {
  initializeAI();

  if (!model) {
    console.log(
      "⚠️ Gemini AI not available, falling back to rule-based detection"
    );
    return detectIntentBasic(text, userId);
  }

  try {
    const prompt = `
You are an intelligent voice assistant that helps users manage their todo lists. Analyze the user's message and determine their intent.

AVAILABLE INTENTS:
1. CREATE_TODO - User wants to create a new todo item
2. SHOW_TODOS - User wants to see their existing todo list
3. COMPLETE_TODO - User wants to mark a todo item as completed/done and remove it
4. CREATE_NOTE - User wants to create a new note
5. SHOW_NOTES - User wants to see their existing notes
6. DELETE_NOTE - User wants to delete a specific note
7. ASSIGN_TASK - User wants to assign a task to a teammate (e.g., "Assign task API testing to Arjun")
8. SHOW_ASSIGNED_TO - User wants to see tasks assigned to a specific person (e.g., "Show tasks assigned to Arjun")
9. MARK_BLOCKED - User wants to mark a task as blocked/stuck with a reason (e.g., "Mark the task fix login API as blocked because API is not responding")
10. SHOW_BLOCKED - User wants to see their blocked tasks (e.g., "Show me the blocked tasks")
11. UNBLOCK_TASK - User wants to unblock a task (e.g., "Unblock the task fix login API")
12. OTHER - General questions or requests not related to todos or notes

INSTRUCTIONS:
- If the user wants to create/add a todo/task/reminder, respond with CREATE_TODO intent
- If the user wants to view/show/list their todos/tasks, respond with SHOW_TODOS intent
- If the user wants to complete/finish/done a specific task, respond with COMPLETE_TODO intent
- If the user wants to create/add a note, respond with CREATE_NOTE intent
- If the user wants to view/show/list/fetch their notes, respond with SHOW_NOTES intent
- If the user wants to delete/remove a note, respond with DELETE_NOTE intent
- If the user wants to assign a task to someone, respond with ASSIGN_TASK intent and extract both task and assignee name
- If the user wants to see tasks assigned to a specific person, respond with SHOW_ASSIGNED_TO intent
- If the user wants to mark a task as blocked/stuck, respond with MARK_BLOCKED intent and extract task title and blocking reason
- If the user wants to see blocked tasks, respond with SHOW_BLOCKED intent
- If the user wants to unblock a task, respond with UNBLOCK_TASK intent and extract task title
- For any other question (like "What is the capital of India?"), use OTHER intent and provide a helpful answer

USER MESSAGE: "${text}"

Respond in this EXACT JSON format:
{
  "intent": "CREATE_TODO|SHOW_TODOS|COMPLETE_TODO|CREATE_NOTE|SHOW_NOTES|DELETE_NOTE|ASSIGN_TASK|SHOW_ASSIGNED_TO|MARK_BLOCKED|SHOW_BLOCKED|UNBLOCK_TASK|OTHER",
  "entity": "extracted task/note text for CREATE intents, task/note to complete/delete, task title for MARK_BLOCKED/UNBLOCK_TASK, null for SHOW intents, or your answer for OTHER",
  "assignedTo": "name of person for ASSIGN_TASK or SHOW_ASSIGNED_TO, null otherwise",
  "reason": "blocking reason for MARK_BLOCKED, null otherwise",
  "confidence": 0.0-1.0
}

Examples:
- "Create a todo to buy milk" → {"intent": "CREATE_TODO", "entity": "buy milk", "assignedTo": null, "confidence": 0.95}
- "Add task call mom" → {"intent": "CREATE_TODO", "entity": "call mom", "assignedTo": null, "confidence": 0.95}
- "Create me a to-do list called buy milk" → {"intent": "CREATE_TODO", "entity": "buy milk", "assignedTo": null, "confidence": 0.95}
- "Make a todo for grocery shopping" → {"intent": "CREATE_TODO", "entity": "grocery shopping", "assignedTo": null, "confidence": 0.95}
- "Show my todos" → {"intent": "SHOW_TODOS", "entity": null, "assignedTo": null, "confidence": 0.95}
- "List all my tasks" → {"intent": "SHOW_TODOS", "entity": null, "assignedTo": null, "confidence": 0.95}
- "Completed buy milk" → {"intent": "COMPLETE_TODO", "entity": "buy milk", "assignedTo": null, "confidence": 0.95}
- "Done with call mom" → {"intent": "COMPLETE_TODO", "entity": "call mom", "assignedTo": null, "confidence": 0.95}
- "Finished grocery shopping" → {"intent": "COMPLETE_TODO", "entity": "grocery shopping", "assignedTo": null, "confidence": 0.95}
- "Complete task buy milk" → {"intent": "COMPLETE_TODO", "entity": "buy milk", "assignedTo": null, "confidence": 0.95}
- "Create me a note called react is a front end" → {"intent": "CREATE_NOTE", "entity": "react is a front end", "assignedTo": null, "confidence": 0.95}
- "Create a note about JavaScript" → {"intent": "CREATE_NOTE", "entity": "JavaScript", "assignedTo": null, "confidence": 0.95}
- "Add note meeting summary" → {"intent": "CREATE_NOTE", "entity": "meeting summary", "assignedTo": null, "confidence": 0.95}
- "Fetch my notes" → {"intent": "SHOW_NOTES", "entity": null, "assignedTo": null, "confidence": 0.95}
- "Show all my notes" → {"intent": "SHOW_NOTES", "entity": null, "assignedTo": null, "confidence": 0.95}
- "List my notes" → {"intent": "SHOW_NOTES", "entity": null, "assignedTo": null, "confidence": 0.95}
- "Delete note react" → {"intent": "DELETE_NOTE", "entity": "react", "assignedTo": null, "confidence": 0.95}
- "Remove note JavaScript" → {"intent": "DELETE_NOTE", "entity": "JavaScript", "assignedTo": null, "confidence": 0.95}
- "Assign task API testing to Arjun" → {"intent": "ASSIGN_TASK", "entity": "API testing", "assignedTo": "Arjun", "confidence": 0.95}
- "Assign database migration to Sarah" → {"intent": "ASSIGN_TASK", "entity": "database migration", "assignedTo": "Sarah", "confidence": 0.95}
- "Give task code review to Mike" → {"intent": "ASSIGN_TASK", "entity": "code review", "assignedTo": "Mike", "confidence": 0.95}
- "Show me tasks assigned to Arjun" → {"intent": "SHOW_ASSIGNED_TO", "entity": null, "assignedTo": "Arjun", "confidence": 0.95}
- "Show tasks assigned to my name Arjun" → {"intent": "SHOW_ASSIGNED_TO", "entity": null, "assignedTo": "Arjun", "reason": null, "confidence": 0.95}
- "List all tasks for Sarah" → {"intent": "SHOW_ASSIGNED_TO", "entity": null, "assignedTo": "Sarah", "reason": null, "confidence": 0.95}
- "Mark the task fix login API as blocked because API is not responding" → {"intent": "MARK_BLOCKED", "entity": "fix login API", "assignedTo": null, "reason": "API is not responding", "confidence": 0.95}
- "Mark task database migration as stuck because waiting for permissions" → {"intent": "MARK_BLOCKED", "entity": "database migration", "assignedTo": null, "reason": "waiting for permissions", "confidence": 0.95}
- "Show me the blocked tasks" → {"intent": "SHOW_BLOCKED", "entity": null, "assignedTo": null, "reason": null, "confidence": 0.95}
- "List all blocked tasks" → {"intent": "SHOW_BLOCKED", "entity": null, "assignedTo": null, "reason": null, "confidence": 0.95}
- "Unblock the task fix login API" → {"intent": "UNBLOCK_TASK", "entity": "fix login API", "assignedTo": null, "reason": null, "confidence": 0.95}
- "Unblock task database migration" → {"intent": "UNBLOCK_TASK", "entity": "database migration", "assignedTo": null, "reason": null, "confidence": 0.95}
- "What is the capital of India?" → {"intent": "OTHER", "entity": "The capital of India is New Delhi.", "assignedTo": null, "reason": null, "confidence": 0.95}
- "How's the weather?" → {"intent": "OTHER", "entity": "I'm a todo assistant and don't have access to weather data. You can check weather apps or websites for current conditions.", "assignedTo": null, "reason": null, "confidence": 0.95}

CRITICAL INSTRUCTIONS:
- For CREATE_TODO, extract ONLY the task description (remove words like "create", "todo", "task", "add", "me", "a", "called")
- For COMPLETE_TODO, extract ONLY the task description to complete (remove words like "completed", "done", "finished", "complete", "task")
- For CREATE_NOTE, extract ONLY the note content (remove words like "create", "note", "add", "me", "a", "called", "about")
- For DELETE_NOTE, extract ONLY the note title to delete (remove words like "delete", "remove", "note")
- For ASSIGN_TASK, extract the task description in "entity" and the person's name in "assignedTo" (remove words like "assign", "task", "to", "give")
- For SHOW_ASSIGNED_TO, extract the person's name in "assignedTo" and set entity to null (remove words like "show", "tasks", "assigned", "to", "my", "name")
- For MARK_BLOCKED, extract task title in "entity" and blocking reason in "reason" (remove words like "mark", "task", "as", "blocked", "because", "stuck")
- For SHOW_BLOCKED, set entity, assignedTo, and reason to null
- For UNBLOCK_TASK, extract task title in "entity" and set reason to null (remove words like "unblock", "task", "the")
- For OTHER intent, provide a helpful and polite response
- Return ONLY valid JSON, NO markdown code blocks, NO additional text, NO formatting
- Do NOT wrap the response in triple backticks or code blocks
- Response must be pure JSON that can be directly parsed
`;

    console.log("🤖 Using AI for intent detection...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text().trim();

    console.log("🎯 AI Response:", aiResponse);

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = aiResponse;
      if (cleanResponse.includes("```json")) {
        cleanResponse = cleanResponse
          .replace(/```json\s*/g, "")
          .replace(/```\s*$/g, "")
          .trim();
      } else if (cleanResponse.includes("```")) {
        cleanResponse = cleanResponse.replace(/```\s*/g, "").trim();
      }

      console.log("🧹 Cleaned AI Response:", cleanResponse);

      const parsed = JSON.parse(cleanResponse);

      // Validate the response structure
      if (
        !parsed.intent ||
        ![
          "CREATE_TODO",
          "SHOW_TODOS",
          "COMPLETE_TODO",
          "CREATE_NOTE",
          "SHOW_NOTES",
          "DELETE_NOTE",
          "ASSIGN_TASK",
          "SHOW_ASSIGNED_TO",
          "MARK_BLOCKED",
          "SHOW_BLOCKED",
          "UNBLOCK_TASK",
          "OTHER",
        ].includes(parsed.intent)
      ) {
        console.log(
          "❌ Invalid intent in AI response, falling back to basic detection"
        );
        return detectIntentBasic(text, userId);
      }

      console.log("✅ AI intent detection successful:", parsed.intent);
      return {
        intent: parsed.intent,
        entity: parsed.entity,
        assignedTo: parsed.assignedTo || null,
        reason: parsed.reason || null,
        userId: userId,
        confidence: parsed.confidence || 0.8,
        aiGenerated: true,
      };
    } catch (parseError) {
      console.log("❌ Failed to parse AI response:", parseError.message);
      console.log("❌ Raw response:", aiResponse);
      return detectIntentBasic(text, userId);
    }
  } catch (error) {
    console.log("❌ AI intent detection failed:", error.message);
    return detectIntentBasic(text, userId);
  }
}

// Fallback rule-based detection
function detectIntentBasic(text, userId = null) {
  const lower = text.toLowerCase();

  // 1. Create Todo - Multiple variations
  if (
    lower.includes("create") &&
    (lower.includes("todo") ||
      lower.includes("task") ||
      lower.includes("reminder"))
  ) {
    // Extract the task text after create todo/task/reminder
    let item = lower.replace(/create\s+(todo|task|reminder)\s*/i, "").trim();
    if (!item) {
      // If no specific text, extract everything after "create"
      item = lower.replace(/create\s*/i, "").trim();
    }
    return {
      intent: "CREATE_TODO",
      entity: item,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Alternative create patterns
  if (
    lower.startsWith("add") &&
    (lower.includes("todo") || lower.includes("task"))
  ) {
    const item = lower.replace(/add\s+(todo|task)\s*/i, "").trim();
    return {
      intent: "CREATE_TODO",
      entity: item,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Complete Todo - Multiple variations
  if (
    (lower.includes("completed") ||
      lower.includes("done") ||
      lower.includes("finished") ||
      lower.includes("complete")) &&
    !lower.includes("create")
  ) {
    // Extract the task text
    let item = lower
      .replace(/completed?\s*/i, "")
      .replace(/done\s*(with)?\s*/i, "")
      .replace(/finished?\s*/i, "")
      .replace(/complete\s*/i, "")
      .replace(/task\s*/i, "")
      .replace(/todo\s*/i, "")
      .replace(/this\s*/i, "")
      .trim();

    return {
      intent: "COMPLETE_TODO",
      entity: item,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // 2. Show/List Todos - Multiple variations
  if (
    (lower.includes("show") ||
      lower.includes("list") ||
      lower.includes("get") ||
      lower.includes("see")) &&
    (lower.includes("todo") ||
      lower.includes("task") ||
      lower.includes("reminder"))
  ) {
    return {
      intent: "SHOW_TODOS",
      entity: null,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Create Note - Multiple variations
  if (
    (lower.includes("create") ||
      lower.includes("add") ||
      lower.includes("make")) &&
    lower.includes("note")
  ) {
    // Extract the note text
    let item = lower
      .replace(/create\s*(me)?\s*(a)?\s*note\s*(called|about)?\s*/i, "")
      .replace(/add\s*(a)?\s*note\s*(called|about)?\s*/i, "")
      .replace(/make\s*(a)?\s*note\s*(called|about)?\s*/i, "")
      .trim();
    return {
      intent: "CREATE_NOTE",
      entity: item,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Show/List Notes - Multiple variations
  if (
    (lower.includes("show") ||
      lower.includes("list") ||
      lower.includes("get") ||
      lower.includes("fetch") ||
      lower.includes("see")) &&
    lower.includes("note")
  ) {
    return {
      intent: "SHOW_NOTES",
      entity: null,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Delete Note - Multiple variations
  if (
    (lower.includes("delete") || lower.includes("remove")) &&
    lower.includes("note")
  ) {
    // Extract the note title
    let item = lower
      .replace(/delete\s*(the)?\s*note\s*/i, "")
      .replace(/remove\s*(the)?\s*note\s*/i, "")
      .trim();
    return {
      intent: "DELETE_NOTE",
      entity: item,
      assignedTo: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Assign Task - Multiple variations
  if (
    (lower.includes("assign") || lower.includes("give")) &&
    (lower.includes("task") || lower.includes("to"))
  ) {
    // Extract task and assignee name
    // Pattern: "assign task [TASK] to [NAME]" or "assign [TASK] to [NAME]"
    let taskMatch = lower.match(/assign\s*(task)?\s*(.+?)\s+to\s+(.+)/i);
    if (!taskMatch) {
      // Try alternative pattern: "give task [TASK] to [NAME]"
      taskMatch = lower.match(/give\s*(task)?\s*(.+?)\s+to\s+(.+)/i);
    }

    if (taskMatch) {
      const task = taskMatch[2].trim();
      const assignee = taskMatch[3].trim();
      return {
        intent: "ASSIGN_TASK",
        entity: task,
        assignedTo: assignee,
        userId,
        confidence: 0.7,
        aiGenerated: false,
      };
    }
  }

  // Show Tasks Assigned To - Multiple variations
  if (
    (lower.includes("show") ||
      lower.includes("list") ||
      lower.includes("get") ||
      lower.includes("fetch")) &&
    lower.includes("assigned") &&
    lower.includes("to")
  ) {
    // Extract the name after "to"
    // Patterns: "show tasks assigned to [NAME]" or "show me tasks assigned to my name [NAME]"
    let nameMatch = lower.match(/assigned\s+to\s+(my\s+name\s+)?(.+)/i);
    if (nameMatch) {
      const name = nameMatch[2].trim();
      return {
        intent: "SHOW_ASSIGNED_TO",
        entity: null,
        assignedTo: name,
        reason: null,
        userId,
        confidence: 0.7,
        aiGenerated: false,
      };
    }
  }

  // Mark Task as Blocked - Multiple variations
  if (
    (lower.includes("mark") || lower.includes("set")) &&
    lower.includes("task") &&
    (lower.includes("blocked") || lower.includes("stuck")) &&
    (lower.includes("because") || lower.includes("as"))
  ) {
    // Extract task title and reason
    // Pattern: "mark the task [TASK] as blocked because [REASON]"
    let match = lower.match(
      /mark\s+(the\s+)?task\s+(.+?)\s+as\s+(blocked|stuck)\s+because\s+(.+)/i
    );
    if (!match) {
      // Try alternative pattern: "mark task [TASK] blocked because [REASON]"
      match = lower.match(
        /mark\s+task\s+(.+?)\s+(blocked|stuck)\s+because\s+(.+)/i
      );
      if (match) {
        const task = match[1].trim();
        const reason = match[3].trim();
        return {
          intent: "MARK_BLOCKED",
          entity: task,
          assignedTo: null,
          reason: reason,
          userId,
          confidence: 0.7,
          aiGenerated: false,
        };
      }
    } else {
      const task = match[2].trim();
      const reason = match[4].trim();
      return {
        intent: "MARK_BLOCKED",
        entity: task,
        assignedTo: null,
        reason: reason,
        userId,
        confidence: 0.7,
        aiGenerated: false,
      };
    }
  }

  // Show Blocked Tasks - Multiple variations
  if (
    (lower.includes("show") ||
      lower.includes("list") ||
      lower.includes("get") ||
      lower.includes("fetch")) &&
    (lower.includes("blocked") || lower.includes("stuck")) &&
    lower.includes("task")
  ) {
    return {
      intent: "SHOW_BLOCKED",
      entity: null,
      assignedTo: null,
      reason: null,
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
  }

  // Unblock Task - Multiple variations
  if (lower.includes("unblock") && lower.includes("task")) {
    // Extract task title
    // Pattern: "unblock the task [TASK]" or "unblock task [TASK]"
    let match = lower.match(/unblock\s+(the\s+)?task\s+(.+)/i);
    if (match) {
      const task = match[2].trim();
      return {
        intent: "UNBLOCK_TASK",
        entity: task,
        assignedTo: null,
        reason: null,
        userId,
        confidence: 0.7,
        aiGenerated: false,
      };
    }
  }

  // 3. What can I do / Help
  if (
    lower.includes("what can") ||
    lower.includes("help") ||
    lower.includes("how")
  ) {
    return {
      intent: "HELP",
      entity: null,
      assignedTo: null,
      reason: null,
      userId,
      confidence: 0.8,
      aiGenerated: false,
    };
  }

  return {
    intent: "UNKNOWN",
    entity: text,
    assignedTo: null,
    reason: null,
    userId,
    confidence: 0.3,
    aiGenerated: false,
  };
}

// Export the AI-powered function as default
export default detectIntentWithAI;
