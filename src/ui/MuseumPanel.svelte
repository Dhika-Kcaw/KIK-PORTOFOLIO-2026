<script>
  import { fade, fly } from 'svelte/transition'
  import { SECTIONS } from '../content/museum.js'
  import './views/views.css'
  import HomeView from './views/HomeView.svelte'
  import AboutView from './views/AboutView.svelte'
  import SkillsView from './views/SkillsView.svelte'
  import ProjectsView from './views/ProjectsView.svelte'
  import ProjectDetailView from './views/ProjectDetailView.svelte'
  import CertificatesView from './views/CertificatesView.svelte'
  import ExperienceView from './views/ExperienceView.svelte'
  import CvView from './views/CvView.svelte'
  import ContactView from './views/ContactView.svelte'
  import BlogView from './views/BlogView.svelte'
  import BoardView from './views/BoardView.svelte'

  let { view, data, onClose, onNavigate, onOpenEmbed, onBlip, onBoardPost } = $props()

  const profile = $derived(data?.profile ?? {})
  const sectionKey = $derived(
    view?.type === 'section'
      ? view.key
      : view?.type === 'project'
        ? 'projects'
        : 'testimonials',
  )
  const section = $derived(SECTIONS[sectionKey] ?? SECTIONS.home)
  // Detail proyek hanya terbuka ketika pemain mendatangi bingkai proyeknya.
  const project = $derived(
    view?.type === 'project'
      ? (data?.projects ?? []).find((item) => item.id === view.id) ?? null
      : null,
  )
  const showProjectDetail = $derived(view?.type === 'project')

  function backToGallery() {
    onBlip?.()
    onNavigate?.({ type: 'section', key: 'projects' })
  }

  function close() {
    onClose?.()
  }
</script>

