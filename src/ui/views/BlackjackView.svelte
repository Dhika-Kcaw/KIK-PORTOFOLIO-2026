<script>
  /**
   * Cadangan panel 2D untuk meja judi — tidak dipakai lagi.
   *
   * Sejak mode duduk orang pertama ada (`BlackjackStage` + `SeatHud`), Kedai
   * Kartu tidak lagi membuka panel: pemain duduk di meja, kartunya ada di atas
   * kain, dan antarmukanya hanya bilah permainan di bawah layar. Berkas ini
   * sengaja dibiarkan sebagai catatan sejarah; tidak ada satu pun modul yang
   * mengimpornya. Pada mesin dengan shell yang sehat berkas ini boleh dihapus.
   */
  import { onMount } from 'svelte'

  let { onClose = null } = $props()

  onMount(() => {
    onClose?.()
  })
</script>

<div class="catatan">
  <p>Meja judi sekarang dimainkan langsung di museum, bukan lewat panel ini.</p>
</div>

<style>
  .catatan {
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
