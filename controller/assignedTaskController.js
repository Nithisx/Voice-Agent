import AssignedTask from "../Models/assignedTaskModel.js";

/**
 * Assign a task to a teammate
 * Example: "Assign task API testing to Arjun"
 * Request body: { assignedBy: "user123", assignedTo: "Arjun", taskDescription: "API testing" }
 */
export const assignTask = async (req, res) => {
  try {
    const { assignedBy, assignedTo, taskDescription } = req.body;

    // Validation
    if (!assignedBy || !assignedTo || !taskDescription) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: assignedBy, assignedTo, or taskDescription",
      });
    }

    // Create the assigned task
    const task = await AssignedTask.create({
      assignedBy,
      assignedTo: assignedTo.trim(),
      taskDescription: taskDescription.trim(),
      status: "pending",
    });

    return res.json({
      success: true,
      message: `Task "${taskDescription}" has been assigned to ${assignedTo}`,
      task,
    });
  } catch (err) {
    console.error("Error assigning task:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to assign task",
      error: err.message,
    });
  }
};

/**
 * Fetch all tasks assigned to a specific person (by name)
 * Example: "Show me tasks assigned to Arjun"
 * Query params: ?assignedTo=Arjun
 */
export const getTasksAssignedToName = async (req, res) => {
  try {
    const { assignedTo } = req.query;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameter: assignedTo",
      });
    }

    // Case-insensitive search
    const tasks = await AssignedTask.find({
      assignedTo: { $regex: new RegExp(`^${assignedTo}$`, "i") },
    }).sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return res.json({
        success: true,
        message: `No tasks found assigned to ${assignedTo}`,
        tasks: [],
      });
    }

    return res.json({
      success: true,
      message: `Found ${tasks.length} task(s) assigned to ${assignedTo}`,
      tasks,
    });
  } catch (err) {
    console.error("Error fetching assigned tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: err.message,
    });
  }
};

/**
 * Fetch all tasks assigned by a specific user
 * Query params: ?assignedBy=user123
 */
export const getTasksAssignedByUser = async (req, res) => {
  try {
    const { assignedBy } = req.query;

    if (!assignedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameter: assignedBy",
      });
    }

    const tasks = await AssignedTask.find({ assignedBy }).sort({
      createdAt: -1,
    });

    if (tasks.length === 0) {
      return res.json({
        success: true,
        message: `No tasks found assigned by you`,
        tasks: [],
      });
    }

    return res.json({
      success: true,
      message: `Found ${tasks.length} task(s) you assigned`,
      tasks,
    });
  } catch (err) {
    console.error("Error fetching assigned tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: err.message,
    });
  }
};

/**
 * Update task status (pending, in-progress, completed)
 * Request body: { taskId: "xxx", status: "completed" }
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId, status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: taskId or status",
      });
    }

    if (!["pending", "in-progress", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, in-progress, or completed",
      });
    }

    const updateData = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const task = await AssignedTask.findByIdAndUpdate(taskId, updateData, {
      new: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.json({
      success: true,
      message: `Task status updated to ${status}`,
      task,
    });
  } catch (err) {
    console.error("Error updating task status:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update task status",
      error: err.message,
    });
  }
};

/**
 * Delete an assigned task
 * Request body: { taskId: "xxx" }
 */
export const deleteAssignedTask = async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: taskId",
      });
    }

    const task = await AssignedTask.findByIdAndDelete(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.json({
      success: true,
      message: "Task deleted successfully",
      task,
    });
  } catch (err) {
    console.error("Error deleting task:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: err.message,
    });
  }
};

/**
 * Get all tasks (with optional filters)
 * Query params: ?status=pending&assignedBy=user123&assignedTo=Arjun
 */
export const getAllTasks = async (req, res) => {
  try {
    const { status, assignedBy, assignedTo } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (assignedBy) filter.assignedBy = assignedBy;
    if (assignedTo)
      filter.assignedTo = { $regex: new RegExp(`^${assignedTo}$`, "i") };

    const tasks = await AssignedTask.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: `Found ${tasks.length} task(s)`,
      tasks,
    });
  } catch (err) {
    console.error("Error fetching all tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: err.message,
    });
  }
};
