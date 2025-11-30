"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * VoiceAgent - Fixed with Enhanced Debugging
 * - Forces microphone permission request on Start
 * - Multiple fallback audio analysis methods
 * - Comprehensive debugging information
 */

export default function VoiceAgent({ wsUrl = "ws://localhost:3000/voice-agent" }) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Click 'Start Voice Agent' to begin");
  const [transcription, setTranscription] = useState("");
  const [response, setResponse] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);

  // Enhanced debug state
  const [showDebug, setShowDebug] = useState(true); // Default to true for troubleshooting
  const [rawDb, setRawDb] = useState(-100);
  const [sampleSnapshot, setSampleSnapshot] = useState([]);
  const [debugLog, setDebugLog] = useState([]);
  const [micPermission, setMicPermission] = useState("unknown");
  const [audioContextState, setAudioContextState] = useState("not created");
  const [analyserConnected, setAnalyserConnected] = useState(false);

  // refs
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const sourceNodeRef = useRef(null);

  // timing refs
  const recordingStartRef = useRef(0);
  const lastSoundRef = useRef(0);
  const speechSeenRef = useRef(false);
  const safetyTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const rafRef = useRef(null);

  // constants
  const MIN_RECORDING_MS = 600;
  const SILENCE_MS = 1500;
  const SAFE_MAX_MS = 30000;
  const SPEECH_THRESHOLD = 5;

  // Debug logger
  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    console.log(`[${timestamp}] ${message}`);
    setDebugLog(prev => [...prev.slice(-20), logEntry]); // Keep last 20 logs
  };

  // ---------- helpers ----------
  const getUserId = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("cliq_user_id") || "demo_user";
    } catch (e) {
      return "demo_user";
    }
  };

  // Check microphone permission status
  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      setMicPermission(result.state);
      addDebugLog(`Microphone permission: ${result.state}`, result.state === 'granted' ? 'success' : 'warning');
      
      result.onchange = () => {
        setMicPermission(result.state);
        addDebugLog(`Microphone permission changed to: ${result.state}`, 'info');
      };
    } catch (err) {
      addDebugLog('Could not query microphone permission', 'error');
      setMicPermission('unknown');
    }
  };

  // ---------- websocket ----------
  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    setStatus("🔌 Connecting to server...");
    addDebugLog("Connecting to WebSocket...", "info");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus("✅ Connected — ready");
        addDebugLog("WebSocket connected", "success");
        ws.send(JSON.stringify({ type: "init", userId: getUserId() }));
        
        // Auto-start listening once connected
        setTimeout(() => {
          addDebugLog("🚀 Auto-starting listening after connection...", "info");
          startListening();
        }, 800);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          addDebugLog(`WS message: ${data.type}`, "info");
          
          if (data.type === "connected") {
            setStatus("🎤 Voice agent active - Idle");
          } else if (data.type === "recording") {
            setIsListening(true);
            setStatus("🎤 Listening... Speak now");
          } else if (data.type === "transcription") {
            setTranscription(data.transcription || "");
            setStatus("📝 Transcribed");
            addDebugLog(`Transcription: ${data.transcription}`, "success");
          } else if (data.type === "processing") {
            setStatus("🔄 Processing your command...");
          } else if (data.type === "result") {
            setResponse(data.response || "");
            setStatus("✅ " + (data.response || "Done"));
            setIsListening(false);
            addDebugLog(`Response: ${data.response}`, "success");
            if (isActive) setTimeout(() => startListening(), 1200);
          } else if (data.type === "error") {
            setStatus("❌ " + (data.message || "Server error"));
            addDebugLog(`Server error: ${data.message}`, "error");
            setIsListening(false);
          }
        } catch (err) {
          addDebugLog(`Failed to parse WS message: ${err.message}`, "error");
        }
      };

      ws.onerror = (err) => {
        addDebugLog("WebSocket error", "error");
        setStatus("❌ Connection error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsListening(false);
        addDebugLog("WebSocket closed", "warning");
        
        if (isActive) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(30000, 500 * 2 ** reconnectAttemptsRef.current);
          setStatus(`⚠️ Disconnected — reconnecting in ${Math.round(delay / 1000)}s`);
          setTimeout(connectWebSocket, delay);
        } else {
          setStatus("🔌 Disconnected");
        }
      };
    } catch (err) {
      addDebugLog(`WebSocket connect failed: ${err.message}`, "error");
      setStatus("❌ Failed to connect");
    }
  };

  // ---------- audio helpers ----------
  const ensureAudioContext = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      addDebugLog(`AudioContext created, state: ${audioContextRef.current.state}`, "success");
    }
    
    setAudioContextState(audioContextRef.current.state);
    
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
        addDebugLog("AudioContext resumed successfully", "success");
        setAudioContextState(audioContextRef.current.state);
      } catch (e) {
        addDebugLog(`Failed to resume AudioContext: ${e.message}`, "error");
      }
    }
    
    return audioContextRef.current;
  };

  const startAnalyser = async (stream) => {
    addDebugLog("📊 Starting analyser setup...", "info");
    
    const ctx = audioContextRef.current;
    if (!ctx) {
      addDebugLog("❌ CRITICAL: AudioContext not available!", "error");
      return false;
    }

    addDebugLog(`AudioContext state: ${ctx.state}`, ctx.state === 'running' ? "success" : "error");

    // Force resume if needed
    if (ctx.state !== 'running') {
      addDebugLog("⚠️ AudioContext not running, forcing resume...", "warning");
      try {
        await ctx.resume();
        addDebugLog(`AudioContext resumed to: ${ctx.state}`, "success");
        // Wait a bit after resume
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        addDebugLog(`❌ Failed to resume AudioContext: ${err.message}`, "error");
        return false;
      }
    }

    try {
      // Clean up existing nodes
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          addDebugLog("🧹 Disconnected old source node", "info");
        } catch (e) {}
      }

      // Verify stream has active tracks
      const tracks = stream.getAudioTracks();
      addDebugLog(`Stream has ${tracks.length} audio track(s)`, "info");
      
      if (tracks.length === 0) {
        addDebugLog("❌ CRITICAL: No audio tracks in stream!", "error");
        return false;
      }

      const track = tracks[0];
      addDebugLog(`Track: "${track.label}", state: ${track.readyState}, enabled: ${track.enabled}`, "info");
      
      if (track.readyState !== 'live') {
        addDebugLog(`❌ CRITICAL: Track state is "${track.readyState}", not "live"!`, "error");
        return false;
      }

      if (!track.enabled) {
        addDebugLog("⚠️ Track is disabled, enabling...", "warning");
        track.enabled = true;
      }

      addDebugLog("✅ Track is valid and live", "success");

      // Create source node
      addDebugLog("Creating MediaStreamSource...", "info");
      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      addDebugLog("✅ MediaStreamSource created", "success");
      
      // Create analyser
      addDebugLog("Creating AnalyserNode...", "info");
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      addDebugLog(`AnalyserNode created: fftSize=${analyser.fftSize}, bins=${analyser.frequencyBinCount}`, "success");
      
      // Connect nodes
      addDebugLog("Connecting source to analyser...", "info");
      source.connect(analyser);
      analyserRef.current = analyser;
      setAnalyserConnected(true);
      addDebugLog("✅ ANALYSER CONNECTED SUCCESSFULLY!", "success");

      // Test audio immediately
      await new Promise(resolve => setTimeout(resolve, 100));
      
      addDebugLog("🧪 Testing audio data...", "info");
      const testData = new Uint8Array(analyser.frequencyBinCount);
      
      // Test 3 times with delays
      for (let i = 0; i < 3; i++) {
        analyser.getByteFrequencyData(testData);
        const testSum = testData.reduce((a, b) => a + b, 0);
        const testAvg = testSum / testData.length;
        const testMax = Math.max(...testData);
        
        addDebugLog(`Test ${i+1}/3: sum=${testSum}, avg=${testAvg.toFixed(2)}, max=${testMax}, samples=[${testData.slice(0, 5).join(',')}]`, 
                    testSum > 0 ? "success" : "warning");
        
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Start analysis loop
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        addDebugLog("Cancelled old animation frame", "info");
      }
      
      rafRef.current = requestAnimationFrame(analyzeAudioFrame);
      addDebugLog("🔄 Audio analysis loop STARTED", "success");
      
      return true;
      
    } catch (err) {
      addDebugLog(`❌ CRITICAL ERROR in startAnalyser: ${err.message}`, "error");
      console.error("Analyser setup error:", err);
      setAnalyserConnected(false);
      return false;
    }
  };

  const analyzeAudioFrame = () => {
    if (!analyserRef.current) {
      addDebugLog("Analyser not available in analysis loop", "error");
      return;
    }

    try {
      const bufferLen = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLen);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLen; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLen;
      
      const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
      
      setVolumeLevel(normalizedLevel);

      const db = average > 0 ? 20 * Math.log10(average / 128) : -100;
      setRawDb(Number(db.toFixed(2)));

      // More frequent sampling for debugging
      if (Math.random() < 0.1) {
        const snapshot = Array.from(dataArray.slice(0, 8));
        setSampleSnapshot(snapshot);
        
        if (average > 1) {
          addDebugLog(`Audio: avg=${average.toFixed(2)}, level=${normalizedLevel}, dB=${db.toFixed(2)}`, "info");
        }
      }

      if (!isListening) {
        rafRef.current = requestAnimationFrame(analyzeAudioFrame);
        return;
      }

      const now = Date.now();

      if (normalizedLevel > SPEECH_THRESHOLD) {
        if (!speechSeenRef.current) {
          addDebugLog(`🎤 SPEECH DETECTED! Level: ${normalizedLevel}`, "success");
        }
        speechSeenRef.current = true;
        lastSoundRef.current = now;
        setIsSpeechDetected(true);
      } else {
        setIsSpeechDetected(false);
        
        if (speechSeenRef.current) {
          const silenceDuration = now - lastSoundRef.current;
          const recordingDuration = now - recordingStartRef.current;
          
          if (silenceDuration > SILENCE_MS && recordingDuration > MIN_RECORDING_MS) {
            addDebugLog(`🔇 Silence detected (${silenceDuration}ms) - auto-stopping`, "info");
            stopListening();
            return;
          }
        }
      }
    } catch (err) {
      addDebugLog(`Error in audio analysis: ${err.message}`, "error");
    }

    rafRef.current = requestAnimationFrame(analyzeAudioFrame);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        const base64 = res.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendAudioBlob = async (blob, format = "webm") => {
    try {
      const base64 = await blobToBase64(blob);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "audio-end", data: base64, format }));
        setStatus("📤 Audio sent — awaiting response...");
        addDebugLog(`Audio sent: ${blob.size} bytes`, "success");
      } else {
        addDebugLog("WebSocket closed - cannot send audio", "error");
        setStatus("❌ Connection lost");
      }
    } catch (err) {
      addDebugLog(`Failed to send audio: ${err.message}`, "error");
      setStatus("❌ Failed to process audio");
    }
  };

  // ---------- recording controls ----------
  const startListening = async () => {
    if (isListening) {
      addDebugLog("⚠️ Already listening, skipping", "warning");
      return;
    }
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setStatus("⚠️ Not connected to server");
      addDebugLog("❌ Cannot start - not connected to server", "warning");
      return;
    }

    addDebugLog("═══════════════════════════════════", "info");
    addDebugLog("🎬 STARTING LISTENING SESSION", "info");
    addDebugLog("═══════════════════════════════════", "info");

    try {
      // Step 1: Request microphone
      addDebugLog("STEP 1: Requesting microphone access...", "info");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } 
      });
      
      streamRef.current = stream;
      setMicPermission('granted');
      addDebugLog("✅ STEP 1 COMPLETE: Microphone access granted", "success");
      
      // Step 2: Verify audio tracks
      addDebugLog("STEP 2: Verifying audio tracks...", "info");
      const tracks = stream.getAudioTracks();
      
      if (tracks.length === 0) {
        throw new Error("No audio tracks in stream");
      }
      
      const track = tracks[0];
      const settings = track.getSettings();
      
      addDebugLog(`Track label: "${track.label}"`, "info");
      addDebugLog(`Track state: ${track.readyState}`, "info");
      addDebugLog(`Track enabled: ${track.enabled}`, "info");
      addDebugLog(`Track muted: ${track.muted}`, "info");
      addDebugLog(`Sample rate: ${settings.sampleRate}Hz`, "info");
      addDebugLog(`Channel count: ${settings.channelCount}`, "info");
      
      if (track.readyState !== 'live') {
        throw new Error(`Track is not live, state: ${track.readyState}`);
      }
      
      addDebugLog("✅ STEP 2 COMPLETE: Audio tracks verified", "success");

      // Step 3: Setup AudioContext
      addDebugLog("STEP 3: Setting up AudioContext...", "info");
      const ctx = await ensureAudioContext();
      
      addDebugLog(`AudioContext state: ${ctx.state}`, "info");
      addDebugLog(`AudioContext sampleRate: ${ctx.sampleRate}Hz`, "info");
      addDebugLog(`AudioContext currentTime: ${ctx.currentTime.toFixed(3)}s`, "info");
      
      if (ctx.state !== 'running') {
        addDebugLog("AudioContext not running, attempting resume...", "warning");
        await ctx.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
        addDebugLog(`After resume: ${ctx.state}`, ctx.state === 'running' ? "success" : "error");
      }
      
      if (ctx.state !== 'running') {
        throw new Error(`AudioContext state is ${ctx.state}, not running`);
      }
      
      addDebugLog("✅ STEP 3 COMPLETE: AudioContext ready", "success");

      // Step 4: Create and connect analyser
      addDebugLog("STEP 4: Creating analyser...", "info");
      const analyserSuccess = await startAnalyser(stream);
      
      if (!analyserSuccess) {
        throw new Error("Failed to create analyser");
      }
      
      addDebugLog("✅ STEP 4 COMPLETE: Analyser connected", "success");

      // Step 5: Wait and verify analyser is working
      addDebugLog("STEP 5: Verifying analyser is receiving audio...", "info");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!analyserRef.current) {
        throw new Error("Analyser ref is null");
      }
      
      addDebugLog("✅ STEP 5 COMPLETE: Analyser reference is valid", "success");

      // Step 6: Setup MediaRecorder
      addDebugLog("STEP 6: Setting up MediaRecorder...", "info");
      
      audioChunksRef.current = [];
      recordingStartRef.current = Date.now();
      lastSoundRef.current = Date.now();
      speechSeenRef.current = false;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
          addDebugLog(`📦 Chunk ${audioChunksRef.current.length}: ${ev.data.size} bytes`, "info");
        }
      };

      recorder.onerror = (e) => {
        addDebugLog(`❌ MediaRecorder error: ${e}`, "error");
      };

      recorder.onstop = async () => {
        addDebugLog("⏹️ MediaRecorder stopped", "info");
        
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const totalSize = audioChunksRef.current.reduce((s, c) => s + c.size, 0);
        addDebugLog(`Total recorded: ${totalSize} bytes from ${audioChunksRef.current.length} chunks`, "info");
        
        if (totalSize === 0) {
          setStatus("⚠️ No audio captured — retrying...");
          addDebugLog("⚠️ No audio data recorded", "warning");
          restartListeningSoon();
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        const recordedMs = Date.now() - recordingStartRef.current;
        addDebugLog(`Duration: ${recordedMs}ms, speech detected: ${speechSeenRef.current}`, "info");
        
        if (!speechSeenRef.current || recordedMs < MIN_RECORDING_MS) {
          setStatus("🎤 No clear speech detected — listening again...");
          addDebugLog("⚠️ No speech detected or too short", "warning");
          restartListeningSoon();
          return;
        }

        setStatus("⏳ Sending audio for transcription...");
        await sendAudioBlob(blob, "webm");
      };

      recorder.start(250);
      addDebugLog("✅ STEP 6 COMPLETE: MediaRecorder started", "success");
      
      setIsListening(true);
      setStatus("🎤 Listening... Speak now");
      addDebugLog("═══════════════════════════════════", "success");
      addDebugLog("🎤 LISTENING SESSION ACTIVE - SPEAK NOW!", "success");
      addDebugLog("═══════════════════════════════════", "success");

      try { 
        wsRef.current.send(JSON.stringify({ type: "audio-start" })); 
      } catch (e) { 
        addDebugLog(`⚠️ WS send failed: ${e.message}`, "warning");
      }

      safetyTimeoutRef.current = setTimeout(() => {
        addDebugLog("⏰ Safety timeout (30s)", "warning");
        stopListening();
      }, SAFE_MAX_MS);
      
    } catch (err) {
      addDebugLog("═══════════════════════════════════", "error");
      addDebugLog(`❌ FAILED: ${err.name} - ${err.message}`, "error");
      addDebugLog("═══════════════════════════════════", "error");
      setStatus("❌ Microphone error - check console");
      setMicPermission('denied');
      setIsListening(false);
      cleanupMedia(true);
    }
  };

  const restartListeningSoon = (delay = 500) => {
    setTimeout(() => { 
      if (isActive && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        startListening(); 
      }
    }, delay);
  };

  const stopListening = () => {
    if (!isListening) return;
    setIsListening(false);
    setStatus("⏸️ Processing audio...");
    addDebugLog("Stopping listening", "info");

    if (safetyTimeoutRef.current) { 
      clearTimeout(safetyTimeoutRef.current); 
      safetyTimeoutRef.current = null; 
    }

    try { 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop(); 
      }
    } catch (e) { 
      addDebugLog(`Failed to stop recorder: ${e.message}`, "error");
    }

    if (streamRef.current) { 
      streamRef.current.getTracks().forEach(t => {
        t.stop();
        addDebugLog(`Stopped track: ${t.label}`, "info");
      });
      streamRef.current = null; 
    }
  };

  const cleanupMedia = (closeAudio = false) => {
    addDebugLog("Cleaning up media", "info");
    
    if (safetyTimeoutRef.current) { 
      clearTimeout(safetyTimeoutRef.current); 
      safetyTimeoutRef.current = null; 
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    if (streamRef.current) { 
      streamRef.current.getTracks().forEach(t => t.stop()); 
      streamRef.current = null; 
    }
    
    if (rafRef.current) { 
      cancelAnimationFrame(rafRef.current); 
      rafRef.current = null; 
    }
    
    audioChunksRef.current = [];
    setAnalyserConnected(false);
    
    if (closeAudio && audioContextRef.current) { 
      audioContextRef.current.close(); 
      audioContextRef.current = null;
      setAudioContextState("closed");
    }
    
    setIsListening(false);
  };

  // ---------- toggle ----------
  const toggleAgent = async () => {
    if (isActive) {
      setIsActive(false);
      setStatus("Voice agent stopped");
      addDebugLog("Voice agent stopped by user", "info");
      cleanupMedia(true);
      if (wsRef.current) { 
        wsRef.current.close(); 
        wsRef.current = null; 
      }
    } else {
      setIsActive(true);
      addDebugLog("Voice agent starting...", "info");
      await checkMicrophonePermission();
      connectWebSocket();
      
      // Pre-initialize audio context on user gesture
      try {
        await ensureAudioContext();
        addDebugLog("Pre-initialized AudioContext on start", "success");
      } catch (err) {
        addDebugLog(`Failed to pre-init audio: ${err.message}`, "error");
      }
    }
  };

  const requestMicPermission = async () => {
    try {
      addDebugLog("Requesting microphone permission...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      addDebugLog("Microphone permission granted!", "success");
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      setMicPermission('denied');
      addDebugLog(`Microphone permission denied: ${err.message}`, "error");
    }
  };

  useEffect(() => {
    checkMicrophonePermission();
    
    return () => {
      setIsActive(false);
      cleanupMedia(true);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg transition-all duration-300 ${
            isListening 
              ? "bg-gradient-to-r from-red-400 to-pink-500 animate-pulse" 
              : isActive 
              ? "bg-gradient-to-r from-green-400 to-emerald-500" 
              : "bg-gradient-to-r from-blue-400 to-indigo-500"
          }`}>
            <svg className="w-14 h-14 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d={isListening ? "M10 12a2 2 0 100-4 2 2 0 000 4z" : "M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"} />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">🤖 AI Voice Agent</h1>
          <p className="text-sm text-gray-600">WebSocket • Auto-silence detection • Low-cost transcription flow</p>
        </div>

        {/* Microphone Permission Alert */}
        {micPermission === 'denied' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 mb-2">🚫 Microphone Access Denied</p>
            <p className="text-xs text-red-600 mb-3">Please allow microphone access in your browser settings to use voice features.</p>
            <button 
              onClick={requestMicPermission}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600"
            >
              Request Permission Again
            </button>
          </div>
        )}

        {micPermission === 'prompt' && !isActive && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm font-semibold text-yellow-700 mb-2">🎤 Microphone Permission Required</p>
            <p className="text-xs text-yellow-600 mb-3">You'll be asked to allow microphone access when you start the agent.</p>
          </div>
        )}

        <div className="mb-4">
          <div className={`p-3 rounded-xl border transition-colors ${
            status.includes("❌") 
              ? "bg-red-50 border-red-200" 
              : status.includes("✅") 
              ? "bg-green-50 border-green-200" 
              : "bg-gray-50 border-gray-200"
          }`}>
            <p className="text-center text-sm font-medium">{status}</p>
          </div>
        </div>

        <button 
          onClick={toggleAgent} 
          className={`w-full py-4 rounded-2xl font-bold text-lg mb-4 transition-all duration-200 hover:shadow-lg ${
            isActive 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
        >
          {isActive ? "Stop Voice Agent" : "Start Voice Agent"}
        </button>

        {isActive && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full">
              <div className={`w-3 h-3 rounded-full transition-colors ${
                isListening 
                  ? (isSpeechDetected ? "bg-green-500 animate-pulse" : "bg-yellow-500") 
                  : "bg-gray-400"
              }`} />
              <span className="text-sm font-semibold text-gray-700">
                {isListening ? (isSpeechDetected ? "🗣️ Speech Detected!" : "👂 Listening...") : "⏸️ Idle"}
              </span>
            </div>

            <div className="mt-3 max-w-xs mx-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs">🔊</span>
                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-75 ${
                      volumeLevel > 20 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                      volumeLevel > 5 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                      'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                    style={{ width: `${volumeLevel}%` }} 
                  />
                </div>
                <span className="text-sm w-10 font-mono font-bold">{Math.round(volumeLevel)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Auto-stop after {Math.round(SILENCE_MS / 1000 * 10) / 10}s silence • Safety max {Math.round(SAFE_MAX_MS / 1000)}s
              </p>

              <div className="mt-3 flex items-center justify-center space-x-2">
                <button 
                  onClick={() => setShowDebug(s => !s)} 
                  className="px-4 py-2 rounded-full bg-gray-100 text-xs hover:bg-gray-200 transition-colors font-semibold"
                >
                  {showDebug ? '🔽 Hide' : '▶️ Show'} Debug Panel
                </button>
              </div>
            </div>
          </div>
        )}

        {showDebug && (
          <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800 text-sm">🔍 Debug Information</p>
              <button 
                onClick={() => setDebugLog([])}
                className="px-2 py-1 bg-slate-200 rounded text-xs hover:bg-slate-300"
              >
                Clear Logs
              </button>
            </div>
            
            {/* System Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white rounded border">
                <span className="font-semibold">Mic Permission:</span>
                <code className={`ml-2 px-2 py-0.5 rounded ${
                  micPermission === 'granted' ? 'bg-green-100 text-green-800' :
                  micPermission === 'denied' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {micPermission}
                </code>
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-semibold">AudioContext:</span>
                <code className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {audioContextState}
                </code>
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-semibold">Analyser:</span>
                <code className={`ml-2 px-2 py-0.5 rounded ${
                  analyserConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {analyserConnected ? '✅ Connected' : '❌ Not connected'}
                </code>
              </div>
              <div className="p-2 bg-white rounded border">
                <span className="font-semibold">Volume Level:</span>
                <code className="ml-2 px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  {volumeLevel}/100
                </code>
              </div>
            </div>

            {/* Audio Metrics */}
            <div className="p-3 bg-white rounded border space-y-2">
              <p className="font-semibold text-xs text-slate-700">📊 Audio Metrics</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-600">Raw dB:</span>
                  <code className="ml-2 px-2 py-0.5 rounded bg-slate-100">{rawDb}</code>
                </div>
                <div>
                  <span className="text-slate-600">Speech Threshold:</span>
                  <code className="ml-2 px-2 py-0.5 rounded bg-slate-100">{SPEECH_THRESHOLD}</code>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-600 mb-1">Frequency Data Sample (0-255):</p>
                <code className="block bg-slate-100 px-2 py-1 rounded text-xs overflow-x-auto">
                  {sampleSnapshot.length > 0 ? sampleSnapshot.join(', ') : 'No data yet...'}
                </code>
              </div>
            </div>

            {/* Activity Log */}
            <div className="p-3 bg-white rounded border space-y-2">
              <p className="font-semibold text-xs text-slate-700">📝 Activity Log (Last 20)</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {debugLog.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No logs yet...</p>
                ) : (
                  debugLog.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`text-xs p-2 rounded ${
                        log.type === 'error' ? 'bg-red-50 text-red-700' :
                        log.type === 'success' ? 'bg-green-50 text-green-700' :
                        log.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-mono text-xs opacity-60">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Troubleshooting Tips */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold text-xs text-blue-800 mb-2">💡 Troubleshooting Tips</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>✓ Make sure microphone permission is granted</li>
                <li>✓ Check that no other app is using your microphone</li>
                <li>✓ Try speaking louder or closer to the microphone</li>
                <li>✓ Verify AudioContext state is "running" not "suspended"</li>
                <li>✓ Check browser console (F12) for additional error messages</li>
                <li>✓ If level stays at 0, try refreshing and allowing mic access again</li>
              </ul>
            </div>
          </div>
        )}

        {transcription && (
          <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-semibold text-purple-600 mb-2">📝 YOU SAID</p>
            <p className="text-purple-900 font-medium">{transcription}</p>
          </div>
        )}

        {response && (
          <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-600 mb-2">🤖 ASSISTANT</p>
            <p className="text-green-900">{response}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center"><span className="text-green-500 mr-2">✓</span>Auto-listening</div>
            <div className="flex items-center"><span className="text-green-500 mr-2">✓</span>Silence detection</div>
            <div className="flex items-center"><span className="text-green-500 mr-2">✓</span>Low-cost flow</div>
            <div className="flex items-center"><span className="text-green-500 mr-2">✓</span>WebM/Opus</div>
          </div>
          <p className="text-center mt-3 text-gray-500 font-mono text-xs">WebSocket: {wsUrl}</p>
        </div>
      </div>
    </div>
  );
}