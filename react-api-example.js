// React Frontend API Helper for Voice Agent
// Save this as src/api/voiceApi.js in your React app

const API_BASE_URL = "http://localhost:3000/server/taskwithurl";

export class VoiceAPI {
  /**
   * Test CORS connection to the API
   */
  static async testConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-cors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  /**
   * Upload audio file and process voice command
   * @param {File} audioFile - The audio file to upload
   * @param {string} userId - User identifier
   * @returns {Promise} API response
   */
  static async transcribeAudio(audioFile, userId) {
    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: "POST",
        headers: {
          userId: userId,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Audio transcription failed:", error);
      throw error;
    }
  }

  /**
   * Just transcribe audio without processing intent
   * @param {File} audioFile - The audio file to upload
   * @returns {Promise} API response with transcription only
   */
  static async transcribeOnly(audioFile) {
    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await fetch(`${API_BASE_URL}/api/transcribe-only`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Transcription failed: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  }

  /**
   * Create a new todo item
   * @param {string} userId - User identifier
   * @param {string} todoText - Todo item text
   * @returns {Promise} API response
   */
  static async createTodo(userId, todoText) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          text: todoText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Todo creation failed: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Todo creation failed:", error);
      throw error;
    }
  }

  /**
   * Get all todos for a user
   * @param {string} userId - User identifier
   * @returns {Promise} API response with todos
   */
  static async getTodos(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/list/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch todos: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch todos:", error);
      throw error;
    }
  }

  /**
   * Get API documentation
   * @returns {Promise} API documentation
   */
  static async getAPIDocs() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/docs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch docs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch API docs:", error);
      throw error;
    }
  }
}

// Example React Component Usage:
/*
import React, { useState } from 'react';
import { VoiceAPI } from './api/voiceApi';

function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId] = useState('user123'); // Get this from your auth system

  const handleFileChange = (event) => {
    setAudioFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!audioFile) {
      alert('Please select an audio file');
      return;
    }

    setLoading(true);
    try {
      const response = await VoiceAPI.transcribeAudio(audioFile, userId);
      setResult(response);
      console.log('Voice command result:', response);
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing voice command: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="audio/*" 
        onChange={handleFileChange}
      />
      <button 
        onClick={handleSubmit} 
        disabled={loading || !audioFile}
      >
        {loading ? 'Processing...' : 'Process Voice Command'}
      </button>
      
      {result && (
        <div>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
*/
