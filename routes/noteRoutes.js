import express from "express";
import {
  createNote,
  listNotes,
  deleteNote,
} from "../controller/noteController.js";

const router = express.Router();

router.post("/create", createNote);
router.get("/list/:userId", listNotes);
router.post("/delete", deleteNote);

export default router;
