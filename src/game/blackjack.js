/**
 * Mesin blackjack “Kedai Kartu” — murni data, tanpa DOM dan tanpa Svelte.
 *
 * Aturan yang dipakai:
 * - enam dek, dikocok ulang saat kartu tersisa kurang dari seperempat;
 * - bandar berhenti di 17 (pada tingkat Sulit bandar memukul soft 17);
 * - blackjack (21 dari dua kartu pertama) dibayar 3:2, menang biasa 1:1;
 * - pemain boleh menggandakan taruhan hanya pada dua kartu pertama.
 *
 * Di atas aturan itu ada **jimat** (buff yang dibeli pemain) dan **kutukan**
 * (debuff yang ditimpakan bandar sesuai tingkat kesulitan). Semua fungsi di
 * bawah menerima satu objek `game` biasa; pemanggil boleh membungkusnya dengan
 * `$state` Svelte karena setiap perubahan hanya menulis properti objek itu.
 */

export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const DECK_COUNT = 6
const RESHUFFLE_RATIO = 0.25
const START_CHIPS = 120
const ADVANCE_CHIPS = 60

/**
 * Tingkat kesulitan mengubah tiga hal yang selalu bisa dibaca pemain:
 * seberapa sering bandar menimpakan kutukan, berapa jimat yang boleh dipakai
 * per babak, dan apakah bandar memukul soft 17.
 */
export const DIFFICULTIES = {
  mudah: {
    key: 'mudah',
    label: 'Mudah',
    note: 'Bandar tidak mengutuk. Jimat pertama gratis tiap babak.',
    debuffChance: 0,
    buffSlots: 2,
    freeBuff: true,
    soft17Hits: false,
    priceScale: 1,
    minBet: 5,
    maxBet: 60,
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    note: 'Bandar sesekali mengutuk. Satu jimat per babak.',
    debuffChance: 0.45,
    buffSlots: 1,
    freeBuff: false,
    soft17Hits: false,
    priceScale: 1,
    minBet: 10,
    maxBet: 80,
  },
  sulit: {
    key: 'sulit',
    label: 'Sulit',
    note: 'Kutukan setiap babak, harga jimat 1,5×, bandar memukul soft 17.',
    debuffChance: 1,
    buffSlots: 1,
    freeBuff: false,
    soft17Hits: true,
    priceScale: 1.5,
    minBet: 20,
    maxBet: 120,
  },
}

export const DEFAULT_DIFFICULTY = 'normal'

/**
 * Jimat (buff) dan kutukan bandar baru terbuka pada babak ini dan seterusnya.
 *
 * Babak 1–2 adalah blackjack bersih: pemain belajar meja, taruhan, dan tombol
 * aksi lebih dulu. Pada babak 3 barulah bandar boleh mengutuk dan pemain boleh
 * membeli jimat.
 */
export const SKILLS_FROM_ROUND = 3

/**
 * Apakah babak yang sedang disiapkan/dimainkan sudah membuka jimat & kutukan?
 * Saat fase `betting`/`result`, `game.round` masih nomor babak sebelumnya, jadi
 * yang dihitung adalah babak berikutnya.
 */
export function skillsUnlocked(game) {
  if (!game) return false
  const phase = game.phase
  const preparing = phase === 'betting' || phase === 'result'
  const round = (game.round ?? 0) + (preparing ? 1 : 0)
  return round >= SKILLS_FROM_ROUND
}

/** Nomor babak yang sedang disiapkan (untuk ditampilkan di HUD). */
export function upcomingRound(game) {
  if (!game) return 1
  const phase = game.phase
  const preparing = phase === 'betting' || phase === 'result'
  return (game.round ?? 0) + (preparing ? 1 : 0)
}

