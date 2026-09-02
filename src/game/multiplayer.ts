import mqtt, { type MqttClient } from 'mqtt'
import type { KartState } from './physics'
import { generateRoomCode } from './roomCode'

export type Peer = KartState & { id: string; name: string; score: number; seen: number }

type RoomMessage =
  | { type: 'state'; player: Omit<Peer, 'seen'> }
  | { type: 'left'; id: string }
  | { type: 'start'; startAt: number }
  | { type: 'hit'; id: string; targetId: string; attackerId: string; damage: number }
  | { type: 'fire'; shooterId: string }

export class Multiplayer {
  readonly peers = new Map<string, Peer>()
  readonly id = crypto.randomUUID()
  room = ''
  private client?: MqttClient
  private topic = ''
  private startHandler: (startAt: number) => void = () => {}
  private rosterHandler: (players: Peer[]) => void = () => {}
  private presenceHandler: (name: string, action: 'joined' | 'left') => void = () => {}
  private heartbeat?: number
  private localPlayer: Omit<Peer, 'seen'>
  private damageHandler: (damage: number, attackerId: string) => void = () => {}
  private fireHandler: (shooterId: string) => void = () => {}
  private seenHits = new Set<string>()

  constructor(private name: () => string) {
    this.localPlayer = { id: this.id, name: this.name(), x: 0, y: 0, z: 12, heading: 0, speed: 0, verticalSpeed: 0, health: 100, score: 0 }
  }

  async createRoom() {
    const room = generateRoomCode()
    return this.connect(room)
  }

  async joinRoom(room: string) {
    return this.connect(room)
  }

  onRaceStart(handler: (startAt: number) => void) {
    this.startHandler = handler
  }

  onRosterChange(handler: (players: Peer[]) => void) {
    this.rosterHandler = handler
  }

  onPresence(handler: (name: string, action: 'joined' | 'left') => void) {
    this.presenceHandler = handler
  }

  onDamage(handler: (damage: number, attackerId: string) => void) { this.damageHandler = handler }

  onFire(handler: (shooterId: string) => void) { this.fireHandler = handler }

  fire() {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'fire', shooterId: this.id } satisfies RoomMessage), { qos: 0 })
  }

  hitOpponent(targetId: string, damage: number) {
    if (!this.client?.connected) return
    // ponytail: hits are client-authoritative; move validation to a trusted match server before ranked play.
    const message: RoomMessage = { type: 'hit', id: crypto.randomUUID(), targetId, attackerId: this.id, damage }
    this.client.publish(this.topic, JSON.stringify(message), { qos: 1 })
  }

  startRace() {
    if (!this.client?.connected) return
    const message: RoomMessage = { type: 'start', startAt: Date.now() + 700 }
    this.client.publish(this.topic, JSON.stringify(message), { qos: 1, retain: true })
  }

  private async connect(room: string) {
    this.disconnect()
    this.room = room
    this.topic = `fakekarts/v3/${room}`
    const left = JSON.stringify({ type: 'left', id: this.id } satisfies RoomMessage)
    try {
      const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
        clientId: `fakekarts_${this.id.replaceAll('-', '')}`,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2000,
        will: { topic: this.topic, payload: left, qos: 0, retain: false },
      })
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 10000)
        client.once('connect', () => { clearTimeout(timer); resolve() })
        client.once('error', error => { clearTimeout(timer); reject(error) })
      })
      this.client = client
      client.on('message', (_topic, payload) => {
        try { this.receive(JSON.parse(payload.toString()) as RoomMessage) } catch { /* Ignore unrelated public-broker traffic. */ }
      })
      await client.subscribeAsync(this.topic, { qos: 0 })
      this.publishLocalState()
      this.heartbeat = window.setInterval(() => this.publishLocalState(), 1000)
      return room
    } catch {
      this.disconnect()
      throw new Error('Could not connect to multiplayer. Please check your internet connection.')
    }
  }

  send(state: KartState, score: number) {
    this.localPlayer = { ...state, id: this.id, name: this.name(), score }
    this.publishLocalState()
    const stale = performance.now() - 3000
    for (const [id, player] of this.peers) if (player.seen < stale) this.removePeer(id)
  }

  disconnect() {
    if (this.client) {
      if (this.client.connected && this.topic) this.client.publish(this.topic, JSON.stringify({ type: 'left', id: this.id } satisfies RoomMessage))
      this.client.end(true)
    }
    this.client = undefined
    clearInterval(this.heartbeat)
    this.heartbeat = undefined
    this.topic = ''
    this.room = ''
    this.peers.clear()
  }

  private receive(message: RoomMessage) {
    if (message.type === 'state' && message.player.id !== this.id) {
      const isNew = !this.peers.has(message.player.id)
      this.peers.set(message.player.id, { ...message.player, seen: performance.now() })
      this.rosterHandler([...this.peers.values()])
      if (isNew) this.presenceHandler(message.player.name, 'joined')
    } else if (message.type === 'left') {
      this.removePeer(message.id)
    } else if (message.type === 'start' && Number.isFinite(message.startAt)) {
      this.startHandler(message.startAt)
    } else if (message.type === 'hit' && message.targetId === this.id && message.attackerId !== this.id && !this.seenHits.has(message.id)) {
      this.seenHits.add(message.id)
      if (this.seenHits.size > 100) this.seenHits.delete(this.seenHits.values().next().value!)
      this.damageHandler(Math.max(0, Math.min(100, Number(message.damage) || 0)), message.attackerId)
    } else if (message.type === 'fire' && message.shooterId !== this.id) {
      this.fireHandler(message.shooterId)
    }
  }

  private publishLocalState() {
    if (!this.client?.connected) return
    this.localPlayer.name = this.name()
    const message: RoomMessage = { type: 'state', player: this.localPlayer }
    this.client.publish(this.topic, JSON.stringify(message), { qos: 0 })
  }

  private removePeer(id: string) {
    const player = this.peers.get(id)
    if (!player) return
    this.peers.delete(id)
    this.rosterHandler([...this.peers.values()])
    this.presenceHandler(player.name, 'left')
  }
}
