/**
 * MICROBIOLOGY ATLAS: a clinical note for each germ, unlocked once you've disinfected enough of them
 * (bosses: once). Listed in the order the atlas shows them. Ids match src/data/germs.ts.
 */
export const ATLAS_UNLOCK_KILLS = 25;

export const ATLAS: { id: string; note: string }[] = [
  { id: 'basic', note: 'Coccus vulgaris. Round, cheerful, everywhere. Does not handle alcohol well.' },
  { id: 'sprinter', note: 'A virus with somewhere to be. Fragile. Has never once read the sign-in sheet.' },
  { id: 'sneezer', note: 'Rhinovirus with a big red nose. Fires from range. Does not cover its mouth.' },
  { id: 'sporePod', note: 'Armored spore. Always faces the threat. Has never once checked behind itself.' },
  { id: 'duo', note: 'Diplococcus. Arrives in pairs, splits up when things get hard.' },
  { id: 'monococcus', note: 'Half a Diplococcus. Recently separated. Coping by charging at doctors.' },
  { id: 'charger', note: 'Bacillus, rod-shaped and pushy. Charges in straight lines. Stops for walls.' },
  { id: 'chonk', note: 'A very large coccus. Cannot be pushed. Contains six smaller problems.' },
  { id: 'healer', note: 'A petri dish that believes in its colony. Keeps everyone nearby alive. Treat first.' },
  { id: 'speck', note: 'One of eight. Individually harmless. Collectively a lawsuit.' },
  { id: 'moldSpot', note: 'Fungus. Grows where nobody looks. Fears bleach and nothing else.' },
  { id: 'spore', note: "Mold's flying children. This is why everyone wears the mask." },
  { id: 'writeUp', note: 'A pink slip with teeth. Filed in triplicate, delivered at speed.' },
  { id: 'diamond', note: 'Practice Manager. Leads with policy. Most vulnerable during her own meetings.' },
  { id: 'patientZero', note: 'Nine hours in the waiting room. Contagious, impatient, and finally being seen.' },
  { id: 'methicillin', note: 'Staphylococcus, the bunch-of-grapes kind. Learns from every treatment. Hates steam.' },
  { id: 'fluH', note: 'Influenza, the H half. Sticky spikes. Cannot stand to be apart from N.' },
  { id: 'fluN', note: 'Influenza, the N half. Cuts its way out of everything. Mostly to find H.' },
];
