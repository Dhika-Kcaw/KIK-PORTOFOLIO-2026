<script>
  let {
    profile,
    mode = 'point',
    hidden = false,
    touch = false,
    physicsEnabled = true,
    muted = false,
    prompt = null,
    onToggleMode,
    onTogglePhysics,
    onToggleMute,
    onOpenMap,
    onToggleHelp,
  } = $props()
</script>

<div class="hud" class:hidden class:touch>
  <div class="wash wash-top" aria-hidden="true"></div>
  <div class="wash wash-bottom" aria-hidden="true"></div>

  <header class="identity">
    <div class="seal" aria-hidden="true">往</div>
    <div class="identity-copy">
      <p class="eyebrow">Museum</p>
      <h1>{profile.name}</h1>
      <p class="role">
        {profile.headline || profile.role}<span class="dot">·</span>{profile.class_name || profile.competence}
      </p>
    </div>
  </header>

  <nav class="system" aria-label="Pengaturan museum">
    <button
      class="system-btn index-btn"
      type="button"
      onclick={onOpenMap}
      title="Peta museum (I)"
    >
      <span class="key" aria-hidden="true">I</span>
      <span class="label">Peta</span>
    </button>

    <button
      class="system-btn"
      class:on={!muted}
      type="button"
      onclick={onToggleMute}
      aria-pressed={!muted}
      title={muted ? 'Nyalakan suara (M)' : 'Matikan suara (M)'}
    >
      <span class="key" aria-hidden="true">M</span>
      <span class="label">{muted ? 'Bisu' : 'Suara'}</span>
    </button>

    <button
      class="system-btn"
      class:on={physicsEnabled}
      type="button"
      onclick={onTogglePhysics}
      aria-pressed={physicsEnabled}
      title="Fisika rambut dan kain (P)"
    >
      <span class="key" aria-hidden="true">P</span>
      <span class="label">Fisika</span>
    </button>

    <button
      class="system-btn"
      type="button"
      onclick={onToggleHelp}
      title="Panduan kontrol (?)"
    >
      <span class="key" aria-hidden="true">?</span>
      <span class="label">Panduan</span>
    </button>
  </nav>

  <div class="dock">
    {#if touch}
      <p class="touch-hint">
        Ketuk lantai untuk berjalan<span class="sep">·</span>ketuk objek untuk membuka<span class="sep">·</span>seret untuk memutar
      </p>
    {:else}
      <div class="mode-switch" role="group" aria-label="Mode gerak">
        <button
          class="mode-btn"
          class:active={mode === 'point'}
          type="button"
          aria-pressed={mode === 'point'}
          onclick={() => onToggleMode?.('point')}
        >
          Klik
        </button>
        <span class="mode-divider" aria-hidden="true"></span>
        <button
          class="mode-btn"
          class:active={mode === 'keys'}
          type="button"
          aria-pressed={mode === 'keys'}
          onclick={() => onToggleMode?.('keys')}
        >
          WASD
        </button>
      </div>

      {#if mode === 'point'}
        <p class="hint">
          Klik batu untuk berjalan<span class="sep">·</span>klik dua kali untuk berlari
        </p>
      {:else}
        <p class="hint">
          W A S D untuk berjalan<span class="sep">·</span>Shift untuk berlari
        </p>
      {/if}
      <p class="hint subtle">
        E interaksi<span class="sep">·</span>I peta<span class="sep">·</span>Space lompat<span class="sep">·</span>Seret kanan putar<span class="sep">·</span>Tab ganti mode
      </p>
    {/if}
  </div>

  {#if prompt && !hidden}
    <div class="prompt-card" aria-live="polite">
      {#if touch}
        <span class="prompt-key tap" aria-hidden="true">Ketuk</span>
      {:else}
        <span class="prompt-key" aria-hidden="true">E</span>
      {/if}
      <span class="prompt-copy">
        <strong>{prompt.text}</strong>
        <small>{prompt.title}</small>
      </span>
    </div>
  {/if}

  <div class="vertical-mark" aria-hidden="true">
    <span>往</span><span>生</span><span>堂</span>
  </div>
</div>

<style>
  .hud {
    position: fixed;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    font-family: var(--font-body);
    color: var(--text);
    transition: opacity 0.25s ease;
  }

  .hud.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .wash {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
  }

  .wash-top {
    top: 0;
    height: 190px;
    background: linear-gradient(180deg, rgba(16, 12, 10, 0.62), rgba(16, 12, 10, 0));
  }

  .wash-bottom {
    bottom: 0;
    height: 170px;
    background: linear-gradient(0deg, rgba(16, 12, 10, 0.6), rgba(16, 12, 10, 0));
  }

  /* Identitas */
  .identity {
    position: absolute;
    top: 26px;
    left: 30px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    pointer-events: auto;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    margin-top: 2px;
    border: 1px solid rgba(255, 240, 214, 0.22);
    border-radius: 2px;
    background: var(--vermilion);
    color: #f7ead1;
    font-family: var(--font-seal);
    font-size: 21px;
    line-height: 1;
    box-shadow: 0 7px 18px rgba(0, 0, 0, 0.35);
    transform: rotate(-1.5deg);
    position: relative;
  }

  .seal::after {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid rgba(255, 240, 214, 0.3);
    border-radius: 1px;
  }

  .eyebrow {
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .identity h1 {
    margin-top: 4px;
    font-size: 29px;
    letter-spacing: 0.005em;
    color: #f7eed9;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  }

  .role {
    margin-top: 3px;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .dot {
    margin: 0 6px;
    color: var(--faint);
  }

  /* Sistem */
  .system {
    position: absolute;
    top: 30px;
    right: 30px;
    display: flex;
    align-items: center;
    gap: 18px;
    pointer-events: auto;
  }

  .system-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
    border-bottom: 1px solid transparent;
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transition: color 0.16s ease, border-color 0.16s ease;
  }

  .system-btn:hover {
    color: var(--text);
  }

  .system-btn.on {
    color: var(--text);
    border-bottom-color: var(--vermilion);
  }

  .key {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 1px solid var(--border);
    border-radius: 2px;
    color: var(--faint);
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1;
    letter-spacing: 0;
  }

  .system-btn:hover .key,
  .system-btn.on .key {
    border-color: var(--border-strong);
    color: var(--text);
  }

  /* Dock gerak */
  .dock {
    position: absolute;
    left: 30px;
    bottom: 26px;
    pointer-events: auto;
  }

  .mode-switch {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .mode-btn {
    position: relative;
    padding: 1px 0 4px;
    border-bottom: 1px solid transparent;
    color: var(--faint);
    font-family: var(--font-display);
    font-size: 17px;
    letter-spacing: 0.02em;
    transition: color 0.16s ease, border-color 0.16s ease;
  }

  .mode-btn:hover {
    color: var(--muted);
  }

  .mode-btn.active {
    color: #f7eed9;
    border-bottom-color: var(--gold);
  }

  .mode-divider {
    width: 1px;
    height: 13px;
    background: var(--border);
  }

  .hint {
    font-size: 11.5px;
    line-height: 1.65;
    letter-spacing: 0.01em;
    color: var(--muted);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
  }

  .hint.subtle {
    margin-top: 1px;
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--faint);
  }

  .prompt-card {
    position: absolute;
    left: 50%;
    bottom: 28px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 11px 7px 8px;
    border: 1px solid rgba(244, 234, 212, 0.16);
    border-left: 2px solid var(--gold);
    background: rgba(22, 17, 13, 0.78);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    transform: translateX(-50%);
    pointer-events: none;
    animation: prompt-in 0.18s ease both;
  }

  @keyframes prompt-in {
    from {
      opacity: 0;
      transform: translate(-50%, 5px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .prompt-key {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    border: 1px solid rgba(244, 234, 212, 0.3);
    color: var(--gold);
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .prompt-copy {
    display: grid;
    gap: 1px;
  }

  .prompt-copy strong {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--text);
  }

  .prompt-copy small {
    font-size: 9px;
    color: var(--muted);
  }

  .sep {
    margin: 0 8px;
    color: rgba(244, 234, 212, 0.28);
  }

  /* Cap vertikal */
  .vertical-mark {
    position: absolute;
    right: 30px;
    bottom: 28px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: var(--font-seal);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.1em;
    color: rgba(244, 234, 212, 0.22);
    pointer-events: none;
  }

  /* Petunjuk gestur (hanya dirender di layar sentuh) */
  .touch-hint {
    max-width: 34ch;
    font-size: 11px;
    line-height: 1.55;
    letter-spacing: 0.01em;
    color: var(--muted);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
  }

  .prompt-key.tap {
    width: auto;
    min-width: 24px;
    padding: 0 7px;
    font-family: var(--font-body);
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /*
   * Layar sentuh: tidak ada mode WASD dan tidak ada baris tombol papan ketik.
   * Tombol sistem turun menjadi satu baris di bawah agar bisa dijangkau ibu jari.
   */
  .hud.touch .vertical-mark {
    display: none;
  }

  .hud.touch .identity {
    top: calc(14px + env(safe-area-inset-top, 0px));
    left: 14px;
  }

  .hud.touch .dock {
    left: calc(14px + env(safe-area-inset-left, 0px));
    /* Sisa ruang di kanan disediakan untuk peta kecil (96 px + tepi 12 px +
       14 px jarak), jadi petunjuk gestur membungkus di sebelah kirinya. */
    right: calc(122px + env(safe-area-inset-right, 0px));
    bottom: calc(82px + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
  }

  .hud.touch .system {
    top: auto;
    left: 14px;
    right: 14px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    justify-content: space-between;
    gap: 0;
    padding: 4px 6px;
    border: 1px solid rgba(244, 234, 212, 0.14);
    border-radius: 3px;
    background: rgba(22, 17, 13, 0.72);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .hud.touch .system-btn {
    flex: 1 1 0;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    min-height: 46px;
    padding: 6px 2px;
    border-bottom: none;
  }

  .hud.touch .system-btn .key {
    min-width: 22px;
    height: 22px;
    font-size: 10px;
  }

  .hud.touch .system-btn .label {
    display: block;
    font-size: 8.5px;
    letter-spacing: 0.08em;
  }

  .hud.touch .system-btn.on {
    color: var(--gold);
  }

  .hud.touch .prompt-card {
    /* Kartu prompt juga menyingkir dari peta kecil: rata kiri, di atas baris
       petunjuk gestur, dengan inset kanan yang sama. */
    left: calc(14px + env(safe-area-inset-left, 0px));
    right: calc(122px + env(safe-area-inset-right, 0px));
    bottom: calc(162px + env(safe-area-inset-bottom, 0px));
    max-width: none;
    padding: 9px 13px 9px 10px;
    transform: none;
    animation: prompt-in-side 0.18s ease both;
  }

  @keyframes prompt-in-side {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .hud.touch .prompt-copy strong {
    font-size: 12px;
  }

  .hud.touch .prompt-copy small {
    font-size: 9.5px;
  }

  @media (max-width: 860px) {
    .identity {
      left: 20px;
      top: 20px;
    }
    .system {
      right: 20px;
      top: 23px;
      gap: 11px;
    }
    .dock {
      left: 20px;
      bottom: 20px;
    }
    .prompt-card {
      bottom: 92px;
    }
    .vertical-mark {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .system {
      top: auto;
      right: 16px;
      bottom: 20px;
    }
    .prompt-card {
      bottom: 78px;
    }
    .identity {
      left: 16px;
      top: 16px;
    }
    /* Sisi kanan dipakai peta kecil, jadi baris petunjuk membungkus di kiri. */
    .dock {
      left: 16px;
      right: 168px;
      bottom: 68px;
    }
  }

  @media (max-width: 640px) {
    .role,
    .system-btn .label {
      display: none;
    }
    .system {
      gap: 8px;
    }
    .system-btn .key {
      min-width: 20px;
      height: 20px;
    }
    .identity h1 {
      font-size: 23px;
    }
    .seal {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }
    .hint {
      font-size: 10.5px;
    }
    .hint.subtle {
      display: none;
    }
  }
</style>