export const JIMAT = {
  mata: {
    key: 'mata',
    seal: '眼',
    label: 'Mata Roh',
    cost: 8,
    desc: 'Mengintai kartu tertutup bandar untuk babak ini.',
  },
  tabungan: {
    key: 'tabungan',
    seal: '儲',
    label: 'Simpanan',
    cost: 10,
    desc: 'Kemenangan dibayar 1,5× lipat.',
  },
  perisai: {
    key: 'perisai',
    seal: '盾',
    label: 'Perisai Kertas',
    cost: 12,
    desc: 'Sekali per babak, tarikan yang melewati 21 dibatalkan.',
  },
  tarikan: {
    key: 'tarikan',
    seal: '換',
    label: 'Tarikan Takdir',
    cost: 9,
    desc: 'Sekali per babak, tukar kartu terakhirmu dengan kartu baru.',
  },
}

export const JIMAT_ORDER = ['mata', 'tabungan', 'perisai', 'tarikan']

export const KUTUKAN = {
  beban: {
    key: 'beban',
    seal: '債',
    label: 'Beban Taruhan',
    desc: 'Taruhan minimum naik 10 keping pada babak ini.',
  },
  kabut: {
    key: 'kabut',
    seal: '霧',
    label: 'Kabut Arsip',
    desc: 'Mata Roh dan Tarikan Takdir tidak berfungsi babak ini.',
  },
  tangan: {
    key: 'tangan',
    seal: '束',
    label: 'Tangan Berat',
    desc: 'Kamu hanya boleh menarik satu kartu tambahan.',
  },
  pajak: {
    key: 'pajak',
    seal: '稅',
    label: 'Pajak Bandar',
    desc: 'Kemenangan dibayar setengah.',
  },
}

const KUTUKAN_ORDER = ['beban', 'kabut', 'tangan', 'pajak']

export function difficultyOf(key) {
  return DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY]
}

/** Nilai tangan; `soft` berarti masih ada As yang dihitung sebelas. */
export function handValue(cards = []) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (!card) continue
    if (card.rank === 'A') {
      total += 11
      aces += 1
    } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      total += 10
    } else {
      total += Number(card.rank) || 0
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return { total, soft: aces > 0 && total <= 21 }
}

export function isRed(card) {
  return card?.suit === '♥' || card?.suit === '♦'
}

