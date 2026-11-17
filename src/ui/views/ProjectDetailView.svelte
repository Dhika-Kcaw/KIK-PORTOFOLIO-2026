<script>
  import { initials, isUrl, safeHref } from '../panel-utils.js'

  let { project, data, onBack, onOpenEmbed, onBlip } = $props()

  // Umpan balik hanya bisa ditulis per proyek dan selalu masuk dengan
  // `approved = 0`. Yang tampil di sini hanya yang sudah disetujui admin;
  // kiriman sesi ini ditandai “menunggu persetujuan”.
  const feedback = $derived(
    (data?.feedback ?? []).filter((item) => Number(item.project_id) === Number(project.id)),
  )
  const average = $derived(
    feedback.length
      ? feedback.reduce((total, item) => total + (Number(item.rating) || 0), 0) /
          feedback.length
      : 0,
  )

  let posted = $state([])
  let form = $state({ name: '', rating: 5, message: '' })
  let sending = $state(false)
  let status = $state('')
  let statusOk = $state(false)
  let open = $state(false)

  const notes = $derived([...posted, ...feedback])
  const messageLength = $derived(form.message.trim().length)
  const canSend = $derived(form.name.trim().length >= 2 && messageLength >= 10 && !sending)

  const PIPS = [1, 2, 3, 4, 5]

  async function sendFeedback(event) {
    event.preventDefault()
    if (!canSend) return

    sending = true
    status = ''
    statusOk = false

    const payload = {
      project_id: Number(project.id),
      name: form.name.trim(),
      rating: form.rating,
      message: form.message.trim(),
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Umpan balik gagal dikirim.')

      const stamp = Date.now()
      posted = [{ key: `lokal-${stamp}`, ...payload, pending: true }, ...posted]
      statusOk = true
      status = result.message || 'Umpan balik terkirim. Menunggu persetujuan admin.'
      form = { name: form.name, rating: form.rating, message: '' }
      open = false
      onBlip?.()
    } catch (reason) {
      statusOk = false
      status = reason?.message ?? 'Umpan balik gagal dikirim. Coba lagi.'
    } finally {
      sending = false
    }
  }

  const blocks = $derived(
    [
      { label: 'Deskripsi proyek', value: project.description },
      { label: 'Permasalahan yang ingin diselesaikan', value: project.problem },
      { label: 'Tujuan dibuatnya proyek', value: project.goal },
      { label: 'Peran dalam proyek', value: project.role },
      { label: 'Detail proyek', value: project.details },
    ].filter((block) => block.value),
  )
</script>

