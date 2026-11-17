<script>
  import { fade, fly } from 'svelte/transition'

  let { onClose, touch = false } = $props()
  const keyboardCategories = [
    {
      title: 'Menjelajah',
      items: [
        { key: 'Klik', desc: 'Berjalan ke titik di lantai museum' },
        { key: 'Klik ×2', desc: 'Berlari ke titik' },
        { key: 'Shift + klik', desc: 'Berlari tanpa klik ganda' },
        { key: 'W A S D', desc: 'Mode tombol' },
        { key: 'Shift', desc: 'Berlari di mode tombol' },
        { key: 'Space', desc: 'Lompat' },
        { key: 'Tab', desc: 'Ganti mode klik / WASD' },
        { key: 'Scroll', desc: 'Zoom diorama' },
        { key: 'Seret kanan', desc: 'Putar diorama 15° per langkah (360°)' },
        { key: 'R', desc: 'Kembalikan kamera' },
      ],
    },
    {
      title: 'Museum',
      items: [
        { key: 'E / Klik', desc: 'Buka proyek, meja info, atau testimoni' },
        { key: 'I', desc: 'Buka indeks seluruh bagian museum' },
        { key: 'G', desc: 'Melambai' },
        { key: 'V', desc: 'Bersorak' },
        { key: 'P', desc: 'Fisika rambut dan kain' },
        { key: 'M', desc: 'Suara' },
        { key: 'Esc', desc: 'Tutup panel' },
      ],
    },
  ]

  // Panduan layar sentuh: gestur menggantikan papan ketik sepenuhnya.
  const touchCategories = [
    {
      title: 'Menjelajah',
      items: [
        { key: 'Ketuk', desc: 'Karakter berjalan ke titik yang diketuk' },
        { key: 'Ketuk ×2', desc: 'Berlari ke titik itu' },
        { key: 'Seret 1 jari', desc: 'Putar diorama 15° per langkah (360°)' },
        { key: 'Cubit 2 jari', desc: 'Zoom masuk atau keluar' },
      ],
    },
    {
      title: 'Museum',
      items: [
        { key: 'Ketuk objek', desc: 'Buka meja info, bingkai proyek, atau testimoni' },
        { key: 'Indeks', desc: 'Daftar seluruh bagian; pilih untuk diantar' },
        { key: 'Suara', desc: 'Nyalakan atau matikan audio' },
        { key: 'Fisika', desc: 'Rambut dan kain' },
        { key: '×', desc: 'Tutup panel lewat tombol silang di kanan atas' },
      ],
    },
  ]

  const categories = $derived(touch ? touchCategories : keyboardCategories)
</script>

<div
  class="backdrop"
  role="presentation"
  transition:fade={{ duration: 160 }}
  onclick={(event) => {
    // Klik latar menutup panduan; klik di dalam gulungan tidak.
    if (event.target === event.currentTarget) onClose()
  }}
