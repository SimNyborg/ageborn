/**
 * Name tables (DESIGN A6.1 auto profile names, A7.4 procedural AI Commanders, A7.1 the simulated online
 * players of the Ladder).
 *
 * AI Commander names always carry the prefix "AI · " (A7.1, A7.4), for example "AI · Brakka Stonejaw".
 * Names are proper nouns built from syllables and are not translated; the prefix stays the same in
 * every language because the AI label must never be lost.
 *
 * The online tables build gamer tags for the players the Ladder's simulated matchmaking finds (owner
 * decision 2026-10-07): "SwiftOtter", "Kenji_77", "sleepy_yak", "SirPancake". Our own family-friendly
 * words and common given names only: no surnames (so never a real person), no celebrity's single name,
 * no brand, no General's name, no AI or staff words, and no number that is a rude or hateful code
 * (`src/meta/test/onlinePlayer.test.ts` checks every list and thousands of generated tags).
 */
import { randInt, type Sfc32State } from '@/core/rng';
import type { NameTables, OnlineNameTables } from './types';

const ONLINE: OnlineNameTables = {
  adjectives: [
    'Swift', 'Brave', 'Lucky', 'Sneaky', 'Mighty', 'Tiny', 'Jolly', 'Sleepy', 'Turbo', 'Mega', 'Hyper', 'Silent',
    'Rusty', 'Shiny', 'Fuzzy', 'Crispy', 'Golden', 'Wild', 'Happy', 'Clever', 'Bold', 'Quick', 'Little', 'Cosmic',
    'Frosty', 'Sunny', 'Stormy', 'Misty', 'Lazy', 'Noble', 'Rapid', 'Steady', 'Spicy', 'Salty', 'Bouncy', 'Dizzy',
    'Fancy', 'Humble', 'Mellow', 'Nimble', 'Plucky', 'Quiet', 'Rowdy', 'Witty', 'Zesty', 'Atomic', 'Pixel', 'Neon',
    'Lunar', 'Crimson', 'Azure', 'Silver', 'Velvet', 'Mystic', 'Frozen', 'Electric', 'Crunchy', 'Snappy', 'Speedy',
    'Cheeky', 'Giddy', 'Breezy', 'Gentle', 'Wobbly',
  ],
  nouns: [
    'Otter', 'Badger', 'Falcon', 'Lynx', 'Panda', 'Koala', 'Gecko', 'Yak', 'Moose', 'Puffin', 'Narwhal', 'Hedgehog',
    'Turtle', 'Raven', 'Owl', 'Tiger', 'Fox', 'Hawk', 'Walrus', 'Lemur', 'Llama', 'Ferret', 'Beaver', 'Heron',
    'Penguin', 'Dolphin', 'Squirrel', 'Parrot', 'Toucan', 'Jaguar', 'Goblin', 'Wizard', 'Pilot', 'Viking', 'Pirate',
    'Builder', 'Chef', 'Baker', 'Anchor', 'Lantern', 'Rocket', 'Thunder', 'Ember', 'Cloud', 'River', 'Meadow',
    'Cactus', 'Maple', 'Acorn', 'Pancake', 'Waffle', 'Noodle', 'Mango', 'Pickle', 'Muffin', 'Biscuit', 'Dumpling',
    'Pretzel', 'Cocoa', 'Taco', 'Mochi', 'Nacho', 'Bagel', 'Turnip', 'Kiwi', 'Peach', 'Neko', 'Kuma', 'Sora', 'Lobo',
    'Gato', 'Tigre', 'Volpe', 'Kettu', 'Ulv', 'Kitsune', 'Blaze', 'Bard', 'Jester', 'Sprout', 'Dragon',
  ],
  given: [
    { flags: ['dk', 'se', 'no', 'fi', 'is', 'fo', 'gl'], names: ['Lars', 'Freja', 'Mikkel', 'Sofie', 'Emil', 'Ida', 'Nils', 'Astrid', 'Oskar', 'Linnea', 'Aksel', 'Sigrid', 'Eero', 'Aino', 'Bjorn', 'Saga', 'Rasmus', 'Elin', 'Tove', 'Malthe'] },
    { flags: ['gb', 'gb_eng', 'gb_sct', 'ie', 'us', 'ca', 'au', 'nz'], names: ['Ollie', 'Jack', 'Amelia', 'Ella', 'Finn', 'Liam', 'Noah', 'Ava', 'Mia', 'Zoe', 'Riley', 'Jamie', 'Charlie', 'Leo', 'Max', 'Ruby', 'Isla', 'Archie', 'Mason', 'Harper'] },
    { flags: ['de', 'at', 'ch', 'nl', 'be', 'lu'], names: ['Lukas', 'Jonas', 'Lena', 'Hanna', 'Felix', 'Mila', 'Daan', 'Sem', 'Fleur', 'Noor', 'Jens', 'Anouk', 'Paul', 'Emma', 'Lotte', 'Timo'] },
    { flags: ['fr', 'be', 'ch', 'lu', 'ca'], names: ['Hugo', 'Louis', 'Chloe', 'Ines', 'Jules', 'Manon', 'Lea', 'Theo', 'Camille', 'Nathan', 'Lina', 'Enzo'] },
    { flags: ['it', 'es', 'pt'], names: ['Luca', 'Giulia', 'Matteo', 'Sofia', 'Mateo', 'Lucia', 'Pablo', 'Alba', 'Diego', 'Marta', 'Tiago', 'Rui', 'Beatriz', 'Marco', 'Chiara', 'Alvaro'] },
    { flags: ['pl', 'cz', 'hu', 'ee', 'lv', 'lt', 'ua', 'ro', 'bg'], names: ['Kuba', 'Zosia', 'Piotr', 'Ola', 'Tomas', 'Bence', 'Mihai', 'Ioana', 'Taras', 'Andrei', 'Elena', 'Marek', 'Lenka', 'Jakub', 'Karlis', 'Ieva', 'Nika', 'Bogdan'] },
    { flags: ['gr', 'tr'], names: ['Nikos', 'Eleni', 'Yannis', 'Elif', 'Emre', 'Deniz', 'Kaan', 'Zeynep', 'Ece', 'Selin', 'Kostas', 'Dimitra'] },
    { flags: ['jp'], names: ['Kenji', 'Yuki', 'Haruto', 'Aiko', 'Ren', 'Hana', 'Riku', 'Mio', 'Daichi', 'Yuna', 'Kaito', 'Akari'] },
    { flags: ['kr'], names: ['Minjun', 'Jiwoo', 'Seojun', 'Hyun', 'Doyun', 'Haeun', 'Seoyeon', 'Jihun'] },
    { flags: ['in'], names: ['Arjun', 'Priya', 'Rohan', 'Anaya', 'Kiran', 'Neel', 'Isha', 'Aarav', 'Diya', 'Kabir', 'Meera'] },
    { flags: ['th', 'vn', 'id'], names: ['Niran', 'Ploy', 'Minh', 'Linh', 'Bao', 'Anh', 'Putri', 'Budi', 'Dewi', 'Rizky', 'Tuan', 'Ayu'] },
    { flags: ['br', 'ar', 'cl', 'co'], names: ['Joao', 'Lucas', 'Gabriel', 'Ana', 'Bia', 'Thiago', 'Valentina', 'Camila', 'Santi', 'Juli', 'Mati', 'Nico', 'Duda', 'Caio'] },
    { flags: ['za', 'ng', 'gh', 'jm'], names: ['Thabo', 'Lerato', 'Sipho', 'Ayo', 'Chidi', 'Ngozi', 'Tunde', 'Kofi', 'Ama', 'Kwame', 'Akua', 'Shanice', 'Andre', 'Imani', 'Zola', 'Femi'] },
  ],
  numbers: [
    '1', '2', '3', '4', '5', '7', '9', '10', '11', '12', '13', '17', '19', '21', '22', '23', '24', '27', '29', '31', '33',
    '42', '44', '47', '55', '64', '70', '71', '73', '77', '90', '99', '100', '101', '123', '202', '247', '300', '321',
    '404', '500', '512', '777', '909', '999', '2003', '2005', '2007', '2009', '2010', '2011', '2012', '2013', '2015',
    '2016', '2017', '2019', '01', '03', '05', '07', '09',
  ],
  titles: ['Sir', 'Lady'],
  blocked: [
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'slut', 'whore', 'bastard', 'piss', 'fag', 'nigg', 'retard',
    'nazi', 'hitler', 'kkk', 'rape', 'porn', 'sex', 'nude', 'boob', 'butt', 'kill', 'dead', 'death', 'blood', 'hate',
    'drug', 'weed', 'damn', 'hell', 'crap', 'arse', 'anal', 'cum', 'tit', 'poo', 'wtf', 'ass', 'gun', 'bomb',
  ],
  maxLength: 14,
  trophySpread: 80,
};

