// Example usage of Voice API with Assigned Tasks feature
// This demonstrates how to send voice commands via API

const BASE_URL = "http://localhost:3000"; // Change to your server URL

/**
 * Helper function to create FormData with audio file
 * In a real application, you would get the audio file from a file input or recording
 */
function createFormDataWithAudio(audioBlob, userId) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "voice.webm");
  // Note: userId is sent in headers, not in form data
  return formData;
}

/**
 * Send voice command to the API
 * @param {Blob} audioBlob - Audio file blob
 * @param {string} userId - User ID
 */
async function sendVoiceCommand(audioBlob, userId) {
  const formData = createFormDataWithAudio(audioBlob, userId);

  const response = await fetch(`${BASE_URL}/api/transcribe`, {
    method: "POST",
    headers: {
      userId: userId, // Send userId in header
    },
    body: formData,
  });

  return await response.json();
}

// ============================================
// EXAMPLE VOICE COMMANDS FOR ASSIGNED TASKS
// ============================================

/**
 * Example 1: Assign a task to Arjun
 * Voice command: "Assign task API testing to Arjun"
 */
async function exampleAssignTask() {
  console.log("\n=== Example 1: Assign Task ===");
  console.log("Voice command: 'Assign task API testing to Arjun'");

  // In real usage, audioBlob would come from actual voice recording
  // const audioBlob = await recordVoice();
  // const response = await sendVoiceCommand(audioBlob, "user123");

  // Expected response structure:
  const expectedResponse = {
    success: true,
    intent: "ASSIGN_TASK",
    transcription: "Assign task API testing to Arjun",
    response: 'Assigned task "API testing" to Arjun',
    data: {
      task: {
        _id: "64f1a2b3c4d5e6f7g8h9i0j1",
        assignedBy: "user123",
        assignedTo: "Arjun",
        taskDescription: "API testing",
        status: "pending",
        createdAt: "2025-12-01T10:30:00.000Z",
      },
    },
    aiGenerated: true,
    confidence: 0.95,
  };

  console.log("Expected response:", JSON.stringify(expectedResponse, null, 2));
}

/**
 * Example 2: Show tasks assigned to Arjun
 * Voice command: "Show me tasks assigned to Arjun"
 */
async function exampleShowAssignedTasks() {
  console.log("\n=== Example 2: Show Assigned Tasks ===");
  console.log("Voice command: 'Show me tasks assigned to Arjun'");

  // Expected response structure:
  const expectedResponse = {
    success: true,
    intent: "SHOW_ASSIGNED_TO",
    transcription: "Show me tasks assigned to Arjun",
    response:
      "Found 2 task(s) assigned to Arjun:\n1. API testing (Status: pending)\n2. Database migration (Status: in-progress)",
    data: {
      tasks: [
        {
          _id: "64f1a2b3c4d5e6f7g8h9i0j1",
          assignedBy: "user123",
          assignedTo: "Arjun",
          taskDescription: "API testing",
          status: "pending",
          createdAt: "2025-12-01T10:30:00.000Z",
        },
        {
          _id: "64f1a2b3c4d5e6f7g8h9i0j2",
          assignedBy: "user456",
          assignedTo: "Arjun",
          taskDescription: "Database migration",
          status: "in-progress",
          createdAt: "2025-12-01T09:00:00.000Z",
        },
      ],
    },
    taskList: [
      /* same as data.tasks */
    ],
    count: 2,
    aiGenerated: true,
    confidence: 0.95,
  };

  console.log("Expected response:", JSON.stringify(expectedResponse, null, 2));
}

/**
 * Example 3: Show tasks assigned to my name (me)
 * Voice command: "Show tasks assigned to my name Arjun"
 */
async function exampleShowMyAssignedTasks() {
  console.log("\n=== Example 3: Show My Assigned Tasks ===");
  console.log("Voice command: 'Show tasks assigned to my name Arjun'");

  // The AI will extract "Arjun" from "my name Arjun"
  const expectedResponse = {
    success: true,
    intent: "SHOW_ASSIGNED_TO",
    transcription: "Show tasks assigned to my name Arjun",
    response: "Found 2 task(s) assigned to Arjun:\n...",
    // ... same as above
  };

  console.log("Expected response:", JSON.stringify(expectedResponse, null, 2));
}

// ============================================
// OTHER VOICE COMMANDS (Already implemented)
// ============================================

