<script>
  import { TYPE_LABEL } from '../panel-utils.js'
  import TestimonialsView from './TestimonialsView.svelte'

  let { data, onBlip, onPosted, onClose } = $props()

  /** Cap kategori dipakai di kertas dan tombol, bukan dropdown. */
  const SEAL = { teacher: '師', friend: '友', user: '客', internship: '職' }
  const CATEGORIES = ['teacher', 'friend', 'user', 'internship'].map((key) => ({
    key,
    label: TYPE_LABEL[key] ?? key,
    seal: SEAL[key],
  }))

  // Papan di dunia 3D memuat 8 kertas, tetapi panel ini menampilkan seluruh
  // arsip yang sudah disetujui supaya tidak ada testimoni yang tak terbaca.
  const approved = $derived(data?.testimonials ?? [])

  let step = $state('idle')
  let posted = $state([])
  let form = $state({ name: '', type: 'friend', quote: '' })
  let sending = $state(false)
  let status = $state('')
  let statusOk = $state(false)

  const quoteLength = $derived(form.quote.trim().length)
  const canPost = $derived(form.name.trim().length >= 2 && quoteLength >= 10 && !sending)

  function click() {
    onBlip?.()
  }

  function takeSheet() {
    click()
    step = 'write'
    status = ''
  }

  function pickType(key) {
    click()
    form.type = key
  }

  function backToBoard() {
    click()
    step = 'idle'
  }

  async function submit(event) {
    event.preventDefault()
    if (!canPost) return

    sending = true
    status = ''
    statusOk = false

    const payload = {
      name: form.name.trim(),
      role: '',
      organization: '',
      type: form.type,
      quote: form.quote.trim(),
    }

    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Testimoni gagal dikirim.')

      const stamp = Date.now()
      posted = [
        {
          key: `lokal-${stamp}`,
          id: stamp,
          name: payload.name,
          type: payload.type,
          quote: payload.quote,
          pending: true,
        },
        ...posted,
      ]
      statusOk = true
      status = result.message || 'Kertas sudah dipaku. Menunggu persetujuan admin.'
      step = 'done'
      // Kertas langsung ikut dipaku di papan 3D, jadi hasilnya terlihat begitu
      // panel ditutup.
      onPosted?.({ ...payload, id: stamp })
    } catch (reason) {
      statusOk = false
      status = reason?.message ?? 'Kertas gagal ditempel. Coba lagi.'
    } finally {
      sending = false
    }
  }
</script>

