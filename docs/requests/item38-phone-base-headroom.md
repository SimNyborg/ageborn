# Customize round 3 final → item 38 (battle camera and HUD): more headroom above the bases on phones (2026-10-25)

Status: **open** (src/render/layout.ts and the battle HUD belong to item 38; nothing in round 3 depends on it).

Review 3b (2026-10-26, NIT 4) adds the Epic scenes: the same top band hides some signatures of the backdrops that a
player pays a crate, a capsule or 2,300/3,300 trophies for (Nebula Shipyard's swinging crane arm on the top girder,
Terraformed Gardens' sky-bridge fall and turbine tops, the Siege of the Bronze City's plume tops, Zeppelin Docks'
drifting second airship); desktop shows them (review 3b `cap/sheets/hud-tn.jpg`, `hud-3.jpg`, `hud-zm.jpg`). The
round 3 final made no change for it (src/render/** is item 44's at the moment); Track A keeps future signature props
under the HUD band (art/blender/world/README.md).

## Why

Review 3a, SHOULD 2. At 844 x 390 (and every phone size) the lane's world framing keeps `TALLEST_LU` = 240 lu above
the ground line clear of the HUD's top band (`src/render/layout.ts`: the tallest Legendary unit plus its HP pips).
The bases are taller: the standard bases and the skin models reach about 280-300 lu, and the top-corner HUD (HP bar,
age, minimap row) covers each base above about z 235. So in battle on a phone:

- Colossus Lighthouse (Bronze, Legendary, Wardrobe Crate) hides its guardian, the torch and the placed aura under the
  left HP bar (`meta.ageborn.auraLu` sits at about 333 lu);
- Wyrm-Coil Keep (Medieval, Legendary, Trophy Road 4,800) hides most of the dragon's head, Clocktower Works its dial;
- the standard bases lose their tops the same way.

Desktop, VS, Home and Customize show the whole base. Players earn a Legendary base for its signature and do not see it
in battle on the device most of them play on.

Evidence (session scratchpad): `custom/trackB-r3/caps/review-colossus_lighthouse-844x390/c0-foe.png`,
`custom/review3a/cap/sheets/trB-colossus_lighthouse-844.png`, `trB-wyrm_coil_keep-844.png`,
`trB-clocktower_works-844.png`, `galleon-844.png`, `arctic-844.png`.

## The change (a suggestion; item 38 decides)

- Give short screens about 45 lu more world height above the ground line near the gates: for example a phone framing
  that keeps 285 lu clear where a base stands (the camera's first and last 300 lu), or a slightly lower ground line in
  the phone band (`GROUND_IN_BAND`) while the tray keeps `GROUND_ABOVE_TRAY_PX`.
- Or let the top-corner HUD stand clear of the base's column (narrower corners on phones).
- Either way, check the units' framing (the tallest Legendary plus its pips stays clear), the 80 / 40 draw-call gates and
  frame time, at 844 x 390, 844 x 340, 750 x 340 and 667 x 375.

Track B keeps future signatures under z 235 meanwhile (art/blender/world/README.md, "Phone framing").

## Check

Bronze battle at 844 x 390 with Colossus Lighthouse on either side: the guardian, the torch and its aura show under the
HUD; Medieval with Wyrm-Coil Keep: the dragon's head shows. The memory and frame-time gates hold.
