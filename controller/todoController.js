import Todo from "../Models/todoModel.js";

export const createTodo = async (req, res) => {
  try {
    const { userId, text } = req.body;

    const todo = await Todo.create({ userId, text });

    return res.json({
      message: `Created todo: ${text}`,
      todo,
    });
  } catch (err) {
    return res.json({ error: "Failed to create todo" });
  }
};

export const listTodos = async (req, res) => {
  try {
    const { userId } = req.params;

    const todos = await Todo.find({ userId });

    return res.json({
      message: "Here is your todo list",
      todos,
    });
  } catch (err) {
    return res.json({ error: "Failed to load todos" });
  }
};

export const completeTodo = async (req, res) => {
  try {
    const { userId, text } = req.body;

    // Find and delete the todo that matches the text (case-insensitive, partial match)
    const deletedTodo = await Todo.findOneAndDelete({
      userId: userId,
      text: { $regex: text, $options: "i" }, // Case-insensitive partial match
    });

    if (deletedTodo) {
      return res.json({
        message: `Completed and removed todo: ${deletedTodo.text}`,
        completedTodo: deletedTodo,
      });
    } else {
      // If exact match not found, try to find similar todos
      const similarTodos = await Todo.find({
        userId: userId,
        text: { $regex: text.split(" ").join("|"), $options: "i" },
      }).limit(3);

      if (similarTodos.length > 0) {
        return res.json({
          message: `No exact match found for "${text}". Did you mean one of these?`,
          suggestions: similarTodos.map((todo) => todo.text),
          error: "No exact match",
        });
      } else {
        return res.json({
          message: `No todo found matching "${text}"`,
          error: "Todo not found",
        });
      }
    }
  } catch (err) {
    return res.json({ error: "Failed to complete todo" });
  }
};
