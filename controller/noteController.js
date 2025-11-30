import Note from "../Models/noteModel.js";

export const createNote = async (req, res) => {
  try {
    const { userId, title, content } = req.body;

    const note = await Note.create({
      userId,
      title,
      content: content || "",
    });

    return res.json({
      message: `Created note: ${title}`,
      note,
    });
  } catch (err) {
    console.error("Error creating note:", err);
    return res.json({ error: "Failed to create note" });
  }
};

export const listNotes = async (req, res) => {
  try {
    const { userId } = req.params;

    const notes = await Note.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      message:
        notes.length > 0 ? "Here are your notes" : "You have no notes yet",
      notes,
      count: notes.length,
    });
  } catch (err) {
    console.error("Error fetching notes:", err);
    return res.json({ error: "Failed to load notes" });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { userId, title } = req.body;

    // Find and delete the note that matches the title (case-insensitive, partial match)
    const deletedNote = await Note.findOneAndDelete({
      userId: userId,
      title: { $regex: title, $options: "i" }, // Case-insensitive partial match
    });

    if (deletedNote) {
      return res.json({
        message: `Deleted note: ${deletedNote.title}`,
        deletedNote: deletedNote,
      });
    } else {
      // If exact match not found, try to find similar notes
      const similarNotes = await Note.find({
        userId: userId,
        title: { $regex: title.split(" ").join("|"), $options: "i" },
      }).limit(3);

      if (similarNotes.length > 0) {
        return res.json({
          message: `No exact match found for "${title}". Did you mean one of these?`,
          suggestions: similarNotes.map((note) => note.title),
          error: "No exact match",
        });
      } else {
        return res.json({
          message: `No note found matching "${title}"`,
          error: "Note not found",
        });
      }
    }
  } catch (err) {
    console.error("Error deleting note:", err);
    return res.json({ error: "Failed to delete note" });
  }
};
