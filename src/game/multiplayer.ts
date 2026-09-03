import mqtt, { type MqttClient } from 'mqtt'
import { isMatchMode, type MatchMode } from './match'
import type { KartState } from './physics'
import { generateRoomCode } from './roomCode'
import { isSecondaryKind, type SecondaryKind } from './secondary'

export type Peer = KartState & { id: string; name: string; score: number; cosmetic: number; secondary: SecondaryKind; seen: number }

type RoomMessage =
  | { type: 'state'; player: Omit<Peer, 'seen'> }
  | { type: 'left'; id: string }
  | { type: 'start'; startAt: number; mode: MatchMode }
  | { type: 'hit'; id: string; targetId: string; attackerId: string; damage: number }
  | { type: 'fire'; shooterId: string }
  | { type: 'secondary'; shooterId: string; kind: SecondaryKind }
  | { type: 'impulse'; id: string; targetId: string; x: number; z: number; up: number }
  | { type: 'kill'; id: string; killerId: string }
  | { type: 'win'; winnerId: string; name: string; mode: MatchMode }

export class Multiplayer {
  readonly peers = new Map<string, Peer>()
  readonly id = crypto.randomUUID()
  room = ''
  private client?: MqttClient
  private topic = ''
  private startHandler: (startAt: number, mode: MatchMode) => void = () => {}
  private rosterHandler: (players: Peer[]) => void = () => {}
  private presenceHandler: (name: string, action: 'joined' | 'left') => void = () => {}
  private heartbeat?: number
  private localPlayer: Omit<Peer, 'seen'>
  private damageHandler: (damage: number, attackerId: string) => void = () => {}
  private fireHandler: (shooterId: string) => void = () => {}
  private secondaryHandler: (shooterId: string, kind: SecondaryKind) => void = () => {}
  private impulseHandler: (x: number, z: number, up: number) => void = () => {}
  private winnerHandler: (name: string, mode: MatchMode) => void = () => {}
  private killHandler: () => void = () => {}
  private seenHits = new Set<string>()

  constructor(private name: () => string) {
    this.localPlayer = { id: this.id, name: this.name(), x: 0, y: 0, z: 12, heading: 0, speed: 0, verticalSpeed: 0, health: 100, score: 0, cosmetic: 0, secondary: 'grenade' }
  }

  async createRoom() {
    const room = generateRoomCode()
    return this.connect(room)
  }

  async joinRoom(room: string) {
    return this.connect(room)
  }

  onRaceStart(handler: (startAt: number, mode: MatchMode) => void) {
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

  onSecondary(handler: (shooterId: string, kind: SecondaryKind) => void) { this.secondaryHandler = handler }

  onImpulse(handler: (x: number, z: number, up: number) => void) { this.impulseHandler = handler }

  onWinner(handler: (name: string, mode: MatchMode) => void) { this.winnerHandler = handler }

  onKill(handler: () => void) { this.killHandler = handler }

  fire() {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'fire', shooterId: this.id } satisfies RoomMessage), { qos: 0 })
  }

  useSecondary(kind: SecondaryKind) {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'secondary', shooterId: this.id, kind } satisfies RoomMessage), { qos: 0 })
  }

  pushOpponent(targetId: string, x: number, z: number, up: number) {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'impulse', id: crypto.randomUUID(), targetId, x, z, up } satisfies RoomMessage), { qos: 1 })
  }

  confirmElimination(killerId: string) {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'kill', id: crypto.randomUUID(), killerId } satisfies RoomMessage), { qos: 1 })
  }

  announceWinner(mode: MatchMode) {
    if (!this.client?.connected) return
    this.client.publish(this.topic, JSON.stringify({ type: 'win', winnerId: this.id, name: this.name(), mode } satisfies RoomMessage), { qos: 1, retain: true })
  }

  hitOpponent(targetId: string, damage: number) {
    if (!this.client?.connected) return
    // ponytail: hits are client-authoritative; move validation to a trusted match server before ranked play.
    const message: RoomMessage = { type: 'hit', id: crypto.randomUUID(), targetId, attackerId: this.id, damage }
    this.client.publish(this.topic, JSON.stringify(message), { qos: 1 })
  }

  startRace(mode: MatchMode) {
    if (!this.client?.connected) return
    const message: RoomMessage = { type: 'start', startAt: Date.now() + 700, mode }
    this.client.publish(this.topic, JSON.stringify(message), { qos: 1, retain: true })
  }

  private async connect(room: string) {
    this.disconnect()
    this.room = room
    this.topic = `fakekarts/v4/${room}`
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
    this.localPlayer = { ...state, id: this.id, name: this.name(), score, cosmetic: this.localPlayer.cosmetic, secondary: this.localPlayer.secondary }
    this.publishLocalState()
    const stale = performance.now() - 3000
    for (const [id, player] of this.peers) if (player.seen < stale) this.removePeer(id)
  }

  setCosmetic(cosmetic: number) {
    this.localPlayer.cosmetic = cosmetic
    this.publishLocalState()
  }

  setSecondary(secondary: SecondaryKind) {
    this.localPlayer.secondary = secondary
    this.publishLocalState()
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
    } else if (message.type === 'start' && Number.isFinite(message.startAt) && isMatchMode(message.mode)) {
      this.startHandler(message.startAt, message.mode)
    } else if (message.type === 'hit' && message.targetId === this.id && message.attackerId !== this.id && !this.seenHits.has(message.id)) {
      this.seenHits.add(message.id)
      if (this.seenHits.size > 100) this.seenHits.delete(this.seenHits.values().next().value!)
      this.damageHandler(Math.max(0, Math.min(100, Number(message.damage) || 0)), message.attackerId)
    } else if (message.type === 'fire' && message.shooterId !== this.id) {
      this.fireHandler(message.shooterId)
    } else if (message.type === 'secondary' && message.shooterId !== this.id && isSecondaryKind(message.kind)) {
      this.secondaryHandler(message.shooterId, message.kind)
    } else if (message.type === 'impulse' && message.targetId === this.id && !this.seenHits.has(message.id)) {
      this.seenHits.add(message.id)
      if (this.seenHits.size > 100) this.seenHits.delete(this.seenHits.values().next().value!)
      this.impulseHandler(Math.max(-20, Math.min(20, Number(message.x) || 0)), Math.max(-20, Math.min(20, Number(message.z) || 0)), Math.max(0, Math.min(14, Number(message.up) || 0)))
    } else if (message.type === 'kill' && message.killerId === this.id && !this.seenHits.has(message.id)) {
      this.seenHits.add(message.id)
      if (this.seenHits.size > 100) this.seenHits.delete(this.seenHits.values().next().value!)
      this.killHandler()
    } else if (message.type === 'win' && message.winnerId !== this.id && typeof message.name === 'string' && isMatchMode(message.mode)) {
      this.winnerHandler(message.name.slice(0, 12), message.mode)
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
