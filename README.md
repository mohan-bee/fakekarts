# FakeKarts

Browser-based circuit racing and vehicular combat. Create a room and share its three-digit code, or open **Solo practice / Garage** without connecting to a server.

- **Circuit:** three laps through twelve ordered gates, with weapons and pickups disabled. Position, elapsed time and best lap are shown live; solo runs are time trials.
- **Combat circuit:** the same three-lap race with primary and secondary weapons. Elimination returns you to the last cleared gate with two seconds of spawn protection.
- **Deathmatch:** first to ten eliminations. Offline practice includes an armed bot; online matches score player eliminations only.
- **Garage:** ten liveries plus independent alloy/black/bronze wheels, rear wing/club aero and metallic/matte finishes. Changes are cosmetic, saved locally and shared with room peers.
- **Controls:** WASD/arrows drive, Space drifts on the ground and brakes in the air, F/click fires a 12-round magazine, Q reloads (1.4 seconds, automatic when empty), E deploys the selected secondary, Shift applies jetpack thrust after collecting a pickup, R toggles rear view. Air steering works at zero speed and has its own sensitivity setting.

```sh
npm install
npm run dev
npm test
npm run build
```

Multiplayer uses MQTT over secure WebSockets. Room transport and hit/finish reports are client-authoritative on a public test broker, so this is friendly competition, not server-verified ranked play. All players must use the same build (room protocol v5).
