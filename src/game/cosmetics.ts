export type Cosmetic = {
  id: number
  name: string
  paint: string
  accent: string
  exhaust: string
  gun: string
}

export const COSMETICS: Cosmetic[] = [
  { id: 0, name: 'Inferno', paint: '#ff5a4f', accent: '#ffd447', exhaust: '#ff9c45', gun: '#8f3841' },
  { id: 1, name: 'Ocean', paint: '#268cff', accent: '#7ee8ff', exhaust: '#55d8ff', gun: '#315e9b' },
  { id: 2, name: 'Volt', paint: '#ffd447', accent: '#1c2434', exhaust: '#fff06a', gun: '#87712d' },
  { id: 3, name: 'Grape', paint: '#955cff', accent: '#ff8bd8', exhaust: '#c78cff', gun: '#563b91' },
  { id: 4, name: 'Mint', paint: '#4de0a1', accent: '#ddfff1', exhaust: '#75ffc0', gun: '#327b69' },
  { id: 5, name: 'Bubblegum', paint: '#ff70bd', accent: '#7ee8ff', exhaust: '#ff9bdd', gun: '#984c79' },
  { id: 6, name: 'Solar', paint: '#ff8b32', accent: '#fff0a6', exhaust: '#ffca55', gun: '#9a5029' },
  { id: 7, name: 'Arctic', paint: '#e9f7ff', accent: '#54baff', exhaust: '#c9f4ff', gun: '#7892a8' },
  { id: 8, name: 'Toxic', paint: '#9bec36', accent: '#242d35', exhaust: '#b9ff52', gun: '#4f772c' },
  { id: 9, name: 'Midnight', paint: '#25304f', accent: '#ff4f82', exhaust: '#736dff', gun: '#11182c' },
]

export const cosmeticAt = (id: number) => COSMETICS.find(cosmetic => cosmetic.id === id) ?? COSMETICS[0]