/**
 * Example 4: Create a todo
 * Voice command: "Create todo buy groceries"
 */
async function exampleCreateTodo() {
  console.log("\n=== Example 4: Create Todo ===");
  console.log("Voice command: 'Create todo buy groceries'");
}

/**
 * Example 5: Show todos
 * Voice command: "Show my todos"
 */
async function exampleShowTodos() {
  console.log("\n=== Example 5: Show Todos ===");
  console.log("Voice command: 'Show my todos'");
}

/**
 * Example 6: Create a note
 * Voice command: "Create note react is a front end framework"
 */
async function exampleCreateNote() {
  console.log("\n=== Example 6: Create Note ===");
  console.log("Voice command: 'Create note react is a front end framework'");
}

/**
 * Example 7: Show notes
 * Voice command: "Fetch my notes"
 */
async function exampleShowNotes() {
  console.log("\n=== Example 7: Show Notes ===");
  console.log("Voice command: 'Fetch my notes'");
}

// ============================================
// VOICE COMMAND VARIATIONS FOR ASSIGNING TASKS
// ============================================

const assignTaskVariations = [
  "Assign task API testing to Arjun",
  "Assign API testing to Arjun",
  "Give task code review to Sarah",
  "Assign database migration to Mike",
  "Give documentation update to John",
];

const showAssignedTasksVariations = [
  "Show me tasks assigned to Arjun",
  "Show tasks assigned to my name Arjun",
  "List all tasks for Sarah",
  "Fetch tasks assigned to Mike",
  "Show me what tasks Arjun has",
];

console.log("\n=== VOICE COMMAND VARIATIONS ===");
console.log("\n📋 Assign Task Variations:");
assignTaskVariations.forEach((cmd, i) => {
  console.log(`  ${i + 1}. "${cmd}"`);
});

console.log("\n📋 Show Assigned Tasks Variations:");
showAssignedTasksVariations.forEach((cmd, i) => {
  console.log(`  ${i + 1}. "${cmd}"`);
});

// ============================================
// INTEGRATION EXAMPLE: React Component
// ============================================

const reactExample = `
// React Component Example

import React, { useState } from 'react';

function VoiceAssistant() {
  const [recording, setRecording] = useState(false);
  const [response, setResponse] = useState(null);
  const userId = "user123"; // Get from auth context

  const startRecording = async () => {
    // Start recording audio
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    const audioChunks = [];
    mediaRecorder.addEventListener("dataavailable", event => {
      audioChunks.push(event.data);
    });
    
    mediaRecorder.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await sendVoiceToAPI(audioBlob);
    });
    
    mediaRecorder.start();
    setRecording(true);
    
    // Stop after 5 seconds (or implement stop button)
    setTimeout(() => {
      mediaRecorder.stop();
      setRecording(false);
    }, 5000);
  };

  const sendVoiceToAPI = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');

    const response = await fetch('${BASE_URL}/api/transcribe', {
      method: 'POST',
      headers: {
        'userId': userId
      },
      body: formData
    });

    const data = await response.json();
    setResponse(data);
    
    // Handle different intents
    if (data.intent === 'ASSIGN_TASK') {
      console.log('Task assigned:', data.response);
    } else if (data.intent === 'SHOW_ASSIGNED_TO') {
      console.log('Tasks:', data.taskList);
    }
  };

  return (
    <div>
      <button onClick={startRecording} disabled={recording}>
        {recording ? 'Recording...' : 'Start Voice Command'}
      </button>
      
      {response && (
        <div>
          <p><strong>Transcription:</strong> {response.transcription}</p>
          <p><strong>Response:</strong> {response.response}</p>
          
          {response.intent === 'SHOW_ASSIGNED_TO' && response.taskList && (
            <ul>
              {response.taskList.map(task => (
                <li key={task._id}>
                  {task.taskDescription} - {task.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceAssistant;
`;

console.log("\n=== REACT INTEGRATION EXAMPLE ===");
console.log(reactExample);

// Run examples
exampleAssignTask();
exampleShowAssignedTasks();
exampleShowMyAssignedTasks();

export {
  sendVoiceCommand,
  exampleAssignTask,
  exampleShowAssignedTasks,
  exampleShowMyAssignedTasks,
  assignTaskVariations,
  showAssignedTasksVariations,
};
