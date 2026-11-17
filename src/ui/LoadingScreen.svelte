<script>
  import { fade } from 'svelte/transition'

  let { progress = 0, progressLabel = 'Menyiapkan halaman', error = '' } = $props()

  const percent = $derived(Math.max(0, Math.min(100, Math.round(progress * 100))))
  // Ruas kertas (garis tipis) supaya tinta jelas mengisi sampai mana.
  const rules = Array.from({ length: 11 }, (_, index) => index)
</script>

<div class="loader" transition:fade={{ duration: 320 }}>
  <div class="lantern" aria-hidden="true"></div>

  {#if error}
    <article class="sheet" role="alert">
      <span class="rod" aria-hidden="true"></span>
      <header class="sheet-head">
        <span class="stamp" aria-hidden="true">封</span>
        <div>
          <p class="eyebrow">Pintu pendopo tertahan</p>
          <h1>Halaman gagal dibuka</h1>
        </div>
      </header>
      <p class="note">
        Pesan di bawah adalah sebabnya. Salinan lengkap ada di konsol browser
        (F12 → Console) dan di jendela terminal <code>bun run dev</code>.
      </p>
      <pre class="trace">{error}</pre>
      {#if error.includes('model karakter')}
        <p class="note hint">
          Belum ada model? Buka <a href="/admin/models">dashboard admin → Model Karakter</a>,
          unggah satu folder berisi berkas PMX beserta seluruh teksturnya, lalu tekan
          <strong>Pakai</strong>. Museum memakai model itu pada pemuatan berikutnya.
        </p>
      {/if}
      <button class="retry" type="button" onclick={() => location.reload()}>
        Muat ulang halaman
      </button>
    </article>
  {:else}
    <div class="board">
      <figure class="scroll">
        <span class="cord" aria-hidden="true"></span>
        <span class="rod" aria-hidden="true"></span>

        <div
          class="paper"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
          aria-label="Progres memuat museum"
        >
          {#each rules as rule (rule)}
            <span class="rule" style={`bottom: ${(rule / rules.length) * 100}%`} aria-hidden="true"></span>
          {/each}

          <span class="ink" style={`height: ${percent}%`} aria-hidden="true"></span>
          <span class="brush" style={`bottom: ${percent}%`} aria-hidden="true"></span>

          <span class="column" aria-hidden="true">
            <span>往</span><span>生</span><span>堂</span>
          </span>
        </div>

        <span class="foot-rod" aria-hidden="true"></span>
      </figure>

      <div class="caption">
        <p class="eyebrow">Museum Wangsheng</p>
        <h1>Membuka pendopo</h1>
        <p class="note">Lentera dinyalakan, meja ditata, roh kertas dibangunkan.</p>

        <dl class="stat">
          <dt>Langkah</dt>
          <dd>{progressLabel}</dd>
        </dl>
        <p class="percent"><span>{percent}</span>%</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .loader {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 32px 24px;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 50% 118%, rgba(120, 66, 34, 0.16), transparent 60%),
      repeating-linear-gradient(
        0deg,
        rgba(244, 234, 212, 0.014) 0 1px,
        transparent 1px 3px
      ),
      #100c0a;
    font-family: var(--font-body);
    color: var(--text);
  }

  /* Cahaya lentera dari bawah: satu sumber, tenang, tanpa lingkaran neon. */
  .lantern {
    position: absolute;
    left: 50%;
    bottom: -90px;
    width: min(520px, 90vw);
    height: 240px;
    transform: translateX(-50%);
    background: radial-gradient(closest-side, rgba(255, 168, 92, 0.1), transparent 72%);
    pointer-events: none;
  }

  .board {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 40px;
  }

  /* Gulungan kertas vertikal: batang kayu, tali, dan kertas bergaris. */
  .scroll {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
  }

  .cord {
    width: 1px;
    height: 34px;
    background: rgba(244, 234, 212, 0.24);
  }

  .rod,
  .foot-rod {
    width: calc(100% + 16px);
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(180deg, #7a5a3c, #3e2a1c 55%, #241810);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .foot-rod {
    margin-top: -1px;
  }

  .paper {
    position: relative;
    width: 88px;
    height: 300px;
    overflow: hidden;
    border: 1px solid rgba(36, 28, 22, 0.6);
    border-left-width: 1px;
    border-right-width: 1px;
    background:
      repeating-linear-gradient(
        90deg,
        rgba(112, 84, 46, 0.05) 0 1px,
        transparent 1px 3px
      ),
      radial-gradient(130% 120% at 30% 4%, #f7eedb 0%, #ecdcbd 54%, #dcc8a3 100%);
    box-shadow:
      0 22px 46px rgba(0, 0, 0, 0.5),
      inset 0 0 0 5px rgba(248, 238, 216, 0.28);
  }

  /* Garis kertas: skala yang membuat isi tinta terbaca tanpa angka besar. */
  .rule {
    position: absolute;
    left: 7px;
    right: 7px;
    height: 1px;
    background: rgba(36, 28, 22, 0.13);
  }

  .ink {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(178, 58, 48, 0.42) 0%,
      rgba(140, 44, 37, 0.6) 70%,
      rgba(106, 33, 27, 0.68) 100%
    );
    transition: height 0.28s ease;
  }

  /* Ujung kuas: satu garis penuh, bukan gradasi bercahaya. */
  .brush {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    margin-bottom: -1px;
    background: var(--vermilion-deep);
    box-shadow: 0 0 0 1px rgba(36, 28, 22, 0.18);
    transition: bottom 0.28s ease;
  }

  .column {
    position: absolute;
    top: 16px;
    right: 15px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-seal);
    font-size: 22px;
    line-height: 1.24;
    color: rgba(36, 28, 22, 0.72);
  }

  .caption {
    padding-bottom: 10px;
    max-width: 30ch;
  }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
  }

  h1 {
    margin-top: 8px;
    font-size: clamp(26px, 4.6vw, 34px);
    color: #f7eed9;
  }

  .note {
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid rgba(244, 234, 212, 0.14);
  }

  .stat dt {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .stat dd {
    margin: 0;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    color: var(--text);
  }

  .percent {
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--faint);
  }

  .percent span {
    margin-right: 1px;
    font-size: 15px;
    color: var(--gold);
  }

  /* ---------------------------------------------------------------- galat */

  .sheet {
    position: relative;
    width: min(560px, 100%);
    padding: 26px 28px 22px;
    border: 1px solid rgba(36, 28, 22, 0.55);
    background:
      repeating-linear-gradient(
        90deg,
        rgba(112, 84, 46, 0.035) 0 1px,
        transparent 1px 3px
      ),
      radial-gradient(120% 130% at 26% 6%, #f7eedb 0%, #ecdcbd 54%, #dcc8a3 100%);
    color: var(--ink);
    box-shadow:
      0 26px 58px rgba(0, 0, 0, 0.52),
      inset 0 0 0 6px rgba(248, 238, 216, 0.3),
      inset 0 0 0 7px rgba(36, 28, 22, 0.14);
  }

  .sheet .rod {
    position: absolute;
    left: -7px;
    right: -7px;
    top: -6px;
  }

  .sheet-head {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .stamp {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border: 1px solid rgba(255, 244, 220, 0.34);
    border-radius: 2px;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 19px;
    transform: rotate(-2deg);
  }

  .sheet .eyebrow {
    color: var(--vermilion-deep);
  }

  .sheet h1 {
    margin-top: 3px;
    font-size: 25px;
    color: var(--ink);
  }

  .sheet .note {
    color: rgba(36, 28, 22, 0.7);
  }

  .sheet .hint {
    margin-top: 0;
    margin-bottom: 14px;
  }

  .sheet a {
    color: var(--vermilion-deep);
    font-weight: 600;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  .sheet a:hover {
    color: var(--ink);
  }

  .sheet code {
    padding: 1px 4px;
    background: rgba(36, 28, 22, 0.08);
    font-family: var(--font-mono);
    font-size: 10.5px;
  }

  .trace {
    margin: 14px 0 16px;
    padding: 11px 12px;
    max-height: 30vh;
    overflow: auto;
    border: 1px solid rgba(36, 28, 22, 0.2);
    border-left: 2px solid var(--vermilion);
    background: rgba(36, 28, 22, 0.05);
    font-family: var(--font-mono);
    font-size: 10.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: rgba(36, 28, 22, 0.82);
  }

  .retry {
    padding: 9px 16px;
    border: 1px solid var(--vermilion-deep);
    border-radius: 2px;
    background: var(--vermilion);
    color: #f8eed7;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .retry:hover {
    background: var(--vermilion-deep);
  }

  @media (max-width: 620px) {
    .board {
      flex-direction: column;
      align-items: center;
      gap: 26px;
    }

    .caption {
      max-width: 34ch;
      padding-bottom: 0;
      text-align: left;
    }

    .paper {
      height: 220px;
      width: 74px;
    }

    .column {
      font-size: 18px;
    }

    .sheet {
      padding: 24px 20px 18px;
    }
  }

  @media (pointer: coarse) {
    .retry {
      min-height: 44px;
      padding: 12px 18px;
    }
  }
</style>
