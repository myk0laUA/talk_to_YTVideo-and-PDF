// Injected offline browser/native fixtures ONLY. Never imported by application code.
export function fakeBrowserVoice(target = globalThis, install = false) {
  const counts = { peers: 0, peerCloses: 0, channels: 0, channelCloses: 0, listeners: 0,
    media: 0, attached: 0, trackStops: 0, remoteStops: 0, audio: 0, releases: 0, plays: 0,
    offers: 0, local: 0, remote: 0, sends: 0, finalAck: 0, items: 0, violations: 0 };
  const control = { hold: '', fault: '', denied: false, blockedPlayback: false, maxMessageSize: 16384, buffered: 0 };
  const pending = [], peers = [], channels = [], tracks = [], trace = [], sourceParts = []; let eventSequence = 0;
  class Target extends EventTarget {
    own = new Map();
    addEventListener(type, listener, options) {
      let set = this.own.get(type); if (!set) this.own.set(type, set = new Set());
      if (!set.has(listener)) { set.add(listener); counts.listeners++; }
      super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      if (this.own.get(type)?.delete(listener)) counts.listeners--;
      super.removeEventListener(type, listener, options);
    }
  }
  const step = (phase, fn) => control.hold === phase ? new Promise((resolve, reject) => pending.push({ phase, release: () => Promise.resolve().then(fn).then(resolve, reject) })) : Promise.resolve().then(fn);
  class Track extends Target {
    kind = 'audio'; enabled = true; readyState = 'live';
    constructor(remote = false) { super(); this.remote = remote; tracks.push(this); }
    stop() { this.readyState = 'ended'; if (this.remote) counts.remoteStops++; else counts.trackStops++; }
  }
  class Stream { constructor() { this.tracks = []; } getTracks() { return this.tracks; } addTrack(t) { this.tracks.push(t); } }
  class Channel extends Target {
    readyState = 'connecting'; bufferedAmountLowThreshold = 0;
    constructor() { super(); counts.channels++; channels.push(this); }
    get bufferedAmount() { return control.buffered; }
    emit(e) { this.dispatchEvent(new MessageEvent('message', { data: typeof e === 'string' ? e : JSON.stringify({ event_id: 'native08d_' + (++eventSequence), ...e }) })); }
    send(raw) {
      counts.sends++; const e = JSON.parse(raw);
      trace.push(e.type === 'session.update' ? (e.session.output_modalities[0] === 'audio' ? 'send-final' : 'send-config') : e.type);
      const phase = e.type === 'session.update' ? (e.session.output_modalities[0] === 'audio' ? 'final' : 'config') : 'items';
      if (e.type === 'conversation.item.create') sourceParts.push(JSON.parse(e.item.content[0].text));
      const reply = () => {
        if (control.fault === 'malformed') { this.emit('{bad'); return; }
        if (control.fault === 'oversized') { this.emit('x'.repeat(24577)); return; }
        if (control.fault === 'provider') { this.emit({ type: 'error', error: { code: 'server_error' } }); return; }
        if (control.fault === 'context') { this.emit({ type: 'error', error: { code: 'context_length_exceeded' } }); return; }
        if (e.type === 'session.update') {
          const s = structuredClone(e.session);
          if (control.fault === 'settings') s.model = 'wrong-model';
          else s.model = 'gpt-realtime-2.1-mini';
          if (phase === 'final' && control.fault === 'transcription-missing') delete s.audio.input.transcription;
          if (phase === 'final' && control.fault === 'transcription-wrong') s.audio.input.transcription = { model: 'whisper-1' };
          if (phase === 'final') { counts.finalAck++; trace.push('ack-final'); }
          this.emit({ type: 'session.updated', event_id: 'ack_' + counts.sends, session: { ...s, id: 'session08d', object: 'realtime.session' } });
        } else if (e.type === 'conversation.item.create') {
          counts.items++; const item = structuredClone(e.item);
          if (control.fault === 'item') item.content[0].text += 'mismatch';
          this.emit({ type: 'conversation.item.done', event_id: 'item_' + counts.items, item: { ...item, status: 'completed' }, previous_item_id: e.previous_item_id ?? null });
        } else if (e.type === 'response.cancel') this.emit({ type: 'response.done', response: { id: e.response_id, status: 'cancelled' } });
        else if (e.type === 'output_audio_buffer.clear') this.emit({ type: 'output_audio_buffer.cleared', response_id: 'response08d' });
      };
      if (control.hold === phase) pending.push({ phase, release: reply }); else queueMicrotask(reply);
    }
    close() { counts.channelCloses++; this.readyState = 'closed'; }
  }
  class Peer extends Target {
    connectionState = 'new';
    constructor() { super(); counts.peers++; peers.push(this); }
    get sctp() { return { maxMessageSize: control.maxMessageSize }; }
    addTransceiver(kind, options) {
      if (kind !== 'audio' || options.direction !== 'sendrecv' || tracks.some(t => !t.remote && t.readyState === 'live')) counts.violations++;
      return { sender: { replaceTrack: track => step('attach', () => {
        if (track.enabled || !counts.finalAck) counts.violations++;
        counts.attached++; trace.push('attach');
      }) } };
    }
    createDataChannel(name, options) { if (name !== 'oai-events' || !options.ordered) counts.violations++; return this.channel = new Channel(); }
    createOffer() { counts.offers++; return step('offer', () => ({ type: 'offer', sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' })); }
    setLocalDescription() { counts.local++; return step('local', () => {}); }
    setRemoteDescription() { counts.remote++; return step('remote', () => {
      if (this.connectionState === 'closed') throw new Error('closed peer');
      this.connectionState = 'connected'; this.channel.readyState = 'open';
      const e = new Event('track'); e.track = new Track(true); e.streams = []; this.dispatchEvent(e);
      this.dispatchEvent(new Event('connectionstatechange')); this.channel.dispatchEvent(new Event('open'));
    }); }
    close() { counts.peerCloses++; this.connectionState = 'closed'; }
  }
  const deps = { peer: () => new Peer(), stream: () => new Stream(), now: () => performance.now(),
    uuid: () => crypto.randomUUID(), fetch: (...args) => fetch(...args),
    media: () => { counts.media++; trace.push('media'); if (!counts.finalAck) counts.violations++;
      return step('media', () => { if (control.denied) throw new Error('denied'); const s = new Stream(); s.addTrack(new Track()); return s; }); },
    audio: () => { counts.audio++; return { autoplay: false, srcObject: null,
      play: () => { counts.plays++; return step('play', () => { if (control.blockedPlayback) throw new Error('playback blocked'); }); },
      pause() { counts.releases++; }, removeAttribute() {}, load() {} }; },
  };
  const api = { counts, control, trace, deps, peers, channels, tracks, sourceParts,
    release: phase => { const work = pending.splice(0); for (const p of work) if (!phase || p.phase === phase) p.release(); else pending.push(p); },
    emit: event => channels.at(-1).emit(event),
    snapshot: () => ({ counts: { ...counts }, trace: [...trace], pending: pending.length, liveTracks: tracks.filter(t => t.readyState === 'live').length,
      enabledTracks: tracks.filter(t => t.enabled && t.readyState === 'live' && !t.remote).length }),
  };
  if (install) {
    target.__voice08d = api;
    target.RTCPeerConnection = Peer; target.MediaStream = Stream;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: deps.media } });
    const create = document.createElement.bind(document);
    document.createElement = function(name, ...args) { return name === 'audio' ? deps.audio() : create(name, ...args); };
  }
  return api;
}