function buildShoe(rng) {
  const cards = []
  for (let deck = 0; deck < DECK_COUNT; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${suit}${rank}-${deck}`, rank, suit })
      }
    }
  }
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const temp = cards[index]
    cards[index] = cards[swap]
    cards[swap] = temp
  }
  return cards
}

/** Harga jimat setelah memperhitungkan tingkat kesulitan dan jimat gratis. */
export function jimatCost(game, key) {
  const info = JIMAT[key]
  if (!info) return 0
  const difficulty = difficultyOf(game?.difficulty)
  const scaled = Math.round(info.cost * difficulty.priceScale)
  if (difficulty.freeBuff && (game?.jimat?.length ?? 0) === 0) return 0
  return scaled
}

export function minBetFor(game) {
  const difficulty = difficultyOf(game?.difficulty)
  // `kutukan` disimpan sebagai objek (KUTUKAN[key]), bukan string kuncinya.
  const curse = game?.kutukan?.key === 'beban' ? 10 : 0
  return difficulty.minBet + curse
}

export function createGame(options = {}) {
  const difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : DEFAULT_DIFFICULTY
  const chips = Number.isFinite(options.chips) ? Math.max(0, Math.round(options.chips)) : START_CHIPS
  const stats = {
    rounds: Math.max(0, Number(options.stats?.rounds) || 0),
    wins: Math.max(0, Number(options.stats?.wins) || 0),
    losses: Math.max(0, Number(options.stats?.losses) || 0),
    pushes: Math.max(0, Number(options.stats?.pushes) || 0),
  }
  return {
    difficulty,
    chips,
    stats,
    shoe: [],
    shoeSize: 0,
    dealer: [],
    player: [],
    revealed: 0,
    phase: 'betting',
    bet: 0,
    betDraft: difficultyOf(difficulty).minBet,
    jimat: [],
    kutukan: null,
    lastKutukan: options.lastKutukan ?? null,
    peek: false,
    shieldUsed: false,
    swapped: false,
    hits: 0,
    doubled: false,
    blackjack: false,
    result: null,
    message: '',
    round: 0,
    log: [],
  }
}

function log(game, text, tone = 'plain') {
  game.log = [{ id: `${Date.now()}-${game.log.length}`, text, tone }, ...game.log].slice(0, 9)
}

function setMessage(game, message) {
  game.message = message
}

function ensureShoe(game, rng) {
  if (game.shoe.length >= Math.ceil(game.shoeSize * RESHUFFLE_RATIO) && game.shoe.length > 0) return
  game.shoe = buildShoe(rng)
  game.shoeSize = game.shoe.length
  if (game.round > 0) log(game, 'Kartu dikocok ulang.', 'muted')
}

function draw(game, rng) {
  ensureShoe(game, rng)
  return game.shoe.pop() ?? null
}

function pickKutukan(game, rng) {
  const difficulty = difficultyOf(game.difficulty)
  if (difficulty.debuffChance <= 0) return null
  if (rng() >= difficulty.debuffChance) return null
  const pool = KUTUKAN_ORDER.filter((key) => key !== game.lastKutukan)
  const key = pool[Math.floor(rng() * pool.length)] ?? KUTUKAN_ORDER[0]
  return KUTUKAN[key]
}

export function setDifficulty(game, key) {
  if (!DIFFICULTIES[key] || game.phase === 'player' || game.phase === 'dealer') return false
  game.difficulty = key
  const difficulty = DIFFICULTIES[key]
  if (game.phase === 'betting') {
    game.betDraft = Math.max(difficulty.minBet, Math.min(game.betDraft, difficulty.maxBet))
  }
  return true
}

export function setBet(game, value) {
  if (game.phase !== 'betting') return
  const difficulty = difficultyOf(game.difficulty)
  const min = minBetFor(game)
  const max = Math.min(difficulty.maxBet, Math.max(min, game.chips))
  const next = Math.round(Number(value) || 0)
  game.betDraft = Math.max(min, Math.min(max, next))
}

/** Saldo habis bukan jalan buntu: pemain boleh meminta talangan sekali klik. */
export function takeAdvance(game) {
  if (game.chips >= minBetFor(game)) return false
  game.chips += ADVANCE_CHIPS
  game.betDraft = minBetFor(game)
  log(game, `Talangan ${ADVANCE_CHIPS} keping dari kas kedai.`, 'good')
  return true
}

/** Pilih/batalkan jimat selama fase taruhan. */
export function toggleJimat(game, key) {
  if (game.phase !== 'betting' || !JIMAT[key]) return false
  if (!skillsUnlocked(game)) {
    setMessage(game, `Jimat baru terbuka pada babak ${SKILLS_FROM_ROUND}.`)
    return false
  }
  const difficulty = difficultyOf(game.difficulty)
  if (game.jimat.includes(key)) {
    game.jimat = game.jimat.filter((entry) => entry !== key)
    return true
  }
  if (game.jimat.length >= difficulty.buffSlots) {
    setMessage(game, `Tingkat ${difficulty.label} hanya mengizinkan ${difficulty.buffSlots} jimat per babak.`)
    return false
  }
  game.jimat = [...game.jimat, key]
  return true
}

/** Total harga jimat yang sedang dipilih (jimat gratis dihitung pertama). */
export function totalJimatCost(game) {
  const list = game?.jimat ?? []
  let total = 0
  for (let index = 0; index < list.length; index += 1) {
    total += jimatCost({ ...game, jimat: list.slice(0, index) }, list[index])
  }
  return total
}

function chargeJimat(game) {
  let total = 0
  const applied = []
  for (const key of game.jimat) {
    const cost = jimatCost({ ...game, jimat: applied }, key)
    if (game.chips - total < cost) continue
    total += cost
    applied.push(key)
  }
  game.jimat = applied
  game.chips -= total
  return total
}

export function startRound(game, rng = Math.random) {
  if (game.phase !== 'betting' && game.phase !== 'result') return false
  // Kalau view lupa memanggil `nextRound`, jimat babak sebelumnya tidak boleh
  // ikut terbeli dua kali.
  if (game.phase === 'result') nextRound(game)

  const difficulty = difficultyOf(game.difficulty)
  // Babak 1–2 sengaja bersih: jimat dan kutukan baru terbuka pada babak
  // SKILLS_FROM_ROUND supaya pemain sempat mengenal meja.
  const roundBefore = game.round ?? 0
  const roundNumber = roundBefore + 1
  const skilled = roundNumber >= SKILLS_FROM_ROUND

  // Babak baru: bersihkan meja lebih dulu, lalu tentukan kutukan bandar. Kutukan
  // dipilih sebelum taruhan dihitung supaya “Beban Taruhan” benar-benar menaikkan
  // minimum babak ini, bukan babak berikutnya.
  game.round = roundNumber
  game.player = []
  game.dealer = []
  game.revealed = 0
  game.result = null
  game.blackjack = false
  game.doubled = false
  game.hits = 0
  game.shieldUsed = false
  game.swapped = false
  game.peek = false
  game.message = ''
  game.kutukan = skilled ? pickKutukan(game, rng) : null

  const min = minBetFor(game)
  const wanted = Math.max(min, Math.min(difficulty.maxBet, Math.round(game.betDraft) || min))
  const bet = Math.min(wanted, game.chips)
  if (bet < min || bet <= 0) {
    // Nomor babak dibatalkan, tetapi kutukan tetap dipasang: percobaan berikutnya
    // harus memakai minimum yang sama, bukan mengundi kutukan baru sampai
    // “Beban Taruhan” kebetulan hilang. Dengan begitu HUD bisa menampilkan
    // tombol talangan (keping < minimum) alih-alih mengulang pesan yang sama.
    game.round = roundBefore
    setMessage(
      game,
      `Keping tidak cukup untuk taruhan minimum ${min}. Ambil talangan atau turunkan taruhan.`,
    )
    return false
  }

  // Jimat tidak boleh “hilang diam-diam” karena saldo kurang: periksa taruhan
  // + seluruh jimat lebih dulu, lalu beri tahu pemain apa yang harus dibatalkan.
  const jimatTotal = totalJimatCost(game)
  if (game.chips < bet + jimatTotal) {
    game.round = roundBefore
    setMessage(
      game,
      `Taruhan ${bet} + jimat ${jimatTotal} melebihi saldo ${game.chips}. Batalkan satu jimat atau turunkan taruhan.`,
    )
    return false
  }

  game.bet = bet
  game.betDraft = bet
  game.chips -= bet

  const spent = chargeJimat(game)
  if (spent > 0) log(game, `Jimat dibeli: ${spent} keping.`, 'muted')

  game.lastKutukan = game.kutukan?.key ?? game.lastKutukan
  if (game.kutukan) log(game, `Kutukan bandar: ${game.kutukan.label}.`, 'bad')

  game.phase = 'player'
  game.player = [draw(game, rng), draw(game, rng)].filter(Boolean)
  game.dealer = [draw(game, rng), draw(game, rng)].filter(Boolean)
  game.revealed = 1

  const player = handValue(game.player)
  const dealer = handValue(game.dealer)
  if (player.total === 21 && game.player.length === 2) {
    game.blackjack = true
    log(game, 'Blackjack! Kartu bandar dibuka.', 'good')
    finishDealer(game, rng, { revealAll: true })
    settle(game)
    return true
  }
  if (dealer.total === 21) {
    // Bandar sudah blackjack: pemain tetap boleh menarik, tetapi peluangnya
    // tipis — jadi lebih jujur langsung membuka semuanya.
    log(game, 'Bandar memegang blackjack.', 'bad')
  }
  return true
}

export function playerTotal(game) {
  return handValue(game.player)
}

export function dealerTotal(game) {
  return handValue(game.dealer)
}

export function playerHit(game, rng = Math.random) {
  if (game.phase !== 'player') return false
  if (game.kutukan?.key === 'tangan' && game.hits >= 1) {
    // Kutukan ini tidak boleh membuat babak menggantung: setelah jatah tarikan
    // habis, tangan otomatis berhenti (pemain melihatnya di catatan).
    log(game, 'Tangan Berat menahan tarikan berikutnya — tangan otomatis berhenti.', 'bad')
    playerStand(game, rng)
    return true
  }

  const card = draw(game, rng)
  if (!card) return false
  game.player = [...game.player, card]
  game.hits += 1

  const value = handValue(game.player)
  if (value.total > 21) {
    if (game.jimat.includes('perisai') && !game.shieldUsed) {
      game.player = game.player.slice(0, -1)
      game.shieldUsed = true
      game.hits -= 1
      log(game, `Perisai Kertas menahan ${card.rank}${card.suit} — tarikan dibatalkan.`, 'good')
      return true
    }
    log(game, `Melewati 21 dengan ${card.rank}${card.suit}.`, 'bad')
    bust(game, rng)
    return true
  }
  if (value.total === 21) playerStand(game, rng)
  return true
}

function bust(game, rng) {
  game.revealed = game.dealer.length
  game.phase = 'dealer'
  settle(game)
}

export function playerStand(game, rng = Math.random) {
  if (game.phase !== 'player') return false
  game.hits = Math.max(0, game.hits)
  finishDealer(game, rng, { revealAll: false })
  game.phase = 'dealer'
  return true
}

/** Hitung kartu bandar sampai berhenti; pengungkapan kartu diatur oleh view. */
function finishDealer(game, rng, { revealAll = false } = {}) {
  const difficulty = difficultyOf(game.difficulty)
  let guard = 0
  // Bandar tidak menarik bila pemain sudah bust — tidak ada gunanya.
  const playerBusted = handValue(game.player).total > 21
  while (!playerBusted && guard < 12) {
    const value = handValue(game.dealer)
    const mustHit =
      value.total < 17 || (value.soft && value.total === 17 && difficulty.soft17Hits)
    if (!mustHit) break
    const card = draw(game, rng)
    if (!card) break
    game.dealer = [...game.dealer, card]
    guard += 1
  }
  if (revealAll) game.revealed = game.dealer.length
}

export function playerDouble(game, rng = Math.random) {
  if (game.phase !== 'player') return false
  if (game.player.length !== 2 || game.chips < game.bet) {
    setMessage(game, 'Gandakan hanya bisa pada dua kartu pertama dan bila keping cukup.')
    return false
  }
  game.chips -= game.bet
  game.bet *= 2
  game.doubled = true
  const card = draw(game, rng)
  if (card) game.player = [...game.player, card]
  const value = handValue(game.player)
  if (value.total > 21) {
    if (game.jimat.includes('perisai') && !game.shieldUsed) {
      game.player = game.player.slice(0, -1)
      game.shieldUsed = true
      log(game, 'Perisai Kertas menahan tarikan ganda.', 'good')
      playerStand(game, rng)
      return true
    }
    log(game, `Taruhan ganda melewati 21 dengan ${card?.rank ?? '?'}${card?.suit ?? ''}.`, 'bad')
    bust(game, rng)
    return true
  }
  playerStand(game, rng)
  return true
}

export function playerSwap(game, rng = Math.random) {
  if (game.phase !== 'player') return false
  if (!game.jimat.includes('tarikan') || game.swapped) return false
  if (game.kutukan?.key === 'kabut') {
    setMessage(game, 'Kabut Arsip mematikan Tarikan Takdir babak ini.')
    return false
  }
  const card = draw(game, rng)
  if (!card) return false
  game.player = [...game.player.slice(0, -1), card]
  game.swapped = true
  log(game, `Kartu terakhir ditukar menjadi ${card.rank}${card.suit}.`, 'plain')
  const value = handValue(game.player)
  if (value.total > 21) {
    if (game.jimat.includes('perisai') && !game.shieldUsed) {
      game.player = game.player.slice(0, -1)
      game.shieldUsed = true
      log(game, 'Perisai Kertas menahan kartu tukaran.', 'good')
      return true
    }
    bust(game, rng)
    return true
  }
  if (value.total === 21) playerStand(game, rng)
  return true
}

export function revealHole(game) {
  if (!game.jimat.includes('mata')) return false
  if (game.kutukan?.key === 'kabut') {
    setMessage(game, 'Kabut Arsip menutup mata rohmu.')
    return false
  }
  if (game.peek) return false
  game.peek = true
  return true
}

/** Selesaikan babak: hitung hasil, bayar, catat statistik. */
export function settle(game) {
  if (game.phase === 'result') return false

  const player = handValue(game.player)
  const dealer = handValue(game.dealer)
  const dealerBlackjack = game.dealer.length === 2 && dealer.total === 21
  let outcome = 'lose'

  if (player.total > 21) {
    outcome = 'lose'
  } else if (dealerBlackjack) {
    outcome = game.blackjack ? 'push' : 'lose'
  } else if (game.blackjack) {
    outcome = 'blackjack'
  } else if (dealer.total > 21 || player.total > dealer.total) {
    outcome = 'win'
  } else if (player.total === dealer.total) {
    outcome = 'push'
  }

  let profit = 0
  if (outcome === 'blackjack') profit = Math.floor(game.bet * 1.5)
  else if (outcome === 'win') profit = game.bet

  if (profit > 0 && game.jimat.includes('tabungan')) {
    profit = Math.round(profit * 1.5)
  }
  if (profit > 0 && game.kutukan?.key === 'pajak') {
    profit = Math.max(1, Math.floor(profit / 2))
  }

  if (outcome === 'push') {
    game.chips += game.bet
  } else if (profit > 0) {
    game.chips += game.bet + profit
  }

  game.revealed = game.dealer.length
  game.phase = 'result'
  game.result = {
    outcome,
    profit,
    delta: outcome === 'lose' ? -game.bet : profit,
    player: player.total,
    dealer: dealer.total,
    note:
      outcome === 'blackjack'
        ? 'Blackjack — dibayar 3:2.'
        : outcome === 'win'
          ? 'Bandar kalah nilai.'
          : outcome === 'push'
            ? 'Nilai sama: taruhan dikembalikan.'
            : player.total > 21
              ? 'Melewati 21.'
              : 'Bandar lebih tinggi.',
  }

  game.stats.rounds += 1
  if (outcome === 'push') game.stats.pushes += 1
  else if (outcome === 'lose') game.stats.losses += 1
  else game.stats.wins += 1

  log(
    game,
    `Babak ${game.round}: ${
      outcome === 'blackjack' ? 'blackjack' : outcome === 'win' ? 'menang' : outcome === 'push' ? 'seri' : 'kalah'
    } (${player.total} lawan ${dealer.total}).`,
    outcome === 'lose' ? 'bad' : outcome === 'push' ? 'muted' : 'good',
  )
  game.betDraft = Math.max(minBetFor(game), Math.min(game.betDraft, game.chips || minBetFor(game)))
  game.message = ''
  return true
}

export function nextRound(game) {
  if (game.phase !== 'result') return false
  game.phase = 'betting'
  game.result = null
  game.player = []
  game.dealer = []
  game.revealed = 0
  game.jimat = []
  game.kutukan = null
  game.peek = false
  game.shieldUsed = false
  game.swapped = false
  game.hits = 0
  game.doubled = false
  game.blackjack = false
  game.bet = 0
  setBet(game, game.betDraft)
  return true
}

/* ---------------------------------------------------------------- simpanan */

const STORAGE_KEY = 'wg-blackjack'

export function loadSave(store = globalThis.localStorage) {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      difficulty: DIFFICULTIES[parsed.difficulty] ? parsed.difficulty : DEFAULT_DIFFICULTY,
      chips: Number.isFinite(parsed.chips) ? Math.max(0, Math.round(parsed.chips)) : START_CHIPS,
      stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : undefined,
      lastKutukan: typeof parsed.lastKutukan === 'string' ? parsed.lastKutukan : null,
    }
  } catch {
    // Mode privat atau kuota penuh: permainan tetap jalan tanpa simpanan.
    return null
  }
}

export function saveGame(game, store = globalThis.localStorage) {
  try {
    store?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        difficulty: game.difficulty,
        chips: game.chips,
        stats: game.stats,
        lastKutukan: game.lastKutukan,
      }),
    )
  } catch {
    // Diamkan: kehilangan simpanan tidak boleh menghentikan permainan.
  }
}
