<script>
  import { safeHref } from '../panel-utils.js'

  let { profile } = $props()

  let form = $state({ name: '', email: '', subject: '', message: '' })
  let sending = $state(false)
  let status = $state('')
  let statusOk = $state(false)

  const channels = $derived(
    [
      ['Email', 'mailto', profile.email, '@'],
      ['GitHub', 'github', profile.github, 'GH'],
      ['Instagram', 'instagram', profile.instagram, 'IG'],
      ['LinkedIn', 'linkedin', profile.linkedin, 'IN'],
    ].filter(([, , value]) => value),
  )

  async function submit(event) {
    event.preventDefault()
    if (sending) return
    sending = true
    status = ''
    statusOk = false

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Pesan gagal dikirim.')

      statusOk = true
      status = result.message || 'Pesan terkirim. Terima kasih!'
      form = { name: '', email: '', subject: '', message: '' }
    } catch (reason) {
      statusOk = false
      status = reason?.message ?? 'Pesan gagal dikirim. Coba lagi nanti.'
    } finally {
      sending = false
    }
  }

  const channelHref = (value) => {
    const text = String(value ?? '')
    if (text.includes('@') && !text.startsWith('http')) return `mailto:${text}`
    return safeHref(text)
  }
</script>

<div class="contact-view">
  <section class="panel-section">
    <p class="kicker">Pintu terbuka</p>
    <h4>Hubungi saya</h4>
    <p class="lede wide">
      Silakan hubungi lewat kanal di bawah, atau tinggalkan pesan langsung lewat formulir museum ini.
    </p>

    <div class="contact-grid">
      {#each channels as [label, , value, badge] (label)}
        <a class="contact-card" href={channelHref(value)} target="_blank" rel="noreferrer">
          <span class="contact-icon" aria-hidden="true">{badge}</span>
          <span>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        </a>
      {/each}
      {#if !channels.length}
        <p class="empty-line">Kanal kontak belum diisi di dashboard admin.</p>
      {/if}
    </div>
  </section>

  <section class="message-form">
    <div class="form-head">
      <div>
        <p class="kicker">Formulir kontak</p>
        <h4>Kirim pesan ke pemilik arsip</h4>
      </div>
    </div>

    <form class="form-grid" onsubmit={submit}>
      <div class="field">
        <label for="message-name">Nama</label>
        <input id="message-name" bind:value={form.name} required minlength="2" maxlength="80" placeholder="Nama kamu" />
      </div>
      <div class="field">
        <label for="message-email">Email (opsional)</label>
        <input id="message-email" type="email" bind:value={form.email} placeholder="nama@email.com" />
      </div>
      <div class="field full">
        <label for="message-subject">Subjek</label>
        <input id="message-subject" bind:value={form.subject} maxlength="160" placeholder="Tentang apa pesan ini" />
      </div>
      <div class="field full">
        <label for="message-body">Pesan</label>
        <textarea id="message-body" bind:value={form.message} required minlength="5" maxlength="2000" rows="4"
          placeholder="Tulis pesanmu di sini…"></textarea>
      </div>
      <div class="field full form-actions">
        <button class="button primary" type="submit" disabled={sending}>
          {sending ? 'Mengirim…' : 'Kirim pesan'}
        </button>
        <p class="form-note">
          Pesan kontak bersifat privat dan hanya dibaca pemilik arsip. Untuk menilai sebuah
          karya, buka bingkai proyeknya di galeri dan tulis umpan balik di sana.
        </p>
      </div>
      {#if status}
        <p class="form-status full" class:ok={statusOk} role="status">{status}</p>
      {/if}
    </form>
  </section>
</div>

<style>
  .form-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;
  }

  .form-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .form-note {
    flex: 1;
    min-width: 160px;
    font-size: 9.5px;
    line-height: 1.45;
    color: rgba(36, 28, 22, 0.45);
  }

  @media (max-width: 620px) {
    .form-head {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
