<script>
  import { fade, scale } from 'svelte/transition'

  let { project, onClose } = $props()

  let isFullscreen = $state(false)
  let iframeKey = $state(0)

  const host = $derived(
    String(project?.href ?? '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, ''),
  )

  function toggleFullscreen() {
    isFullscreen = !isFullscreen
  }

  function reloadIframe() {
    iframeKey += 1
  }
</script>

<div
  class="overlay"
  role="presentation"
  transition:fade={{ duration: 160 }}
  onclick={(event) => {
    // Klik latar menutup pratinjau; klik di dalam bingkai tidak.
    if (event.target === event.currentTarget) onClose()
  }}
>
  <div
    class="frame"
    class:fullscreen={isFullscreen}
    transition:scale={{ duration: 190, start: 0.97 }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={`Uji web: ${project?.title ?? 'Proyek'}`}
  >
    <div class="bar">
      <div class="title-group">
        <span class="live"><span class="dot" aria-hidden="true"></span>Langsung</span>
        <h2>{project?.title ?? 'Proyek Web'}</h2>
        <span class="year">{project?.year ?? '2026'}</span>
      </div>

      <div class="url" title={project?.href}>
        <span>{host || 'demo.local'}</span>
      </div>

      <div class="actions">
        {#if project?.href}
          <a
            class="action"
            href={project.href}
            target="_blank"
            rel="noreferrer"
            title="Buka di tab browser baru"
          >
            Tab baru ↗
          </a>
        {/if}
        <button class="action" type="button" onclick={reloadIframe} title="Muat ulang pratinjau">
          Muat ulang
        </button>
        <button
          class="action"
          type="button"
          onclick={toggleFullscreen}
          title={isFullscreen ? 'Kecilkan' : 'Layar penuh'}
        >
          {isFullscreen ? 'Kecilkan' : 'Layar penuh'}
        </button>
        <button class="action close" type="button" onclick={onClose} title="Tutup (Esc)">
          Tutup <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>

    <div class="viewport">
      {#key iframeKey}
        <iframe
          src={project?.href}
          title={`Pratinjau ${project?.title ?? 'proyek'}`}
          class="content"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="eager"
        ></iframe>
      {/key}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(12, 9, 7, 0.84);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .frame {
    display: flex;
    flex-direction: column;
    width: min(1160px, 100%);
    height: min(84vh, 820px);
    height: min(84dvh, 820px);
    border: 1px solid rgba(244, 234, 212, 0.22);
    border-radius: 2px;
    overflow: hidden;
    background: #17120f;
    box-shadow: 0 30px 64px rgba(0, 0, 0, 0.6);
    transition: width 0.2s ease, height 0.2s ease;
  }

  .frame.fullscreen {
    width: 97vw;
    height: 94vh;
    height: 94dvh;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 11px 18px 12px;
    border-bottom: 1px solid rgba(178, 58, 48, 0.5);
    background: linear-gradient(180deg, #1e1713, #17120f);
  }

  .title-group {
    display: flex;
    align-items: baseline;
    gap: 9px;
    min-width: 0;
  }

  .live {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--vermilion);
    box-shadow: 0 0 7px rgba(178, 58, 48, 0.8);
  }

  .title-group h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    font-weight: 500;
    color: #f7eed9;
  }

  .year {
    font-family: var(--font-mono);
    font-size: 9.5px;
    color: var(--faint);
  }

  .url {
    flex: 1;
    min-width: 0;
    padding-bottom: 3px;
    border-bottom: 1px dotted rgba(244, 234, 212, 0.25);
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: rgba(244, 234, 212, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-shrink: 0;
  }

  .action {
    padding: 2px 0;
    border-bottom: 1px solid transparent;
    color: var(--muted);
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .action:hover {
    color: #f7eed9;
    border-bottom-color: rgba(244, 234, 212, 0.4);
  }

  .action.close {
    color: rgba(207, 143, 159, 0.9);
  }

  .action.close:hover {
    color: #f2b3bd;
    border-bottom-color: var(--plum);
  }

  .action.close span {
    margin-left: 4px;
    font-size: 13px;
    line-height: 1;
  }

  .viewport {
    flex: 1;
    padding: 5px;
    background: #d8c6a3;
  }

  .content {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #ffffff;
  }

  @media (max-width: 820px) {
    .url {
      display: none;
    }
  }

  @media (max-width: 620px) {
    .overlay {
      padding: 10px;
    }
    .bar {
      gap: 12px;
      padding: 9px 12px 10px;
    }
    .title-group h2 {
      font-size: 14px;
    }
    .year,
    .action:not(.close) {
      display: none;
    }
  }
</style>
