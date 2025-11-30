// transcriber.service.js
// Service for transcribing audio files using Google's Gemini API

import { GoogleGenerativeAI } from "@google/generative-ai";
import { promises as fs } from "fs";
import path from "path";

class TranscriberService {
  constructor(apiKey, modelName = "gemini-2.0-flash-lite") {
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.maxRetries = 3;
    this.initialDelay = 2000; // 2 seconds
  }

  /**
   * Sleep utility for retry delays
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 2000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("503") ||
          errorMsg.includes("overloaded") ||
          errorMsg.includes("unavailable")
        ) {
          if (attempt < maxRetries - 1) {
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(
              `Model overloaded. Retrying in ${
                delay / 1000
              } seconds... (attempt ${attempt + 1}/${maxRetries})`
            );
            await this.sleep(delay);
          } else {
            throw new Error(
              "Model is currently overloaded. Please try again in a few minutes."
            );
          }
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Determine MIME type from file path
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".opus": "audio/ogg",
      ".mp3": "audio/mpeg",
      ".webm": "audio/webm",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
    };

    return mimeTypes[ext] || "audio/webm";
  }

  /**
   * Convert audio file to base64
   */
  async audioFileToBase64(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString("base64");
    } catch (error) {
      throw new Error(`Failed to read audio file: ${error.message}`);
    }
  }

  /**
   * Transcribe audio file using Gemini
   */
  async transcribe(audioFilePath) {
    try {
      console.log(`Transcribing audio file: ${audioFilePath}`);

      // Check if file exists
      try {
        await fs.access(audioFilePath);
      } catch {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Get MIME type and convert to base64
      const mimeType = this.getMimeType(audioFilePath);
      const base64Audio = await this.audioFileToBase64(audioFilePath);

      console.log(
        `File size: ${base64Audio.length} chars (base64), MIME type: ${mimeType}`
      );

      // Transcription function with retry logic
      const transcribeFunc = async () => {
        const prompt =
          "You are an accurate speech-to-text system. " +
          "Transcribe the following audio exactly as spoken. " +
          "Return only the transcription, no additional commentary.";

        const result = await this.model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
        ]);

        const response = await result.response;
        const transcription = response.text().trim();

        if (!transcription || transcription.length === 0) {
          throw new Error("Empty transcription received");
        }

        return transcription;
      };

      // Execute with retry logic
      const transcription = await this.retryWithBackoff(
        transcribeFunc,
        this.maxRetries,
        this.initialDelay
      );

      console.log(
        `Transcription successful: ${transcription.substring(0, 100)}...`
      );
      return transcription;
    } catch (error) {
      console.error(`Transcription error: ${error.message}`);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio from buffer (for uploaded files)
   */
  async transcribeBuffer(audioBuffer, mimeType = "audio/webm") {
    try {
      console.log(
        `Transcribing audio buffer: ${audioBuffer.length} bytes, type: ${mimeType}`
      );

      const base64Audio = audioBuffer.toString("base64");

      const transcribeFunc = async () => {
        const prompt =
          "You are an accurate speech-to-text system. " +
          "Transcribe the following audio exactly as spoken. " +
          "Return only the transcription, no additional commentary.";

        const result = await this.model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
        ]);

        const response = await result.response;
        const transcription = response.text().trim();

        if (!transcription || transcription.length === 0) {
          throw new Error("Empty transcription received");
        }

        return transcription;
      };

      const transcription = await this.retryWithBackoff(
        transcribeFunc,
        this.maxRetries,
        this.initialDelay
      );

      console.log(
        `Transcription successful: ${transcription.substring(0, 100)}...`
      );
      return transcription;
    } catch (error) {
      console.error(`Transcription error: ${error.message}`);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
}

// Export singleton instance and class
let transcriberInstance = null;

export function getTranscriberService(apiKey, modelName) {
  if (!transcriberInstance) {
    const key = apiKey || process.env.GOOGLE_API_KEY;
    const model =
      modelName || process.env.GENAI_MODEL || "gemini-2.0-flash-lite";
    transcriberInstance = new TranscriberService(key, model);
  }
  return transcriberInstance;
}

export { TranscriberService };

// Example usage:
// import { getTranscriberService } from './transcriber.service.js';
//
// const transcriber = getTranscriberService(process.env.GOOGLE_API_KEY);
//
// // From file path
// const text = await transcriber.transcribe('temp/audio/1737018289-user.wav');
// console.log(text);
//
// // From buffer (e.g., uploaded file)
// const buffer = req.file.buffer; // from multer or similar
// const text = await transcriber.transcribeBuffer(buffer, 'audio/wav');
