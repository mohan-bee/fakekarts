import { accuracy, CHECKPOINT_COUNT, formatTime, RACE_LAPS, type RaceState, type MatchStats, type MatchMode } from './match'
import type { Peer } from './multiplayer'
import { KPH_PER_UNIT } from './physics'
import type { PowerupKind, PowerupSystem } from './powerups'
import type { SecondaryKind } from './secondary'

export function updateHud(speed: number, drift: number, health: number, botHealth: number, peers: Iterable<Peer>, localId: string, localScore: number, mode: MatchMode, secondary: SecondaryKind, powerups: PowerupSystem, race: RaceState, stats: MatchStats, botKills: number | undefined, airborne: boolean, ammo: number, reloadRemaining: number) {
  document.querySelector('#ammo-count')!.textContent = reloadRemaining > 0 ? reloadRemaining.toFixed(1) : String(ammo)
  document.querySelector('#ammo-label')!.textContent = reloadRemaining > 0 ? 'RELOAD' : '/ 12 · Q'
  const kmh = Math.round(Math.abs(speed) * KPH_PER_UNIT)
  document.querySelector('#speed')!.textContent = String(kmh)
  ;(document.querySelector('#speedbar') as HTMLElement).style.width = `${Math.min(kmh / 1.5, 100)}%`
  document.querySelector('#drift-status')!.classList.toggle('active', Math.abs(drift) > .08 || airborne)
  document.querySelector('#drift-status')!.textContent = airborne ? 'AIR CONTROL · SPACE TO BRAKE' : 'DRIFTING'
  document.querySelector('#health-value')!.textContent = String(health)
  ;(document.querySelector('#healthbar') as HTMLElement).style.width = `${health}%`
  const remotePlayers = [...peers]
  document.querySelector('#position')!.textContent = String(1 + remotePlayers.length + Number(botKills !== undefined))
  document.querySelector('#secondary-name')!.textContent = secondary.toUpperCase()
  const activePowerups = (['rapid', 'shield', 'jetpack'] as PowerupKind[]).filter(kind => powerups.active(kind))
  document.querySelector('#powerup-status')!.innerHTML = activePowerups.map(kind => `<span>${kind.toUpperCase()} <b>${powerups.remaining(kind)}s</b></span>`).join('')
  document.querySelector('#players')!.innerHTML = `<span><i style="background:#ff5a4f"></i>YOU · ${health} HP</span>${botKills !== undefined ? `<span><i style="background:#30a9ff"></i>BOT-01 · ${botHealth} HP</span>` : ''}${remotePlayers.map(peer => `<span><i style="background:#a879ff"></i>${escapeHtml(peer.name)} · ${peer.health ?? 100} HP</span>`).join('')}`
  const rankings = [{ id: localId, name: 'YOU', score: localScore }, ...remotePlayers, ...(botKills === undefined ? [] : [{ id: 'bot', name: 'BOT-01', score: botKills }])]
    .sort((a, b) => b.score - a.score)
  document.querySelector('#race-position')!.textContent = `${rankings.findIndex(player => player.id === localId) + 1} / ${rankings.length}`
  document.querySelector('#match-stats')!.textContent = mode === 'battle' ? `${stats.kills} K / ${stats.deaths} D · ${stats.shots} SHOTS · ${stats.hits} HITS · ${accuracy(stats)}% ACC` : `LAP ${Math.min(RACE_LAPS, Math.floor(race.checkpoints / CHECKPOINT_COUNT) + 1)} / ${RACE_LAPS} · GATE ${race.checkpoints % CHECKPOINT_COUNT + 1} / ${CHECKPOINT_COUNT}`
  document.querySelector('#lap-timing')!.textContent = mode === 'battle' ? 'FIRST TO 10 ELIMINATIONS' : `TIME ${formatTime(race.elapsed)} · BEST ${formatTime(race.bestLap)}`
  document.querySelector('#combat-stats')!.textContent = mode === 'combat-race' ? `${stats.kills} K / ${stats.deaths} D · ${stats.shots} SHOTS · ${stats.hits} HITS · ${accuracy(stats)}% ACC` : ''
  document.querySelector('#leaderboard')!.innerHTML = `<b>${mode !== 'battle' ? 'RACE POSITION' : 'ELIMINATIONS'}</b>${rankings.map((player, index) => `<span><i>${index + 1}</i><em>${escapeHtml(player.name)}</em><strong>${mode !== 'battle' ? `${Math.floor(player.score / CHECKPOINT_COUNT)} L` : `${player.score} K`}</strong></span>`).join('')}`
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
