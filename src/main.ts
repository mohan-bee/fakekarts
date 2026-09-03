import './styles/base.css'
import './styles/menu.css'
import './styles/hud.css'
import './styles/settings.css'
import { Game } from './game/Game'
import { isRoomCode, normalizeRoomCode } from './game/roomCode'
import { setupSettings } from './game/settings'

const byId = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!
const name = byId<HTMLInputElement>('name')
const room = byId<HTMLInputElement>('room-code')
const joinButton = byId<HTMLButtonElement>('join-room')
const createButton = byId<HTMLButtonElement>('create-room')
const startButton = byId<HTMLButtonElement>('start-room')
const lobby = byId('lobby')
const lobbyPlayers = byId('lobby-players')
const roomStatus = byId('room-status')
const presenceToast = byId('presence-toast')
const joinError = byId('join-error')
room.value = normalizeRoomCode(new URLSearchParams(location.search).get('room') || '')
const settings = setupSettings()
const game = new Game(byId<HTMLCanvasElement>('world'), () => name.value.trim() || 'Rookie', settings)

let countdownRunning = false
let raceActive = false
let toastTimer = 0

const renderRoster = (players: Array<{ name: string }>) => {
  lobbyPlayers.replaceChildren()
  byId('lobby-player-count').textContent = String(players.length + 1)
  for (const playerName of [`${name.value.trim() || 'Rookie'} (YOU)`, ...players.map(player => player.name)]) {
    const row = document.createElement('span')
    const avatar = document.createElement('i')
    avatar.textContent = playerName.charAt(0).toUpperCase()
    const label = document.createElement('b')
    label.textContent = playerName
    const ready = document.createElement('small')
    ready.textContent = 'READY'
    row.append(avatar, label, ready)
    lobbyPlayers.append(row)
  }
}

game.onRosterChange(renderRoster)
game.onPresence((playerName, action) => {
  if (!raceActive) return
  clearTimeout(toastTimer)
  presenceToast.textContent = `${playerName} ${action === 'joined' ? 'joined the room' : 'left the room'}`
  presenceToast.className = `presence-toast ${action} show`
  toastTimer = window.setTimeout(() => { presenceToast.className = 'presence-toast' }, 2000)
})

const runCountdown = async (startAt: number) => {
  if (countdownRunning) return
  countdownRunning = true
  await new Promise(resolve => setTimeout(resolve, Math.max(0, startAt - Date.now())))
  lobby.classList.add('hidden')
  const countdown = byId('countdown')
  for (const word of ['3', '2', '1', 'GO!']) {
    countdown.textContent = word
    countdown.classList.add('show')
    await new Promise(resolve => setTimeout(resolve, word === 'GO!' ? 650 : 700))
    countdown.classList.remove('show')
  }
  byId('menu').classList.add('hidden')
  byId('hud').classList.remove('hidden')
  document.querySelector('.controls')!.classList.add('active')
  game.start()
  raceActive = true
}

game.onRaceStart(runCountdown)

const enterLobby = async (action: () => Promise<string>, isOwner: boolean) => {
  createButton.disabled = true
  joinButton.disabled = true
  joinError.textContent = ''
  try {
    const joinedRoom = await action()
    room.value = joinedRoom
    byId('room-name').textContent = joinedRoom
    byId('lobby-room-code').textContent = joinedRoom
    history.replaceState(null, '', `${location.pathname}?room=${encodeURIComponent(joinedRoom)}`)
  } catch (error) {
    joinError.textContent = error instanceof Error ? error.message : 'Could not connect to the room.'
    createButton.disabled = false
    joinButton.disabled = false
    joinButton.querySelector('span')!.textContent = 'JOIN ROOM'
    return
  }
  byId('menu').classList.add('hidden')
  byId('hud').classList.remove('hidden')
  renderRoster([])
  if (!countdownRunning) lobby.classList.remove('hidden')
  roomStatus.textContent = isOwner ? 'ROOM READY — SHARE THE CODE, THEN START' : 'WAITING FOR THE OWNER TO START…'
  if (isOwner) startButton.classList.remove('hidden')
}

createButton.addEventListener('click', () => enterLobby(() => game.createRoom(), true))

startButton.addEventListener('click', () => {
  startButton.disabled = true
  roomStatus.textContent = 'STARTING FOR EVERYONE…'
  game.startRoomRace()
})

joinButton.addEventListener('click', () => {
  const roomCode = normalizeRoomCode(room.value)
  room.value = roomCode
  if (!isRoomCode(roomCode)) {
    joinError.textContent = 'Enter a 3-digit room code.'
    room.focus()
    return undefined
  }
  joinButton.querySelector('span')!.textContent = 'JOINING…'
  return enterLobby(() => game.joinRoom(roomCode), false)
})

room.addEventListener('keydown', event => {
  if (event.key === 'Enter') joinButton.click()
})

room.addEventListener('input', () => { room.value = normalizeRoomCode(room.value) })

byId('sound').addEventListener('click', event => {
  const button = event.currentTarget as HTMLButtonElement
  button.classList.toggle('muted')
  button.textContent = button.classList.contains('muted') ? '×' : '♪'
})

addEventListener('pagehide', () => game.disconnect())
