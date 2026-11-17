<script>
  import { onDestroy, onMount } from 'svelte'
  import {
    DIFFICULTIES,
    JIMAT,
    JIMAT_ORDER,
    SKILLS_FROM_ROUND,
    createGame,
    handValue,
    jimatCost,
    loadSave,
    minBetFor,
    nextRound,
    playerDouble,
    playerHit,
    playerStand,
    playerSwap,
    revealHole,
    saveGame,
    setBet,
    setDifficulty,
    settle,
    skillsUnlocked,
    startRound,
    takeAdvance,
    toggleJimat,
    totalJimatCost,
    upcomingRound,
  } from '../game/blackjack.js'

  let { onSync = null, onLeave = null, onBlip = null } = $props()

  // Keadaan permainan hidup di sini; `BlackjackStage` menggambar kartunya di meja
  // 3D. Satu `$effect` cukup untuk menyelaraskan keduanya karena `sync()` membaca
  // kartu, `revealed`, dan `bet` — perubahan itu otomatis memicu ulang.
  let game = $state(createGame(loadSave() ?? {}))
  let busy = $state(false)
  let token = 0

  const levels = [DIFFICULTIES.mudah, DIFFICULTIES.normal, DIFFICULTIES.sulit]
  const CHIP_STEPS = [5, 10, 25]
  const difficulty = $derived(DIFFICULTIES[game.difficulty] ?? DIFFICULTIES.normal)
  const minBet = $derived(minBetFor(game))
  const maxBet = $derived(Math.min(difficulty.maxBet, Math.max(minBet, game.chips)))
  const jimatTotal = $derived(totalJimatCost(game))
  const affordable = $derived(game.betDraft + jimatTotal <= game.chips)
  const playerValue = $derived(handValue(game.player))
  const shownDealer = $derived(
    game.peek || game.revealed >= game.dealer.length
      ? game.dealer
      : game.dealer.slice(0, Math.max(1, game.revealed)),
  )
  const shownDealerValue = $derived(handValue(shownDealer))
  const round = $derived(upcomingRound(game))
  const unlocked = $derived(skillsUnlocked(game))
  const canHit = $derived(!(game.kutukan?.key === 'tangan' && game.hits >= 1))
  const phase = $derived(game.phase)
  const outcomeSeal = $derived(
    game.result?.outcome === 'push' ? '和' : game.result?.outcome === 'lose' ? '敗' : '勝',
  )
  const turnLabel = $derived(
    phase === 'betting'
      ? unlocked
        ? 'Pasang taruhan, pilih jimat, lalu bagikan'
        : 'Pasang taruhan lalu bagikan'
      : phase === 'player'
        ? 'Giliranmu'
        : phase === 'dealer'
          ? 'Bandar membuka kartu'
          : 'Tangan selesai',
  )
  const canDouble = $derived(
    !busy && game.player.length === 2 && game.chips >= game.bet && phase === 'player',
  )

  $effect(() => {
    onSync?.(game)
  })

  onMount(() => {
    onBlip?.()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  onDestroy(() => {
    token += 1
  })

  function persist() {
    saveGame(game)
  }

  function blip() {
    onBlip?.()
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function revealAndSettle() {
    const run = ++token
    busy = true
    for (let count = game.revealed + 1; count <= game.dealer.length; count += 1) {
      await delay(340)
      if (run !== token) return
      game.revealed = count
    }
    await delay(220)
    if (run !== token) return
    settle(game)
    busy = false
    persist()
  }

  function deal() {
    if (busy || game.phase !== 'betting') return
    blip()
    if (!startRound(game)) return
    if (game.phase === 'dealer') revealAndSettle()
  }

  function act(kind) {
    if (busy || game.phase !== 'player') return
    blip()
    if (kind === 'hit') playerHit(game)
    else if (kind === 'stand') playerStand(game)
    else if (kind === 'double') playerDouble(game)
    else if (kind === 'swap') playerSwap(game)
    if (game.phase === 'dealer') revealAndSettle()
    else if (game.phase === 'result') persist()
  }

  function peekHole() {
    if (busy || game.phase !== 'player') return
    if (revealHole(game)) blip()
  }

  function replay() {
    if (busy || game.phase !== 'result') return
    nextRound(game)
    deal()
  }

  function adjustBet() {
    if (busy || game.phase !== 'result') return
    blip()
    nextRound(game)
  }

  function bumpBet(step) {
    if (game.phase !== 'betting') return
    blip()
    setBet(game, game.betDraft + step)
  }

  /** Tambah taruhan dengan satu keping — cara yang dipakai orang di meja sungguhan. */
  function addChip(amount) {
    if (game.phase !== 'betting') return
    blip()
    setBet(game, game.betDraft + amount)
  }

  function betAll() {
    if (game.phase !== 'betting') return
    blip()
    setBet(game, maxBet)
  }

  function pickJimat(key) {
    blip()
    // Jimat harus terbayar bersama taruhan. Kalau taruhan sekarang terlalu besar,
    // turunkan dulu sampai ada ruang — jangan sampai jimat terbeli lalu ditolak
    // diam-diam saat kartu dibagikan.
    if (!game.jimat.includes(key)) {
      const cost = jimatCost(game, key)
      const room = game.chips - totalJimatCost(game) - cost
      if (room < minBetFor(game)) return
      if (game.betDraft > room) setBet(game, room)
    }
    toggleJimat(game, key)
  }

  /** Segel hanya bisa ditekan kalau kepingnya cukup tanpa mengorbankan taruhan minimum. */
  function canPick(key) {
    if (game.jimat.includes(key)) return true
    const room = game.chips - totalJimatCost(game) - jimatCost(game, key)
    return room >= minBetFor(game)
  }

  function chooseLevel(key) {
    if (busy || (game.phase !== 'betting' && game.phase !== 'result')) return
    if (setDifficulty(game, key)) {
      blip()
      persist()
    }
  }

  function advance() {
    blip()
    if (takeAdvance(game)) persist()
  }

  /**
   * Berdiri dari kursi. Kalau masih ada tangan berjalan, tangan itu diselesaikan
   * lebih dulu (anggap “Lewati”) supaya taruhan yang sudah dipotong tidak hangus
   * hanya karena pemain menutup meja.
   */
  function leave() {
    if (busy) return
    blip()
    if (game.phase === 'player') playerStand(game)
    if (game.phase === 'dealer') {
      settle(game)
      persist()
    }
    onLeave?.()
  }

  /**
   * Pintasan papan tombol, seperti game kartu biasa.
   * `Esc` sengaja dilewatkan: `App.svelte` yang menutup kursi.
   */
  function handleKey(event) {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
    const code = event.code
    if (code === 'Escape') return

    const target = event.target
    const onButton = target instanceof HTMLElement && Boolean(target.closest('button'))

    if (game.phase === 'betting') {
      if ((code === 'Enter' || code === 'Space') && !onButton) {
        event.preventDefault()
        deal()
      } else if (code === 'ArrowLeft') bumpBet(-5)
      else if (code === 'ArrowRight') bumpBet(5)
      else if (/^Digit[1-4]$/.test(code) && unlocked) {
        pickJimat(JIMAT_ORDER[Number(code.slice(5)) - 1])
      }
      return
    }

    if (game.phase === 'player') {
      if (code === 'KeyH') act('hit')
      else if (code === 'KeyS') act('stand')
      else if (code === 'KeyD' && canDouble) act('double')
      else if (code === 'KeyT' && game.jimat.includes('tarikan') && !game.swapped) act('swap')
      else if (code === 'KeyI' && game.jimat.includes('mata') && !game.peek) peekHole()
      return
    }

    if (game.phase === 'result' && (code === 'Enter' || code === 'Space') && !onButton) {
      event.preventDefault()
      replay()
    }
  }
</script>

<div class="table">
  <!-- keluar selalu di pojok kanan atas -->
  <button type="button" class="exit" onclick={leave} aria-label="Berdiri dari meja">
    <span class="x" aria-hidden="true">✕</span>
    <span class="text">Berdiri</span>
    <kbd>Esc</kbd>
  </button>

  <!-- saldo & konteks babak -->
  <div class="bank">
    <span class="kicker">Keping</span>
    <strong class="value">{game.chips}</strong>
    <span class="meta">
      Babak {round} · {difficulty.label}
      {#if game.kutukan}· <em class="curse" title={game.kutukan.desc}>{game.kutukan.seal} {game.kutukan.label}</em>{/if}
    </span>
    {#if !unlocked}
      <span class="meta kunci">Jimat &amp; kutukan mulai babak {SKILLS_FROM_ROUND}</span>
    {/if}
  </div>

  <!-- bandar -->
  <div class="dealer" class:aktif={phase === 'dealer'}>
    <span class="who">Bandar arsip</span>
    <span class="row">
      <b class="value">{shownDealerValue.total}</b>
      {#if shownDealerValue.soft}<em class="soft">lembut</em>{/if}
      <span class="cards">{shownDealer.length} dari {game.dealer.length} kartu</span>
    </span>
  </div>

  <!-- hasil babak -->
  {#if game.result}
    <div
      class="outcome"
      class:menang={game.result.outcome === 'win' || game.result.outcome === 'blackjack'}
      class:kalah={game.result.outcome === 'lose'}
      role="status"
    >
      <span class="stamp" aria-hidden="true">{outcomeSeal}</span>
      <span class="report">
        <b>{game.result.note}</b>
        <em>{game.result.delta >= 0 ? '+' : ''}{game.result.delta} keping</em>
      </span>
    </div>
  {/if}

  {#if game.message && !game.result}
    <p class="notice">{game.message}</p>
  {/if}

  {#if game.chips < minBet && phase !== 'player' && phase !== 'dealer'}
    <p class="notice talangan">
      Keping kurang untuk taruhan minimum {minBet}.
      <button type="button" onclick={advance}>Minta talangan 60 keping</button>
    </p>
  {/if}

  <!-- kaki meja: tangan pemain + dermaga aksi -->
  <div class="foot">
    <div class="hand">
      <span class="who">Tanganmu</span>
      <span class="row">
        <b class="value">{playerValue.total}</b>
        {#if playerValue.soft}<em class="soft">lembut</em>{/if}
        <span class="cards">{game.player.length} dari {game.player.length} kartu</span>
        {#if phase !== 'betting'}
          <span class="cards wager">taruhan {game.bet}</span>
        {/if}
      </span>
      <span class="turn">{turnLabel}</span>
    </div>

    <div class="dock">
      {#if phase === 'betting'}
        <div class="bet">
          <div class="stepper">
            <button
              type="button"
              class="step"
              onclick={() => bumpBet(-5)}
              disabled={game.betDraft <= minBet}
              aria-label="Kurangi taruhan"
            >−</button>
            <output class="amount">
              <b>{game.betDraft}</b>
              <small>taruhan</small>
            </output>
            <button
              type="button"
              class="step"
              onclick={() => bumpBet(5)}
              disabled={game.betDraft >= maxBet}
              aria-label="Tambah taruhan"
            >+</button>
          </div>

          <div class="chips">
            {#each CHIP_STEPS as amount (amount)}
              <button
                type="button"
                class="chip"
                disabled={game.betDraft >= maxBet || game.chips < minBet}
                onclick={() => addChip(amount)}
                aria-label={`Tambah ${amount} keping`}
              >{amount}</button>
            {/each}
            <button
              type="button"
              class="chip all"
              disabled={game.betDraft >= maxBet || game.chips < minBet}
              onclick={betAll}
              aria-label="Taruhan maksimum"
            >maks</button>
          </div>
          <span class="range">min {minBet} · maks {maxBet}</span>
        </div>
      {/if}

      <div class="skills">
        {#if unlocked && phase === 'betting'}
          {#each JIMAT_ORDER as key, index (key)}
            {@const info = JIMAT[key]}
            {@const cost = jimatCost(game, key)}
            {@const active = game.jimat.includes(key)}
            <button
              type="button"
              class="seal"
              class:on={active}
              title={`${info.label} — ${info.desc}`}
              aria-pressed={active}
              disabled={!active && !canPick(key)}
              onclick={() => pickJimat(key)}
            >
              <span class="glyph" aria-hidden="true">{info.seal}</span>
              <span class="name">{info.label}</span>
              <small class="cost">{active ? 'dipakai' : cost === 0 ? 'gratis' : cost}</small>
              <kbd>{index + 1}</kbd>
            </button>
          {/each}
          {#if jimatTotal > 0}
            <span class="spent">jimat −{jimatTotal}</span>
          {/if}
        {:else if !unlocked}
          <span class="locked">Jimat &amp; kutukan terbuka pada babak {SKILLS_FROM_ROUND}</span>
        {/if}
      </div>

      <div class="actions">
        {#if phase === 'betting'}
          <button
            type="button"
            class="primary"
            disabled={game.chips < minBet || busy || !affordable}
            onclick={deal}
          >
            Bagikan kartu <kbd>⏎</kbd>
          </button>
        {:else if phase === 'player'}
          <button type="button" class="primary" disabled={busy || !canHit} onclick={() => act('hit')}>
            Tarik <kbd>H</kbd>
          </button>
          <button type="button" class="second" disabled={busy} onclick={() => act('stand')}>
            Lewati <kbd>S</kbd>
          </button>
          <button type="button" class="second" disabled={!canDouble} onclick={() => act('double')}>
            Gandakan <kbd>D</kbd>
          </button>
          {#if game.jimat.includes('tarikan') && !game.swapped}
            <button type="button" class="second" disabled={busy} onclick={() => act('swap')}>
              Tukar <kbd>T</kbd>
            </button>
          {/if}
          {#if game.jimat.includes('mata') && !game.peek}
            <button type="button" class="second" disabled={busy} onclick={peekHole}>
              Intai <kbd>I</kbd>
            </button>
          {/if}
        {:else if phase === 'dealer'}
          <span class="waiting">Bandar membuka kartu…</span>
        {:else if phase === 'result'}
          <button
            type="button"
            class="primary"
            disabled={busy || game.chips < minBet}
            onclick={replay}
          >
            Main lagi · {game.betDraft} <kbd>⏎</kbd>
          </button>
          <button type="button" class="second" disabled={busy} onclick={adjustBet}>
            Atur taruhan
          </button>
        {/if}

        <div class="levels">
          {#each levels as level (level.key)}
            <button
              type="button"
              class="level"
              class:on={game.difficulty === level.key}
              aria-pressed={game.difficulty === level.key}
              disabled={busy || (phase !== 'betting' && phase !== 'result')}
              onclick={() => chooseLevel(level.key)}
            >{level.label}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .table {
    position: fixed;
    inset: 0;
    z-index: 24;
    font-family: var(--font-body);
    color: var(--paper);
    pointer-events: none;
  }

  /* ---------- pelat dasar ---------- */

  .bank,
  .dealer,
  .hand,
  .actions,
  .outcome,
  .notice {
    background: rgba(16, 12, 9, 0.84);
    border: 1px solid rgba(236, 224, 196, 0.18);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.38);
  }

  .value {
    font-family: var(--font-display);
    line-height: 0.9;
  }

  .who,
  .kicker,
  .cards,
  .meta,
  .range,
  .turn {
    font-family: var(--font-mono);
    letter-spacing: 0.06em;
  }

  /* ---------- pojok kiri atas: saldo ---------- */

  .bank {
    position: absolute;
    top: clamp(10px, 1.8vw, 18px);
    left: clamp(10px, 1.8vw, 18px);
    display: grid;
    gap: 2px;
    padding: 8px 13px 9px;
    border-left: 3px solid var(--vermilion-deep);
  }

  .kicker {
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.5);
  }

  .bank .value {
    font-size: clamp(22px, 3vw, 30px);
    color: #f6ecd8;
  }

  .meta {
    font-size: 9.5px;
    color: rgba(236, 224, 196, 0.62);
    white-space: nowrap;
  }

  .meta .curse {
    font-style: normal;
    color: #e9b9a1;
  }

  .meta.kunci {
    color: rgba(236, 224, 196, 0.45);
  }

  /* ---------- pojok kanan atas: keluar ---------- */

  .exit {
    position: absolute;
    top: clamp(10px, 1.8vw, 18px);
    right: clamp(10px, 1.8vw, 18px);
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 38px;
    padding: 0 11px;
    border: 1px solid rgba(236, 224, 196, 0.28);
    background: rgba(16, 12, 9, 0.84);
    color: var(--paper);
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    touch-action: manipulation;
  }

  .exit:hover {
    border-color: rgba(236, 224, 196, 0.55);
    background: rgba(46, 24, 20, 0.9);
  }

  .exit .x {
    font-size: 12px;
    color: #e0b8a4;
  }

  kbd {
    padding: 1px 4px;
    border: 1px solid rgba(236, 224, 196, 0.26);
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.04em;
    color: rgba(236, 224, 196, 0.55);
  }

  /* ---------- tengah atas: bandar ---------- */

  .dealer {
    position: absolute;
    top: clamp(10px, 1.8vw, 18px);
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    justify-items: center;
    gap: 1px;
    padding: 5px 16px 7px;
  }

  .dealer .who {
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.5);
  }

  .dealer .row,
  .hand .row {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }

  .dealer .value {
    font-size: 24px;
    color: #f6ecd8;
  }

  .dealer.aktif {
    border-color: rgba(178, 58, 48, 0.6);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.38), inset 0 0 0 1px rgba(178, 58, 48, 0.24);
  }

  .soft {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.5);
  }

  .cards {
    font-size: 9.5px;
    color: rgba(236, 224, 196, 0.6);
  }

  /* ---------- hasil babak ---------- */

  .outcome {
    position: absolute;
    top: 34%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: min(520px, 78vw);
    padding: 10px 16px 10px 12px;
    border-left: 3px solid var(--vermilion-deep);
    animation: masuk 0.28s ease-out;
  }

  .outcome.menang {
    border-left-color: var(--gold-deep, #a97f45);
  }

  .outcome .stamp {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    background: var(--vermilion-deep);
    color: #f7ecd6;
    font-family: var(--font-display);
    font-size: 17px;
  }

  .outcome.menang .stamp {
    background: var(--gold-deep, #a97f45);
  }

  .outcome.kalah .stamp {
    background: #5c241d;
  }

  .outcome .report {
    display: grid;
    gap: 1px;
  }

  .outcome .report b {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    color: #f4e7cd;
  }

  .outcome .report em {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: rgba(236, 224, 196, 0.62);
  }

  @keyframes masuk {
    from {
      opacity: 0;
      transform: translate(-50%, -46%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .notice {
    position: absolute;
    top: 44%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: min(520px, 80vw);
    margin: 0;
    padding: 8px 14px;
    font-size: 12.5px;
    line-height: 1.45;
    text-align: center;
    border-left: 3px solid rgba(236, 224, 196, 0.3);
    color: #f0e2c6;
  }

  .talangan button {
    margin-left: 7px;
    padding: 4px 9px;
    border: 1px solid rgba(236, 224, 196, 0.4);
    background: transparent;
    color: #f0e2c6;
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
  }

  /* ---------- kaki: tangan + dermaga ---------- */

  .foot {
    position: absolute;
    left: clamp(10px, 1.8vw, 18px);
    right: clamp(10px, 1.8vw, 18px);
    bottom: calc(clamp(10px, 1.8vw, 18px) + env(safe-area-inset-bottom));
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .hand {
    display: grid;
    gap: 1px;
    padding: 7px 13px 8px;
    border-left: 3px solid rgba(236, 224, 196, 0.4);
  }

  .hand .who {
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.5);
  }

  .hand .value {
    font-size: 26px;
    color: #f6ecd8;
  }

  .hand .turn {
    font-size: 9.5px;
    color: rgba(236, 224, 196, 0.55);
  }

  .dock {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    pointer-events: auto;
    max-width: min(660px, 66vw);
  }

  .actions {
    padding: 7px 10px;
  }

  /* taruhan */
  .bet {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .step {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(236, 224, 196, 0.3);
    background: rgba(16, 12, 9, 0.72);
    color: var(--paper);
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
  }

  .step:hover:not(:disabled) {
    border-color: rgba(236, 224, 196, 0.6);
    background: rgba(236, 224, 196, 0.08);
  }

  .amount {
    display: grid;
    justify-items: center;
    min-width: 56px;
  }

  .amount b {
    font-family: var(--font-mono);
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    color: #f6ecd8;
  }

  .amount small {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.45);
  }

  .chips {
    display: flex;
    gap: 5px;
  }

  .chip {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(168, 56, 45, 0.85);
    background: radial-gradient(circle at 50% 42%, rgba(246, 236, 216, 0.14), rgba(0, 0, 0, 0));
    color: #f0dcc0;
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0;
    cursor: pointer;
    touch-action: manipulation;
  }

  .chip.all {
    border-color: rgba(169, 127, 69, 0.9);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chip:hover:not(:disabled) {
    background: rgba(168, 56, 45, 0.3);
  }

  .range {
    font-size: 9px;
    color: rgba(236, 224, 196, 0.4);
  }

  .wager {
    color: rgba(236, 224, 196, 0.72);
  }

  /* jimat */
  .skills {
    display: flex;
    align-items: stretch;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .seal {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 7px;
    min-width: 116px;
    padding: 5px 9px 5px 7px;
    border: 1px solid rgba(236, 224, 196, 0.24);
    background: rgba(16, 12, 9, 0.8);
    color: var(--paper);
    font: inherit;
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
    position: relative;
  }

  .seal .glyph {
    grid-row: 1 / span 2;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 1px solid rgba(236, 224, 196, 0.28);
    font-family: var(--font-display);
    font-size: 14px;
    color: #f0dcc0;
  }

  .seal .name {
    font-size: 10.5px;
    letter-spacing: 0.01em;
    line-height: 1.15;
    color: rgba(246, 236, 216, 0.9);
  }

  .seal .cost {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(236, 224, 196, 0.5);
  }

  .seal kbd {
    position: absolute;
    top: 3px;
    right: 4px;
    border: 0;
    padding: 0;
    font-size: 8px;
    color: rgba(236, 224, 196, 0.35);
  }

  .seal:hover:not(:disabled) {
    border-color: rgba(236, 224, 196, 0.5);
    background: rgba(44, 30, 24, 0.88);
  }

  .seal.on {
    border-color: rgba(178, 58, 48, 0.85);
    background: rgba(120, 32, 26, 0.55);
  }

  .seal.on .glyph {
    border-color: rgba(246, 236, 216, 0.5);
    color: #fbeed8;
  }

  .seal.on .cost {
    color: #f0c9b4;
  }

  .seal:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  .spent {
    align-self: center;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(240, 201, 180, 0.85);
  }

  .locked {
    font-size: 10.5px;
    color: rgba(236, 224, 196, 0.5);
  }

  /* aksi */
  .actions {
    display: flex;
    align-items: stretch;
    gap: 7px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .primary,
  .second {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 15px;
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    touch-action: manipulation;
    border: 1px solid rgba(236, 224, 196, 0.32);
    background: transparent;
    color: #f4e7cd;
  }

  .primary {
    min-width: 148px;
    border-color: var(--vermilion-deep);
    background: var(--vermilion-deep);
    color: #fbf0da;
  }

  .primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .second:hover:not(:disabled) {
    border-color: rgba(236, 224, 196, 0.62);
    background: rgba(236, 224, 196, 0.1);
  }

  .primary:disabled,
  .second:disabled,
  .step:disabled,
  .chip:disabled,
  .level:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  .primary kbd,
  .second kbd {
    color: rgba(251, 240, 218, 0.7);
    border-color: rgba(251, 240, 218, 0.3);
  }

  .second kbd {
    color: rgba(236, 224, 196, 0.5);
    border-color: rgba(236, 224, 196, 0.24);
  }

  .waiting {
    display: inline-flex;
    align-items: center;
    min-height: 42px;
    padding: 0 4px;
    font-size: 12px;
    font-style: italic;
    color: rgba(236, 224, 196, 0.65);
  }

  .levels {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-left: 4px;
  }

  .level {
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid rgba(236, 224, 196, 0.2);
    background: transparent;
    color: rgba(236, 224, 196, 0.7);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    touch-action: manipulation;
  }

  .level.on {
    border-color: rgba(236, 224, 196, 0.55);
    background: rgba(236, 224, 196, 0.14);
    color: #f6ecd8;
  }

  /* pintasan hanya relevan di perangkat dengan papan tombol */
  @media (pointer: coarse) {
    kbd {
      display: none;
    }

    .step {
      width: 44px;
      height: 44px;
    }

    .chip {
      width: 44px;
      height: 44px;
      font-size: 11.5px;
    }

    .primary,
    .second {
      min-height: 48px;
      font-size: 13px;
    }

    .seal {
      min-width: 0;
      flex: 1 1 44%;
    }

    .level {
      min-height: 36px;
    }
  }

  /* ---------- ponsel: satu kolom, dermaga penuh ---------- */

  @media (max-width: 820px), (pointer: coarse) {
    .dealer {
      top: calc(clamp(10px, 1.8vw, 18px) + 44px);
    }

    .outcome,
    .notice {
      top: 40%;
    }

    .foot {
      flex-direction: column;
      align-items: stretch;
      gap: 7px;
    }

    .hand {
      flex-direction: row;
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      padding: 6px 11px;
    }

    .hand .turn {
      margin-left: auto;
      text-align: right;
    }

    .dock {
      align-items: stretch;
      max-width: none;
    }

    .bet {
      justify-content: space-between;
      gap: 8px;
    }

    .chips {
      order: 3;
      width: 100%;
      justify-content: space-between;
      gap: 6px;
    }

    .chip {
      flex: 1 1 0;
      width: auto;
    }

    .range {
      order: 4;
      width: 100%;
      text-align: right;
    }

    .skills {
      justify-content: space-between;
    }

    .seal {
      flex: 1 1 0;
      min-width: 0;
      padding: 5px 6px;
      column-gap: 5px;
    }

    .seal .glyph {
      width: 22px;
      height: 22px;
      font-size: 12px;
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
      gap: 6px;
    }

    .primary {
      min-width: 0;
      grid-column: 1 / -1;
    }

    .levels {
      grid-column: 1 / -1;
      margin: 2px 0 0;
      justify-content: space-between;
    }

    .level {
      flex: 1 1 0;
      text-align: center;
    }
  }

  @media (max-width: 460px) {
    .exit .text {
      display: none;
    }

    .bank .value {
      font-size: 20px;
    }

    .dealer .value {
      font-size: 21px;
    }

    .hand .value {
      font-size: 22px;
    }

    .seal .name {
      font-size: 10px;
    }

    .outcome,
    .notice {
      max-width: 88vw;
    }
  }

  @media (max-height: 560px) {
    .hand .turn {
      display: none;
    }

    .actions {
      padding: 5px 8px;
    }
  }
</style>
