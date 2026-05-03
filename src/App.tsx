import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, Volume2, LogIn, LogOut, FileText, MessageCircle, Save, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, handleFirestoreError } from './firebase';
import { doc, getDocFromServer, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Initialize GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Support for Safari
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

// Browser speech recognition API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [appMode, setAppMode] = useState<'conversation' | 'meeting'>('conversation');
  
  const [transcript, setTranscript] = useState('');
  const [pastMeetings, setPastMeetings] = useState<any[]>([]);
  const transcriptRef = useRef(''); // Keeps track across recognition restarts
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingMeetingRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Tryk for at starte');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [outputVolume, setOutputVolume] = useState(1);
  const [autoSaveTranscript, setAutoSaveTranscript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Settings Sync
  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists() && !isSaving) {
        const data = docSnap.data();
        if (data.selectedVoice) setSelectedVoice(data.selectedVoice);
        if (data.outputVolume !== undefined) setOutputVolume(data.outputVolume);
        if (data.autoSaveTranscript !== undefined) setAutoSaveTranscript(data.autoSaveTranscript);
      }
    }, (err) => {
      handleFirestoreError(err, 'get', `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Load Past Meetings
  useEffect(() => {
    if (!user) {
      setPastMeetings([]);
      return;
    }
    
    const meetingsRef = collection(db, 'users', user.uid, 'meetings');
    const q = query(meetingsRef, orderBy('createdAt', 'desc'), limit(5));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPastMeetings(meetingsData);
    }, (err) => {
      handleFirestoreError(err, 'list', `users/${user.uid}/meetings`);
    });

    return () => unsubscribe();
  }, [user]);

  // Persist settings to Firestore instead of localStorage
  useEffect(() => {
    if (!user || !authReady) return;
    
    async function saveSettings() {
      setIsSaving(true);
      try {
        const userRef = doc(db, 'users', user!.uid);
        const docSnap = await getDocFromServer(userRef);
        
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            email: user!.email || '',
            selectedVoice,
            outputVolume,
            autoSaveTranscript,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            selectedVoice,
            outputVolume,
            autoSaveTranscript,
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
         handleFirestoreError(err, 'update', `users/${user?.uid}`);
      } finally {
        setIsSaving(false);
      }
    }
    
    // Simple debounce
    const timeout = setTimeout(saveSettings, 1000);
    return () => clearTimeout(timeout);
  }, [selectedVoice, outputVolume, autoSaveTranscript, user, authReady]);

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
      
      if (appMode === 'meeting') {
        startMeetingMode();
      } else {
        await startConversationMode();
      }
    } catch (err: any) {
      handleSetupError(err);
    }
  };

  const startMeetingMode = () => {
    if (!SpeechRecognition) {
      setError('Din browser understøtter desværre ikke indbygget diktering. Prøv venligst Chrome eller Edge.');
      setIsConnecting(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'da-DK';

    let currentFinalTranscript = transcriptRef.current;

    recognition.onstart = () => {
      setIsConnecting(false);
      setIsRecording(true);
      isRecordingMeetingRef.current = true;
      setStatusMessage('Optager referat...');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let incomingFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          incomingFinal += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (incomingFinal) {
        currentFinalTranscript += incomingFinal + ' ';
        transcriptRef.current = currentFinalTranscript;
      }

      setTranscript(currentFinalTranscript + interimTranscript);
      // Simulate volume visually based on speaking intensity
      setVolume(interimTranscript.length > 0 ? 0.3 + Math.random() * 0.4 : 0);
      
      // Auto-save logic on silence
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (isRecordingMeetingRef.current && autoSaveTranscript) {
           stopSession(); // This will trigger onend -> auto save
        }
      }, 5000); // 5 seconds of silence
      
      setTimeout(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error', event.error);
      if (event.error !== 'aborted') {
        if (event.error === 'network') {
          setError('Netværksfejl under diktering. Prøv venligst igen.');
        } else {
          setError(`Lyd-fejl: ${event.error}`);
        }
        stopSession();
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (isRecordingMeetingRef.current) {
        try { recognition.start(); } catch(e){} // Restart if active
      } else {
        setVolume(0);
        
        // Auto-save exactly when meeting mode stops
        if (autoSaveTranscript && transcriptRef.current.trim()) {
           // We use a small timeout to let React states settle
           setTimeout(() => {
              saveMeeting(transcriptRef.current);
           }, 100);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch(e) {
       console.error("Could not start recognition:", e);
    }
  };

  const startConversationMode = async () => {
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

      let activeSession: any = null;

      // 3. Connect to Gemini Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are a helpful, friendly voice companion. Keep your answers concise and conversational. You are talking to a Danish user, so please speak Danish.',
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          }
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
              if (!activeSession) return;

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
              
              // Fast Base64 conversion chunking to avoid max call stack
              let binary = '';
              const bytes = new Uint8Array(buffer);
              const chunkSize = 0x8000; 
              for (let i = 0; i < bytes.length; i += chunkSize) {
                // ⚡ Bolt optimization: Passing TypedArray directly without Array.from avoids heavy heap allocations
                // in this performance-critical real-time audio loop. Cast to unknown as number[] to satisfy TS.
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
              }
              const base64Data = btoa(binary);

              try {
                activeSession.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              } catch (sendErr) {
                console.error("Fejl ved afsendelse af lyd:", sendErr);
              }
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              parts.forEach(p => {
                if (p.inlineData) {
                  playAudio(p.inlineData.data);
                }
              });
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              stopPlayback();
            }
          },
          onerror: (err: any) => {
            console.error('Live API Error:', err);
            setError(`Fejl i forbindelse: ${err?.message || 'Ukendt netværksfejl'}`);
            setStatusMessage('Fejl i forbindelsen');
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        }
      });

      sessionPromise.then(session => {
        activeSession = session;
      }).catch(err => {
        console.error('Session connection failed:', err);
        setError('Kunne ikke oprette forbindelse (Network error).');
        setIsConnecting(false);
        stopSession();
      });

      sessionRef.current = sessionPromise;
  };

  const handleSetupError = (err: any) => {
      console.error('Failed to start session:', err);
      if (err.name === 'NotAllowedError') {
        setError('Mikrofon adgang nægtet. Tillad venligst mikrofon i din browser.');
      } else if (err.name === 'NotFoundError') {
        setError('Ingen mikrofon fundet. Tjek at dit headset er tilsluttet.');
      } else {
        setError(err.message || 'Kunne ikke starte mikrofon.');
      }
      setIsConnecting(false);
      setStatusMessage('Tryk for at starte');
      stopSession();
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
    setVolume(0);

    isRecordingMeetingRef.current = false;
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
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

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      // Not showing error in UI for brevity if they close popup, handling simple case
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const saveMeeting = async (transcriptToSave?: string) => {
    const finalTranscript = transcriptToSave || transcript;
    if (!user || !finalTranscript.trim()) return;
    try {
      setIsSaving(true);
      await addDoc(collection(db, 'users', user.uid, 'meetings'), {
        userId: user.uid,
        transcript: finalTranscript.trim(),
        createdAt: serverTimestamp(),
      });
      setTranscript('');
      transcriptRef.current = '';
      // Optionally show a momentary success message in a real app
    } catch(err) {
      console.error(err);
      setError("Kunne ikke gemme referat.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Auth Banner */}
      <div className="absolute top-4 right-4 z-50">
        {!authReady ? null : user ? (
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <span className="text-sm text-white/70 max-w-[120px] truncate">{user.email}</span>
            <button onClick={handleLogout} className="text-orange-400 hover:text-orange-300 transition-colors" title="Log ud">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full border border-orange-500/20 transition-all font-medium text-sm"
          >
            <LogIn className="w-4 h-4" />
            Log ind med Google
          </button>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="absolute top-4 left-4 z-50">
        <div className="flex bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => setAppMode('conversation')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${appMode === 'conversation' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Samtale</span>
          </button>
          <button 
            onClick={() => setAppMode('meeting')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${appMode === 'meeting' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Møde</span>
          </button>
        </div>
      </div>

      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/20 rounded-full blur-[120px] opacity-60 mix-blend-screen"></div>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] opacity-40 mix-blend-screen"></div>
      </div>

      <div className={`z-10 flex flex-col items-center flex-1 w-full max-w-4xl px-4 ${appMode === 'meeting' ? 'py-24' : 'justify-center'} space-y-8`}>
        {appMode === 'conversation' && (
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-light tracking-tight text-white/90">Gemini Voice</h1>
            <p className="text-white/50 text-lg font-light tracking-wide">Your AI Companion</p>
          </div>
        )}

        {appMode === 'meeting' && (
          <div className="w-full flex-1 flex flex-col items-center max-w-2xl mx-auto space-y-4 pt-12 lg:pt-0">
             <div className="text-center space-y-2 mb-4">
              <h1 className="text-3xl font-light tracking-tight text-white/90">Mødereferat</h1>
              <p className="text-white/50 text-sm font-light tracking-wide">Lokal transskribering til skyen.</p>
            </div>
            
            {(transcript || isRecording) ? (
              <div className="w-full h-80 lg:flex-1 min-h-[300px] bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto backdrop-blur-sm relative">
                {!transcript && isRecording && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 italic p-8 text-center space-y-4">
                     <p className="text-lg">Lytter...</p>
                     <p className="text-sm font-light opacity-60">
                       Hvis dine ord ikke dukker op efter et par sekunder, blokerer din browser muligvis for diktering i dette vindue.
                     </p>
                     <p className="text-sm font-light opacity-60">
                       <strong className="text-white">Løsning:</strong> Tryk på knappen <span className="inline-block px-2 py-1 bg-white/10 rounded border border-white/20 mx-1">⍈</span> (Åbn i ny fane) helt oppe i øvre højre hjørne af skærmen, og prøv der!
                     </p>
                   </div>
                )}
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed font-light text-lg">
                  {transcript}
                  <div ref={transcriptEndRef} />
                </div>
              </div>
            ) : (
                <div className="w-full max-w-2xl mt-8">
                  {pastMeetings.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-white/40 text-sm tracking-widest uppercase font-medium mb-6">Tidligere referater</h3>
                      {pastMeetings.map((meeting) => (
                        <div key={meeting.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
                            <Clock className="w-3.5 h-3.5" />
                            {meeting.createdAt?.toDate ? meeting.createdAt.toDate().toLocaleString('da-DK', { dateStyle: 'medium', timeStyle: 'short'}) : 'Lige nu'}
                          </div>
                          <p className="text-white/80 text-sm line-clamp-3 font-light leading-relaxed">
                            {meeting.transcript}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-12 border border-white/5 rounded-2xl bg-white/5">
                        <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/40 font-light">Ingen referater endnu.</p>
                        <p className="text-white/30 text-sm mt-2">Tryk på mikrofonen for at starte et møde.</p>
                    </div>
                  )}
                </div>
            )}

            {transcript.trim() && !isRecording && user && (
              <button 
                onClick={saveMeeting}
                disabled={isSaving}
                className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-6 py-3 rounded-full border border-green-500/30 transition-all font-medium disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                Gem Referat i Skyen
              </button>
            )}
            
            {!user && transcript.trim() && !isRecording && (
               <p className="text-xs text-orange-400/80">Log ind oppe til højre for at gemme referatet.</p>
            )}
          </div>
        )}

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
                <div className="flex gap-1 items-end h-4">
                  <motion.div animate={{ height: Math.max(4, volume * 30) }} className="w-1.5 bg-orange-400 rounded-full" />
                  <motion.div animate={{ height: Math.max(4, volume * 45) }} className="w-1.5 bg-orange-400 rounded-full" />
                  <motion.div animate={{ height: Math.max(4, volume * 30) }} className="w-1.5 bg-orange-400 rounded-full" />
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

            {/* Application Settings (Meeting Mode focused) */}
            {appMode === 'meeting' && user && (
              <label className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors mt-4">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${autoSaveTranscript ? 'bg-orange-500' : 'bg-white/20'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${autoSaveTranscript ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={autoSaveTranscript}
                  onChange={(e) => setAutoSaveTranscript(e.target.checked)}
                />
                <span className="text-sm text-white/70 font-light">
                  Auto-gem referat ved stop / pause (5s)
                </span>
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
