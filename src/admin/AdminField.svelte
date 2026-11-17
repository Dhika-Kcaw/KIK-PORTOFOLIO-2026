<script>
  import { uploadFile } from './api.js'

  let { field, value = $bindable('') } = $props()

  let listText = $state(Array.isArray(value) ? value.join('\n') : '')
  let uploading = $state(false)
  let uploadError = $state('')
  let fileInput = $state(null)

  const isHalf = $derived(field.width === 'half')

  // Nilai daftar bisa datang belakangan (profil dimuat setelah kolom tampil)
  // atau dirapikan server setelah disimpan. Tanpa sinkronisasi ini textarea
  // tampak kosong walau database berisi, dan mengetik satu baris bisa
  // menghapus sisa daftar yang tidak terlihat.
  $effect(() => {
    const incoming = Array.isArray(value) ? value.join('\n') : ''
    if (incoming === listText) return
    const typed = listText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
    if (typed === incoming) return
    listText = incoming
  })

  function updateList(event) {
    listText = event.currentTarget.value
    value = listText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  async function handleUpload(event) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    uploading = true
    uploadError = ''
    try {
      const result = await uploadFile(file)
      value = result.url
    } catch (error) {
      uploadError = error.message
    } finally {
      uploading = false
      if (fileInput) fileInput.value = ''
    }
  }

  const uploadLabel = $derived(field.type === 'file' ? 'Pilih PDF' : 'Pilih gambar')
  const accept = $derived(field.type === 'file' ? 'application/pdf' : 'image/*')
</script>

<div class="field" class:half={isHalf}>
  {#if field.type === 'boolean'}
    <!-- Label bertingkat tidak valid di HTML, jadi judul field dipisah. -->
    <span class="field-label">
      {field.label}
      {#if field.required}<span class="required" aria-hidden="true">*</span>{/if}
    </span>
  {:else}
    <label for={`field-${field.name}`}>
      {field.label}
      {#if field.required}<span class="required" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  {#if field.type === 'textarea'}
    <textarea
      id={`field-${field.name}`}
      rows={field.rows ?? 4}
      bind:value
      required={field.required}
      placeholder={field.hint ?? ''}
    ></textarea>
  {:else if field.type === 'select'}
    <select id={`field-${field.name}`} bind:value>
      {#each field.options ?? [] as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {:else if field.type === 'boolean'}
    <label class="toggle" for={`field-${field.name}`}>
      <input id={`field-${field.name}`} type="checkbox" bind:checked={value} />
      <span class="track" aria-hidden="true"><span class="thumb"></span></span>
      <span class="toggle-copy">{value ? 'Aktif' : 'Tidak aktif'}</span>
    </label>
  {:else if field.type === 'number'}
    <input
      id={`field-${field.name}`}
      type="number"
      min={field.min}
      max={field.max}
      bind:value
      required={field.required}
    />
  {:else if field.type === 'list'}
    <textarea
      id={`field-${field.name}`}
      rows={field.rows ?? Math.max(4, Math.min(9, listText.split('\n').length + 2))}
      value={listText}
      oninput={updateList}
      placeholder={field.hint ?? 'Satu baris per item'}
    ></textarea>
  {:else if field.type === 'image' || field.type === 'file'}
    <div class="upload-row">
      <input
        id={`field-${field.name}`}
        type="text"
        bind:value
        placeholder="URL /uploads/... atau tempel tautan"
      />
      <button
        class="upload-btn"
        type="button"
        onclick={() => fileInput?.click()}
        disabled={uploading}
      >
        {uploading ? 'Mengunggah…' : uploadLabel}
      </button>
      <input
        bind:this={fileInput}
        class="file-input"
        type="file"
        {accept}
        onchange={handleUpload}
      />
    </div>
    {#if uploadError}<p class="upload-error">{uploadError}</p>{/if}
    {#if value && field.type === 'image'}
      <div class="preview">
        <img src={value} alt={`Pratinjau ${field.label}`} />
      </div>
    {:else if value && field.type === 'file'}
      <a class="file-link" href={value} target="_blank" rel="noreferrer">
        Buka berkas terpasang ↗
      </a>
    {/if}
  {:else}
    <input
      id={`field-${field.name}`}
      type="text"
      bind:value
      required={field.required}
      placeholder={field.hint ?? ''}
    />
  {/if}

  {#if field.hint && field.type !== 'textarea'}
    <p class="hint">{field.hint}</p>
  {/if}
</div>

<style>
  .field {
    display: grid;
    grid-column: 1 / -1;
    gap: 7px;
    min-width: 0;
  }

  .field.half {
    grid-column: span 1;
  }

  label,
  .field-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.68);
  }

  .required {
    color: var(--vermilion);
  }

  input:not([type='checkbox']):not([type='file']),
  textarea,
  select {
    width: 100%;
    border: 1px solid rgba(36, 28, 22, 0.22);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.7);
    padding: 10px 12px;
    color: var(--ink);
    font: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    outline: none;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  textarea {
    resize: vertical;
    min-height: 86px;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--vermilion);
    box-shadow: 0 0 0 3px rgba(178, 58, 48, 0.1);
  }

  .hint {
    font-size: 11.5px;
    line-height: 1.45;
    color: rgba(36, 28, 22, 0.5);
  }

  .upload-row {
    display: flex;
    gap: 7px;
  }

  .upload-row input {
    flex: 1;
    min-width: 0;
  }

  .upload-btn {
    flex: 0 0 auto;
    padding: 0 12px;
    border: 1px solid rgba(36, 28, 22, 0.3);
    border-radius: 2px;
    background: rgba(36, 28, 22, 0.06);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--ink);
  }

  .upload-btn:hover {
    background: rgba(36, 28, 22, 0.12);
  }

  .upload-btn:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .file-input {
    display: none;
  }

  .preview {
    margin-top: 3px;
    width: 100%;
    max-width: 280px;
    border: 1px solid rgba(36, 28, 22, 0.15);
    background: rgba(36, 28, 22, 0.04);
    padding: 5px;
  }

  .preview img {
    display: block;
    width: 100%;
    max-height: 150px;
    object-fit: cover;
  }

  .upload-error {
    font-size: 11.5px;
    color: var(--vermilion-deep);
  }

  .file-link {
    justify-self: start;
    font-size: 12px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid rgba(36, 28, 22, 0.16);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.55);
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-body);
    font-size: 12.5px;
    color: var(--ink);
  }

  .toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .track {
    position: relative;
    width: 34px;
    height: 18px;
    border-radius: 999px;
    background: rgba(36, 28, 22, 0.2);
    transition: background 0.18s ease;
  }

  .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fffaf0;
    transition: transform 0.18s ease;
  }

  .toggle input:checked + .track {
    background: var(--vermilion);
  }

  .toggle input:checked + .track .thumb {
    transform: translateX(16px);
  }

  .toggle-copy {
    color: rgba(36, 28, 22, 0.62);
    font-size: 12px;
  }

  @media (max-width: 720px) {
    .field,
    .field.half {
      grid-column: 1 / -1;
    }

    .upload-row {
      flex-wrap: wrap;
    }

    .upload-btn {
      min-height: 38px;
    }
  }
</style>
