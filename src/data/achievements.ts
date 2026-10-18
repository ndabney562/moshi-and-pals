/**
 * ACHIEVEMENTS: named jokes, each one nudging a player toward a mechanic. Unlocked once per device, kept
 * forever. Adding one = an entry here plus a `this.achieve('id')` where it happens (GameScene).
 */
export interface AchievementDef {
  id: string;
  name: string;
  /** How to get it (always shown, so the list doubles as a to-do list). */
  how: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstKill', name: 'Hand Hygiene Compliant', how: 'Disinfect your first germ' },
  { id: 'perfectPour', name: 'Steady Hands', how: 'Land a Perfect Pour' },
  { id: 'honk', name: 'HRRRNNNKKK', how: 'Hit 5 germs with one Sinus Purge' },
  { id: 'flipper', name: 'Board-Certified Flipper', how: 'Flip a Spore Pod onto its back' },
  { id: 'spotless', name: 'Spotless Record', how: 'Finish a round without getting hurt' },
  { id: 'streak25', name: 'On a Roll', how: 'Reach a 25 Sanitation Streak' },
  { id: 'gesundheit', name: 'Gesundheit', how: 'Disinfect 10 Sneezers in one shift' },
  { id: 'doctorsOrders', name: "Doctor's Orders", how: 'Rest on an exam table' },
  { id: 'rxStrength', name: 'Prescription Strength', how: 'Fully upgrade a tool at the Compounding Station' },
  { id: 'upstairs', name: 'Upstairs Privileges', how: 'Open the upstairs' },
  { id: 'secondOpinion', name: 'Second Opinion', how: 'Appeal a Supply Requisition' },
  { id: 'claimDenied', name: 'Out of Network', how: 'Get a claim denied (sorry)' },
  { id: 'pendingApproval', name: 'Pending Approval', how: 'Grab a Prior Authorization' },
  { id: 'wallBanger', name: 'Brake Check', how: 'Make a Bacillus Bulldozer charge into a wall' },
  { id: 'cultureShock', name: 'Culture Shock', how: 'Disinfect a Mother Culture' },
  { id: 'remediation', name: 'Mold Remediation', how: 'Disinfect a Mold Spot' },
  { id: 'airDried', name: 'Air Dried', how: 'Blast germs with a bathroom hand dryer' },
  { id: 'sterilized', name: 'Sterile Field', how: 'Cook a germ in the Lab autoclave' },
  { id: 'radiology', name: 'Radiology Consult', how: 'Fire the X-ray' },
  { id: 'snackBreak', name: 'Snack Break', how: 'Buy something from the vending machine' },
  { id: 'meetingAdjourned', name: 'Meeting Adjourned', how: 'Defeat Diamond the Practice Manager' },
  { id: 'discharged', name: 'Discharged', how: 'Defeat Patient Zero before he leaves' },
  { id: 'ama', name: 'Against Medical Advice', how: 'Let Patient Zero walk out' },
  { id: 'doubleShift', name: 'Double Shift', how: 'Reach round 10' },
  { id: 'attending', name: 'Attending Physician', how: 'Reach round 20' },
  { id: 'clockedIn', name: 'Clocked In', how: "Finish a Today's Shift" },
  { id: 'traumaTen', name: 'Level One Trauma', how: 'Reach round 10 on Trauma Center' },
  { id: 'darkShift', name: 'Working in the Dark', how: 'Reach round 8 during a Power Outage' },
];
