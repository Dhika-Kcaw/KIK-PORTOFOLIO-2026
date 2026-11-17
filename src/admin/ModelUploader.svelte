<script>
  import { uploadModel } from './api.js'

  let { onUploaded = null, activeModel = null, modelCount = 0 } = $props()

  let name = $state('')
  let picked = $state([])
  let keepTopFolder = $state(false)
  let uploading = $state(false)
  let error = $state('')
  let info = $state('')
  let folderInput = $state(null)
  let fileInput = $state(null)

  /** Jalur relatif berkas di browser (folder → `model/tex/face.png`). */
  function relativeOf(file) {
    const raw = file.webkitRelativePath || file.name || ''
    return raw.replace(/\\/g, '/').replace(/^\.?\//, '')
  }

  /**
   * PMX menyimpan jalur teksturnya relatif terhadap berkas PMX, jadi memilih
   * folder `model/` harus menghasilkan `model.pmx` + `tex/face.png` — bukan
   * `model/model.pmx`. Nama folder teratas dibuang kecuali diminta sebaliknya.
   */
  const paths = $derived(
    picked.map((file) => {
      const relative = relativeOf(file)
      if (keepTopFolder || !file.webkitRelativePath) return relative
      const parts = relative.split('/')
      return parts.length > 1 ? parts.slice(1).join('/') : relative
    }),
  )

  const pmxIndex = $derived(paths.findIndex((path) => /\.(pmx|pmd)$/i.test(path)))
  const pmxPath = $derived(pmxIndex >= 0 ? paths[pmxIndex] : '')
  const totalSize = $derived(picked.reduce((sum, file) => sum + (file.size || 0), 0))
  const ready = $derived(
    !uploading && name.trim().length >= 2 && pmxPath !== '' && picked.length > 0,
  )

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
    return `${bytes} B`
  }

  function pick(event) {
    const files = Array.from(event.currentTarget.files ?? [])
    picked = files
    error = ''
    info = ''

    // Nama model ditebak dari folder/berkas pertama supaya tidak perlu mengetik
    // ulang; admin tetap bisa mengubahnya.
    if (!name.trim() && files.length > 0) {
      const first = relativeOf(files[0]).split('/')[0]
      name = first
        .replace(/\.(pmx|pmd)$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim()
    }
  }

  function resetInputs() {
    if (folderInput) folderInput.value = ''
    if (fileInput) fileInput.value = ''
  }

  async function submit(event) {
    event.preventDefault()
    if (!ready) return
    uploading = true
    error = ''
    info = ''
    try {
      const result = await uploadModel({ name: name.trim(), files: picked, paths })
      info = `${result.files} berkas tersimpan. Tekan Pakai pada daftar di bawah untuk memakainya di museum.`
      picked = []
      name = ''
      resetInputs()
      onUploaded?.(result)
    } catch (reason) {
      error = reason?.message || String(reason)
    } finally {
      uploading = false
    }
  }
</script>

<section class="model-upload" aria-labelledby="model-upload-title">
  <header class="upload-head">
    <div>
      <p class="eyebrow">Karakter museum</p>
      <h2 id="model-upload-title">Unggah model PMX</h2>
    </div>
    <p class="upload-state">
      {#if activeModel}
        Sedang dipakai: <strong>{activeModel.name}</strong>
      {:else}
        Belum ada model aktif — museum memakai model bawaan
      {/if}
      <span class="upload-count">{modelCount} model tersimpan</span>
    </p>
  </header>

  <form onsubmit={submit}>
    <div class="upload-fields">
      <label class="field">
        <span>Nama model</span>
        <input
          type="text"
          bind:value={name}
          maxlength="120"
          placeholder="Contoh: karakter utama — seragam sekolah"
          autocomplete="off"
        />
      </label>

      <div class="field">
        <span>Berkas model dan tekstur</span>
        <div class="pick-row">
          <label class="pick-btn">
            <span>Pilih folder</span>
            <input
              type="file"
              webkitdirectory
              multiple
              bind:this={folderInput}
              onchange={pick}
              aria-label="Pilih folder model"
            />
          </label>
          <label class="pick-btn">
            <span>Pilih berkas</span>
            <input
              type="file"
              multiple
              accept=".pmx,.pmd,.png,.jpg,.jpeg,.webp,.bmp,.tga,.spa,.sph"
              bind:this={fileInput}
              onchange={pick}
              aria-label="Pilih berkas model"
            />
          </label>
        </div>
      </div>
    </div>

    <p class="summary" role="status">
      {#if picked.length === 0}
        Belum ada berkas dipilih. Pilih folder model yang berisi satu berkas .pmx
        beserta teksturnya.
      {:else}
        <strong>{picked.length} berkas</strong> · {formatSize(totalSize)}
        {#if pmxPath}
          · PMX: <code>{pmxPath}</code>
        {:else}
          · <span class="summary-warn">belum ada berkas .pmx di pilihan ini</span>
        {/if}
      {/if}
    </p>

    <label class="keep-folder">
      <input type="checkbox" bind:checked={keepTopFolder} />
      <span>Pertahankan nama folder teratas pada jalur berkas</span>
    </label>

    <p class="note">
      PMX merujuk teksturnya lewat jalur relatif (mis. <code>tex/face.png</code>), jadi
      unggahan menyimpan struktur folder apa adanya. Aktifkan opsi di atas hanya bila
      PMX di dalamnya menulis jalur dengan nama folder ikut terbawa. Maksimal 96 MB.
    </p>

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    {#if info}<p class="form-ok" role="status">{info}</p>{/if}

    <div class="upload-actions">
      <button class="button primary" type="submit" disabled={!ready}>
        {uploading ? 'Mengunggah…' : 'Unggah model'}
      </button>
      {#if !uploading && picked.length > 0 && !pmxPath}
        <span class="note inline">Tambahkan berkas .pmx sebelum mengunggah.</span>
      {/if}
    </div>
  </form>
</section>

<style>
  .model-upload {
    border: 1px solid rgba(36, 28, 22, 0.16);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.55);
    padding: 16px 18px 18px;
    margin-bottom: 18px;
    display: grid;
    gap: 14px;
  }

  .upload-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px 18px;
  }

  .upload-head h2 {
    margin: 2px 0 0;
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 600;
    color: var(--ink);
  }

  .eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.5);
  }

  .upload-state {
    margin: 0;
    display: grid;
    gap: 3px;
    font-size: 12px;
    line-height: 1.45;
    color: rgba(36, 28, 22, 0.62);
    text-align: right;
  }

  .upload-state strong {
    color: var(--ink);
  }

  .upload-count {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .upload-fields {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .field {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .field > span {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.68);
  }

  input[type='text'] {
    width: 100%;
    border: 1px solid rgba(36, 28, 22, 0.22);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.7);
    padding: 10px 12px;
    color: var(--ink);
    font: inherit;
    font-size: 13.5px;
    outline: none;
  }

  input[type='text']:focus {
    border-color: var(--vermilion);
    box-shadow: 0 0 0 3px rgba(178, 58, 48, 0.1);
  }

  .pick-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pick-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid rgba(36, 28, 22, 0.3);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.9);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink);
    cursor: pointer;
  }

  .pick-btn:hover {
    border-color: rgba(36, 28, 22, 0.45);
  }

  .pick-btn:focus-within {
    outline: 2px solid var(--vermilion);
    outline-offset: 2px;
  }

  /* Input asli disembunyikan tetapi tetap fokusabel lewat label. */
  .pick-btn input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .summary {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: rgba(36, 28, 22, 0.66);
  }

  .summary-warn {
    color: var(--vermilion);
  }

  .summary code,
  .note code {
    font-family: var(--font-mono);
    font-size: 11.5px;
    padding: 1px 4px;
    background: rgba(36, 28, 22, 0.06);
    border-radius: 2px;
  }

  .keep-folder {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: rgba(36, 28, 22, 0.72);
    cursor: pointer;
  }

  .keep-folder input {
    width: 16px;
    height: 16px;
    accent-color: var(--vermilion);
  }

  .note {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.55;
    color: rgba(36, 28, 22, 0.5);
    max-width: 74ch;
  }

  .note.inline {
    align-self: center;
  }

  .form-error {
    margin: 0;
    padding: 8px 10px;
    border-left: 2px solid var(--vermilion);
    background: rgba(178, 58, 48, 0.07);
    color: #7d2a23;
    font-size: 12.5px;
  }

  .form-ok {
    margin: 0;
    padding: 8px 10px;
    border-left: 2px solid #4a6b45;
    background: rgba(74, 107, 69, 0.08);
    color: #33502f;
    font-size: 12.5px;
  }

  .upload-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  @media (max-width: 780px) {
    .upload-fields {
      grid-template-columns: 1fr;
    }

    .upload-state {
      text-align: left;
    }
  }
</style>