<div class="project-detail">
  <button class="back-link" type="button" onclick={onBack}>
    <span aria-hidden="true">←</span> Kembali ke galeri
  </button>

  <header class="detail-head">
    <p class="kicker">{project.category || 'Karya'} · {project.year || 'Tanpa tahun'}</p>
    <h3 class="display-title">{project.title}</h3>
    {#if project.summary}<p class="lede wide">{project.summary}</p>{/if}
  </header>

  <div class="detail-cover">
    {#if project.image_url}
      <img src={project.image_url} alt={`Tangkapan layar ${project.title}`} />
    {:else}
      <span class="cover-seal" aria-hidden="true">作</span>
    {/if}
  </div>

  <div class="detail-meta">
    <div><strong>Peran</strong>{project.role ? 'Terlibat langsung' : '—'}</div>
    <div><strong>Teknologi</strong>{(project.tech ?? []).length ? `${project.tech.length} alat` : '—'}</div>
    <div><strong>Fitur</strong>{(project.features ?? []).length ? `${project.features.length} fitur` : '—'}</div>
    <div><strong>Status</strong>{project.published ? 'Tampil di museum' : 'Arsip'}</div>
  </div>

  {#each blocks as block (block.label)}
    <section class="detail-block">
      <p class="kicker">{block.label}</p>
      <p>{block.value}</p>
    </section>
  {/each}

  {#if (project.tech ?? []).length}
    <section class="detail-block">
      <p class="kicker">Teknologi yang digunakan</p>
      <div class="chip-row">
        {#each project.tech as tech (tech)}<span class="chip">{tech}</span>{/each}
      </div>
    </section>
  {/if}

  {#if (project.features ?? []).length}
    <section class="detail-block">
      <p class="kicker">Fitur dalam proyek</p>
      <ul class="plain-list">
        {#each project.features as feature (feature)}<li>{feature}</li>{/each}
      </ul>
    </section>
  {/if}

  {#if project.documentation}
    <section class="detail-block">
      <p class="kicker">Dokumentasi proses pekerjaan</p>
      {#if isUrl(project.documentation)}
        <a class="button small" href={safeHref(project.documentation)} target="_blank" rel="noreferrer">
          Buka dokumentasi
        </a>
      {:else}
        <div class="doc-block">{project.documentation}</div>
      {/if}
    </section>
  {/if}

  {#if (project.gallery ?? []).length}
    <section class="detail-block">
      <p class="kicker">Galeri gambar</p>
      <div class="gallery-grid">
        {#each project.gallery as image, index (image)}
          <a href={safeHref(image)} target="_blank" rel="noreferrer">
            <img src={image} alt={`Dokumentasi ${index + 1} ${project.title}`} loading="lazy" />
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <section class="detail-block feedback" aria-label="Umpan balik pengunjung">
    <p class="kicker">Umpan balik pengunjung</p>

    <div class="score-row">
      <p class="score-main">
        <strong>{feedback.length ? average.toFixed(1) : '—'}</strong>
        <span>dari 5</span>
      </p>
      <p class="score-note">
        {#if feedback.length}
          {feedback.length} umpan balik sudah disetujui admin.
        {:else}
          Belum ada umpan balik yang disetujui untuk proyek ini.
        {/if}
      </p>
      <button
        class="button small"
        type="button"
        aria-expanded={open}
        onclick={() => {
          open = !open
          status = ''
        }}
      >
        {open ? 'Batal menulis' : 'Tulis umpan balik'}
      </button>
    </div>

    {#if notes.length}
      <ul class="feedback-list">
        {#each notes as item (item.key ?? item.id)}
          <li class="feedback-item" class:pending={item.pending}>
            <div class="feedback-top">
              <span class="quote-avatar" aria-hidden="true">{initials(item.name)}</span>
              <div class="feedback-who">
                <strong>{item.name}</strong>
                <small>{item.pending ? 'Menunggu persetujuan admin' : 'Disetujui admin'}</small>
              </div>
              <span class="pips" aria-label={`Nilai ${item.rating} dari 5`}>
                {#each PIPS as pip (pip)}
                  <i class="pip" class:on={pip <= (Number(item.rating) || 0)}></i>
                {/each}
              </span>
            </div>
            <p>{item.message}</p>
          </li>
        {/each}
      </ul>
    {/if}

    {#if open}
      <form class="feedback-form" onsubmit={sendFeedback}>
        <div class="field">
          <label for="feedback-name">Nama</label>
          <input
            id="feedback-name"
            bind:value={form.name}
            required
            minlength="2"
            maxlength="80"
            placeholder="Nama kamu"
            autocomplete="name"
          />
        </div>

        <fieldset class="rating-field">
          <legend>Nilai proyek ini</legend>
          <div class="rating-buttons">
            {#each PIPS as value (value)}
              <button
                class="rating-btn"
                class:active={form.rating === value}
                type="button"
                aria-pressed={form.rating === value}
                aria-label={`Nilai ${value} dari 5`}
                onclick={() => (form.rating = value)}
              >
                <i class="pip" class:on={value <= form.rating}></i>
                <span>{value}</span>
              </button>
            {/each}
          </div>
        </fieldset>

        <div class="field">
          <label for="feedback-message">Umpan balik</label>
          <textarea
            id="feedback-message"
            bind:value={form.message}
            required
            minlength="10"
            maxlength="800"
            rows="4"
            placeholder="Apa yang sudah berjalan baik, dan apa yang bisa ditingkatkan?"
          ></textarea>
          <p class="ink-count" class:enough={messageLength >= 10}>
            {messageLength} / 800 karakter{messageLength < 10 ? ' · minimal 10' : ''}
          </p>
        </div>

        <div class="feedback-actions">
          <button class="button primary" type="submit" disabled={!canSend}>
            {sending ? 'Mengirim…' : 'Kirim umpan balik'}
          </button>
          <p class="feedback-note">
            Umpan balik tampil di sini setelah disetujui admin di dashboard, jadi tidak ada
            kiriman yang langsung terbit.
          </p>
        </div>
      </form>
    {/if}

    {#if status}
      <p class="form-status" class:ok={statusOk} role="status">{status}</p>
    {/if}
  </section>

  <div class="action-row">
    {#if project.demo_url}
      <button class="button primary" type="button" onclick={() => onOpenEmbed?.(project)}>
        Uji demo di museum <span aria-hidden="true">↗</span>
      </button>
      <a class="button" href={safeHref(project.demo_url)} target="_blank" rel="noreferrer">Buka tab baru</a>
    {/if}
    {#if project.repo_url}
      <a class="button" href={safeHref(project.repo_url)} target="_blank" rel="noreferrer">Source code GitHub</a>
    {/if}
    {#if !project.demo_url && !project.repo_url}
      <p class="empty-line">Tautan demo dan repositori belum diisi.</p>
    {/if}
  </div>
</div>

<style>
  .project-detail {
    padding-top: 2px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.2);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.6);
  }

  .back-link:hover {
    color: var(--vermilion-deep);
    border-bottom-color: rgba(178, 58, 48, 0.4);
  }

  .detail-head {
    margin-bottom: 14px;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
    margin-top: 9px;
  }

  .gallery-grid a {
    display: block;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border: 1px solid rgba(36, 28, 22, 0.14);
  }

  .gallery-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 8px;
    padding: 9px 11px;
    border: 1px solid rgba(36, 28, 22, 0.14);
    background: rgba(255, 251, 241, 0.42);
  }

  .score-main {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .score-main strong {
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1;
  }

  .score-main span {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .score-note {
    flex: 1 1 160px;
    font-size: 10px;
    line-height: 1.5;
    color: rgba(36, 28, 22, 0.55);
  }

  .feedback-list {
    display: grid;
    gap: 8px;
    margin-top: 9px;
    padding: 0;
    list-style: none;
  }

  .feedback-item {
    padding: 10px 11px;
    border: 1px solid rgba(36, 28, 22, 0.14);
    background: rgba(255, 251, 241, 0.42);
  }

  /* Kiriman yang belum disetujui tetap terlihat, tetapi jelas belum terbit. */
  .feedback-item.pending {
    border-style: dashed;
    border-color: rgba(196, 132, 47, 0.55);
    background: rgba(244, 226, 190, 0.42);
  }

  .feedback-item.pending small {
    color: #8f5c17;
  }

  .feedback-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .feedback-who {
    flex: 1 1 auto;
    min-width: 0;
  }

  .feedback-top strong {
    display: block;
    font-size: 11px;
    font-weight: 600;
  }

  .feedback-top small {
    display: block;
    font-family: var(--font-mono);
    font-size: 8px;
    color: rgba(36, 28, 22, 0.45);
  }

  .pips {
    display: inline-flex;
    gap: 2px;
    flex: 0 0 auto;
  }

  .pip {
    width: 7px;
    height: 7px;
    border: 1px solid rgba(150, 48, 42, 0.5);
  }

  .pip.on {
    background: var(--vermilion, #96302a);
    border-color: var(--vermilion, #96302a);
  }

  .feedback-item > p {
    margin-top: 7px;
    font-family: var(--font-display);
    font-size: 11.5px;
    line-height: 1.55;
    color: rgba(36, 28, 22, 0.72);
  }

  .feedback-form {
    display: grid;
    gap: 10px;
    margin-top: 10px;
    padding: 12px;
    border: 1px solid rgba(36, 28, 22, 0.16);
    background: rgba(255, 251, 241, 0.55);
  }

  .rating-field {
    margin: 0;
    padding: 0;
    border: none;
  }

  .rating-field legend {
    padding: 0;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .rating-buttons {
    display: flex;
    gap: 5px;
    margin-top: 5px;
  }

  .rating-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 30px;
    padding: 0 8px;
    border: 1px solid rgba(36, 28, 22, 0.2);
    background: transparent;
    font-family: var(--font-mono);
    font-size: 9px;
    color: rgba(36, 28, 22, 0.55);
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .rating-btn:hover {
    border-color: rgba(150, 48, 42, 0.45);
  }

  .rating-btn.active {
    border-color: var(--vermilion, #96302a);
    background: rgba(150, 48, 42, 0.09);
    color: var(--ink);
  }

  .rating-btn:focus-visible {
    outline: 2px solid var(--vermilion, #96302a);
    outline-offset: 1px;
  }

  .ink-count {
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.08em;
    color: rgba(36, 28, 22, 0.4);
  }

  .ink-count.enough {
    color: rgba(36, 28, 22, 0.55);
  }

  .feedback-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .feedback-note {
    flex: 1 1 200px;
    font-size: 9.5px;
    line-height: 1.55;
    color: rgba(36, 28, 22, 0.5);
  }

  @media (max-width: 700px) {
    .gallery-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (pointer: coarse) {
    .rating-btn {
      min-height: 44px;
      padding: 0 12px;
    }
  }
</style>
