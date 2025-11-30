//voiceagent.jsx

"use client";

import { useState, useRef } from "react";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState(
    "Click Start to record"
  );
  const [debugLog, setDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Debug logging function
  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    setDebugLog((prev) => [...prev, logEntry]);
  };

  // Simple CORS test without triggering preflight
  const testCORS = async () => {
    addDebugLog("Testing simple CORS (no preflight)...");
    try {
      // Test 1: Simple GET request (no preflight)
      const response = await fetch(
        "http://localhost:3000/api/test-cors"
        // No method, no headers - this should NOT trigger preflight
      );

      addDebugLog(`Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addDebugLog(`✅ Simple CORS successful: ${data.message}`, "success");
      } else {
        addDebugLog(`❌ Simple CORS failed: ${response.status}`, "error");
      }
    } catch (error) {
      addDebugLog(`❌ Simple CORS error: ${error.message}`, "error");

      // Test 2: Try with explicit headers to see the difference
      addDebugLog("Now testing with headers (will trigger preflight)...");
      try {
        const response2 = await fetch("http://localhost:3000/api/test-cors", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        addDebugLog(`With headers: ${response2.status}`, "info");
      } catch (error2) {
        addDebugLog(`❌ With headers failed: ${error2.message}`, "error");
      }
    }
  };

  // Enhanced OPTIONS preflight test
  const testPreflight = async () => {
    addDebugLog("Testing OPTIONS preflight...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("http://localhost:3000/api/transcribe", {
        method: "OPTIONS",
        headers: {
          Origin: window.location.origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "Content-Type, userId, userid, Accept",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      addDebugLog(
        `OPTIONS response: ${response.status} ${response.statusText}`,
        response.ok ? "success" : "error"
      );

      // Log all CORS-related headers
      const corsHeaders = {};
      [
        "access-control-allow-origin",
        "access-control-allow-methods",
        "access-control-allow-headers",
        "access-control-max-age",
        "access-control-allow-credentials",
      ].forEach((header) => {
        const value = response.headers.get(header);
        if (value !== null) corsHeaders[header] = value;
      });

      addDebugLog(
        `CORS headers received: ${JSON.stringify(corsHeaders)}`,
        "info"
      );

      if (response.ok) {
        addDebugLog("✅ OPTIONS preflight successful", "success");
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ OPTIONS failed: ${errorText}`, "error");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        addDebugLog(`❌ OPTIONS test timeout after 15 seconds`, "error");
      } else {
        addDebugLog(`❌ OPTIONS test failed: ${error.message}`, "error");
        addDebugLog(`Error details: ${error.stack}`, "error");
      }
    }
  };

  const startRecording = async () => {
    addDebugLog("Starting recording process...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      addDebugLog("✅ Microphone access granted");

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          addDebugLog(`Audio chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        streamRef.current.getTracks().forEach((track) => track.stop());
        addDebugLog("Recording stopped, processing audio...");
        setRecordingStatus("Processing...");
        uploadAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus("Recording... Speak now");
      addDebugLog("🎤 Recording started");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addDebugLog(`❌ Microphone error: ${err.message}`, "error");
      setRecordingStatus("Error: Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addDebugLog("🛑 Stop recording requested");
    }
  };

  const uploadAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      addDebugLog("❌ No audio chunks to upload", "error");
      setRecordingStatus("No audio recorded");
      return;
    }

    addDebugLog(
      `Creating audio blob from ${audioChunksRef.current.length} chunks`
    );
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    addDebugLog(
      `Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`
    );

    const formData = new FormData();
    // FIXED: Use 'audio' instead of 'file'
    formData.append("audio", audioBlob, "recording.webm");

    // Debug FormData
    addDebugLog("FormData entries:");
    for (let [key, value] of formData.entries()) {
      addDebugLog(
        `  ${key}: ${
          value instanceof File ? `File(${value.name}, ${value.size}b)` : value
        }`
      );
    }

    const requestUrl = "http://localhost:3000/api/transcribe";

    // Read user id from URL query parameter 'cliq_user_id'
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("cliq_user_id") || "";

    if (userId) {
      addDebugLog(`User ID from URL: ${userId}`);
    } else {
      addDebugLog(
        "⚠️ No 'cliq_user_id' found in URL; request will omit userId header",
        "error"
      );
    }

    addDebugLog(`Preparing request to: ${requestUrl}`);

    try {
      // Enhanced request with timeout and proper headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        addDebugLog("❌ Request timeout after 30 seconds", "error");
      }, 30000);

      // Build headers - only include userId if available
      // Don't include Accept header to avoid triggering preflight unnecessarily
      const headers = {};

      if (userId) {
        headers.userId = userId;
        // Only send one version to minimize headers
      }

      addDebugLog(`Request headers: ${JSON.stringify(headers)}`);
      addDebugLog("🚀 Sending POST request...");

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      addDebugLog(`Response status: ${response.status} ${response.statusText}`);

      // Log ALL response headers for debugging
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      addDebugLog(`Response headers: ${JSON.stringify(responseHeaders)}`);

      if (response.ok) {
        const result = await response.json();
        addDebugLog(
          `✅ Upload successful: ${JSON.stringify(result)}`,
          "success"
        );

        // Show different messages based on intent and response
        if (result.success && result.intent) {
          switch (result.intent) {
            case "CREATE_TODO":
              setRecordingStatus(`✅ ${result.response}`);
              break;
            case "SHOW_TODOS":
              if (result.todoList && result.todoList.length > 0) {
                let todoDisplay = `📋 Your Todo List (${result.count} items):\n`;
                result.todoList.forEach((todo, index) => {
                  todoDisplay += `${index + 1}. ${todo.text}\n`;
                });
                setRecordingStatus(todoDisplay.trim());
              } else {
                setRecordingStatus(`📋 ${result.response}`);
              }
              break;
            case "OTHER":
              setRecordingStatus(`🤖 ${result.response}`);
              break;
            case "COMPLETE_TODO":
              if (result.success) {
                setRecordingStatus(`✅ ${result.response}`);
              } else {
                setRecordingStatus(`❌ ${result.response}`);
              }
              break;
            case "HELP":
              setRecordingStatus(`ℹ️ ${result.response}`);
              break;
            default:
              setRecordingStatus(`✅ ${result.response}`);
          }
        } else if (result.success && result.response) {
          setRecordingStatus(`✅ ${result.response}`);
        } else if (result.transcription) {
          setRecordingStatus(`📝 Transcription: "${result.transcription}"`);
        } else {
          setRecordingStatus(`✅ Success: ${JSON.stringify(result)}`);
        }
      } else {
        const errorText = await response.text();
        addDebugLog(
          `❌ Upload failed: ${response.status} - ${errorText}`,
          "error"
        );
        setRecordingStatus(`❌ Upload failed (${response.status})`);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        addDebugLog("❌ Request was aborted (timeout)", "error");
        setRecordingStatus("❌ Request timeout - Try again");
      } else {
        addDebugLog(`❌ Network error: ${err.message}`, "error");
        addDebugLog(`Error type: ${err.constructor.name}`, "error");
        addDebugLog(`Error stack: ${err.stack}`, "error");
        console.error("Full upload error:", err);

        // Provide user-friendly error messages
        if (err.message.includes("CORS")) {
          setRecordingStatus("❌ CORS error - Server configuration issue");
        } else if (err.message.includes("fetch")) {
          setRecordingStatus(
            "❌ Connection failed - Check internet connection"
          );
        } else if (err.message.includes("Failed to fetch")) {
          setRecordingStatus("❌ Network error - Server may be down");
        } else {
          setRecordingStatus(`❌ Error: ${err.message}`);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13 2H7a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            Voice Recorder
          </h1>
          <p className="text-gray-600 text-sm">{recordingStatus}</p>
        </div>

        
        <div className="space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg flex items-center justify-center space-x-3 transition-all duration-300 transform ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl hover:from-red-600 hover:to-red-700 active:scale-95 shadow-red-500/25"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-95 shadow-emerald-500/25"
            }`}
          >
            {isRecording ? (
              <>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Start Recording</span>
              </>
            )}
          </button>

          {recordingStatus.includes("✅") && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-medium text-sm text-center whitespace-pre-line">
                {recordingStatus}
              </p>
            </div>
          )}

          {recordingStatus.includes("📋") && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 font-medium text-sm whitespace-pre-line">
                {recordingStatus}
              </p>
            </div>
          )}

          {recordingStatus.includes("🤖") && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-purple-800 font-medium text-sm text-center whitespace-pre-line">
                {recordingStatus}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500 text-center">
          <p>Supports modern browsers with microphone access</p>
          <p className="mt-1">API: localhost:3000/server/taskwithurl</p>
        </div>
      </div>
    </div>
  );
}
