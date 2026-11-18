<script>
  import { onMount } from 'svelte'
  import { isTouchDevice } from '../core/device.js'
  import { api } from './api.js'

  let { onSuccess } = $props()

  let email = $state('')
  let password = $state('')
  let busy = $state(false)
  let error = $state('')
  let emailEl = $state(null)

  onMount(() => {
    // Di ponsel jangan langsung memunculkan papan tombol.
    if (!isTouchDevice()) emailEl?.focus()
  })

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    busy = true
    error = ''
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      onSuccess?.(result.admin)
    } catch (reason) {
      error = reason.message || 'Tidak bisa masuk.'
    } finally {
      busy = false
    }
  }
</script>

<div class="screen">
  <div class="grain" aria-hidden="true"></div>

  <main class="card">
    <header class="head">
      <span class="seal" aria-hidden="true">往</span>
      <div>
        <p class="eyebrow">NekoNeko Archive</p>
        <h1>Masuk ke meja arsip</h1>
      </div>
    </header>

    <p class="lede">
      Kelola profil, proyek, sertifikat, pengalaman, testimoni, dan pesan yang tampil
      di museum 3D. Hanya admin yang dapat membuka halaman ini.
    </p>

    <form onsubmit={submit}>
      <label>
        <span>Email admin</span>
        <input
          bind:this={emailEl}
          name="email"
          type="email"
          bind:value={email}
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          placeholder="admin@nekoneko.local"
          required
        />
      </label>

      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </label>

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <button class="submit" type="submit" disabled={busy}>
        {busy ? 'Memeriksa…' : 'Masuk'}
        <span aria-hidden="true">→</span>
      </button>
    </form>

    <footer>
      <a href="/">← Kembali ke museum</a>
      <span>Lupa kata sandi? Hubungi pengelola proyek untuk mengatur ulang akun admin.</span>
    </footer>
  </main>
</div>

<style>
  .screen {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 28px;
    padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    background:
      radial-gradient(80% 70% at 18% 0%, rgba(201, 160, 92, 0.16), transparent 60%),
      radial-gradient(70% 60% at 100% 100%, rgba(178, 58, 48, 0.1), transparent 60%),
      linear-gradient(135deg, #ece0c8 0%, #e2d2b4 58%, #d6c19e 100%);
    color: var(--ink);
  }

  .grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background:
      repeating-linear-gradient(90deg, rgba(112, 84, 46, 0.035) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(0deg, rgba(112, 84, 46, 0.025) 0 1px, transparent 1px 4px);
  }

  .card {
    position: relative;
    width: min(470px, 100%);
    padding: 34px 36px 26px;
    border: 1px solid rgba(36, 28, 22, 0.34);
    border-radius: 2px;
    background:
      radial-gradient(120% 130% at 30% 5%, #faf1dd 0%, #f1e3c7 55%, #e5d3b1 100%);
    box-shadow:
      0 28px 70px rgba(36, 24, 16, 0.26),
      inset 0 0 0 6px rgba(255, 250, 238, 0.34),
      inset 0 0 0 7px rgba(36, 28, 22, 0.1);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    border: 1px solid rgba(255, 244, 220, 0.42);
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 20px;
    transform: rotate(-2deg);
    box-shadow: 0 4px 9px rgba(80, 30, 24, 0.25);
  }

  .eyebrow {
    margin-bottom: 4px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.52);
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(24px, 4vw, 31px);
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.02em;
  }

  .lede {
    margin-top: 18px;
    color: rgba(36, 28, 22, 0.7);
    font-size: 13.5px;
    line-height: 1.65;
  }

  form {
    display: grid;
    gap: 16px;
    margin-top: 24px;
  }

  label {
    display: grid;
    gap: 7px;
  }

  label span {
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.58);
  }

  input {
    width: 100%;
    min-height: 44px;
    border: 1px solid rgba(36, 28, 22, 0.22);
    border-radius: 2px;
    background: rgba(255, 252, 244, 0.68);
    padding: 10px 12px;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    outline: none;
  }

  input:focus {
    border-color: var(--vermilion);
    box-shadow: 0 0 0 3px rgba(178, 58, 48, 0.12);
  }

  .error {
    padding: 9px 11px;
    border-left: 2px solid var(--vermilion);
    background: rgba(178, 58, 48, 0.08);
    color: var(--vermilion-deep);
    font-size: 12.5px;
  }

  .submit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 46px;
    margin-top: 4px;
    padding: 0 16px;
    border: 1px solid var(--vermilion-deep);
    border-radius: 2px;
    background: var(--vermilion);
    color: #fbf1dc;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition:
      background 0.15s ease,
      transform 0.15s ease;
  }

  .submit:hover {
    background: var(--vermilion-deep);
  }

  .submit:active {
    transform: translateY(1px);
  }

  .submit:disabled {
    opacity: 0.62;
    cursor: wait;
  }

  footer {
    display: grid;
    gap: 7px;
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px dashed rgba(36, 28, 22, 0.22);
    font-size: 11px;
    line-height: 1.5;
    color: rgba(36, 28, 22, 0.5);
  }

  footer a {
    justify-self: start;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  @media (max-width: 520px) {
    .screen {
      padding: 16px;
    }

    .card {
      padding: 26px 22px 20px;
    }
  }

  /* iOS memperbesar halaman bila input < 16px. */
  @media (pointer: coarse) {
    input {
      font-size: 16px;
    }
  }
</style>
