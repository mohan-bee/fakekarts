import './styles/base.css'
import './styles/menu.css'
import './styles/hud.css'
import './styles/settings.css'
import { GaragePreview } from './game/garage'
import { Game } from './game/Game'
import { COSMETICS, cosmeticAt, normalizeTrim, type KartTrim } from './game/cosmetics'
import { MODE_LABELS, type MatchMode } from './game/match'
import { isRoomCode, normalizeRoomCode } from './game/roomCode'
import { isSecondaryKind } from './game/secondary'
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
const matchMode = byId<HTMLSelectElement>('match-mode')
const secondaryChoice = byId<HTMLSelectElement>('secondary-choice')
room.value = normalizeRoomCode(new URLSearchParams(location.search).get('room') || '')
const settings = setupSettings()
const game = new Game(byId<HTMLCanvasElement>('world'), () => name.value.trim() || 'Rookie', settings)
const garagePreview = new GaragePreview(byId<HTMLCanvasElement>('garage-preview'))
let previewTrim = normalizeTrim()
const garageOptions = byId('garage-options')

const selectCosmetic = (id: number) => {
  const cosmetic = cosmeticAt(id)
  localStorage.setItem('fakekarts-cosmetic', String(cosmetic.id))
  byId('garage-name').textContent = cosmetic.name.toUpperCase()
  byId('garage-effect').style.background = cosmetic.exhaust
  const preview = byId('kart-preview')
  preview.style.setProperty('--paint', cosmetic.paint)
  preview.style.setProperty('--accent', cosmetic.accent)
  preview.style.setProperty('--exhaust', cosmetic.exhaust)
  preview.style.setProperty('--gun', cosmetic.gun)
  for (const button of garageOptions.querySelectorAll<HTMLButtonElement>('button')) {
    const selected = Number(button.dataset.cosmetic) === cosmetic.id
    button.classList.toggle('selected', selected)
    button.setAttribute('aria-checked', String(selected))
  }
  game.setCosmetic(cosmetic.id)
  garagePreview.update(cosmetic, previewTrim)
}

for (const cosmetic of COSMETICS) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.cosmetic = String(cosmetic.id)
  button.setAttribute('role', 'radio')
  button.setAttribute('aria-label', cosmetic.name)
  button.style.setProperty('--paint', cosmetic.paint)
  button.style.setProperty('--accent', cosmetic.accent)
  button.innerHTML = '<i></i><span></span>'
  button.addEventListener('click', () => selectCosmetic(cosmetic.id))
  garageOptions.append(button)
}
selectCosmetic(Number(localStorage.getItem('fakekarts-cosmetic')))

const storedSecondary = localStorage.getItem('fakekarts-secondary')
if (isSecondaryKind(storedSecondary)) secondaryChoice.value = storedSecondary
game.setSecondary(isSecondaryKind(secondaryChoice.value) ? secondaryChoice.value : 'grenade')
secondaryChoice.addEventListener('change', () => {
  if (!isSecondaryKind(secondaryChoice.value)) return
  localStorage.setItem('fakekarts-secondary', secondaryChoice.value)
  game.setSecondary(secondaryChoice.value)
})
const descriptions: Record<MatchMode, string> = {
  battle: 'First to 10 eliminations. Solo practice includes an armed opponent.',
  race: 'Three laps. Cross all 12 gates in order. Weapons and pickups disabled. Solo runs track your best lap.',
  'combat-race': 'Three laps with weapons. Elimination returns you to your last checkpoint with two seconds of spawn protection.',
}
matchMode.addEventListener('change', () => {
  startButton.querySelector('span')!.textContent = `START ${MODE_LABELS[matchMode.value as MatchMode]}`
  byId('mode-description').textContent = descriptions[matchMode.value as MatchMode]
})
let trim = normalizeTrim()
try { trim = normalizeTrim(JSON.parse(localStorage.getItem('fakekarts-trim') || '{}')) } catch { /* Default trim. */ }
for (const key of ['wheels', 'aero', 'finish'] as const) {
  const select = byId<HTMLSelectElement>(`trim-${key}`)
  select.value = trim[key]
  select.addEventListener('change', () => {
    trim = normalizeTrim({ ...trim, [key]: select.value } as KartTrim)
    localStorage.setItem('fakekarts-trim', JSON.stringify(trim))
    game.setTrim(trim)
    previewTrim = trim
    garagePreview.update(cosmeticAt(Number(localStorage.getItem('fakekarts-cosmetic'))), trim)
  })
}
game.setTrim(trim)
previewTrim = trim
garagePreview.update(cosmeticAt(Number(localStorage.getItem('fakekarts-cosmetic'))), trim)
let practice = false
byId('practice').addEventListener('click', () => {
  practice = true
  byId('menu').classList.add('hidden')
  lobby.classList.remove('hidden')
  byId('lobby-room-code').textContent = 'SOLO'
  byId('room-name').textContent = 'PRACTICE'
  byId('room-status').textContent = 'CHOOSE YOUR MODE AND LOADOUT'
  lobby.querySelector('.lobby-header > span')!.textContent = 'OFFLINE'
  startButton.classList.remove('hidden')
  renderRoster([])
})

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

const runCountdown = async (startAt: number, mode: MatchMode) => {
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
  game.start(mode)
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
  matchMode.disabled = !isOwner
  if (isOwner) startButton.classList.remove('hidden')
}

createButton.addEventListener('click', () => enterLobby(() => game.createRoom(), true))

startButton.addEventListener('click', () => {
  startButton.disabled = true
  roomStatus.textContent = 'STARTING FOR EVERYONE…'
  if (practice) void runCountdown(Date.now(), matchMode.value as MatchMode)
  else game.startRoomRace(matchMode.value as MatchMode)
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

byId('play-again').addEventListener('click', () => location.reload())

addEventListener('pagehide', () => game.disconnect())
