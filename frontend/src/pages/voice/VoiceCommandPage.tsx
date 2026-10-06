import { useState, useEffect, FormEvent } from 'react';
import { apiRequest } from '../../api/client';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';

interface VoiceResult {
  status: 'listening' | 'processing' | 'needs_confirmation' | 'committed' | 'low_confidence' | 'cancelled' | 'idle';
  token?: string;
  spokenText?: string;
  error?: string;
  action?: string;
  sku?: string;
  quantity?: number;
  location?: string;
}

interface QueuedCommand {
  client_id: string;
  transcript: string;
  ts: string;
}

export default function VoiceCommandPage() {
  const [state, setState] = useState<VoiceResult['status']>('idle');
  const [currentResult, setCurrentResult] = useState<VoiceResult | null>(null);
  const [typedCommand, setTypedCommand] = useState('');
  const confidence = 0.92;
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<QueuedCommand[]>([]);
  const [spokenAudioEnabled, setSpokenAudioEnabled] = useState(true);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const speakText = (text: string) => {
    if (!spokenAudioEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const handleProcessTranscript = async (transcript: string, conf: number) => {
    if (!transcript.trim()) return;

    if (!isOnline) {
      // Add to offline queue (Robustness-1)
      const queuedItem: QueuedCommand = {
        client_id: 'CLI-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        transcript: transcript.trim(),
        ts: new Date().toISOString(),
      };
      setOfflineQueue((prev) => [...prev, queuedItem]);
      setState('idle');
      speakText('Offline. Command saved to local queue.');
      return;
    }

    setState('processing');

    try {
      const res = await apiRequest<{
        status: string;
        token?: string;
        spoken_text?: string;
        action?: string;
        error?: string;
        interpreted?: { action: string; sku: string; quantity: number; location: string };
      }>('/api/v1/voice/command', {
        method: 'POST',
        body: JSON.stringify({
          transcript: transcript.trim(),
          confidence: conf,
          device_id: 'browser-mic-1',
        }),
      });

      if (res.status === 'needs_confirmation') {
        setState('needs_confirmation');
        setCurrentResult({
          status: 'needs_confirmation',
          token: res.token,
          spokenText: res.spoken_text,
          action: res.interpreted?.action,
          sku: res.interpreted?.sku,
          quantity: res.interpreted?.quantity,
          location: res.interpreted?.location,
        });
        if (res.spoken_text) {
          speakText(res.spoken_text);
        }
      } else if (res.status === 'low_confidence') {
        setState('low_confidence');
        const err = 'Confidence low. Please repeat or use the form.';
        setCurrentResult({ status: 'low_confidence', error: err });
        speakText(err);
      } else {
        setState('idle');
      }
    } catch (err: unknown) {
      setState('idle');
      const msg = err instanceof Error ? err.message : 'Voice command processing failed';
      setCurrentResult({ status: 'idle', error: msg });
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!currentResult?.token) return;

    setState('processing');
    try {
      const res = await apiRequest<{
        status: string;
        spoken_text?: string;
      }>('/api/v1/voice/confirm', {
        method: 'POST',
        body: JSON.stringify({
          token: currentResult.token,
          confirmed,
        }),
      });

      if (confirmed && res.status === 'committed') {
        setState('committed');
        if (res.spoken_text) speakText(res.spoken_text);
      } else {
        setState('cancelled');
        speakText('Command cancelled.');
      }
    } catch (err: unknown) {
      setState('idle');
      setCurrentResult({ status: 'idle', error: err instanceof Error ? err.message : 'Confirmation failed' });
    }
  };

  const startListening = () => {
    // Check Web Speech API availability
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please use the typed command fallback box below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecording(true);
      setState('listening');

      recognition.onresult = (event: any) => {
        setIsRecording(false);
        const transcript = event.results[0][0].transcript;
        const conf = event.results[0][0].confidence || 0.95;
        setTypedCommand(transcript);
        handleProcessTranscript(transcript, conf);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setState('idle');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      setState('idle');
    }
  };

  const handleReplayQueue = async () => {
    if (offlineQueue.length === 0) return;
    try {
      await apiRequest('/api/v1/voice/command/queued', {
        method: 'POST',
        body: JSON.stringify(offlineQueue),
      });
      setOfflineQueue([]);
      speakText('Offline queue synchronised successfully.');
    } catch {
      alert('Failed to synchronise offline queue');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Mic className="w-6 h-6 text-emerald-400" />
            <span>Voice Stock Command (C1.7 / Seq 1)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hands-free inventory updates: Capture → Interpret → Spoken Read-back → Confirm
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setSpokenAudioEnabled(!spokenAudioEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition ${
              spokenAudioEnabled
                ? 'bg-slate-900 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio Read-back {spokenAudioEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Microphone Interaction Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        {/* Status Indicator */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-950 border border-slate-800">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-rose-500 animate-ping'
                : state === 'processing'
                ? 'bg-amber-400 animate-pulse'
                : state === 'needs_confirmation'
                ? 'bg-blue-400'
                : state === 'committed'
                ? 'bg-emerald-400'
                : 'bg-slate-600'
            }`}
          />
          <span className="uppercase tracking-wider text-[11px] text-slate-300">
            State: {state}
          </span>
        </div>

        {/* Big Mic Button */}
        <div>
          <button
            onClick={startListening}
            disabled={isRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition shadow-xl ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
          </button>
          <p className="text-xs text-slate-400 mt-3">
            {isRecording ? 'Listening... Speak now' : 'Click to start speaking voice command'}
          </p>
        </div>

        {/* Confirmation State UI */}
        {state === 'needs_confirmation' && currentResult && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950 border border-blue-900/60 text-left space-y-3">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Confirmation Required (Seq 1 loop)</span>
            </div>
            <p className="text-sm text-slate-200 italic font-serif">
              "{currentResult.spokenText}"
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-2.5 rounded-lg font-mono">
              <div>Action: <span className="text-emerald-400">{currentResult.action}</span></div>
              <div>Qty: <span className="text-white">{currentResult.quantity}</span></div>
              <div>SKU: <span className="text-white">{currentResult.sku}</span></div>
              <div>Location: <span className="text-white">{currentResult.location}</span></div>
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => handleConfirm(true)}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Confirm & Commit Stock
              </button>
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Committed State UI */}
        {state === 'committed' && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Stock update committed and broadcast to WebSocket channel!</span>
          </div>
        )}

        {/* Low Confidence State UI */}
        {state === 'low_confidence' && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Confidence below threshold (0.75). Please repeat or use the form below.</span>
          </div>
        )}
      </div>

      {/* Typed Command Fallback Box (CO-4) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <span>Typed Command Fallback (CO-4)</span>
            <span title="Grammar: add|remove|set|check <n> [units of] <sku> [to|from|in] [location] <loc>">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            </span>
          </h3>
          <span className="text-[10px] text-slate-500">Supports text input & offline queueing</span>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleProcessTranscript(typedCommand, confidence);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="e.g. add twenty units of SKU-1001 to location WH-01"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <button
            type="submit"
            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Process</span>
          </button>
        </form>

        <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-1">
          <span>Grammar examples:</span>
          <button
            type="button"
            onClick={() => setTypedCommand('add 20 units of SKU-1001 to location WH-01')}
            className="text-emerald-400 hover:underline"
          >
            Add 20 SKU-1001
          </button>
          <button
            type="button"
            onClick={() => setTypedCommand('remove five units of SKU-1001 from location WH-01')}
            className="text-emerald-400 hover:underline"
          >
            Remove 5 units
          </button>
          <button
            type="button"
            onClick={() => setTypedCommand('set 3 units of SKU-1001 in location WH-01')}
            className="text-emerald-400 hover:underline"
          >
            Set 3 units (Low Stock Trigger)
          </button>
        </div>
      </div>

      {/* Offline Queue Section (Robustness-1) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <div className="text-xs font-semibold text-white">
              Offline Command Queue ({offlineQueue.length} pending)
            </div>
            <div className="text-[10px] text-slate-400">
              Network status: <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span> • Idempotent by client_id
            </div>
          </div>
        </div>

        {offlineQueue.length > 0 && isOnline && (
          <button
            onClick={handleReplayQueue}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
          >
            Replay Queue Now
          </button>
        )}
      </div>
    </div>
  );
}
