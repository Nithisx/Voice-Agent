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
4. OTHER - General questions or requests not related to todos

INSTRUCTIONS:
- If the user wants to create/add a todo/task/reminder, respond with CREATE_TODO intent
- If the user wants to view/show/list their todos/tasks, respond with SHOW_TODOS intent
- If the user wants to complete/finish/done a specific task, respond with COMPLETE_TODO intent
- For any other question (like "What is the capital of India?"), use OTHER intent and provide a helpful answer

USER MESSAGE: "${text}"

Respond in this EXACT JSON format:
{
  "intent": "CREATE_TODO|SHOW_TODOS|COMPLETE_TODO|OTHER",
  "entity": "extracted task text for CREATE_TODO, task to complete for COMPLETE_TODO, null for SHOW_TODOS, or your answer for OTHER",
  "confidence": 0.0-1.0
}

Examples:
- "Create a todo to buy milk" → {"intent": "CREATE_TODO", "entity": "buy milk", "confidence": 0.95}
- "Add task call mom" → {"intent": "CREATE_TODO", "entity": "call mom", "confidence": 0.95}
- "Create me a to-do list called buy milk" → {"intent": "CREATE_TODO", "entity": "buy milk", "confidence": 0.95}
- "Make a todo for grocery shopping" → {"intent": "CREATE_TODO", "entity": "grocery shopping", "confidence": 0.95}
- "Show my todos" → {"intent": "SHOW_TODOS", "entity": null, "confidence": 0.95}
- "List all my tasks" → {"intent": "SHOW_TODOS", "entity": null, "confidence": 0.95}
- "Completed buy milk" → {"intent": "COMPLETE_TODO", "entity": "buy milk", "confidence": 0.95}
- "Done with call mom" → {"intent": "COMPLETE_TODO", "entity": "call mom", "confidence": 0.95}
- "Finished grocery shopping" → {"intent": "COMPLETE_TODO", "entity": "grocery shopping", "confidence": 0.95}
- "Complete task buy milk" → {"intent": "COMPLETE_TODO", "entity": "buy milk", "confidence": 0.95}
- "What is the capital of India?" → {"intent": "OTHER", "entity": "The capital of India is New Delhi.", "confidence": 0.95}
- "How's the weather?" → {"intent": "OTHER", "entity": "I'm a todo assistant and don't have access to weather data. You can check weather apps or websites for current conditions.", "confidence": 0.95}

CRITICAL INSTRUCTIONS:
- For CREATE_TODO, extract ONLY the task description (remove words like "create", "todo", "task", "add", "me", "a", "called")
- For COMPLETE_TODO, extract ONLY the task description to complete (remove words like "completed", "done", "finished", "complete", "task")
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
        !["CREATE_TODO", "SHOW_TODOS", "COMPLETE_TODO", "OTHER"].includes(
          parsed.intent
        )
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
      userId,
      confidence: 0.7,
      aiGenerated: false,
    };
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
      userId,
      confidence: 0.8,
      aiGenerated: false,
    };
  }

  return {
    intent: "UNKNOWN",
    entity: text,
    userId,
    confidence: 0.3,
    aiGenerated: false,
  };
}

// Export the AI-powered function as default
export default detectIntentWithAI;
