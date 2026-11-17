<script>
  import { fly } from 'svelte/transition'

  let { station, onClose, onBlip, onPageAdvance, onOpenEmbed } = $props()

  const pages = $derived(
    Array.isArray(station?.dialog) && station.dialog.length > 0
      ? station.dialog
      : [
          {
            speaker: station?.guide?.name ?? 'Pemandu',
            text: station?.intro ?? station?.subtitle ?? '',
          },
        ],
  )

  let pageIndex = $state(0)
  let visibleCount = $state(0)
  let typeTimer = null

  const page = $derived(pages[Math.min(pageIndex, pages.length - 1)] ?? {})
  const fullText = $derived(page.text ?? '')
  const shownText = $derived(fullText.slice(0, visibleCount))
  const isTyping = $derived(visibleCount < fullText.length)
  const isLast = $derived(pageIndex >= pages.length - 1)
  const speaker = $derived(page.speaker ?? station?.guide?.name ?? 'Pemandu')
  const isProject = $derived(station?.kind === 'lantern' || Boolean(station?.project))
  const pageLabel = $derived(
    `${String(pageIndex + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`,
  )

  $effect(() => {
    station?.id
    pageIndex = 0
  })

  $effect(() => {
    const text = fullText
    visibleCount = 0
    if (typeTimer) clearInterval(typeTimer)
    typeTimer = null
    if (!text) return

    let index = 0
    typeTimer = setInterval(() => {
      index += 1
      visibleCount = index
      if (index % 2 === 0) onBlip?.()
      if (index >= text.length) {
        clearInterval(typeTimer)
        typeTimer = null
      }
    }, 18)

    return () => {
      if (typeTimer) clearInterval(typeTimer)
      typeTimer = null
    }
  })

  function finishTyping() {
    if (typeTimer) clearInterval(typeTimer)
    typeTimer = null
    visibleCount = fullText.length
  }

  function advance() {
    if (isTyping) {
      finishTyping()
      return
    }
    if (isLast) {
      onClose?.()
      return
    }
    pageIndex += 1
    onPageAdvance?.()
  }

  function previous() {
    if (pageIndex > 0) {
      pageIndex -= 1
      onPageAdvance?.()
    }
  }

  function handleBoxClick(event) {
    if (event.target.closest('a, button')) return
    advance()
  }

  function handleBoxKey(event) {
    if (event.code !== 'Enter' && event.code !== 'Space') return
    event.preventDefault()
    event.stopPropagation()
    advance()
  }

  function handleEmbedClick(event) {
    event.stopPropagation()
    if (station?.project) {
      onOpenEmbed?.(station.project)
    }
  }

  $effect(() => {
    const handleKey = (event) => {
      if (
        event.code === 'Space' ||
        event.code === 'Enter' ||
        event.code === 'KeyE' ||
        event.code === 'ArrowRight'
      ) {
        event.preventDefault()
        advance()
      } else if (event.code === 'ArrowLeft' || event.code === 'PageUp') {
        event.preventDefault()
        previous()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
</script>

<div class="dialog-viewport">
  <div
    class="dialog"
    role="dialog"
    aria-labelledby="dialog-speaker"
    tabindex="-1"
    transition:fly={{ y: 22, duration: 220, opacity: 0.15 }}
    onclick={handleBoxClick}
    onkeydown={handleBoxKey}
  >
    <span class="corner corner-a" aria-hidden="true"></span>
    <span class="corner corner-b" aria-hidden="true"></span>

    <header class="head">
      <div class="speaker">
        <span class="seal" aria-hidden="true">言</span>
        <div class="speaker-copy">
          <p class="eyebrow">{station?.subtitle ?? 'Percakapan'}</p>
          <h2 id="dialog-speaker">{speaker}</h2>
        </div>
      </div>

      <div class="status">
        <span class="page-count">Halaman {pageLabel}</span>
        <button class="close" type="button" onclick={onClose} aria-label="Tutup dialog">
          ×
        </button>
      </div>
    </header>

    <div class="body">
      <p class="text" aria-live="polite">
        {shownText}{#if isTyping}<span class="caret" aria-hidden="true"></span>{/if}
      </p>

      {#if !isTyping && page.tags?.length}
        <div class="tags">
          {#each page.tags as tag (tag)}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      {/if}

      {#if !isTyping && (isProject || page.links?.length)}
        <div class="actions">
          {#if isProject}
            <button class="action primary" type="button" onclick={handleEmbedClick}>
              <span class="key" aria-hidden="true">E</span>
              <span>Buka uji web langsung</span>
            </button>
          {/if}

          {#if page.links?.length}
            {#each page.links as link (link.label)}
              {#if link.action === 'open-embed'}
                <button class="action ghost" type="button" onclick={handleEmbedClick}>
                  {link.label}
                </button>
              {:else if link.href}
                <a
                  class="action ghost"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onclick={(event) => event.stopPropagation()}
                >
                  {link.label} ↗
                </a>
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <footer class="foot">
      <div class="foot-hint">
        {#if pageIndex > 0}
          <button class="back" type="button" onclick={previous}>← Kembali</button>
        {/if}
        <span>Space / Enter / klik untuk lanjut</span>
      </div>

      <div class="arrow-zone" aria-hidden="true">
        {#if !isTyping}
          <span class="arrow" class:final={isLast}>{isLast ? '●' : '▼'}</span>
        {/if}
      </div>
    </footer>
  </div>
</div>

<style>
  .dialog-viewport {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 24px 28px;
    pointer-events: none;
    user-select: none;
  }

  .dialog {
    position: relative;
    width: min(830px, 100%);
    min-height: 190px;
    padding: 19px 26px 15px;
    border: 1px solid rgba(36, 28, 22, 0.55);
    border-radius: 2px;
    box-shadow:
      0 22px 48px rgba(0, 0, 0, 0.55),
      inset 0 0 0 6px rgba(248, 238, 216, 0.32),
      inset 0 0 0 7px rgba(36, 28, 22, 0.14);
    background:
      repeating-linear-gradient(
        90deg,
        rgba(112, 84, 46, 0.03) 0 1px,
        transparent 1px 3px
      ),
      repeating-linear-gradient(
        0deg,
        rgba(112, 84, 46, 0.02) 0 1px,
        transparent 1px 4px
      ),
      radial-gradient(120% 150% at 35% 10%, #f7eeda 0%, #ebdbbc 55%, #dcc9a4 100%);
    color: var(--ink);
    pointer-events: auto;
    cursor: pointer;
    font-family: var(--font-body);
  }

  .corner {
    position: absolute;
    width: 14px;
    height: 14px;
    border-color: rgba(36, 28, 22, 0.35);
    border-style: solid;
    pointer-events: none;
  }

  .corner-a {
    top: 12px;
    left: 12px;
    border-width: 1px 0 0 1px;
  }

  .corner-b {
    bottom: 12px;
    right: 12px;
    border-width: 0 1px 1px 0;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(36, 28, 22, 0.2);
  }

  .speaker {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 2px;
    background: var(--vermilion);
    color: #f7ead1;
    font-family: var(--font-seal);
    font-size: 18px;
    box-shadow: 0 3px 8px rgba(80, 30, 24, 0.28);
    transform: rotate(-1.5deg);
  }

  .eyebrow {
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--vermilion);
  }

  .speaker h2 {
    margin-top: 2px;
    font-size: 21px;
    color: var(--ink);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 3px;
  }

  .page-count {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.08em;
    color: rgba(36, 28, 22, 0.5);
    text-transform: uppercase;
  }

  .close {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid rgba(36, 28, 22, 0.25);
    border-radius: 2px;
    color: rgba(36, 28, 22, 0.6);
    font-size: 15px;
    line-height: 1;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .close:hover {
    background: var(--vermilion);
    border-color: var(--vermilion);
    color: #f8eed7;
  }

  .body {
    margin-top: 13px;
    min-height: 78px;
  }

  .text {
    margin: 0;
    font-size: 15.5px;
    line-height: 1.72;
    color: #2c231b;
  }

  .caret {
    display: inline-block;
    width: 6px;
    height: 1.02em;
    margin-left: 3px;
    vertical-align: -0.12em;
    background: rgba(36, 28, 22, 0.75);
    animation: blink-step 0.7s steps(1) infinite;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }

  .tag {
    padding: 3px 8px;
    border: 1px solid rgba(36, 28, 22, 0.28);
    border-radius: 2px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.7);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 13px;
    border-radius: 2px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .action.primary {
    background: var(--vermilion);
    color: #f8eed7;
  }

  .action.primary:hover {
    background: var(--vermilion-deep);
  }

  .action .key {
    display: inline-grid;
    place-items: center;
    min-width: 17px;
    height: 17px;
    border: 1px solid rgba(248, 238, 215, 0.4);
    border-radius: 2px;
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1;
  }

  .action.ghost {
    border: 1px solid rgba(36, 28, 22, 0.32);
    color: rgba(36, 28, 22, 0.78);
    background: transparent;
  }

  .action.ghost:hover {
    background: rgba(36, 28, 22, 0.07);
    border-color: rgba(36, 28, 22, 0.5);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px dashed rgba(36, 28, 22, 0.22);
  }

  .foot-hint {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 10px;
    letter-spacing: 0.04em;
    color: rgba(36, 28, 22, 0.52);
  }

  .back {
    padding: 1px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.25);
    font-size: 10px;
    letter-spacing: 0.04em;
    color: rgba(36, 28, 22, 0.68);
  }

  .back:hover {
    color: var(--vermilion);
    border-bottom-color: var(--vermilion);
  }

  .arrow-zone {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
  }

  .arrow {
    color: var(--vermilion);
    font-size: 12px;
    animation: bounce 0.9s ease-in-out infinite alternate;
  }

  .arrow.final {
    font-size: 9px;
  }

  @keyframes bounce {
    0% {
      transform: translateY(-2px);
    }
    100% {
      transform: translateY(3px);
    }
  }

  @keyframes blink-step {
    0%,
    49% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @media (max-width: 640px) {
    .dialog-viewport {
      padding: 0 12px 14px;
    }
    .dialog {
      padding: 15px 16px 12px;
    }
    .text {
      font-size: 14.5px;
    }
    .page-count {
      display: none;
    }
    .foot-hint span {
      display: none;
    }
  }
</style>
