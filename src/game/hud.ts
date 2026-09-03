import type { MatchMode } from './match'
import type { Peer } from './multiplayer'
import { KPH_PER_UNIT } from './physics'
import type { PowerupKind, PowerupSystem } from './powerups'
import type { SecondaryKind } from './secondary'

export function updateHud(speed: number, drift: number, health: number, botHealth: number, peers: Iterable<Peer>, localId: string, localScore: number, mode: MatchMode, secondary: SecondaryKind, powerups: PowerupSystem) {
  const kmh = Math.round(Math.abs(speed) * KPH_PER_UNIT)
  document.querySelector('#speed')!.textContent = String(kmh)
  ;(document.querySelector('#speedbar') as HTMLElement).style.width = `${Math.min(kmh / 1.5, 100)}%`
  document.querySelector('#drift-status')!.classList.toggle('active', Math.abs(drift) > .08)
  document.querySelector('#health-value')!.textContent = String(health)
  ;(document.querySelector('#healthbar') as HTMLElement).style.width = `${health}%`
  const remotePlayers = [...peers]
  document.querySelector('#position')!.textContent = String(1 + remotePlayers.length + Number(mode === 'battle'))
  document.querySelector('#secondary-name')!.textContent = secondary.toUpperCase()
  const activePowerups = (['rapid', 'shield', 'jetpack'] as PowerupKind[]).filter(kind => powerups.active(kind))
  document.querySelector('#powerup-status')!.innerHTML = activePowerups.map(kind => `<span>${kind.toUpperCase()} <b>${powerups.remaining(kind)}s</b></span>`).join('')
  document.querySelector('#players')!.innerHTML = `<span><i style="background:#ff5a4f"></i>YOU · ${health} HP</span>${mode === 'battle' ? `<span><i style="background:#30a9ff"></i>BOT-01 · ${botHealth} HP</span>` : ''}${remotePlayers.map(peer => `<span><i style="background:#a879ff"></i>${escapeHtml(peer.name)} · ${peer.health ?? 100} HP</span>`).join('')}`
  const rankings = [{ id: localId, name: 'YOU', score: Math.round(localScore) }, ...remotePlayers]
    .sort((a, b) => b.score - a.score)
  document.querySelector('#leaderboard')!.innerHTML = `<b>${mode === 'race' ? 'RACE PROGRESS' : 'ELIMINATIONS'}</b>${rankings.map((player, index) => `<span><i>${index + 1}</i><em>${escapeHtml(player.name)}</em><strong>${player.score}${mode === 'race' ? ' M' : ' K'}</strong></span>`).join('')}`
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