export const names: NameTables = {
  aiPrefix: 'AI · ',
  commanderFirst: {
    start: ['Brak', 'Grun', 'Tor', 'Vel', 'Mar', 'Kel', 'Dra', 'Zor', 'Hal', 'Rok', 'Sil', 'Fen', 'Ul', 'Bor', 'Nar', 'Tess', 'Kir', 'Osk', 'Yar', 'Gil'],
    end: ['ka', 'da', 'gar', 'ric', 'na', 'mir', 'ek', 'ra', 'tha', 'dor', 'is', 'en', 'o', 'us', 'wyn'],
  },
  commanderLast: {
    start: ['Stone', 'Iron', 'Ash', 'Frost', 'Brass', 'Storm', 'Ember', 'Oak', 'Flint', 'Steel', 'Thunder', 'Copper', 'Bone', 'Mud', 'Gear'],
    end: ['jaw', 'fist', 'beard', 'horn', 'hammer', 'shield', 'fang', 'hide', 'heart', 'brow', 'crest', 'song', 'wall', 'tooth', 'spark'],
  },
  // A6.1: "Chief-4821"
  player: { prefixes: ['Chief', 'Warlord', 'Captain', 'Marshal', 'Elder', 'Scout'], digits: 4 },
  online: ONLINE,
};

function draw(state: Sfc32State, items: readonly string[]): string {
  return items[randInt(state, items.length)] ?? '';
}

/** A procedural AI Commander name with the AI prefix, drawn from `state` (advances it by 4 draws). */
export function commanderName(state: Sfc32State, t: NameTables = names): string {
  const first = draw(state, t.commanderFirst.start) + draw(state, t.commanderFirst.end);
  const last = draw(state, t.commanderLast.start) + draw(state, t.commanderLast.end);
  return `${t.aiPrefix}${first} ${last}`;
}

/** An auto-generated profile name such as "Chief-4821" (A6.1), drawn from `state` (advances it by 2 draws). */
export function playerName(state: Sfc32State, t: NameTables = names): string {
  const prefix = draw(state, t.player.prefixes);
  let limit = 1;
  for (let i = 0; i < t.player.digits; i += 1) limit *= 10;
  const n = randInt(state, limit - limit / 10) + limit / 10;
  return `${prefix}-${n}`;
}
