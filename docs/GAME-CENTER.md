# Game Center setup (App Store Connect)

The iPhone app reports to Game Center on its own (`ios/MoshiAndPals/Services/GameCenterService.swift`).
Nothing shows up until these IDs exist in App Store Connect → the app → Services → Game Center.
The IDs must match exactly. Generated from `src/data/difficulties.ts` and `src/data/achievements.ts`.
Add a matching entry here and in App Store Connect when you add an achievement or difficulty.

## Leaderboards (Classic, Best score, High to Low, Integer)

| ID | Name |
|---|---|
| `moshi.best.walkIn` | Walk-In |
| `moshi.best.urgent` | Urgent |
| `moshi.best.trauma` | Trauma Center |

Today's Shift is not on Game Center: it resets at local midnight, and Game Center's recurring leaderboards reset on a fixed UTC schedule.

## Achievements (34)

Each one also needs points (all achievements together can total at most 1,000) and an image. Consider marking `moshi.ach.miracleCure` hidden: the quest is a secret.

| ID | Name | How |
|---|---|---|
| `moshi.ach.firstKill` | Hand Hygiene Compliant | Disinfect your first germ |
| `moshi.ach.perfectPour` | Steady Hands | Land a Perfect Pour |
| `moshi.ach.honk` | HRRRNNNKKK | Hit 5 germs with one Sinus Purge |
| `moshi.ach.flipper` | Board-Certified Flipper | Flip a Spore Pod onto its back |
| `moshi.ach.spotless` | Spotless Record | Finish a round without getting hurt |
| `moshi.ach.streak25` | On a Roll | Reach a 25 Sanitation Streak |
| `moshi.ach.gesundheit` | Gesundheit | Disinfect 10 Sneezers in one shift |
| `moshi.ach.doctorsOrders` | Doctor's Orders | Rest on an exam table |
| `moshi.ach.rxStrength` | Prescription Strength | Fully upgrade a tool at the Compounding Station |
| `moshi.ach.upstairs` | Upstairs Privileges | Open the upstairs |
| `moshi.ach.secondOpinion` | Second Opinion | Appeal a Supply Requisition |
| `moshi.ach.claimDenied` | Out of Network | Get a claim denied (sorry) |
| `moshi.ach.pendingApproval` | Pending Approval | Grab a Prior Authorization |
| `moshi.ach.wallBanger` | Brake Check | Make a Bacillus Bulldozer charge into a wall |
| `moshi.ach.cultureShock` | Culture Shock | Disinfect a Mother Culture |
| `moshi.ach.remediation` | Mold Remediation | Disinfect a Mold Spot |
| `moshi.ach.airDried` | Air Dried | Blast germs with a bathroom hand dryer |
| `moshi.ach.sterilized` | Sterile Field | Cook a germ in the Lab autoclave |
| `moshi.ach.radiology` | Radiology Consult | Fire the X-ray |
| `moshi.ach.snackBreak` | Snack Break | Buy something from the vending machine |
| `moshi.ach.meetingAdjourned` | Meeting Adjourned | Defeat Diamond the Practice Manager |
| `moshi.ach.discharged` | Discharged | Defeat Patient Zero before he leaves |
| `moshi.ach.ama` | Against Medical Advice | Let Patient Zero walk out |
| `moshi.ach.sensitivityReport` | Sensitivity Report | Defeat Methicillin the Unkillable |
| `moshi.ach.herdImmunity` | Herd Immunity | Defeat the Influenza Twins |
| `moshi.ach.exitInterview` | Exit Interview | Defeat Diamond as Ken |
| `moshi.ach.delegation` | Delegation | Scribes clean up 5 patients in one shift |
| `moshi.ach.doubleShift` | Double Shift | Reach round 10 |
| `moshi.ach.attending` | Attending Physician | Reach round 20 |
| `moshi.ach.clockedIn` | Clocked In | Finish a Today's Shift |
| `moshi.ach.traumaTen` | Level One Trauma | Reach round 10 on Trauma Center |
| `moshi.ach.darkShift` | Working in the Dark | Reach round 8 during a Power Outage |
| `moshi.ach.miracleCure` | The Miracle Cure | Read the old magazines. All of them. Then call. |
| `moshi.ach.shiftComplete` | Shift Complete | Clock out. Actually clock out. |
