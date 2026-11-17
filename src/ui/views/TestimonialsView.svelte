<script>
  import { TYPE_LABEL } from '../panel-utils.js'

  // Dinding kertas di dalam BoardView: testimoni yang sudah disetujui admin
  // dipaku sebagai kertas, dan kiriman sesi ini tampil paling depan dengan cap
  // “待審” (menunggu persetujuan).
  let { testimonials = [], pending = [], onBlip } = $props()

  const SEAL = { teacher: '師', friend: '友', user: '客', internship: '職' }

  let filter = $state('all')
  let selected = $state(null)

  const types = $derived([...new Set(testimonials.map((item) => item.type).filter(Boolean))])
  const visible = $derived(
    filter === 'all' ? testimonials : testimonials.filter((item) => item.type === filter),
  )
  const notes = $derived([...pending, ...visible])
  const pendingCount = $derived(pending.length)

  const noteKey = (note) => note.key ?? note.id

  function click() {
    onBlip?.()
  }

  function setFilter(key) {
    click()
    filter = key
  }

  function toggle(note) {
    click()
    selected = selected === noteKey(note) ? null : noteKey(note)
  }
</script>

<section class="wall" aria-label="Kertas testimoni di papan">
  <header class="wall-head">
    <p class="kicker">Sudah dipaku</p>
    <span class="wall-count">{testimonials.length} kertas</span>
  </header>

  {#if pendingCount}
    <p class="pending-strip" role="status">
      <span class="pending-dot" aria-hidden="true"></span>
      {pendingCount} kertas menunggu persetujuan admin — belum tampil di museum
    </p>
  {/if}

  {#if types.length > 1}
    <div class="filter-chips" role="group" aria-label="Saring kertas per kategori">
      <button
        class="chip"
        class:active={filter === 'all'}
        type="button"
        onclick={() => setFilter('all')}
      >
        Semua
      </button>
      {#each types as type (type)}
        <button
          class="chip"
          class:active={filter === type}
          type="button"
          onclick={() => setFilter(type)}
        >
          {TYPE_LABEL[type] ?? type}
        </button>
      {/each}
    </div>
  {/if}

  {#if notes.length}
    <div class="slip-grid">
      {#each notes as note (noteKey(note))}
        <button
          class="slip"
          class:open={selected === noteKey(note)}
          class:pending={note.pending}
          type="button"
          aria-expanded={selected === noteKey(note)}
          onclick={() => toggle(note)}
        >
          <span class="pin" aria-hidden="true"></span>
          <span class="slip-name">{note.name}</span>
          <span class="slip-role">
            {(note.role || note.organization || TYPE_LABEL[note.type] || 'Pengunjung')
              .toString()
              .toUpperCase()}
          </span>
          <span class="slip-quote">{note.quote}</span>
          <span class="slip-foot">
            <span class="slip-seal" aria-hidden="true">{SEAL[note.type] ?? '言'}</span>
            <span class="slip-tag">
              {note.pending ? 'Menunggu persetujuan admin' : TYPE_LABEL[note.type] ?? 'Pengunjung'}
            </span>
          </span>
          {#if note.pending}
            <span class="slip-flag" aria-hidden="true">待審</span>
          {/if}
        </button>
      {/each}
    </div>
    <p class="wall-note">
      Ketuk kertas untuk membaca seluruh tulisannya. Kertas bercap <em>待審</em> belum disetujui
      admin, jadi belum hadir sebagai pengunjung museum.
    </p>
  {:else}
    <p class="empty-state">
      Papan ini masih bersih. Jadilah pengunjung pertama yang memaku testimoni.
    </p>
  {/if}
</section>

<style>
  .kicker {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .wall {
    padding: 16px 16px 14px;
    border: 1px solid rgba(80, 52, 30, 0.28);
    background:
      repeating-linear-gradient(90deg, rgba(72, 46, 26, 0.05) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(0deg, rgba(72, 46, 26, 0.04) 0 1px, transparent 1px 5px),
      linear-gradient(150deg, #a8804f, #9a7244 55%, #83603a);
    box-shadow: inset 0 1px 0 rgba(255, 236, 200, 0.14);
  }

  .wall-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .wall-head .kicker {
    color: rgba(250, 238, 214, 0.62);
  }

  .wall-count {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(250, 238, 214, 0.5);
  }

  /* Status yang belum tuntas harus paling kelihatan di papan. */
  .pending-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 7px 10px;
    border-left: 3px solid #e0a44a;
    background: rgba(28, 18, 12, 0.32);
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f4d9a4;
  }

  .pending-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #e0a44a;
    box-shadow: 0 0 0 3px rgba(224, 164, 74, 0.18);
    animation: pending-pulse 1.9s ease-in-out infinite;
  }

  @keyframes pending-pulse {
    50% {
      box-shadow: 0 0 0 6px rgba(224, 164, 74, 0.06);
    }
  }

  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .chip {
    padding: 4px 9px;
    border: 1px solid rgba(250, 238, 214, 0.26);
    background: transparent;
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(250, 238, 214, 0.64);
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .chip:hover {
    border-color: rgba(250, 238, 214, 0.5);
  }

  .chip.active {
    border-color: #f4d9a4;
    background: rgba(244, 217, 164, 0.16);
    color: #f8eed7;
  }

  .slip-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .slip {
    position: relative;
    display: grid;
    gap: 3px;
    padding: 20px 14px 12px;
    border: none;
    background: linear-gradient(168deg, #f7eed9, #ecdcbc 62%, #ddc8a2);
    color: var(--ink);
    text-align: left;
    transform: rotate(-1.1deg);
    transition: transform 0.18s ease, filter 0.18s ease;
    clip-path: polygon(
      0 0,
      100% 0.6%,
      100% 96%,
      88% 99.4%,
      74% 96.6%,
      58% 100%,
      41% 97%,
      24% 100%,
      9% 96.8%,
      0 99.2%
    );
  }

  .slip:nth-child(even) {
    transform: rotate(0.9deg);
  }

  .slip:hover {
    transform: rotate(0deg) translateY(-3px);
    filter: brightness(1.03);
  }

  .slip:focus-visible {
    outline: 2px solid var(--vermilion);
    outline-offset: 2px;
  }

  .slip.open {
    grid-column: 1 / -1;
    transform: rotate(0deg);
  }

  .slip.pending {
    background: linear-gradient(168deg, #f7eed9, #e9d7b6 62%, #d9c29a);
    box-shadow: inset 0 0 0 1px rgba(196, 132, 47, 0.35);
  }

  .slip.pending .slip-tag {
    font-weight: 600;
    color: #8f5c17;
  }

  /* Cap miring di sudut: penanda “belum tampil” yang tidak bisa terlewat. */
  .slip-flag {
    position: absolute;
    top: 13px;
    right: 9px;
    padding: 1px 4px;
    border: 1.5px solid rgba(168, 104, 26, 0.72);
    font-family: var(--font-seal);
    font-size: 10px;
    line-height: 1.25;
    letter-spacing: 0.06em;
    color: rgba(168, 104, 26, 0.86);
    transform: rotate(7deg);
  }

  .pin {
    position: absolute;
    top: 6px;
    left: 50%;
    width: 11px;
    height: 11px;
    margin-left: -5.5px;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 28%, #ea8b7c, #a8322b 68%);
    box-shadow: 0 1px 2px rgba(30, 18, 12, 0.45), 0 0 0 1px rgba(120, 30, 26, 0.45);
  }

  .slip-name {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    padding-right: 22px;
  }

  .slip-role {
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.13em;
    color: var(--vermilion-deep);
    opacity: 0.8;
  }

  .slip-quote {
    display: -webkit-box;
    margin-top: 3px;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    font-family: var(--font-display);
    font-size: 11.5px;
    line-height: 1.55;
    color: rgba(36, 28, 22, 0.78);
  }

  .slip.open .slip-quote {
    -webkit-line-clamp: unset;
    font-size: 12.5px;
  }

  .slip-foot {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px dashed rgba(36, 28, 22, 0.2);
  }

  .slip-seal {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    background: rgba(150, 48, 42, 0.85);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 10px;
    line-height: 1;
  }

  .slip-tag {
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .wall-note {
    margin-top: 12px;
    font-size: 9.5px;
    line-height: 1.6;
    color: rgba(250, 238, 214, 0.55);
  }

  .wall-note em {
    font-style: normal;
    color: #f3d9a5;
  }

  .empty-state {
    margin: 0;
  }

  @media (max-width: 640px) {
    .slip-grid {
      grid-template-columns: 1fr;
    }

    .slip {
      transform: rotate(-0.7deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .slip,
    .pending-dot {
      animation: none;
      transition: none;
    }
  }
</style>
