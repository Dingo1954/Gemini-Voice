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
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('gemini_voice') || 'Zephyr';
  });
  const [outputVolume, setOutputVolume] = useState(() => {
    const saved = localStorage.getItem('gemini_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [chatHistory, setChatHistory] = useState<{role: string, text: string, id: number}[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(() => {
    return localStorage.getItem('gemini_persona') || 'venlig';
  });
  const [customPersona, setCustomPersona] = useState(() => {
    return localStorage.getItem('gemini_custom_persona') || '';
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_voice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('gemini_volume', outputVolume.toString());
  }, [outputVolume]);

  useEffect(() => {
    localStorage.setItem('gemini_persona', selectedPersonaId);
  }, [selectedPersonaId]);

  useEffect(() => {
    localStorage.setItem('gemini_custom_persona', customPersona);
  }, [customPersona]);

  const voices = [
    { id: 'Zephyr', name: 'Zephyr (Dyb/Rolig)' },
    { id: 'Puck', name: 'Puck (Lys/Energisk)' },
    { id: 'Charon', name: 'Charon (Blød)' },
    { id: 'Kore', name: 'Kore (Klar)' },
    { id: 'Fenrir', name: 'Fenrir (Stærk)' },
  ];

  const personas = [
    { id: 'venlig', name: 'Venlig Følgesvend', instruction: 'You are a helpful, friendly voice companion. Keep your answers concise and conversational. You are talking to a Danish user, so please speak Danish.' },
    { id: 'interviewer', name: 'Job-interviewer', instruction: 'You are a strict but fair job interviewer conducting a job interview in Danish. Ask challenging questions and evaluate the user\'s responses. Be concise.' },
    { id: 'underviser', name: 'Sprogunderviser', instruction: 'You are a helpful Danish language teacher. Gently correct grammar mistakes, explain vocabulary, and encourage the user to practice speaking Danish.' },
    { id: 'custom', name: 'Brugerdefineret', instruction: '' }
  ];

  const getSystemInstruction = () => {
    if (selectedPersonaId === 'custom') {
      return customPersona || personas[0].instruction;
    }
    const persona = personas.find(p => p.id === selectedPersonaId);
    return persona ? persona.instruction : personas[0].instruction;
  };
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const dummyGainRef = useRef<GainNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  const startSession = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setVolume(0);
      setChatHistory([]);
      
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
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: getSystemInstruction(),
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsRecording(true);
            setStatusMessage('Lytter...');

            // Set up Speech Recognition for User Subtitles
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognition.lang = 'da-DK';
              recognition.continuous = true;
              recognition.interimResults = false;

              recognition.onresult = (event: any) => {
                const last = event.results.length - 1;
                const text = event.results[last][0].transcript;

                setChatHistory(prev => [...prev, {
                  role: 'Bruger',
                  text: text,
                  id: Date.now()
                }]);
              };

              try {
                recognition.start();
                speechRecognitionRef.current = recognition;
              } catch (e) {
                console.warn('Speech recognition failed to start:', e);
              }
            }

            // Start streaming audio from microphone
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // Prevent audio feedback (hearing yourself) while keeping processor active
            const dummyGain = audioCtx.createGain();
            dummyGain.gain.value = 0;
            dummyGainRef.current = dummyGain;
            
            // Set up Analyser for visualizer
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            source.connect(processor);
            processor.connect(dummyGain);
            dummyGain.connect(audioCtx.destination);

            // Connect to visualizer
            source.connect(analyser);

            // Start Visualizer Loop
            const drawVisualizer = () => {
              if (!canvasRef.current || !analyserRef.current) return;

              const canvas = canvasRef.current;
              const canvasCtx = canvas.getContext('2d');
              if (!canvasCtx) return;

              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              analyser.getByteFrequencyData(dataArray);

              canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

              const barWidth = (canvas.width / bufferLength) * 2.5;
              let barHeight;
              let x = 0;

              for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Colors based on intensity
                canvasCtx.fillStyle = `rgb(249, 115, 22, ${barHeight / 100})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
              }

              animationFrameRef.current = requestAnimationFrame(drawVisualizer);
            };
            drawVisualizer();

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
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  playAudio(part.inlineData.data);
                }
                if (part.text) {
                  setChatHistory(prev => [...prev, {
                    role: 'AI',
                    text: part.text as string,
                    id: Date.now() + Math.random()
                  }]);
                }
              }
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
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = outputVolume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (analyserRef.current) {
      gainNode.connect(analyserRef.current);
    }

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
    setStatusMessage('Tryk for at starte');
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
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

  const exportHistory = () => {
    if (chatHistory.length === 0) return;
    const historyText = chatHistory.map(msg => `[${msg.role}]: ${msg.text}`).join('\n\n');
    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_historik_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault(); // Stop page scroll
          if (isRecording) {
            stopSession();
          } else if (!isConnecting) {
            startSession();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, isConnecting]);

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
                <motion.div
                  animate={{ 
                    color: volume > 0.1 ? '#fb923c' : '#fdba74',
                    scale: 1 + volume * 0.2
                  }}
                >
                  <Mic className="w-10 h-10 mb-1" />
                </motion.div>
                {/* We replace the old simple height bars with the canvas visualizer */}
                <canvas
                  ref={canvasRef}
                  width={80}
                  height={24}
                  className="mt-1"
                />
              </div>
            ) : (
              <MicOff className="w-12 h-12" />
            )}
          </button>
        </div>

        <div className="h-8 flex items-center justify-center mb-8">
          {error ? (
            <p className="text-red-400 text-sm font-medium bg-red-400/10 px-4 py-2 rounded-full border border-red-400/20">
              {error}
            </p>
          ) : (
            <div className="flex items-center gap-3">
              {isRecording && (
                <motion.div 
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-[10px] font-bold text-red-500 tracking-widest">REC</span>
                </motion.div>
              )}
              <p className={`text-sm tracking-widest uppercase ${isRecording ? 'text-orange-400/80' : 'text-white/50'}`}>
                {isConnecting ? statusMessage : isRecording ? 'Lytter...' : 'Tryk for at starte'}
              </p>
            </div>
          )}
        </div>

        {/* Chat History Subtitles */}
        {(isRecording || chatHistory.length > 0) && (
          <div className="w-full max-w-2xl px-4 mt-4 flex flex-col items-center">
            <div className="w-full h-64 overflow-y-auto flex flex-col gap-3 rounded-xl p-4 hide-scrollbar mask-image-bottom-fade border border-white/5 bg-white/5">
              {chatHistory.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === 'Bruger' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-white/30 uppercase tracking-widest mb-1 ml-1">{msg.role}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                    msg.role === 'Bruger'
                      ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30 rounded-tr-sm'
                      : 'bg-white/10 text-white/90 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {/* Dummy element to auto-scroll to bottom */}
              <div style={{ float:"left", clear: "both" }}
                   ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }}>
              </div>
            </div>

            {!isRecording && chatHistory.length > 0 && (
              <button
                onClick={exportHistory}
                className="mt-4 px-4 py-2 rounded-full text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
              >
                Eksportér Historik
              </button>
            )}
          </div>
        )}

        {/* Voice Selection */}
        {!isRecording && !isConnecting && (
          <div className="flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Volume Control */}
            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/10 w-full max-w-xs">
              <Volume2 className="w-5 h-5 text-white/40" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={outputVolume}
                onChange={(e) => setOutputVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-[10px] font-mono text-white/40 w-8 text-right">
                {Math.round(outputVolume * 100)}%
              </span>
            </div>

            <div className="flex flex-col gap-4 items-center">
              <span className="text-xs text-white/40 uppercase tracking-widest">Stemme</span>
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
            </div>

            <div className="flex flex-col gap-4 items-center w-full">
              <span className="text-xs text-white/40 uppercase tracking-widest">Persona</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-md px-4">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersonaId(persona.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                      selectedPersonaId === persona.id
                        ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {persona.name}
                  </button>
                ))}
              </div>

              {selectedPersonaId === 'custom' && (
                <div className="w-full max-w-md px-4 mt-2 animate-in fade-in slide-in-from-top-2">
                  <textarea
                    value={customPersona}
                    onChange={(e) => setCustomPersona(e.target.value)}
                    placeholder="Skriv din egen systeminstruktion her..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none h-24 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
