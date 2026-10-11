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
  // BUG FIX: was hardcoded to 0.92 — now tracks actual confidence from speech recognition event
  const [confidence, setConfidence] = useState<number>(0.9);
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
        const conf = event.results[0][0].confidence || 0.9;
        // BUG FIX: update state so the displayed confidence reflects the real value
        setConfidence(conf);
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
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid var(--color-hairline)', paddingBottom:20, marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <Mic size={22} color="var(--color-primary)" strokeWidth={1.5} />
            <span className="text-heading-lg" style={{ color:'var(--color-ink)' }}>Voice Stock Command</span>
          </div>
          <div style={{ fontSize:14, color:'var(--color-ink-mute)', fontWeight:300 }}>Hands-free inventory updates: Capture → Interpret → Spoken read-back → Confirm (C1.7)</div>
        </div>
        <button onClick={() => setSpokenAudioEnabled(!spokenAudioEnabled)}
          className="btn-ghost-sm" style={{ fontSize:13 }}>
          <Volume2 size={14} style={{ color: spokenAudioEnabled ? 'var(--color-primary)' : 'var(--color-ink-mute)' }} />
          Audio Read-back {spokenAudioEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Main Microphone Card */}
      <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:32, boxShadow:'var(--shadow-2)', textAlign:'center', marginBottom:20, display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
        {/* State badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 12px', borderRadius:'var(--radius-pill)', border:'1px solid var(--color-hairline)', backgroundColor:'var(--color-canvas-soft)', fontSize:11, fontWeight:300, color:'var(--color-ink-mute)', letterSpacing:'0.05em', textTransform:'uppercase' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', backgroundColor:
            state==='listening' ? '#ef4444' :
            state==='processing' ? '#f59e0b' :
            state==='needs_confirmation' ? 'var(--color-primary)' :
            state==='committed' ? '#16a34a' : 'var(--color-ink-mute)', display:'inline-block' }} />
          State: {state}
        </div>

        {/* Mic button */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <button onClick={startListening} disabled={isRecording}
            style={{ width:88, height:88, borderRadius:'50%', border:'none', cursor: isRecording ? 'not-allowed' : 'pointer',
              backgroundColor: isRecording ? 'var(--c-err-fg)' : 'var(--color-primary)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: isRecording ? '0 0 0 4px rgba(220,38,38,0.2)' : '0 4px 20px rgba(13,148,136,0.35)',
              transition:'all 0.2s', transform: isRecording ? 'scale(1.05)' : 'scale(1)' }}>
            {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <div style={{ fontSize:13, color:'var(--color-ink-mute)', fontWeight:300 }}>
            {isRecording ? 'Listening… speak now' : 'Click to start voice command'}
          </div>
        </div>

        {/* Confidence readout */}
        <div style={{ fontSize:12, color:'var(--color-ink-mute)', display:'flex', alignItems:'center', gap:8 }}>
          <span>Confidence:</span>
          <div style={{ width:100, height:4, backgroundColor:'var(--color-hairline)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ width: `${Math.round(confidence*100)}%`, height:'100%', backgroundColor: confidence>0.8 ? '#16a34a' : confidence>0.6 ? '#f59e0b' : 'var(--c-err-fg)', borderRadius:2, transition:'width 0.3s' }} />
          </div>
          <span className="tnum" style={{ fontWeight:400, color:'var(--color-ink)' }}>{Math.round(confidence*100)}%</span>
        </div>

        {/* Needs Confirmation */}
        {state === 'needs_confirmation' && currentResult && (
          <div style={{ maxWidth:480, width:'100%', padding:16, border:'1px solid rgba(13,148,136,0.4)', borderRadius:12, backgroundColor:'rgba(13,148,136,0.04)', textAlign:'left' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--color-primary)', fontSize:11, fontWeight:400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
              <AlertCircle size={14} /> Confirmation Required
            </div>
            <p style={{ fontSize:15, color:'var(--color-ink)', fontStyle:'italic', marginBottom:12 }}>&#8220;{currentResult.spokenText}&#8221;</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, fontSize:12, fontFamily:'monospace', backgroundColor:'var(--color-canvas-soft)', padding:'10px 12px', borderRadius:8, border:'1px solid var(--color-hairline)' }}>
              <div>Action: <span style={{color:'var(--color-primary)'}}>{currentResult.action}</span></div>
              <div className="tnum">Qty: <span style={{color:'var(--color-ink)',fontWeight:400}}>{currentResult.quantity}</span></div>
              <div>SKU: <span style={{color:'var(--color-ink)',fontWeight:400}}>{currentResult.sku}</span></div>
              <div>Location: <span style={{color:'var(--color-ink)',fontWeight:400}}>{currentResult.location}</span></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => handleConfirm(true)} className="btn-primary" style={{ flex:1, justifyContent:'center' }}>Confirm & Commit Stock</button>
              <button onClick={() => handleConfirm(false)} className="btn-ghost-sm" style={{ padding:'8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Committed */}
        {state === 'committed' && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', border:'1px solid var(--c-ok-border)', borderRadius:10, backgroundColor:'var(--c-ok-bg)', color:'var(--c-ok-fg)', fontSize:14 }}>
            <CheckCircle2 size={18} /> Stock update committed and broadcast via WebSocket!
          </div>
        )}

        {/* Low Confidence */}
        {state === 'low_confidence' && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', border:'1px solid var(--c-warn-border)', borderRadius:10, backgroundColor:'var(--c-warn-bg)', color:'var(--c-warn-fg)', fontSize:14 }}>
            <AlertCircle size={18} /> Confidence below threshold (0.75). Please repeat or use the typed form below.
          </div>
        )}
      </div>

      {/* Typed Command Fallback */}
      <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:20, boxShadow:'var(--shadow-1)', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:400, color:'var(--color-ink)' }}>
            <span>Typed Command Fallback</span>
            <span title="Grammar: add|remove|set|check <n> [units of] <sku> [to|from|in] [location] <loc>" style={{color:'var(--color-ink-mute)',cursor:'help'}}>
              <HelpCircle size={13} />
            </span>
          </div>
          <span style={{ fontSize:11, color:'var(--color-ink-mute)', fontWeight:300 }}>Supports text input & offline queueing</span>
        </div>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setConfidence(0.9); handleProcessTranscript(typedCommand, 0.9); }} style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input type="text" value={typedCommand} onChange={e => setTypedCommand(e.target.value)}
            placeholder="e.g. add 20 units of SKU-1001 to location WH-01"
            className="input" style={{ flex:1, fontSize:14, fontFamily:'monospace' }} />
          <button type="submit" className="btn-primary-sm"><Send size={13} /> Process</button>
        </form>
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, fontSize:12, color:'var(--color-ink-mute)' }}>
          <span>Examples:</span>
          {[{label:'Add 20 · SKU-1001',cmd:'add 20 units of SKU-1001 to location WH-01'},{label:'Remove 5 units',cmd:'remove five units of SKU-1001 from location WH-01'},{label:'Set 3 (low stock)',cmd:'set 3 units of SKU-1001 in location WH-01'}].map(ex=>(
            <button key={ex.cmd} type="button" onClick={() => setTypedCommand(ex.cmd)} style={{ fontSize:12, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted' }}>{ex.label}</button>
          ))}
        </div>
      </div>

      {/* Offline Queue */}
      <div style={{ border:'1px solid var(--color-hairline)', borderRadius:'var(--radius-lg)', padding:'14px 20px', boxShadow:'var(--shadow-1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Clock size={18} color="var(--color-ink-mute)" strokeWidth={1.5} />
          <div>
            <div style={{ fontSize:14, fontWeight:400, color:'var(--color-ink)' }}>Offline Queue ({offlineQueue.length} pending)</div>
            <div style={{ fontSize:12, color:'var(--color-ink-mute)', fontWeight:300 }}>Network: <span style={{ color: isOnline ? '#16a34a' : '#f59e0b', fontWeight:400 }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span> · Idempotent by client_id</div>
          </div>
        </div>
        {offlineQueue.length > 0 && isOnline && (
          <button onClick={handleReplayQueue} className="btn-primary-sm" style={{ fontSize:13 }}>Replay Queue</button>
        )}
      </div>
    </div>
  );
}
