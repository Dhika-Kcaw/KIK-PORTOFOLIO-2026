<script>
  import { fade, fly } from 'svelte/transition'
  import { SECTION_ORDER, SECTIONS } from '../content/museum.js'

  let { data, onClose, onVisit } = $props()

  let tab = $state('sections')
  let query = $state('')

  const projects = $derived(data?.projects ?? [])
  const testimonials = $derived(data?.testimonials ?? [])
  const sections = $derived(
    SECTION_ORDER.map((key) => ({ key, ...SECTIONS[key] })).filter((section) => {
      if (!query.trim()) return true
      const haystack = `${section.label} ${section.description} ${section.subtitle}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    }),
  )
  const filteredProjects = $derived(
    projects.filter((project) =>
      `${project.title} ${project.category} ${project.year} ${(project.tech ?? []).join(' ')}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ),
  )
  const filteredTestimonials = $derived(
    testimonials.filter((testimonial) =>
      `${testimonial.name} ${testimonial.role} ${testimonial.type}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ),
  )

  const counts = $derived({
    projects: projects.length,
    testimonials: testimonials.length,
  })

  function openSection(key) {
    onVisit?.({ type: 'section', key })
  }
</script>

<div
  class="index-backdrop"
  role="presentation"
  transition:fade={{ duration: 150 }}
  onclick={(event) => {
    // Hanya klik latar yang menutup indeks; klik di dalam lembar tidak.
    if (event.target === event.currentTarget) onClose()
  }}
>
  <div
    class="index-sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="index-title"
    tabindex="-1"
    transition:fly={{ y: 18, duration: 210, opacity: 0.2 }}
  >
    <span class="rod rod-top" aria-hidden="true"></span>
    <span class="rod rod-bottom" aria-hidden="true"></span>

    <header class="head">
      <div class="title-wrap">
        <span class="seal" aria-hidden="true">引</span>
        <div>
          <p class="eyebrow">Indeks koleksi</p>
          <h2 id="index-title">Museum</h2>
          <p class="sub">
            {data?.profile?.name ?? 'Portofolio'} · pilih tujuan, karakter akan berjalan ke sana
          </p>
        </div>
      </div>
      <button class="close" type="button" onclick={onClose}>Tutup <span aria-hidden="true">×</span></button>
    </header>

    <div class="toolbar">
      <div class="tabs" role="group" aria-label="Jenis indeks">
        <button class:active={tab === 'sections'} type="button" onclick={() => (tab = 'sections')}>
          Bagian
        </button>
        <button class:active={tab === 'projects'} type="button" onclick={() => (tab = 'projects')}>
          Proyek <span class="count">{counts.projects}</span>
        </button>
        <button class:active={tab === 'testimonials'} type="button" onclick={() => (tab = 'testimonials')}>
          Pengunjung <span class="count">{counts.testimonials}</span>
        </button>
      </div>
      <input
        type="search"
        bind:value={query}
        placeholder="Cari bagian, proyek, atau nama…"
        aria-label="Cari di indeks museum"
      />
    </div>

    <div class="body">
      {#if tab === 'sections'}
        <div class="section-grid">
          {#each sections as section (section.key)}
            <button class="section-row" type="button" onclick={() => openSection(section.key)}>
              <span class="section-seal" aria-hidden="true">{section.seal}</span>
              <span class="section-copy">
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
              <span class="section-arrow" aria-hidden="true">→</span>
            </button>
          {/each}
          {#if sections.length === 0}<p class="empty">Tidak ada bagian yang cocok.</p>{/if}
        </div>
      {:else if tab === 'projects'}
        <div class="card-grid">
          {#each filteredProjects as project (project.id)}
            <button class="project-card" type="button" onclick={() => onVisit?.({ type: 'project', id: project.id })}>
              <span class="project-thumb">
                {#if project.image_url}
                  <img src={project.image_url} alt="" />
                {:else}
                  <span class="thumb-seal" aria-hidden="true">作</span>
                {/if}
              </span>
              <span class="project-copy">
                <small>{project.year} · {project.category}</small>
                <strong>{project.title}</strong>
                <span>{project.summary || project.description}</span>
              </span>
            </button>
          {/each}
          {#if filteredProjects.length === 0}<p class="empty">Tidak ada proyek yang cocok.</p>{/if}
        </div>
      {:else}
        <div class="visitor-grid">
          {#each filteredTestimonials as testimonial (testimonial.id)}
            <button class="visitor-card" type="button" onclick={() => onVisit?.({ type: 'testimonial', id: testimonial.id })}>
              <span class="visitor-avatar">
                {#if testimonial.avatar_url}
                  <img src={testimonial.avatar_url} alt="" />
                {:else}
                  {testimonial.name?.slice(0, 1) ?? '客'}
                {/if}
              </span>
              <span class="visitor-copy">
                <strong>{testimonial.name}</strong>
                <small>{testimonial.role} · {testimonial.organization}</small>
                <span>“{testimonial.quote}”</span>
              </span>
            </button>
          {/each}
          {#if filteredTestimonials.length === 0}<p class="empty">Belum ada testimoni yang tampil.</p>{/if}
        </div>
      {/if}
    </div>

    <footer class="foot">
      <p>Pilih tujuan untuk didatangi. Panel terbuka setelah karakter tiba di sana.</p>
      <button class="enter" type="button" onclick={onClose}>Kembali ke museum</button>
    </footer>
  </div>
</div>

<style>
  .index-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(14, 10, 8, 0.7);
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
  }

  .index-sheet {
    position: relative;
    width: min(880px, 100%);
    max-height: min(90vh, 780px);
    max-height: min(90dvh, 780px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(36, 28, 22, 0.48);
    border-radius: 2px;
    background:
      repeating-linear-gradient(90deg, rgba(112, 84, 46, 0.035) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(0deg, rgba(112, 84, 46, 0.022) 0 1px, transparent 1px 4px),
      radial-gradient(120% 130% at 28% 8%, #f7eedb 0%, #ecdcbd 52%, #dcc8a3 100%);
    color: var(--ink);
    box-shadow:
      0 28px 70px rgba(0, 0, 0, 0.5),
      inset 0 0 0 6px rgba(248, 238, 216, 0.32),
      inset 0 0 0 7px rgba(36, 28, 22, 0.12);
  }

  .rod {
    position: absolute;
    left: -7px;
    width: 7px;
    height: 104px;
    border-radius: 3px 0 0 3px;
    background: linear-gradient(90deg, #2c2018, #493626);
  }

  .rod-top {
    top: 18%;
  }

  .rod-bottom {
    bottom: 18%;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 24px 30px 16px;
  }

  .title-wrap {
    display: flex;
    gap: 13px;
    min-width: 0;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    margin-top: 2px;
    border: 1px solid rgba(255, 244, 220, 0.36);
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 18px;
    transform: rotate(-2deg);
  }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.5);
  }

  h2 {
    margin-top: 3px;
    font-family: var(--font-display);
    font-size: clamp(25px, 3.4vw, 34px);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.025em;
  }

  .sub {
    margin-top: 5px;
    font-size: 11px;
    color: rgba(36, 28, 22, 0.58);
  }

  .close {
    flex: 0 0 auto;
    padding: 4px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.28);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.62);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 30px 14px;
    border-bottom: 1px dashed rgba(36, 28, 22, 0.2);
  }

  .tabs {
    display: flex;
    gap: 4px;
  }

  .tabs button {
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: 2px;
    font-size: 10.5px;
    color: rgba(36, 28, 22, 0.54);
  }

  .tabs button:hover {
    background: rgba(36, 28, 22, 0.05);
    color: var(--ink);
  }

  .tabs button.active {
    border-color: rgba(36, 28, 22, 0.26);
    background: rgba(36, 28, 22, 0.065);
    color: var(--ink);
  }

  .count {
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 8px;
    color: rgba(36, 28, 22, 0.45);
  }

  .toolbar input {
    flex: 1;
    min-width: 100px;
    max-width: 290px;
    margin-left: auto;
    min-height: 32px;
    padding: 6px 10px;
    border: 1px solid rgba(36, 28, 22, 0.2);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.55);
    font: inherit;
    font-size: 11.5px;
    color: var(--ink);
    outline: none;
  }

  .toolbar input:focus {
    border-color: var(--vermilion);
  }

  .body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 30px 20px;
  }

  .section-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .section-row {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 66px;
    padding: 9px 10px;
    border: 1px solid rgba(36, 28, 22, 0.14);
    background: rgba(255, 251, 241, 0.4);
    text-align: left;
    transition:
      background 0.14s ease,
      border-color 0.14s ease;
  }

  .section-row:hover {
    border-color: rgba(178, 58, 48, 0.36);
    background: rgba(255, 252, 246, 0.7);
  }

  .section-seal {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    border: 1px solid rgba(178, 58, 48, 0.28);
    color: var(--vermilion);
    font-family: var(--font-seal);
    font-size: 12px;
  }

  .section-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .section-copy strong {
    font-size: 12px;
    font-weight: 600;
  }

  .section-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    color: rgba(36, 28, 22, 0.5);
  }

  .section-arrow {
    margin-left: auto;
    font-size: 12px;
    color: rgba(36, 28, 22, 0.3);
  }

  .card-grid,
  .visitor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .project-card,
  .visitor-card {
    display: flex;
    gap: 11px;
    padding: 9px;
    border: 1px solid rgba(36, 28, 22, 0.14);
    background: rgba(255, 251, 241, 0.4);
    text-align: left;
  }

  .project-card:hover,
  .visitor-card:hover {
    border-color: rgba(178, 58, 48, 0.34);
    background: rgba(255, 252, 246, 0.7);
  }

  .project-thumb {
    display: grid;
    place-items: center;
    width: 82px;
    height: 62px;
    flex: 0 0 auto;
    overflow: hidden;
    background: rgba(36, 28, 22, 0.08);
  }

  .project-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-seal {
    color: rgba(178, 58, 48, 0.5);
    font-family: var(--font-seal);
    font-size: 22px;
  }

  .project-copy,
  .visitor-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .project-copy small,
  .visitor-copy small {
    font-family: var(--font-mono);
    font-size: 8.5px;
    color: rgba(36, 28, 22, 0.46);
  }

  .project-copy strong,
  .visitor-copy strong {
    font-size: 12px;
    font-weight: 600;
  }

  .project-copy span,
  .visitor-copy span {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: 10.5px;
    line-height: 1.45;
    color: rgba(36, 28, 22, 0.6);
  }

  .visitor-avatar {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    border: 1px solid rgba(36, 28, 22, 0.16);
    background: rgba(178, 58, 48, 0.1);
    color: var(--vermilion-deep);
    font-family: var(--font-display);
    font-size: 18px;
  }

  .visitor-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    grid-column: 1 / -1;
    padding: 28px 0;
    text-align: center;
    color: rgba(36, 28, 22, 0.5);
    font-size: 12px;
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 30px 18px;
    border-top: 1px dashed rgba(36, 28, 22, 0.2);
  }

  .foot p {
    font-size: 10px;
    color: rgba(36, 28, 22, 0.48);
  }

  .enter {
    flex: 0 0 auto;
    padding: 8px 13px;
    border: 1px solid var(--vermilion-deep);
    border-radius: 2px;
    background: var(--vermilion);
    color: #f8eed7;
    font-size: 10.5px;
    font-weight: 600;
  }

  /* Layar sentuh: baris dan tab dinaikkan ke ukuran sasaran jari. */
  @media (pointer: coarse) {
    .close {
      padding: 9px 4px;
    }
    .tabs button {
      min-height: 42px;
      padding: 0 12px;
      font-size: 11px;
    }
    .toolbar input {
      min-height: 44px;
      font-size: 13px;
    }
    .section-row {
      min-height: 74px;
      padding: 11px 12px;
    }
    .section-copy strong {
      font-size: 13px;
    }
    .section-copy small {
      font-size: 11px;
    }
  }

  @media (max-width: 700px) {
    .index-backdrop {
      padding: 10px;
    }

    .index-sheet {
      max-height: 94vh;
      max-height: 94dvh;
    }

    .head,
    .toolbar,
    .body,
    .foot {
      padding-left: 18px;
      padding-right: 18px;
    }

    .section-grid,
    .card-grid,
    .visitor-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-wrap: wrap;
    }

    .toolbar input {
      flex: 1 1 100%;
      max-width: none;
      margin-left: 0;
    }

    .foot p {
      display: none;
    }

    .enter {
      width: 100%;
    }
  }

  @media (max-width: 460px) {
    .sub {
      display: none;
    }

    .head {
      padding-top: 18px;
    }

    .tabs button {
      padding: 0 7px;
    }
  }
</style>
