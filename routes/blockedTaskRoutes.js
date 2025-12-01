import express from "express";
import {
  markTaskAsBlocked,
  getBlockedTasks,
  unblockTask,
  deleteBlockedTask,
  getAllBlockedTasks,
  updateBlockedReason,
} from "../controller/blockedTaskController.js";

const router = express.Router();

/**
 * POST /api/blocked-tasks/mark
 * Mark a task as blocked/stuck
 * Body: { userId: "user123", taskTitle: "fix login API", reason: "API is not responding" }
 */
router.post("/mark", markTaskAsBlocked);

/**
 * GET /api/blocked-tasks/list?userId=user123
 * Get all blocked tasks for a user
 */
router.get("/list", getBlockedTasks);

/**
 * PUT /api/blocked-tasks/unblock
 * Unblock a task
 * Body: { userId: "user123", taskTitle: "fix login API" }
 */
router.put("/unblock", unblockTask);

/**
 * GET /api/blocked-tasks/all
 * Get all blocked/unblocked tasks with optional filters
 * Query params: ?userId=user123&status=blocked
 */
router.get("/all", getAllBlockedTasks);

/**
 * PUT /api/blocked-tasks/update-reason
 * Update blocked task reason
 * Body: { taskId: "xxx", reason: "new reason" }
 */
router.put("/update-reason", updateBlockedReason);

/**
 * DELETE /api/blocked-tasks/delete
 * Delete a blocked task record
 * Body: { taskId: "xxx" }
 */
router.delete("/delete", deleteBlockedTask);

export default router;
