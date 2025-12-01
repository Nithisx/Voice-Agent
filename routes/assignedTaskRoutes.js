import express from "express";
import {
  assignTask,
  getTasksAssignedToName,
  getTasksAssignedByUser,
  updateTaskStatus,
  deleteAssignedTask,
  getAllTasks,
} from "../controller/assignedTaskController.js";

const router = express.Router();

/**
 * POST /api/assigned-tasks/assign
 * Assign a task to a teammate
 * Body: { assignedBy: "user123", assignedTo: "Arjun", taskDescription: "API testing" }
 */
router.post("/assign", assignTask);

/**
 * GET /api/assigned-tasks/to?assignedTo=Arjun
 * Fetch all tasks assigned to a specific person by name
 */
router.get("/to", getTasksAssignedToName);

/**
 * GET /api/assigned-tasks/by?assignedBy=user123
 * Fetch all tasks assigned by a specific user
 */
router.get("/by", getTasksAssignedByUser);

/**
 * GET /api/assigned-tasks/all
 * Get all tasks with optional filters
 * Query params: ?status=pending&assignedBy=user123&assignedTo=Arjun
 */
router.get("/all", getAllTasks);

/**
 * PUT /api/assigned-tasks/status
 * Update task status
 * Body: { taskId: "xxx", status: "completed" }
 */
router.put("/status", updateTaskStatus);

/**
 * DELETE /api/assigned-tasks/delete
 * Delete an assigned task
 * Body: { taskId: "xxx" }
 */
router.delete("/delete", deleteAssignedTask);

export default router;
