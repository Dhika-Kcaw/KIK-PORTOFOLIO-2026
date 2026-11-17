<script>
  import { onMount } from 'svelte'
  import {
    Box3,
    CircleGeometry,
    Clock,
    DirectionalLight,
    Group,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    RingGeometry,
    Scene,
    SRGBColorSpace,
    Vector3,
    WebGLRenderer,
  } from 'three'
  import { MMDLoader } from '@moeru/three-mmd'
  import { MMDSpringBonePlugin } from '@moeru/three-mmd-physics-springbone'
  import { clamp, disposeObject3D } from '../core/math.js'

  let { item = null, onClose = null } = $props()

  let stageEl = $state(null)
  let modalEl = $state(null)
  let status = $state('loading')
  let message = $state('')
  let autoSpin = $state(true)

  /**
   * State kamera sengaja disimpan di objek biasa, bukan `$state`: nilainya
   * berubah tiap frame dan tidak perlu memicu render ulang Svelte.
   */
  const view = { yaw: 0.6, elevation: 0.16, zoom: 1, dragging: false }

  function close() {
    onClose?.()
  }

  function resetView() {
    view.yaw = 0.6
    view.elevation = 0.16
    view.zoom = 1
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  onMount(() => {
    // Gulir latar dihentikan selama pratinjau terbuka; tanpa ini roda gulir
    // yang dipakai untuk memperbesar model ikut menggeser dashboard.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => modalEl?.focus?.())

    let cancelled = false
    let renderer = null
    let mmd = null
    let frame = 0
    let teardown = () => {
      cancelled = true
    }

    async function start() {
      const stage = stageEl
      if (!stage) return

      const scene = new Scene()
      const camera = new PerspectiveCamera(32, 1, 0.1, 4000)
      const clock = new Clock()
      const turntable = new Group()
      const target = new Vector3(0, 1, 0)
      let radius = 1

      scene.add(turntable)

      renderer = new WebGLRenderer({ antialias: true, alpha: true })
      renderer.outputColorSpace = SRGBColorSpace
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setClearAlpha(0)

      const canvas = renderer.domElement
      canvas.style.display = 'block'
      canvas.style.position = 'relative'
      // Di atas gradasi lantai (:after) supaya model tidak ikut tergelapi.
      canvas.style.zIndex = '1'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      // `touch-action: none` supaya seret putar tidak dibajak menjadi gulir.
      canvas.style.touchAction = 'none'
      canvas.style.cursor = 'grab'
      stage.appendChild(canvas)

      // Cahaya netral seperti ruang pamer: kunci hangat, isi dingin, sorot tepi.
      scene.add(new HemisphereLight(0xfff4e2, 0x241c18, 1.5))
      const key = new DirectionalLight(0xfff0d4, 2.2)
      key.position.set(3, 6, 5)
      scene.add(key)
      const fill = new DirectionalLight(0xdfe8ff, 0.45)
      fill.position.set(-4, 1.5, 4)
      scene.add(fill)
      const rim = new DirectionalLight(0xffd2bb, 0.9)
      rim.position.set(-2, 3.5, -5)
      scene.add(rim)

      const resize = () => {
        const width = stage.clientWidth || 360
        const height = stage.clientHeight || 360
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(stage)
      resize()

      const aim = () => {
        // Jarak kamera dihitung dari bola pembungkus model dan sudut pandang
        // lensa, supaya model setinggi apa pun tetap utuh di dalam bingkai
        // (dulu memakai radius × 2,35 dan model MMD setinggi 20 unit terpotong).
        const fit = radius / Math.sin((camera.fov * Math.PI) / 360)
        const distance = fit * 1.12 * view.zoom
        camera.position.set(
          0,
          target.y + Math.sin(view.elevation) * distance,
          Math.cos(view.elevation) * distance,
        )
        camera.lookAt(target)
      }
      aim()

      const onPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        view.dragging = true
        view.pointerId = event.pointerId
        view.lastX = event.clientX
        view.lastY = event.clientY
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture?.(event.pointerId)
      }

      const onPointerMove = (event) => {
        if (!view.dragging || event.pointerId !== view.pointerId) return
        const dx = event.clientX - view.lastX
        const dy = event.clientY - view.lastY
        view.lastX = event.clientX
        view.lastY = event.clientY
        // Putaran bebas 360°: tidak ada batas kanan-kiri.
        view.yaw += dx * 0.011
        view.elevation = clamp(view.elevation + dy * 0.006, -0.32, 1.02)
      }

      const onPointerUp = (event) => {
        if (event.pointerId !== view.pointerId) return
        view.dragging = false
        view.pointerId = undefined
        canvas.style.cursor = 'grab'
      }

      const onWheel = (event) => {
        event.preventDefault()
        const step = Math.sign(event.deltaY) * 0.08
        view.zoom = clamp(view.zoom * (1 + step), 0.55, 2.2)
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
      canvas.addEventListener('wheel', onWheel, { passive: false })

      const tick = () => {
        frame = requestAnimationFrame(tick)
        if (cancelled) return
        const delta = Math.min(clock.getDelta(), 0.05)
        if (autoSpin && !view.dragging) view.yaw += delta * 0.55
        turntable.rotation.y = view.yaw
        mmd?.update?.(delta, { physics: true })
        aim()
        renderer.render(scene, camera)
      }
      tick()

      teardown = () => {
        cancelled = true
        cancelAnimationFrame(frame)
        observer.disconnect()
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
        canvas.removeEventListener('wheel', onWheel)
        mmd?.dispose?.()
        disposeObject3D(scene)
        renderer?.dispose?.()
        renderer?.forceContextLoss?.()
        canvas.remove()
      }

      try {
        const loader = new MMDLoader()
        loader.register(MMDSpringBonePlugin)
        const loaded = await loader.loadAsync(item?.pmx_url)
        if (cancelled) {
          loaded.dispose?.()
          return
        }

        mmd = loaded
        const mesh = mmd.mesh
        mesh.frustumCulled = false

        // Pusatkan model di titik asal dan taruh kakinya di lantai, sehingga
        // meja putar berputar pada sumbu tegak tubuhnya sendiri.
        const box = new Box3().setFromObject(mesh)
        const size = box.getSize(new Vector3())
        const center = box.getCenter(new Vector3())
        mesh.position.set(-center.x, -box.min.y, -center.z)
        turntable.add(mesh)

        radius = Math.max(size.x, size.y, size.z) * 0.5
        target.set(0, size.y * 0.52, 0)

        const disc = new Mesh(
          new CircleGeometry(Math.max(radius * 1.15, 0.001), 48),
          new MeshBasicMaterial({ color: 0x2b1e17, transparent: true, opacity: 0.1 }),
        )
        disc.rotation.x = -Math.PI / 2
        disc.position.y = 0.002
        turntable.add(disc)

        const ring = new Mesh(
          new RingGeometry(radius * 1.02, radius * 1.06, 48),
          new MeshBasicMaterial({ color: 0x8a3b31, transparent: true, opacity: 0.32 }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.004
        turntable.add(ring)

        resize()
        status = 'ready'
      } catch (error) {
        if (cancelled) return
        status = 'error'
        message = error?.message || String(error)
      }
    }

    // Galat di luar pemuatan model (mis. WebGL diblokir peramban) juga harus
    // tampil sebagai pesan, bukan pratinjau kosong tanpa penjelasan.
    start().catch((error) => {
      if (cancelled) return
      status = 'error'
      message = error?.message || String(error)
    })

    return () => {
      document.body.style.overflow = previousOverflow
      teardown()
    }
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="modal-backdrop"
  role="presentation"
  onclick={(event) => {
    if (event.target === event.currentTarget) close()
  }}
>
  <div
    class="modal preview-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="preview-title"
    tabindex="-1"
    bind:this={modalEl}
  >
    <header class="modal-head">
      <div class="modal-title">
        <span class="modal-seal" aria-hidden="true">形</span>
        <div>
          <p class="preview-eyebrow">Pratinjau model</p>
          <h2 id="preview-title">{item?.name ?? 'Model'}</h2>
        </div>
      </div>
      <button class="icon-btn" type="button" onclick={close} aria-label="Tutup pratinjau">×</button>
    </header>

    <div class="preview-stage" bind:this={stageEl}>
      {#if status !== 'ready'}
        <div class="preview-overlay">
          {#if status === 'loading'}
            <p class="preview-loading" role="status">Memuat model…</p>
            <p class="preview-note">{item?.pmx_url}</p>
          {:else}
            <p class="preview-error" role="alert">Model gagal dimuat.</p>
            <p class="preview-note">{message}</p>
            <p class="preview-note">{item?.pmx_url}</p>
          {/if}
        </div>
      {/if}
    </div>

    <footer class="modal-foot">
      <div class="preview-meta">
        <p class="preview-hint">
          Seret untuk memutar 360°, gulir untuk memperbesar.
        </p>
        <p class="preview-note">
          Skala museum {Number(item?.scale ?? 0) > 0 ? Number(item.scale).toFixed(2).replace('.', ',') : '0,08'}
          {#if item?.slug}· folder <code>{item.slug}</code>{/if}
        </p>
      </div>
      <div>
        <label class="preview-auto">
          <input type="checkbox" bind:checked={autoSpin} />
          <span>Putar otomatis</span>
        </label>
        <button class="button ghost" type="button" onclick={resetView}>Reset</button>
        <button class="button primary" type="button" onclick={close}>Tutup</button>
      </div>
    </footer>
  </div>
</div>

<style>
  .preview-modal {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(820px, 100%);
    max-height: min(92dvh, 900px);
    overflow: auto;
  }

  .preview-eyebrow {
    margin: 0 0 2px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.5);
  }

  .preview-stage {
    position: relative;
    min-height: 300px;
    height: min(52dvh, 520px);
    background:
      radial-gradient(85% 70% at 50% 30%, #fbf2df 0%, #efe0c2 62%, #e2cfab 100%);
  }

  .preview-stage::after {
    /* Garis cakrawala tipis: memberi kesan lantai ruang pamer, bukan latar kosong. */
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 34%;
    background: linear-gradient(180deg, rgba(36, 28, 22, 0) 0%, rgba(36, 28, 22, 0.07) 100%);
    pointer-events: none;
  }

  .preview-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 6px;
    padding: 22px;
    text-align: center;
  }

  .preview-loading {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.6);
  }

  .preview-error {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vermilion-deep);
  }

  .preview-note {
    margin: 0;
    max-width: 46ch;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(36, 28, 22, 0.55);
    overflow-wrap: anywhere;
  }

  .preview-note code {
    font-family: var(--font-mono);
    font-size: 10.5px;
  }

  .preview-meta {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .preview-hint {
    margin: 0;
    font-size: 11.5px;
    color: rgba(36, 28, 22, 0.7);
  }

  .preview-auto {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 4px;
    margin-right: 4px;
    font-size: 11.5px;
    color: rgba(36, 28, 22, 0.72);
    cursor: pointer;
  }

  .preview-auto input {
    width: 15px;
    height: 15px;
    accent-color: var(--vermilion);
  }

  @media (max-width: 640px) {
    .preview-stage {
      height: min(50dvh, 420px);
    }

    .preview-modal .modal-foot {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .preview-modal .modal-foot > div:last-child {
      width: 100%;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }
</style>
