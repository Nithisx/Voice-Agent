import express from "express";
import {
  createTodo,
  listTodos,
  completeTodo,
} from "../controller/todoController.js";

const router = express.Router();

router.post("/create", createTodo);
router.get("/list/:userId", listTodos);
router.post("/complete", completeTodo);

export default router;
