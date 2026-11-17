<script>
  import { onMount } from 'svelte'
  import { PortfolioApp } from './app/PortfolioApp.js'
  import { CONFIG } from './config.js'
  import { isTouchDevice } from './core/device.js'
  import Hud from './ui/Hud.svelte'
  import HelpOverlay from './ui/HelpOverlay.svelte'
  import MuseumIndex from './ui/MuseumIndex.svelte'
  import MuseumPanel from './ui/MuseumPanel.svelte'
  import SeatHud from './ui/SeatHud.svelte'
  import VisitorDialog from './ui/VisitorDialog.svelte'
  import WebEmbedModal from './ui/WebEmbedModal.svelte'
  import LoadingScreen from './ui/LoadingScreen.svelte'

  let container = $state(null)
  let app = null

  // Layar sentuh: HUD dan panduan memakai teks gestur, bukan tombol papan ketik.
  const touch = isTouchDevice()

  let progress = $state(0)
  let progressLabel = $state('Menyiapkan museum')
  let ready = $state(false)
  let error = $state('')
  let portfolio = $state(null)
  let activeView = $state(null)
  let activeTestimonial = $state(null)
  // Duduk di meja judi: dunia jadi orang pertama, panel 2D tidak dipakai.
  let seated = $state(false)
  let embedProject = $state(null)
  let indexOpen = $state(false)
  let helpOpen = $state(true)
  let prompt = $state(null)
  let controlMode = $state(CONFIG.controls.defaultMode)
  let physicsEnabled = $state(CONFIG.physics.enabled)
  let muted = $state(false)

  const profile = $derived(portfolio?.profile ?? null)

  $effect(() => {
    const visible =
      ready &&
      helpOpen &&
      !activeView &&
      !activeTestimonial &&
      !embedProject &&
      !indexOpen &&
      !seated
    if (app) app.setHelpVisible(visible)
  })

  onMount(() => {
    app = new PortfolioApp(container, {
      onProgress: (value, label) => {
        progress = value
        if (label) progressLabel = label
      },
      onData: (data) => {
        portfolio = data
      },
      onReady: () => {
        ready = true
      },
      onOpenView: (view) => {
        activeView = view
        activeTestimonial = null
        indexOpen = false
        helpOpen = false
      },
      onTestimonial: (testimonial) => {
        activeTestimonial = testimonial
        activeView = null
        indexOpen = false
        helpOpen = false
      },
      // Duduk/berdiri dari meja judi. Dunia dikendalikan `SeatHud`.
      onSeat: (state) => {
        seated = Boolean(state?.open)
        if (state?.open) {
          helpOpen = false
          indexOpen = false
          activeView = null
          activeTestimonial = null
        }
      },
      onCloseView: () => {
        activeView = null
        activeTestimonial = null
      },
      onPrompt: (value) => {
        prompt = value
      },
      // Tombol E di depan stasiun menutup kartu panduan lebih dulu, bukan
      // diam saja karena overlay panduan masih terbuka.
      onDismissHelp: () => {
        helpOpen = false
      },
      onModeChange: (value) => {
        controlMode = value
      },
      onPhysicsChange: (value) => {
        physicsEnabled = value
      },
      onMuteChange: (value) => {
        muted = value
      },
    })

    if (import.meta.env.DEV) window.__portfolioApp = app

    app.init().catch((reason) => {
      error = reason?.message ?? String(reason)
      app?.dispose()
    })

    const moveKeys = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      // Space ikut menutup panduan: tanpa ini, orang menekan Space untuk lompat
      // saat panduan masih terbuka dan mengira lompatnya rusak.
      'Space',
    ])

    const dismissHelp = (event) => {
      if (!helpOpen) return
      if (moveKeys.has(event.code)) helpOpen = false
    }
    window.addEventListener('keydown', dismissHelp)

    const handleEscape = (event) => {
      if (event.code !== 'Escape') return
      if (seated) {
        app?.closeSeat()
        return
      }
      if (embedProject) {
        embedProject = null
        return
      }
      if (activeView || activeTestimonial) {
        closeView()
        return
      }
      if (indexOpen) {
        indexOpen = false
        return
      }
      if (helpOpen) helpOpen = false
    }
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', dismissHelp)
      window.removeEventListener('keydown', handleEscape)
      if (import.meta.env.DEV) delete window.__portfolioApp
      app?.dispose()
      app = null
    }
  })

  function closeView() {
    app?.closePanel()
    activeView = null
    activeTestimonial = null
  }

  function openEmbed(project) {
    app?.startAudio()
    embedProject = project
  }

  function closeEmbed() {
    embedProject = null
  }

  function toggleMode(mode) {
    app?.setControlMode(mode)
  }

  function togglePhysics() {
    app?.togglePhysics()
  }

  function toggleMute() {
    app?.toggleMute()
  }

  /**
   * Satu-satunya cara membuka bagian: karakter harus berjalan ke meja/bingkai/NPC
   * yang bersangkutan. Indeks dan tombol di panel hanya mengantar ke sana.
   */
  function visitView(view) {
    if (!view) return
    if (activeView || activeTestimonial) closeView()
    indexOpen = false
    helpOpen = false
    app?.startAudio()
    app?.visitView(view)
  }

  function openIndex() {
    app?.startAudio()
    helpOpen = false
    indexOpen = true
  }

  function closeHelp() {
    app?.startAudio()
    helpOpen = false
  }

  function playBlip() {
    app?.playBlip()
  }
</script>

<div class="app-shell">
  <div class="scene-host" bind:this={container}></div>

  {#if ready && profile}
    <Hud
      {profile}
      mode={controlMode}
      {physicsEnabled}
      {muted}
      {prompt}
      {touch}
      hidden={Boolean(activeView || activeTestimonial || embedProject || indexOpen || seated)}
      onToggleMode={toggleMode}
      onTogglePhysics={togglePhysics}
      onToggleMute={toggleMute}
      onOpenIndex={openIndex}
      onToggleHelp={() => (helpOpen = !helpOpen)}
    />
  {/if}

  {#if ready && indexOpen && !activeView && !seated}
    <MuseumIndex
      data={portfolio}
      onClose={() => (indexOpen = false)}
      onVisit={visitView}
    />
  {/if}

  {#if activeTestimonial && !activeView}
    <VisitorDialog
      testimonial={activeTestimonial}
      onClose={closeView}
      onBlip={playBlip}
    />
  {/if}

  {#if activeView && portfolio}
    <MuseumPanel
      view={activeView}
      data={portfolio}
      onClose={closeView}
      onNavigate={visitView}
      onOpenEmbed={openEmbed}
      onBlip={playBlip}
      onBoardPost={(note) => app?.postBoardNote(note)}
    />
  {/if}

  <!-- Duduk di meja judi: kartu ada di meja 3D, antarmuka hanya bilah permainan. -->
  {#if seated}
    <SeatHud
      onSync={(game) => app?.syncSeat(game)}
      onLeave={() => app?.closeSeat()}
      onBlip={playBlip}
    />
  {/if}

  {#if embedProject}
    <WebEmbedModal
      project={{ ...embedProject, href: embedProject.demo_url || embedProject.repo_url || '', year: embedProject.year }}
      onClose={closeEmbed}
    />
  {/if}

  {#if ready && helpOpen && !activeView && !activeTestimonial && !embedProject && !indexOpen && !seated}
    <HelpOverlay {touch} onClose={closeHelp} />
  {/if}

  {#if !ready}
    <LoadingScreen {progress} {progressLabel} {error} />
  {/if}
</div>