>
  <div
    class="scroll"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="help-title"
    transition:fly={{ y: 18, duration: 220, opacity: 0.2 }}
  >
    <span class="rod rod-top" aria-hidden="true"></span>
    <span class="rod rod-bottom" aria-hidden="true"></span>

    <header class="head">
      <div class="seal" aria-hidden="true">引</div>
      <div class="head-copy">
        <p class="eyebrow">Panduan singkat</p>
        <h2 id="help-title">Cara menjelajah museum</h2>
      </div>
      <button class="close" type="button" onclick={onClose}>
        Tutup <span aria-hidden="true">×</span>
      </button>
    </header>

    <p class="lede">
      {#if touch}
        Museum ini dibaca seperti diorama. Ketuk lantai untuk berjalan, ketuk meja
        untuk membuka bagiannya. Indeks menampilkan lokasi setiap tujuan; pilih satu
        dan karakter akan berjalan ke sana.
      {:else}
        Museum ini dibaca seperti diorama. Bagian portofolio hanya terbuka setelah karakter
        mendatangi mejanya. Indeks menampilkan lokasi setiap tujuan; pilih satu dan ia akan
        berjalan ke sana.
      {/if}
    </p>

    <div class="columns">
      {#each categories as category (category.title)}
        <section class="col">
          <h3>{category.title}</h3>
          <ul>
            {#each category.items as item (item.key)}
              <li>
                <span class="badge">{item.key}</span>
                <span class="desc">{item.desc}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    <footer class="foot">
      <p class="tip">Audio menyala setelah interaksi pertama. Data museum dikelola lewat dashboard admin.</p>
      <button class="enter" type="button" onclick={onClose}>
        Masuk ke halaman <span aria-hidden="true">→</span>
      </button>
    </footer>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(14, 10, 8, 0.78);
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
  }

  .scroll {
    position: relative;
    width: min(790px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    padding: 30px 36px 24px;
    border: 1px solid rgba(36, 28, 22, 0.5);
    border-radius: 2px;
    box-shadow:
      0 26px 60px rgba(0, 0, 0, 0.55),
      inset 0 0 0 6px rgba(248, 238, 216, 0.3),
      inset 0 0 0 7px rgba(36, 28, 22, 0.14);
    background:
      repeating-linear-gradient(
        90deg,
        rgba(112, 84, 46, 0.035) 0 1px,
        transparent 1px 3px
      ),
      repeating-linear-gradient(
        0deg,
        rgba(112, 84, 46, 0.022) 0 1px,
        transparent 1px 4px
      ),
      radial-gradient(120% 140% at 30% 10%, #f7eedb 0%, #ecdcbd 52%, #dcc8a3 100%);
    color: var(--ink);
  }

  .rod {
    position: absolute;
    left: -7px;
    right: -7px;
    height: 7px;
    border-radius: 4px;
    background: linear-gradient(180deg, #7a5a3c, #3e2a1c 55%, #241810);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }

  .rod-top {
    top: -5px;
  }

  .rod-bottom {
    bottom: -5px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 2px;
    background: var(--vermilion);
    color: #f7ead1;
    font-family: var(--font-seal);
    font-size: 19px;
    transform: rotate(-2deg);
    box-shadow: 0 4px 10px rgba(80, 30, 24, 0.3);
  }

  .head-copy {
    flex: 1;
  }

  .eyebrow {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--vermilion);
  }

  .head h2 {
    margin-top: 3px;
    font-size: 29px;
    color: var(--ink);
  }

  .close {
    align-self: flex-start;
    padding: 3px 0;
    border-bottom: 1px solid transparent;
    color: rgba(36, 28, 22, 0.55);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .close:hover {
    color: var(--vermilion);
    border-bottom-color: var(--vermilion);
  }

  .close span {
    font-size: 14px;
    margin-left: 4px;
  }

  .lede {
    margin: 16px 0 20px;
    max-width: 58ch;
    font-size: 13px;
    line-height: 1.65;
    color: rgba(36, 28, 22, 0.7);
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }

  .col h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    font-family: var(--font-body);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--vermilion);
  }

  .col h3::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(36, 28, 22, 0.18);
  }

  .col li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    padding: 7px 0;
    border-bottom: 1px dashed rgba(36, 28, 22, 0.14);
  }

  .badge {
    flex-shrink: 0;
    padding: 2px 7px;
    border: 1px solid rgba(36, 28, 22, 0.32);
    border-radius: 2px;
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1.4;
    color: #3b2e25;
    white-space: nowrap;
  }

  .desc {
    font-size: 12.5px;
    text-align: right;
    color: rgba(36, 28, 22, 0.78);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-top: 22px;
    padding-top: 15px;
    border-top: 1px solid rgba(36, 28, 22, 0.22);
  }

  .tip {
    max-width: 40ch;
    font-size: 10.5px;
    line-height: 1.6;
    color: rgba(36, 28, 22, 0.55);
  }

  .enter {
    flex-shrink: 0;
    padding: 9px 17px;
    border-radius: 2px;
    background: var(--vermilion);
    color: #f8eed7;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: background 0.16s ease;
  }

  .enter:hover {
    background: var(--vermilion-deep);
  }

  .enter span {
    margin-left: 6px;
  }

  @media (max-width: 680px) {
    .backdrop {
      padding: 12px;
      align-items: flex-end;
    }
    .scroll {
      padding: 24px 20px 18px;
      max-height: 92dvh;
    }
    .columns {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .head h2 {
      font-size: 24px;
    }
    .foot {
      flex-direction: column;
      align-items: stretch;
      text-align: center;
    }
    .tip {
      display: none;
    }
    .enter {
      width: 100%;
    }
  }

  /* Layar sentuh: bilah panduan jadi sasaran ketuk yang layak. */
  @media (pointer: coarse) {
    .close {
      padding: 8px 6px;
      font-size: 11px;
    }
    .enter {
      padding: 14px 18px;
      font-size: 12.5px;
    }
    .col li {
      padding: 10px 0;
    }
    .badge {
      padding: 4px 9px;
      font-size: 10.5px;
    }
    .desc {
      font-size: 13px;
    }
  }
</style>
