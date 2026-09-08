export type GameSettings = {
  cameraDistance: number
  cameraHeight: number
  steeringSensitivity: number
  airSteeringSensitivity: number
  driftStrength: number
}

const defaults: GameSettings = { cameraDistance: 12, cameraHeight: 6.5, steeringSensitivity: 1, driftStrength: 1.15, airSteeringSensitivity: 1 }

export function setupSettings() {
  let saved: Partial<GameSettings> = {}
  try { saved = JSON.parse(localStorage.getItem('fakekarts-settings') || '{}') as Partial<GameSettings> } catch { /* Use safe defaults. */ }
  const settings = { ...defaults, ...saved }
  const dialog = document.querySelector<HTMLDialogElement>('#settings-panel')!
  const fields = Object.keys(defaults) as Array<keyof GameSettings>

  const render = () => fields.forEach(key => {
    const select = document.querySelector<HTMLSelectElement>(`#setting-${key}`)!
    const options = [...select.options].map(option => Number(option.value))
    const value = Number.isFinite(Number(settings[key])) ? Number(settings[key]) : defaults[key]
    settings[key] = options.reduce((closest, option) => Math.abs(option - value) < Math.abs(closest - value) ? option : closest)
    select.value = String(settings[key])
  })

  for (const key of fields) document.querySelector(`#setting-${key}`)!.addEventListener('change', event => {
    settings[key] = Number((event.currentTarget as HTMLSelectElement).value)
    render()
    try { localStorage.setItem('fakekarts-settings', JSON.stringify(settings)) } catch { /* Settings still apply for this session. */ }
  })
  document.querySelector('#settings')!.addEventListener('click', () => dialog.showModal())
  document.querySelector('#reset-settings')!.addEventListener('click', event => {
    event.preventDefault()
    Object.assign(settings, defaults)
    try { localStorage.removeItem('fakekarts-settings') } catch { /* Settings still reset for this session. */ }
    render()
  })
  render()
  return settings
}
