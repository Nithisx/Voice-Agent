import BlockedTask from "../Models/blockedTaskModel.js";

/**
 * Mark a task as blocked/stuck
 * Example: "Mark the task fix login API as blocked because API is not responding"
 * Request body: { userId: "user123", taskTitle: "fix login API", reason: "API is not responding" }
 */
export const markTaskAsBlocked = async (req, res) => {
  try {
    const { userId, taskTitle, reason } = req.body;

    // Validation
    if (!userId || !taskTitle || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, taskTitle, or reason",
      });
    }

    // Check if task is already blocked
    const existingBlocked = await BlockedTask.findOne({
      userId,
      taskTitle: { $regex: new RegExp(`^${taskTitle}$`, "i") },
      status: "blocked",
    });

    if (existingBlocked) {
      return res.json({
        success: false,
        message: `Task "${taskTitle}" is already marked as blocked`,
        task: existingBlocked,
      });
    }

    // Create blocked task entry
    const blockedTask = await BlockedTask.create({
      userId,
      taskTitle: taskTitle.trim(),
      reason: reason.trim(),
      status: "blocked",
    });

    return res.json({
      success: true,
      message: `Task "${taskTitle}" has been marked as blocked. Reason: ${reason}`,
      task: blockedTask,
    });
  } catch (err) {
    console.error("Error marking task as blocked:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark task as blocked",
      error: err.message,
    });
  }
};

/**
 * Get all blocked tasks for a user
 * Query params: ?userId=user123
 */
export const getBlockedTasks = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameter: userId",
      });
    }

    // Find all blocked tasks for the user
    const blockedTasks = await BlockedTask.find({
      userId,
      status: "blocked",
    }).sort({ blockedAt: -1 });

    if (blockedTasks.length === 0) {
      return res.json({
        success: true,
        message: "You have no blocked tasks",
        tasks: [],
      });
    }

    return res.json({
      success: true,
      message: `Found ${blockedTasks.length} blocked task(s)`,
      tasks: blockedTasks,
    });
  } catch (err) {
    console.error("Error fetching blocked tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blocked tasks",
      error: err.message,
    });
  }
};

/**
 * Unblock a task
 * Request body: { userId: "user123", taskTitle: "fix login API" }
 */
export const unblockTask = async (req, res) => {
  try {
    const { userId, taskTitle } = req.body;

    if (!userId || !taskTitle) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId or taskTitle",
      });
    }

    // Find and update the blocked task (case-insensitive)
    const unblockedTask = await BlockedTask.findOneAndUpdate(
      {
        userId,
        taskTitle: { $regex: new RegExp(`^${taskTitle}$`, "i") },
        status: "blocked",
      },
      {
        status: "unblocked",
        unblockedAt: new Date(),
      },
      { new: true }
    );

    if (!unblockedTask) {
      // Check if task exists but already unblocked
      const alreadyUnblocked = await BlockedTask.findOne({
        userId,
        taskTitle: { $regex: new RegExp(`^${taskTitle}$`, "i") },
        status: "unblocked",
      });

      if (alreadyUnblocked) {
        return res.json({
          success: false,
          message: `Task "${taskTitle}" is already unblocked`,
          task: alreadyUnblocked,
        });
      }

      // Try to find similar tasks
      const similarTasks = await BlockedTask.find({
        userId,
        status: "blocked",
        taskTitle: { $regex: taskTitle.split(" ").join("|"), $options: "i" },
      }).limit(3);

      if (similarTasks.length > 0) {
        return res.json({
          success: false,
          message: `No exact match found for "${taskTitle}". Did you mean one of these?`,
          suggestions: similarTasks.map((task) => task.taskTitle),
        });
      }

      return res.json({
        success: false,
        message: `No blocked task found matching "${taskTitle}"`,
      });
    }

    return res.json({
      success: true,
      message: `Task "${taskTitle}" has been unblocked`,
      task: unblockedTask,
    });
  } catch (err) {
    console.error("Error unblocking task:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unblock task",
      error: err.message,
    });
  }
};

/**
 * Delete a blocked task record
 * Request body: { taskId: "xxx" }
 */
export const deleteBlockedTask = async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: taskId",
      });
    }

    const task = await BlockedTask.findByIdAndDelete(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Blocked task not found",
      });
    }

    return res.json({
      success: true,
      message: "Blocked task record deleted successfully",
      task,
    });
  } catch (err) {
    console.error("Error deleting blocked task:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete blocked task",
      error: err.message,
    });
  }
};

/**
 * Get all blocked/unblocked tasks with optional filters
 * Query params: ?userId=user123&status=blocked
 */
export const getAllBlockedTasks = async (req, res) => {
  try {
    const { userId, status } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const tasks = await BlockedTask.find(filter).sort({ blockedAt: -1 });

    return res.json({
      success: true,
      message: `Found ${tasks.length} task(s)`,
      tasks,
    });
  } catch (err) {
    console.error("Error fetching blocked tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: err.message,
    });
  }
};

/**
 * Update blocked task reason
 * Request body: { taskId: "xxx", reason: "new reason" }
 */
export const updateBlockedReason = async (req, res) => {
  try {
    const { taskId, reason } = req.body;

    if (!taskId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: taskId or reason",
      });
    }

    const task = await BlockedTask.findByIdAndUpdate(
      taskId,
      { reason: reason.trim() },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Blocked task not found",
      });
    }

    return res.json({
      success: true,
      message: "Blocked reason updated successfully",
      task,
    });
  } catch (err) {
    console.error("Error updating blocked reason:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update blocked reason",
      error: err.message,
    });
  }
};
