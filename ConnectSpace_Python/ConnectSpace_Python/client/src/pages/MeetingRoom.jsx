import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, Check, Copy, DoorOpen, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Send, ShieldCheck, Users, Video, VideoOff, X } from 'lucide-react';
import { api, API_BASE, getToken } from '../lib/api';
import { useAuth } from '../App.jsx';

export default function MeetingRoom() {
  const { code } = useParams(); const nav = useNavigate(); const { user } = useAuth();
  const [meeting, setMeeting] = useState(null); const [error, setError] = useState('');
  const [mic, setMic] = useState(true); const [camera, setCamera] = useState(true); const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false); const [participants, setParticipants] = useState([]); const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState(''); const [copied, setCopied] = useState(false); const [connecting, setConnecting] = useState(true);
  const localVideo = useRef(null); const localStream = useRef(null); const socketRef = useRef(null); const peersRef = useRef({}); const remoteStreams = useRef({}); const chatEnd = useRef(null);

  useEffect(() => { let live = true; api(`/meetings/join/${code}`).then(d => { if (live) setMeeting(d.meeting); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [code]);
  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(pc => pc.close()); peersRef.current = {}; remoteStreams.current = {};
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    if (localStream.current) { localStream.current.getTracks().forEach(track => track.stop()); localStream.current = null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const setupSocket = (stream) => {
      if (cancelled) return;
      const socket = io(API_BASE, { auth: { token: getToken() } }); socketRef.current = socket;
      const createPeer = (peerId) => {
        if (peersRef.current[peerId]) return peersRef.current[peerId];
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); peersRef.current[peerId] = pc;
        stream?.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = e => { if (e.candidate) socket.emit('webrtc:ice', { to: peerId, candidate: e.candidate }); };
        pc.ontrack = e => { remoteStreams.current[peerId] = e.streams[0]; const el = document.getElementById(`remote-${peerId}`); if (el) el.srcObject = e.streams[0]; };
        return pc;
      };
      socket.on('connect', () => { setConnecting(false); socket.emit('room:join', { code: code.toUpperCase() }); });
      socket.on('connect_error', e => { setConnecting(false); setError(e.message || 'Could not connect to the meeting server.'); });
      socket.on('room:peers', peers => {
        setParticipants([{ id: socket.id, name: user?.name || 'You', self: true }, ...peers.map(p => ({ id: p.socketId, name: p.user?.name || 'Guest' }))]);
        peers.forEach(async p => { if (!stream) return; const pc = createPeer(p.socketId); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit('webrtc:offer', { to: p.socketId, offer }); });
      });
      socket.on('room:peer-joined', p => setParticipants(old => old.some(x => x.id === p.socketId) ? old : [...old, { id: p.socketId, name: p.user?.name || 'Guest' }]));
      socket.on('room:peer-left', p => { peersRef.current[p.socketId]?.close(); delete peersRef.current[p.socketId]; delete remoteStreams.current[p.socketId]; setParticipants(old => old.filter(x => x.id !== p.socketId)); });
      socket.on('webrtc:offer', async data => { if (!stream) return; const pc = createPeer(data.from); await pc.setRemoteDescription(new RTCSessionDescription(data.offer)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit('webrtc:answer', { to: data.from, answer }); });
      socket.on('webrtc:answer', async data => { const pc = peersRef.current[data.from]; if (pc && pc.signalingState !== 'stable') await pc.setRemoteDescription(new RTCSessionDescription(data.answer)); });
      socket.on('webrtc:ice', async data => { try { await peersRef.current[data.from]?.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { console.warn('Could not add ICE candidate', e); } });
      socket.on('chat:message', m => setMessages(old => [...old, m]));
    };
    (async () => {
      let stream = null;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); localStream.current = stream; if (localVideo.current) localVideo.current.srcObject = stream; }
      catch (e) { setError(e.name === 'NotAllowedError' ? 'Camera or microphone permission was denied. You can still use chat.' : 'Camera and microphone could not be started. You can still use chat.'); }
      if (!cancelled) setupSocket(stream); else stream?.getTracks().forEach(t => t.stop());
    })();
    return () => { cancelled = true; cleanup(); };
  }, [code, cleanup, user?.name]);
  useEffect(() => { if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current; }, [camera, connecting]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  function toggleMic() { const next = !mic; setMic(next); localStream.current?.getAudioTracks().forEach(t => { t.enabled = next; }); }
  function toggleCamera() { const next = !camera; setCamera(next); localStream.current?.getVideoTracks().forEach(t => { t.enabled = next; }); }
  async function shareScreen() {
    try {
      if (sharing) { const original = localStream.current?.getVideoTracks()[0]; if (original) { Object.values(peersRef.current).forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(original)); if (localVideo.current) localVideo.current.srcObject = localStream.current; } setSharing(false); return; }
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true }); const track = screen.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track)); if (localVideo.current) localVideo.current.srcObject = screen;
      track.onended = () => { const original = localStream.current?.getVideoTracks()[0]; if (original) Object.values(peersRef.current).forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(original)); if (localVideo.current) localVideo.current.srcObject = localStream.current; setSharing(false); };
      setSharing(true);
    } catch (e) { if (e.name !== 'NotAllowedError') setError('Screen sharing is not available in this browser.'); }
  }
  function sendMessage(e) { e.preventDefault(); const text = message.trim(); if (!text) return; socketRef.current?.emit('chat:message', { text }); setMessage(''); }
  async function copy() { try { await navigator.clipboard.writeText(`${location.origin}/meeting/${code}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setError(`Share this meeting code: ${code}`); } }
  if (!meeting && !error) return <div className="full-loader">Loading meeting…</div>;
  return <main className="meeting-page">
    <header className="meeting-topbar"><button className="back-button" onClick={() => { cleanup(); nav('/'); }}><ArrowLeft size={18}/> Workspace</button><div className="meeting-title"><span className="meeting-live-dot"/><span><b>{meeting?.title || 'ConnectSpace meeting'}</b><small>Room code: {code.toUpperCase()}</small></span></div><button className="share-button" onClick={copy}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied' : 'Invite'}</button></header>
    {error && <div className="meeting-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15}/></button></div>}
    <div className={`meeting-body ${chatOpen ? 'chat-visible' : ''}`}><section className="video-stage"><div className="stage-heading"><span><span className="record-dot"/> LIVE ROOM</span><span className="participants-count"><Users size={15}/> {Math.max(1, participants.length)} here</span></div>
      <div className="video-grid">{participants.filter(p => p.self).map(p => <div className="video-tile self-tile" key={p.id}><video ref={localVideo} autoPlay muted playsInline className={camera ? '' : 'hidden-video'}/>{!camera && <div className="video-placeholder"><span>{(user?.name || 'Y')[0].toUpperCase()}</span><b>Camera off</b></div>}<div className="video-label"><span className="audio-indicator">{mic ? <Mic size={13}/> : <MicOff size={13}/>}</span>{p.name} (You)</div></div>)}
      {participants.filter(p => !p.self).map(p => <div className="video-tile remote-tile" key={p.id}><video id={`remote-${p.id}`} autoPlay playsInline ref={el => { if (el && remoteStreams.current[p.id]) el.srcObject = remoteStreams.current[p.id]; }}/><div className="video-label"><span className="audio-indicator"><Mic size={13}/></span>{p.name}</div></div>)}
      {participants.length <= 1 && <div className="invite-tile"><div className="invite-illustration"><Users size={32}/><span>+</span></div><h3>Your people are one link away.</h3><p>Copy the invite link and send it to the people you want in this room.</p><button className="button primary" onClick={copy}><Copy size={15}/> {copied ? 'Copied link' : 'Copy invite link'}</button></div>}</div>
      <div className="meeting-controls"><div className="control-group"><button className={`control-button ${!mic ? 'is-off' : ''}`} onClick={toggleMic} aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>{mic ? <Mic size={20}/> : <MicOff size={20}/>}<span>{mic ? 'Mute' : 'Unmute'}</span></button><button className={`control-button ${!camera ? 'is-off' : ''}`} onClick={toggleCamera} aria-label={camera ? 'Turn camera off' : 'Turn camera on'}>{camera ? <Video size={20}/> : <VideoOff size={20}/>}<span>{camera ? 'Camera' : 'Camera off'}</span></button><button className={`control-button ${sharing ? 'is-on' : ''}`} onClick={shareScreen} aria-label="Share screen"><MonitorUp size={20}/><span>{sharing ? 'Stop share' : 'Share screen'}</span></button></div><button className="leave-button" onClick={() => { cleanup(); nav('/'); }}><PhoneOff size={19}/><span>Leave</span></button><div className="control-group control-right"><button className={`control-button ${chatOpen ? 'is-on' : ''}`} onClick={() => setChatOpen(v => !v)} aria-label="Toggle chat"><MessageSquare size={20}/><span>Chat</span></button><button className="control-button" onClick={copy} aria-label="Invite people"><Users size={20}/><span>Invite</span></button></div></div><div className="meeting-privacy"><ShieldCheck size={14}/> Keep your meeting link private. Only invite people you trust.</div>
    </section>{chatOpen && <aside className="chat-panel"><div className="chat-header"><div><h3>In-meeting chat</h3><small>Messages are shared with everyone here</small></div><button className="icon-button" onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={18}/></button></div><div className="chat-messages">{messages.length ? messages.map(m => <div className={`chat-message ${m.user?.id === user?.id ? 'mine' : ''}`} key={m.id}><b>{m.user?.name || 'Guest'}</b><p>{m.text}</p><small>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="chat-empty"><MessageSquare size={24}/><b>Start the conversation</b><p>Messages sent here appear for everyone in this room.</p></div>}<div ref={chatEnd}/></div><form className="chat-compose" onSubmit={sendMessage}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Send a message…" maxLength={1000} aria-label="Chat message"/><button type="submit" disabled={!message.trim()} aria-label="Send message"><Send size={17}/></button></form></aside>}</div>
    <footer className="meeting-footer"><span>ConnectSpace <span>•</span> Meeting room</span><span>{connecting ? 'Connecting to room…' : `${participants.length || 1} participant${(participants.length || 1) === 1 ? '' : 's'}`}</span><button onClick={() => nav('/')}><DoorOpen size={14}/> Back to workspace</button></footer>
  </main>;
}
