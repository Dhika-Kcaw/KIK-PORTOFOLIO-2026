<script>
  import { fly } from 'svelte/transition'
  import { initials, TYPE_LABEL } from './panel-utils.js'

  let { testimonial, onClose, onBlip } = $props()

  let visibleCount = $state(0)
  let frame = 0

  const fullText = $derived(testimonial?.quote ?? '')
  const shownText = $derived(fullText.slice(0, visibleCount))
  const isTyping = $derived(visibleCount < fullText.length)
  const typeLabel = $derived(TYPE_LABEL[testimonial?.type] ?? 'Pengunjung')
  const detail = $derived(
    [testimonial?.role, testimonial?.organization].filter(Boolean).join(' · ') || typeLabel,
  )

  // Mengetik berbasis waktu (bukan setInterval) agar kecepatan tetap sama
  // meskipun frame atau timer browser sedang dibatasi.
  $effect(() => {
    testimonial?.id
    const text = fullText
    visibleCount = 0
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    if (!text) return

    const startedAt = performance.now()
    const charsPerSecond = 52

    const step = (now) => {
      const chars = Math.min(text.length, Math.floor(((now - startedAt) / 1000) * charsPerSecond))
      if (chars !== visibleCount) {
        const before = visibleCount
        visibleCount = chars
        if (Math.floor(chars / 3) > Math.floor(before / 3)) onBlip?.()
      }
      if (chars < text.length) frame = requestAnimationFrame(step)
      else frame = 0
    }

    frame = requestAnimationFrame(step)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
  })

  function finishOrClose() {
    if (isTyping) {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      visibleCount = fullText.length
      return
    }
    onClose?.()
  }

  function handleKey(event) {
    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') {
      event.preventDefault()
      finishOrClose()
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
</script>

<div class="visitor-viewport">
  <div
    class="visitor-dialog"
    role="dialog"
    aria-labelledby="visitor-name"
    tabindex="-1"
    transition:fly={{ y: 20, duration: 200, opacity: 0.2 }}
    onclick={(event) => {
      if (event.target.closest('button, a')) return
      finishOrClose()
    }}
    onkeydown={(event) => {
      if (event.code === 'Space' || event.code === 'Enter') finishOrClose()
    }}
  >
    <span class="corner corner-a" aria-hidden="true"></span>
    <span class="corner corner-b" aria-hidden="true"></span>

    <header class="head">
      <div class="who">
        <span class="avatar" aria-hidden="true">
          {#if testimonial?.avatar_url}
            <img src={testimonial.avatar_url} alt="" />
          {:else}
            {initials(testimonial?.name ?? '')}
          {/if}
        </span>
        <div class="who-copy">
          <p class="eyebrow">{typeLabel}</p>
          <h2 id="visitor-name">{testimonial?.name ?? 'Pengunjung'}</h2>
          <p class="sub">{detail}</p>
        </div>
      </div>

      <button class="close" type="button" onclick={onClose} aria-label="Tutup percakapan">×</button>
    </header>

    <div class="body">
      <p class="quote" aria-live="polite">
        <span class="mark" aria-hidden="true">“</span>{shownText}{#if isTyping}<span
          class="caret"
          aria-hidden="true"
        ></span>{:else}<span class="mark" aria-hidden="true">”</span>{/if}
      </p>

      {#if !isTyping && testimonial?.project_title}
        <p class="project-note">
          Tentang proyek <strong>{testimonial.project_title}</strong>
        </p>
      {/if}
    </div>

    <footer class="foot">
      <span class="hint">Space / Enter / klik untuk {isTyping ? 'mempercepat' : 'menutup'}</span>
      <span class="arrow" class:final={!isTyping} aria-hidden="true">{isTyping ? '…' : '▼'}</span>
    </footer>
  </div>
</div>

<style>
  .visitor-viewport {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 24px 30px;
    pointer-events: none;
    user-select: none;
  }

  .visitor-dialog {
    position: relative;
    width: min(700px, 100%);
    padding: 18px 24px 13px;
    border: 1px solid rgba(36, 28, 22, 0.55);
    border-radius: 2px;
    background:
      repeating-linear-gradient(90deg, rgba(112, 84, 46, 0.03) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(0deg, rgba(112, 84, 46, 0.02) 0 1px, transparent 1px 4px),
      radial-gradient(120% 150% at 32% 8%, #f8efdc 0%, #ecdcbe 56%, #ddcaa5 100%);
    box-shadow:
      0 22px 48px rgba(0, 0, 0, 0.5),
      inset 0 0 0 6px rgba(248, 238, 216, 0.32),
      inset 0 0 0 7px rgba(36, 28, 22, 0.14);
    color: var(--ink);
    pointer-events: auto;
    cursor: pointer;
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
    top: 11px;
    left: 11px;
    border-width: 1px 0 0 1px;
  }

  .corner-b {
    bottom: 11px;
    right: 11px;
    border-width: 0 1px 1px 0;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 11px;
    border-bottom: 1px solid rgba(36, 28, 22, 0.18);
  }

  .who {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    overflow: hidden;
    border: 1px solid rgba(255, 244, 220, 0.42);
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-display);
    font-size: 17px;
    transform: rotate(-1.5deg);
    box-shadow: 0 3px 8px rgba(80, 30, 24, 0.25);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .who-copy {
    min-width: 0;
  }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--vermilion);
  }

  h2 {
    margin-top: 1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .sub {
    margin-top: 2px;
    font-size: 10.5px;
    color: rgba(36, 28, 22, 0.55);
  }

  .close {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
    border: 1px solid rgba(36, 28, 22, 0.24);
    color: rgba(36, 28, 22, 0.55);
    font-size: 15px;
    line-height: 1;
  }

  .close:hover {
    border-color: var(--vermilion);
    background: var(--vermilion);
    color: #f8eed7;
  }

  .body {
    margin-top: 12px;
    min-height: 68px;
  }

  .quote {
    font-family: var(--font-display);
    font-size: 15px;
    font-style: italic;
    line-height: 1.7;
    color: #2c231b;
  }

  .mark {
    color: rgba(178, 58, 48, 0.45);
  }

  .caret {
    display: inline-block;
    width: 5px;
    height: 1em;
    margin-left: 2px;
    vertical-align: -0.1em;
    background: rgba(36, 28, 22, 0.7);
    animation: blink 0.7s steps(1) infinite;
  }

  .project-note {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed rgba(36, 28, 22, 0.16);
    font-size: 10px;
    color: rgba(36, 28, 22, 0.55);
  }

  .project-note strong {
    color: var(--vermilion-deep);
    font-weight: 600;
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed rgba(36, 28, 22, 0.2);
  }

  .hint {
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: rgba(36, 28, 22, 0.48);
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
    from {
      transform: translateY(-2px);
    }
    to {
      transform: translateY(3px);
    }
  }

  @keyframes blink {
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
    .visitor-viewport {
      padding: 0 12px 14px;
    }

    .visitor-dialog {
      padding: 14px 16px 11px;
    }

    .quote {
      font-size: 14px;
    }

    .hint {
      display: none;
    }
  }

  /* Layar sentuh: dialog tumbuh dari bawah, tombol silang jadi 40 px. */
  @media (pointer: coarse) {
    .visitor-viewport {
      align-items: flex-end;
      padding: 0 10px calc(10px + env(safe-area-inset-bottom, 0px));
    }

    .visitor-dialog {
      padding: 16px 18px 13px;
    }

    .close {
      width: 38px;
      height: 38px;
      font-size: 17px;
    }

    .quote {
      font-size: 15px;
      line-height: 1.62;
    }
  }
</style>
