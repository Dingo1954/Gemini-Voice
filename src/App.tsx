import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

// Initialize GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Support for Safari
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Tryk for at starte');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');

  const voices = [
    { id: 'Zephyr', name: 'Zephyr (Dyb/Rolig)' },
    { id: 'Puck', name: 'Puck (Lys/Energisk)' },
    { id: 'Charon', name: 'Charon (Blød)' },
    { id: 'Kore', name: 'Kore (Klar)' },
    { id: 'Fenrir', name: 'Fenrir (Stærk)' },
  ];
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const dummyGainRef = useRef<GainNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const startSession = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setVolume(0);
      
      setStatusMessage('Starter lydsystem...');

      // 1. Setup Audio Context
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      await audioCtx.resume(); // Ensure it's not suspended by the browser
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      setStatusMessage('Venter på mikrofon...');

      // 2. Get Microphone Stream with better constraints for headsets
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      } catch (mediaErr: any) {
        console.warn('Kunne ikke hente mikrofon med specifikke indstillinger, prøver standard...', mediaErr);
        // Fallback to basic audio request if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      streamRef.current = stream;

      setStatusMessage('Forbinder til AI...');

      // 3. Connect to Gemini Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: 'You are a helpful, friendly voice companion. Keep your answers concise and conversational. You are talking to a Danish user, so please speak Danish.',
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsRecording(true);
            setStatusMessage('Lytter...');

            // Start streaming audio from microphone
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // Prevent audio feedback (hearing yourself) while keeping processor active
            const dummyGain = audioCtx.createGain();
            dummyGain.gain.value = 0;
            dummyGainRef.current = dummyGain;
            
            source.connect(processor);
            processor.connect(dummyGain);
            dummyGain.connect(audioCtx.destination);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visual feedback
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); // Scale up slightly for visibility

              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }
              
              let binary = '';
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playAudio(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              stopPlayback();
            }
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('Forbindelsesfejl. Prøv igen.');
            setStatusMessage('Fejl');
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      if (err.name === 'NotAllowedError') {
        setError('Mikrofon adgang nægtet. Tillad venligst mikrofon i din browser.');
      } else if (err.name === 'NotFoundError') {
        setError('Ingen mikrofon fundet. Tjek at dit headset er tilsluttet.');
      } else {
        setError(err.message || 'Kunne ikke starte mikrofon eller forbinde til AI.');
      }
      setIsConnecting(false);
      setStatusMessage('Tryk for at starte');
      stopSession();
    }
  };

  const playAudio = (base64Audio: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    if (nextPlayTimeRef.current < audioCtx.currentTime) {
      nextPlayTimeRef.current = audioCtx.currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
    
    sourceNodesRef.current.push(source);
    source.onended = () => {
      sourceNodesRef.current = sourceNodesRef.current.filter(s => s !== source);
    };
  };

  const stopPlayback = () => {
    sourceNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    sourceNodesRef.current = [];
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const stopSession = () => {
    setIsRecording(false);
    setIsConnecting(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        try {
          session.close();
        } catch (e) {}
      });
      sessionRef.current = null;
    }
    stopPlayback();
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/20 rounded-full blur-[120px] opacity-60 mix-blend-screen"></div>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] opacity-40 mix-blend-screen"></div>
      </div>

      <div className="z-10 flex flex-col items-center space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-light tracking-tight text-white/90">Gemini Voice</h1>
          <p className="text-white/50 text-lg font-light tracking-wide">Your AI Companion</p>
        </div>

        <div className="relative">
          {/* Pulsing rings when recording */}
          {isRecording && (
            <>
              <motion.div
                animate={{ 
                  scale: 1 + volume * 1.5, 
                  opacity: Math.max(0.1, volume) 
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                className="absolute inset-0 bg-orange-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute inset-0 bg-orange-500 rounded-full"
              />
            </>
          )}

          <button
            onClick={isRecording ? stopSession : startSession}
            disabled={isConnecting}
            className={`
              relative w-32 h-32 rounded-full flex items-center justify-center
              transition-all duration-500 ease-out z-10
              ${isRecording 
                ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-400 shadow-[0_0_40px_rgba(249,115,22,0.3)]' 
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:scale-105 backdrop-blur-md'}
              ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isConnecting ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : isRecording ? (
              <div className="flex flex-col items-center">
                <Mic className="w-10 h-10 mb-1" />
                <div className="flex gap-1 items-end h-3">
                  <motion.div animate={{ height: Math.max(4, volume * 24) }} className="w-1 bg-orange-400 rounded-full" />
                  <motion.div animate={{ height: Math.max(4, volume * 32) }} className="w-1 bg-orange-400 rounded-full" />
                  <motion.div animate={{ height: Math.max(4, volume * 24) }} className="w-1 bg-orange-400 rounded-full" />
                </div>
              </div>
            ) : (
              <MicOff className="w-12 h-12" />
            )}
          </button>
        </div>

        <div className="h-8 flex items-center justify-center">
          {error ? (
            <p className="text-red-400 text-sm font-medium bg-red-400/10 px-4 py-2 rounded-full border border-red-400/20">
              {error}
            </p>
          ) : (
            <p className={`text-sm tracking-widest uppercase ${isRecording ? 'text-orange-400/80 animate-pulse' : 'text-white/50'}`}>
              {statusMessage}
            </p>
          )}
        </div>

        {/* Voice Selection */}
        {!isRecording && !isConnecting && (
          <div className="flex flex-wrap justify-center gap-2 max-w-md px-4">
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                  selectedVoice === voice.id
                    ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {voice.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