<div class="panel-backdrop" transition:fade={{ duration: 140 }} role="presentation" onclick={(event) => {
  if (event.target === event.currentTarget) close()
}}>
  <div
    class="panel-sheet"
    class:wide={sectionKey === 'cv'}
    role="dialog"
    aria-modal="false"
    aria-labelledby="panel-title"
    tabindex="-1"
    transition:fly={{ x: 40, duration: 240, opacity: 0.3 }}
  >
    <span class="rod" aria-hidden="true"></span>

    <header class="panel-head">
      <div class="head-top">
        <button class="back" type="button" onclick={close}>
          <span aria-hidden="true">←</span> Kembali ke museum
        </button>
        <button class="close" type="button" onclick={close} aria-label="Tutup panel">×</button>
      </div>

      <div class="title-wrap">
        <span class="seal" aria-hidden="true">{section.seal}</span>
        <div class="title-copy">
          <p class="eyebrow">{section.eyebrow || 'Museum Wangsheng'}</p>
          <h2 id="panel-title">{project ? project.title : section.label}</h2>
          <p class="sub">
            {#if project}
              {[project.year, project.category].filter(Boolean).join(' · ') || section.subtitle}
            {:else}
              {section.subtitle}
            {/if}
          </p>
        </div>
      </div>
    </header>

    <div class="panel-body views">
      {#key view?.type === 'project' ? `project-${view.id}` : sectionKey}
        <div class="panel-page" in:fly={{ y: 10, duration: 190, opacity: 0 }}>
          <!-- Satu view yang gagal dimuat tidak boleh mematikan museum: galatnya
               ditangkap di sini lalu ditampilkan sebagai lembar pesan. -->
          <svelte:boundary>
            {#snippet failed(error, reset)}
              <div class="panel-error" role="alert">
                <p class="eyebrow">Panel gagal dimuat</p>
                <h3>{section.label}</h3>
                <p class="galat">{error?.message ?? String(error)}</p>
                <p class="petunjuk">
                  Tutup panel lalu buka kembali. Bila tetap gagal, salin pesan di atas.
                </p>
                <button class="coba" type="button" onclick={reset}>Coba muat ulang</button>
              </div>
            {/snippet}
          {#if showProjectDetail}
            {#if project}
              <ProjectDetailView
                {project}
                {data}
                onBack={backToGallery}
                onOpenEmbed={onOpenEmbed}
                onBlip={onBlip}
              />
            {:else}
              <p class="empty-state">Proyek tidak ditemukan. Kembali ke galeri untuk memilih karya lain.</p>
            {/if}
          {:else if sectionKey === 'home'}
            <HomeView {profile} {data} onNavigate={onNavigate} />
          {:else if sectionKey === 'about'}
            <AboutView {profile} {data} />
          {:else if sectionKey === 'skills'}
            <SkillsView {data} />
          {:else if sectionKey === 'projects'}
            <ProjectsView
              {data}
              onOpenProject={(id) => onNavigate?.({ type: 'project', id })}
            />
          {:else if sectionKey === 'certificates'}
            <CertificatesView {data} />
          {:else if sectionKey === 'experience'}
            <ExperienceView {data} />
          {:else if sectionKey === 'cv'}
            <CvView {profile} {data} />
          {:else if sectionKey === 'contact'}
            <ContactView {profile} />
          {:else if sectionKey === 'blog'}
            <BlogView {data} onBlip={onBlip} />
          {:else if sectionKey === 'testimonials'}
            <BoardView
              {data}
              onBlip={onBlip}
              onPosted={onBoardPost}
              onClose={close}
            />
          {:else}
            <HomeView {profile} {data} onNavigate={onNavigate} />
          {/if}
          </svelte:boundary>
        </div>
      {/key}
    </div>

    <footer class="panel-foot">
      <p>{profile.name ?? 'Portofolio'} · arsip Wangsheng</p>
      <button class="foot-btn" type="button" onclick={close}>Tutup panel</button>
    </footer>
  </div>
</div>

<style>
  .panel-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    justify-content: flex-end;
    background: linear-gradient(90deg, rgba(14, 10, 8, 0.18), rgba(14, 10, 8, 0.6));
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }

  .panel-sheet {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(720px, 100%);
    height: 100%;
    border-left: 1px solid rgba(36, 28, 22, 0.5);
    background:
      repeating-linear-gradient(90deg, rgba(112, 84, 46, 0.035) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(0deg, rgba(112, 84, 46, 0.022) 0 1px, transparent 1px 4px),
      radial-gradient(130% 120% at 20% 4%, #f8efdd 0%, #ecdcbd 52%, #dcc8a3 100%);
    color: var(--ink);
    box-shadow: -24px 0 64px rgba(0, 0, 0, 0.42);
  }

  .panel-sheet.wide {
    width: min(820px, 100%);
  }

  .rod {
    position: absolute;
    left: 0;
    top: 12%;
    width: 6px;
    height: 120px;
    background: linear-gradient(90deg, #2c2018, #4a3423);
    border-radius: 0 3px 3px 0;
  }

  .panel-head {
    flex: 0 0 auto;
    padding: 18px 30px 12px;
  }

  .head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.2);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.56);
  }

  .back:hover {
    color: var(--vermilion-deep);
    border-bottom-color: rgba(178, 58, 48, 0.4);
  }

  .close {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(36, 28, 22, 0.16);
    font-size: 16px;
    line-height: 1;
    color: rgba(36, 28, 22, 0.5);
  }

  .close:hover {
    border-color: rgba(178, 58, 48, 0.4);
    color: var(--vermilion-deep);
  }

  .title-wrap {
    display: flex;
    gap: 13px;
    min-width: 0;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    margin-top: 2px;
    border: 1px solid rgba(255, 244, 220, 0.36);
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 19px;
    transform: rotate(-2deg);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
  }

  .title-copy {
    min-width: 0;
  }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.48);
  }

  h2 {
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-display);
    font-size: clamp(24px, 3.2vw, 33px);
    font-weight: 600;
    line-height: 1.04;
    letter-spacing: -0.028em;
  }

  .sub {
    margin-top: 4px;
    font-size: 11px;
    color: rgba(36, 28, 22, 0.55);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 30px 26px;
  }

  .panel-foot {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 11px 30px 14px;
    border-top: 1px dashed rgba(36, 28, 22, 0.16);
  }

  .panel-foot p {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.4);
  }

  .foot-btn {
    flex: 0 0 auto;
    padding: 6px 11px;
    border: 1px solid rgba(36, 28, 22, 0.24);
    border-radius: 2px;
    font-size: 10px;
    font-weight: 600;
    color: rgba(36, 28, 22, 0.7);
  }

  .foot-btn:hover {
    border-color: rgba(36, 28, 22, 0.5);
    color: var(--ink);
  }

  /* Lembar galat view: pesan jujur, bukan kartu hias. */
  .panel-error {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    border: 1px solid rgba(140, 44, 37, 0.32);
    border-left: 3px solid var(--vermilion-deep);
    background: rgba(255, 252, 244, 0.5);
  }

  .panel-error h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 19px;
    color: var(--ink);
  }

  .panel-error .galat {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.55;
    color: var(--vermilion-deep);
    overflow-wrap: anywhere;
  }

  .panel-error .petunjuk {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--ink-muted);
  }

  .panel-error .coba {
    align-self: flex-start;
    margin-top: 4px;
    padding: 8px 14px;
    border: 1px solid rgba(36, 28, 22, 0.32);
    border-radius: 2px;
    background: transparent;
    font: inherit;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
    touch-action: manipulation;
  }

  .panel-error .coba:hover {
    border-color: var(--ink);
  }

  /* Layar sentuh: tombol tutup dan footer dinaikkan ke ukuran jari. */
  @media (pointer: coarse) {
    .close {
      width: 40px;
      height: 40px;
      font-size: 20px;
    }

    .back {
      padding: 8px 0;
      font-size: 10.5px;
    }

    .foot-btn {
      padding: 11px 14px;
      font-size: 11.5px;
    }
  }

  @media (max-width: 720px) {
    .panel-sheet {
      width: 100%;
      border-left: none;
    }

    .panel-head {
      padding: 14px 18px 10px;
    }

    .panel-body {
      padding: 14px 18px 22px;
    }

    .panel-foot {
      padding: 10px 18px 12px;
    }

    .panel-foot p {
      display: none;
    }
  }
</style>
