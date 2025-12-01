// Test file for Assigned Tasks API
// This demonstrates how to use the assigned tasks endpoints

const BASE_URL = "http://localhost:3000"; // Change to your server URL

// Example 1: Assign a task to Arjun
async function testAssignTask() {
  console.log("\n=== Test 1: Assign Task ===");

  const response = await fetch(`${BASE_URL}/api/assigned-tasks/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assignedBy: "user123",
      assignedTo: "Arjun",
      taskDescription: "API testing",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
  return data.task?._id;
}

// Example 2: Assign multiple tasks
async function testAssignMultipleTasks() {
  console.log("\n=== Test 2: Assign Multiple Tasks ===");

  const tasks = [
    {
      assignedBy: "user123",
      assignedTo: "Arjun",
      taskDescription: "Database migration",
    },
    {
      assignedBy: "user123",
      assignedTo: "Sarah",
      taskDescription: "Code review for PR #45",
    },
    {
      assignedBy: "user456",
      assignedTo: "Arjun",
      taskDescription: "Update documentation",
    },
  ];

  for (const task of tasks) {
    const response = await fetch(`${BASE_URL}/api/assigned-tasks/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    const data = await response.json();
    console.log(`Assigned: ${task.taskDescription} to ${task.assignedTo}`);
  }
}

// Example 3: Get tasks assigned to Arjun
async function testGetTasksForArjun() {
  console.log("\n=== Test 3: Get Tasks Assigned to Arjun ===");

  const response = await fetch(
    `${BASE_URL}/api/assigned-tasks/to?assignedTo=Arjun`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 4: Get tasks assigned by user123
async function testGetTasksAssignedByUser() {
  console.log("\n=== Test 4: Get Tasks Assigned by user123 ===");

  const response = await fetch(
    `${BASE_URL}/api/assigned-tasks/by?assignedBy=user123`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 5: Update task status
async function testUpdateTaskStatus(taskId) {
  console.log("\n=== Test 5: Update Task Status ===");

  const response = await fetch(`${BASE_URL}/api/assigned-tasks/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: taskId,
      status: "in-progress",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 6: Get all pending tasks
async function testGetPendingTasks() {
  console.log("\n=== Test 6: Get All Pending Tasks ===");

  const response = await fetch(
    `${BASE_URL}/api/assigned-tasks/all?status=pending`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 7: Get all tasks for Arjun that are in-progress
async function testGetArjunInProgressTasks() {
  console.log("\n=== Test 7: Get Arjun's In-Progress Tasks ===");

  const response = await fetch(
    `${BASE_URL}/api/assigned-tasks/all?assignedTo=Arjun&status=in-progress`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 8: Complete a task
async function testCompleteTask(taskId) {
  console.log("\n=== Test 8: Complete Task ===");

  const response = await fetch(`${BASE_URL}/api/assigned-tasks/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: taskId,
      status: "completed",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 9: Delete a task
async function testDeleteTask(taskId) {
  console.log("\n=== Test 9: Delete Task ===");

  const response = await fetch(`${BASE_URL}/api/assigned-tasks/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: taskId,
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Run all tests
async function runAllTests() {
  try {
    console.log("🚀 Starting Assigned Tasks API Tests...\n");

    // Test 1: Assign a single task
    const taskId = await testAssignTask();

    // Test 2: Assign multiple tasks
    await testAssignMultipleTasks();

    // Test 3: Get tasks for Arjun
    await testGetTasksForArjun();

    // Test 4: Get tasks assigned by user
    await testGetTasksAssignedByUser();

    // Test 5: Update task status
    if (taskId) {
      await testUpdateTaskStatus(taskId);
    }

    // Test 6: Get all pending tasks
    await testGetPendingTasks();

    // Test 7: Get Arjun's in-progress tasks
    await testGetArjunInProgressTasks();

    // Test 8: Complete a task
    if (taskId) {
      await testCompleteTask(taskId);
    }

    // Optional: Test 9: Delete a task (uncomment if needed)
    // if (taskId) {
    //   await testDeleteTask(taskId);
    // }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
  }
}

// Run the tests
runAllTests();

// Export for module usage
export {
  testAssignTask,
  testAssignMultipleTasks,
  testGetTasksForArjun,
  testGetTasksAssignedByUser,
  testUpdateTaskStatus,
  testGetPendingTasks,
  testGetArjunInProgressTasks,
  testCompleteTask,
  testDeleteTask,
};
