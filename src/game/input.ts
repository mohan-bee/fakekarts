import type { Controls } from './physics'

export function bindControls(controls: Controls, toggleReverse: () => void) {
  const keys: Record<string, keyof Controls> = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'drift', KeyF: 'fire', KeyE: 'secondary', ShiftLeft: 'jetpack', ShiftRight: 'jetpack' }
  for (const event of ['keydown', 'keyup'] as const) addEventListener(event, e => {
    if (event === 'keydown' && e.code === 'KeyR' && !e.repeat) { e.preventDefault(); toggleReverse() }
    const control = keys[e.code]
    if (control) { e.preventDefault(); controls[control] = event === 'keydown' }
  })
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => {
    const control = button.dataset.key as keyof Controls
    for (const event of ['pointerdown', 'pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(event, e => {
      e.preventDefault()
      controls[control] = event === 'pointerdown'
    })
  })
  document.querySelector('#world')!.addEventListener('pointerdown', event => { if ((event as PointerEvent).pointerType === 'mouse') controls.fire = true })
  addEventListener('pointerup', () => { controls.fire = false })
}