<div class="board">
  <TestimonialsView testimonials={approved} pending={posted} onBlip={onBlip} />

  <section class="desk">
    {#if step === 'idle'}
      <div class="take">
        <span class="stack" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <div class="take-copy">
          <p class="kicker">Lembar kosong</p>
          <h4>Ambil selembar kertas</h4>
          <p class="lede">
            Tulis namamu, pilih satu cap kategori, lalu tuliskan kesanmu. Kertas yang sudah dipaku
            menunggu ditinjau admin sebelum tampil di museum.
          </p>
          <button class="take-btn" type="button" onclick={takeSheet}>
            Ambil kertas
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    {:else if step === 'write'}
      <form class="blank" onsubmit={submit}>
        <p class="kicker">Kertas baru</p>

        <div class="line-field">
          <label for="note-name">Nama</label>
          <input
            id="note-name"
            bind:value={form.name}
            required
            minlength="2"
            maxlength="80"
            placeholder="Nama kamu"
            autocomplete="name"
          />
        </div>

        <fieldset class="seal-row">
          <legend>Cap kategori</legend>
          <div class="seal-buttons">
            {#each CATEGORIES as category (category.key)}
              <button
                type="button"
                class="seal-btn"
                class:active={form.type === category.key}
                aria-pressed={form.type === category.key}
                onclick={() => pickType(category.key)}
              >
                <span class="glyph" aria-hidden="true">{category.seal}</span>
                <span class="cap">{category.label}</span>
              </button>
            {/each}
          </div>
        </fieldset>

        <div class="line-field">
          <label for="note-quote">Kesanmu</label>
          <textarea
            id="note-quote"
            bind:value={form.quote}
            required
            minlength="10"
            maxlength="800"
            rows="5"
            placeholder="Apa yang paling kamu ingat dari museum ini?"
          ></textarea>
          <div class="ink-meter" aria-hidden="true">
            <span style={`width: ${Math.min(100, (quoteLength / 800) * 100)}%`}></span>
          </div>
          <p class="ink-count" class:enough={quoteLength >= 10}>
            {quoteLength} karakter {quoteLength < 10 ? '· tulis minimal 10' : ''}
          </p>
        </div>

        <div class="blank-actions">
          <button class="pin-btn" type="submit" disabled={!canPost}>
            <span class="pin-dot" aria-hidden="true"></span>
            {sending ? 'Menempel…' : 'Tempelkan di papan'}
          </button>
          <button class="link-btn" type="button" onclick={backToBoard}>Kembalikan kertas</button>
        </div>

        {#if status && !statusOk}
          <p class="form-status" role="status">{status}</p>
        {/if}
      </form>
    {:else}
      <div class="blank done">
        <span class="stamp" aria-hidden="true">待審</span>
        <p class="kicker">Status kiriman</p>
        <h4>Kertas sudah dipaku, tetapi belum tampil</h4>
        <p class="lede">
          Siapa pun yang membuka museum belum bisa membaca kertas ini. Admin meninjaunya dulu di
          dashboard — setelah disetujui, kertasnya kehilangan cap 待審 dan namamu hadir sebagai
          pengunjung museum.
        </p>

        <ol class="status-steps">
          <li class="step ok">
            <span class="step-dot" aria-hidden="true">1</span>
            <span class="step-copy">
              <strong>Ditempel di papan</strong>
              <small>selesai — kertasnya sudah ada di papan</small>
            </span>
          </li>
          <li class="step now" aria-current="step">
            <span class="step-dot" aria-hidden="true">2</span>
            <span class="step-copy">
              <strong>Menunggu persetujuan admin</strong>
              <small>sedang berjalan — belum tampil untuk pengunjung</small>
            </span>
          </li>
          <li class="step">
            <span class="step-dot" aria-hidden="true">3</span>
            <span class="step-copy">
              <strong>Tampil di museum</strong>
              <small>otomatis setelah disetujui</small>
            </span>
          </li>
        </ol>

        <p class="status-note">
          Kertas bertanda <em>待審</em> hanya bertahan selama museum belum dimuat ulang. Jangan
          khawatir: kirimanmu tetap tersimpan dan tetap bisa disetujui admin.
        </p>

        <div class="blank-actions">
          <button class="take-btn" type="button" onclick={() => (click(), onClose?.())}>
            Tutup dan lihat papannya
          </button>
          <button
            class="link-btn"
            type="button"
            onclick={() => {
              click()
              form = { name: '', type: form.type, quote: '' }
              status = ''
              step = 'write'
            }}
          >
            Tulis kertas lain
          </button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .board {
    display: grid;
    gap: 18px;
  }

  .kicker {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  /* ---------------------------------------------------------------- */
  /*  Meja tulis                                                       */
  /* ---------------------------------------------------------------- */

  .take {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .stack {
    position: relative;
    width: 62px;
    height: 78px;
    flex: 0 0 auto;
    margin-top: 4px;
  }

  .stack i {
    position: absolute;
    inset: 0;
    background: linear-gradient(165deg, #f4e8cd, #dcc7a1);
    border: 1px solid rgba(36, 28, 22, 0.18);
    box-shadow: 0 6px 12px -10px rgba(36, 28, 22, 0.8);
  }

  .stack i:nth-child(1) {
    transform: rotate(-3deg) translate(-2px, 2px);
    opacity: 0.7;
  }

  .stack i:nth-child(2) {
    transform: rotate(2deg) translate(1px, -1px);
    opacity: 0.85;
  }

  .stack i:nth-child(3) {
    transform: rotate(-0.6deg);
  }

  .take-copy h4,
  .blank h4 {
    margin-top: 3px;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }

  .take-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 14px;
    border: 1px solid rgba(150, 48, 42, 0.55);
    background: rgba(150, 48, 42, 0.06);
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--vermilion-deep);
    transition: background 0.16s ease, color 0.16s ease;
  }

  .take-btn:hover {
    background: var(--vermilion);
    color: #f8eed7;
  }

  .blank {
    position: relative;
    padding: 18px 20px 20px;
    background: linear-gradient(172deg, #f7eed9, #ecdcbc 60%, #e0cba6);
    box-shadow: 0 16px 28px -24px rgba(36, 28, 22, 0.9), 0 1px 0 rgba(255, 255, 255, 0.5) inset;
    transform: rotate(-0.35deg);
    animation: sheet-in 0.26s ease both;
  }

  @keyframes sheet-in {
    from {
      opacity: 0;
      transform: translateY(10px) rotate(-1.6deg);
    }
    to {
      opacity: 1;
      transform: translateY(0) rotate(-0.35deg);
    }
  }

  .line-field {
    margin-top: 14px;
  }

  .line-field label,
  .seal-row legend {
    display: block;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.48);
  }

  .line-field input,
  .line-field textarea {
    width: 100%;
    padding: 6px 2px;
    border: none;
    border-bottom: 1px dashed rgba(36, 28, 22, 0.28);
    background: transparent;
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    border-radius: 0;
  }

  .line-field textarea {
    margin-top: 4px;
    border: 1px solid rgba(36, 28, 22, 0.16);
    padding: 8px 10px;
    font-size: 13px;
    line-height: 26px;
    resize: vertical;
    background-image: repeating-linear-gradient(
      180deg,
      transparent 0 25px,
      rgba(36, 28, 22, 0.07) 25px 26px
    );
  }

  .line-field input::placeholder,
  .line-field textarea::placeholder {
    color: rgba(36, 28, 22, 0.32);
  }

  .line-field input:focus,
  .line-field textarea:focus {
    border-color: rgba(150, 48, 42, 0.55);
  }

  .ink-meter {
    height: 1.5px;
    margin-top: 7px;
    background: rgba(36, 28, 22, 0.1);
  }

  .ink-meter span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, rgba(150, 48, 42, 0.5), var(--vermilion));
    transition: width 0.12s linear;
  }

  .ink-count {
    margin-top: 5px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.08em;
    color: rgba(36, 28, 22, 0.4);
  }

  .ink-count.enough {
    color: rgba(78, 122, 94, 0.9);
  }

  .seal-row {
    margin: 14px 0 0;
    padding: 0;
    border: none;
  }

  .seal-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 7px;
  }

  .seal-btn {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 58px;
    padding: 6px 8px 5px;
    border: 1px solid rgba(36, 28, 22, 0.22);
    background: transparent;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .seal-btn .glyph {
    font-family: var(--font-seal);
    font-size: 18px;
    line-height: 1.1;
    color: rgba(36, 28, 22, 0.55);
  }

  .seal-btn .cap {
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.42);
  }

  .seal-btn:hover {
    border-color: rgba(150, 48, 42, 0.45);
  }

  .seal-btn.active {
    border-color: var(--vermilion);
    background: var(--vermilion);
  }

  .seal-btn.active .glyph {
    color: #f8eed7;
  }

  .seal-btn.active .cap {
    color: rgba(248, 238, 215, 0.78);
  }

  .blank-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .pin-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 9px 16px 9px 12px;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: filter 0.16s ease;
  }

  .pin-btn:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .pin-btn:disabled {
    background: rgba(36, 28, 22, 0.22);
    color: rgba(248, 238, 215, 0.7);
    cursor: not-allowed;
  }

  .pin-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 28%, #ffb9ab, #7d241f 70%);
    box-shadow: 0 0 0 1px rgba(120, 30, 26, 0.5);
  }

  .link-btn {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.48);
    border-bottom: 1px solid rgba(36, 28, 22, 0.2);
    padding-bottom: 1px;
  }

  .link-btn:hover {
    color: var(--vermilion-deep);
    border-bottom-color: rgba(150, 48, 42, 0.45);
  }

  .form-status {
    margin-top: 10px;
    font-size: 11px;
    color: var(--vermilion-deep);
  }

  .done .lede {
    padding-right: 0;
  }

  .done h4 {
    padding-right: 66px;
  }

  .stamp {
    position: absolute;
    top: 14px;
    right: 16px;
    padding: 5px 12px;
    border: 2.5px solid rgba(150, 48, 42, 0.6);
    font-family: var(--font-seal);
    font-size: 22px;
    letter-spacing: 0.16em;
    color: rgba(150, 48, 42, 0.78);
    transform: rotate(-11deg);
    animation: stamp-in 0.4s ease both;
  }

  @keyframes stamp-in {
    from {
      opacity: 0;
      transform: rotate(-11deg) scale(1.7);
    }
    to {
      opacity: 1;
      transform: rotate(-11deg) scale(1);
    }
  }

  .status-steps {
    display: grid;
    gap: 0;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
    border-top: 1px dashed rgba(36, 28, 22, 0.16);
  }

  .step:first-child {
    border-top: 1px solid rgba(36, 28, 22, 0.16);
  }

  .step-dot {
    display: grid;
    place-items: center;
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
    border: 1px solid rgba(36, 28, 22, 0.26);
    font-family: var(--font-mono);
    font-size: 8.5px;
    color: rgba(36, 28, 22, 0.5);
  }

  .step.ok .step-dot {
    border-color: rgba(78, 122, 94, 0.55);
    background: rgba(78, 122, 94, 0.14);
    color: #3f6349;
  }

  .step.now .step-dot {
    border-color: rgba(168, 104, 26, 0.7);
    background: rgba(196, 132, 47, 0.18);
    color: #8f5c17;
  }

  .step-copy {
    display: grid;
    gap: 1px;
  }

  .step-copy strong {
    font-size: 11.5px;
    font-weight: 600;
    color: rgba(36, 28, 22, 0.78);
  }

  .step.now .step-copy strong {
    color: #7c4f11;
  }

  .step-copy small {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.05em;
    color: rgba(36, 28, 22, 0.42);
  }

  .status-note {
    margin-top: 12px;
    padding: 8px 10px;
    border-left: 2px solid rgba(196, 132, 47, 0.6);
    background: rgba(196, 132, 47, 0.08);
    font-size: 10px;
    line-height: 1.6;
    color: rgba(36, 28, 22, 0.62);
  }

  .status-note em {
    font-style: normal;
    color: #8f5c17;
  }

  @media (max-width: 640px) {
    .take {
      flex-direction: column;
      gap: 10px;
    }

    .stack {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blank,
    .stamp {
      animation: none;
      transition: none;
    }
  }
</style>
