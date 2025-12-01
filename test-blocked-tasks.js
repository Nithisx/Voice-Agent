// Test file for Blocked Tasks API
// This demonstrates how to use the blocked tasks endpoints

const BASE_URL = "http://localhost:3000"; // Change to your server URL

// Example 1: Mark a task as blocked
async function testMarkTaskAsBlocked() {
  console.log("\n=== Test 1: Mark Task as Blocked ===");

  const response = await fetch(`${BASE_URL}/api/blocked-tasks/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user123",
      taskTitle: "fix login API",
      reason: "API is not responding",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
  return data.task?._id;
}

// Example 2: Mark multiple tasks as blocked
async function testMarkMultipleTasksAsBlocked() {
  console.log("\n=== Test 2: Mark Multiple Tasks as Blocked ===");

  const tasks = [
    {
      userId: "user123",
      taskTitle: "database migration",
      reason: "waiting for DBA approval",
    },
    {
      userId: "user123",
      taskTitle: "deploy to production",
      reason: "blocked by security review",
    },
    {
      userId: "user456",
      taskTitle: "update documentation",
      reason: "waiting for product team feedback",
    },
  ];

  for (const task of tasks) {
    const response = await fetch(`${BASE_URL}/api/blocked-tasks/mark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    const data = await response.json();
    console.log(`Marked: ${task.taskTitle} as blocked`);
  }
}

// Example 3: Get blocked tasks for a user
async function testGetBlockedTasks() {
  console.log("\n=== Test 3: Get Blocked Tasks ===");

  const response = await fetch(
    `${BASE_URL}/api/blocked-tasks/list?userId=user123`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 4: Unblock a task
async function testUnblockTask() {
  console.log("\n=== Test 4: Unblock Task ===");

  const response = await fetch(`${BASE_URL}/api/blocked-tasks/unblock`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user123",
      taskTitle: "fix login API",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 5: Get all blocked tasks (with filters)
async function testGetAllBlockedTasks() {
  console.log("\n=== Test 5: Get All Blocked Tasks ===");

  const response = await fetch(
    `${BASE_URL}/api/blocked-tasks/all?status=blocked`
  );

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 6: Update blocked reason
async function testUpdateBlockedReason(taskId) {
  console.log("\n=== Test 6: Update Blocked Reason ===");

  const response = await fetch(`${BASE_URL}/api/blocked-tasks/update-reason`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: taskId,
      reason: "API endpoint has been fixed, testing in progress",
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

// Example 7: Delete a blocked task record
async function testDeleteBlockedTask(taskId) {
  console.log("\n=== Test 7: Delete Blocked Task ===");

  const response = await fetch(`${BASE_URL}/api/blocked-tasks/delete`, {
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
    console.log("🚀 Starting Blocked Tasks API Tests...\n");

    // Test 1: Mark a task as blocked
    const taskId = await testMarkTaskAsBlocked();

    // Test 2: Mark multiple tasks as blocked
    await testMarkMultipleTasksAsBlocked();

    // Test 3: Get blocked tasks
    await testGetBlockedTasks();

    // Test 4: Unblock a task
    // await testUnblockTask(); // Uncomment to test

    // Test 5: Get all blocked tasks
    await testGetAllBlockedTasks();

    // Test 6: Update blocked reason
    if (taskId) {
      await testUpdateBlockedReason(taskId);
    }

    // Optional: Test 7: Delete a blocked task (uncomment if needed)
    // if (taskId) {
    //   await testDeleteBlockedTask(taskId);
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
  testMarkTaskAsBlocked,
  testMarkMultipleTasksAsBlocked,
  testGetBlockedTasks,
  testUnblockTask,
  testGetAllBlockedTasks,
  testUpdateBlockedReason,
  testDeleteBlockedTask,
};
