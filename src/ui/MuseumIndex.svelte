<script>
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'

  /**
   * Peta museum.
   *
   * Ini bukan gambar statis dan bukan daftar terpisah: `source()` dipanggil
   * berulang selama panel terbuka dan mengembalikan potret dunia yang sedang
   * berjalan (`PortfolioApp.getMapState()`). Penanda meja, bingkai proyek,
   * pengunjung, papan testimoni, dan meja judi semuanya datang dari
   * `world.exhibits.items`, sehingga peta otomatis ikut berubah saat koleksi
   * bertambah, pengunjung berjalan, atau karakter berpindah tempat.
   *
   * Kerucut pandang tidak ditebak dari `yaw` kamera: `getMapState()` mengirim
   * vektor pandang kamera yang benar-benar merender plus setengah sudut
   * pandangnya, jadi gambar di peta selalu sama dengan yang terlihat di layar.
   */
  let { source = null, title = '', onClose, onVisit } = $props()

  let live = $state(null)
  let hoveredId = $state(null)

  // ~11 potret per detik cukup untuk gerak yang enak dilihat, jauh lebih murah
  // daripada menggambar ulang tiap bingkai.
  const POLL_MS = 90

  onMount(() => {
    let frame = 0
    let last = 0
    let alive = true

    const paint = () => {
      const next = source?.()
      if (next) live = next
    }

    const tick = (time) => {
      if (!alive) return
      if (time - last >= POLL_MS) {
        last = time
        paint()
      }
      frame = requestAnimationFrame(tick)
    }

    paint()
    frame = requestAnimationFrame(tick)

    return () => {
      alive = false
      cancelAnimationFrame(frame)
    }
  })

  /* ---------------------------------------------------------------- skala */

  // Dunia `[-half-1, half+1]` dipetakan ke 0–1000 unit SVG (dan 0–100 %).
  const half = $derived(live?.half ?? 18)
  const span = $derived(half * 2 + 2)
  const svg = (value) => ((value + span / 2) / span) * 1000
  const svgLen = (value) => (value / span) * 1000
  const pct = (value) => ((value + span / 2) / span) * 100

  const plate = $derived({ at: svg(-half), size: svgLen(half * 2) })
  /** Satu meter dalam unit SVG — dipakai men-skala tapak perabot. */
  const unit = $derived(svgLen(1))
  const plazaRadius = $derived(svgLen(live?.plaza?.radius ?? 5.2))
  const inkRadius = $derived(plazaRadius * 0.415)
  const treeRadius = $derived(plazaRadius * 0.254)

  const northZ = $derived(live?.walls?.z ?? -(half - 1.9))
  const westX = $derived(live?.walls?.x ?? -(half - 1.9))
  const northY = $derived(svg(northZ))
  const westY = $derived(svg(westX))

  const playerPoint = $derived({ x: svg(live?.player?.x ?? 0), y: svg(live?.player?.z ?? 0) })
  // Arah hadap karakter: 0 rad = sumbu +Z, yang di peta menjadi bawah layar.
  const facingDeg = $derived(((live?.player?.heading ?? 0) * 180) / Math.PI)

  const targetPoint = $derived(
    live?.destination ? { x: svg(live.destination.x), y: svg(live.destination.z) } : null,
  )

  const markerPoint = $derived(
    live?.marker ? { x: svg(live.marker.x), y: svg(live.marker.z) } : null,
  )

  /** Grid lantai: satu sel = 2 m. */
  const cellSize = $derived(svgLen(2))

  /* ------------------------------------------------------------- koleksi */

  const stations = $derived(live?.stations ?? [])

  // Tapak perabot: meja, bingkai, papan, dan meja judi punya bentuk nyata.
  // Pengunjung hanya titik — mereka berjalan, jadi tapaknya akan menyesatkan.
  const furniture = $derived(stations.filter((station) => station.shape !== 'person'))

  const stats = $derived.by(() => {
    const pick = (kind) => stations.filter((station) => station.kind === kind).length
    return {
      sections: pick('section'),
      projects: pick('project'),
      visitors: pick('visitor'),
      boards: pick('board'),
      games: pick('game'),
      total: stations.length,
    }
  })

  // Warna legenda memakai aksen yang sama dengan penanda di peta.
  const legend = $derived([
    { key: 'section', label: 'Meja bagian', color: '#c9a05c', count: stats.sections },
    { key: 'project', label: 'Bingkai proyek', color: '#a98bb8', count: stats.projects },
    { key: 'visitor', label: 'Pengunjung', color: '#c07a86', count: stats.visitors },
    { key: 'board', label: 'Papan testimoni', color: '#b23a30', count: stats.boards },
    { key: 'game', label: 'Meja kartu', color: '#7f9b86', count: stats.games },
  ])

  const KIND_LABEL = {
    section: 'Meja bagian',
    project: 'Bingkai proyek',
    visitor: 'Pengunjung',
    board: 'Papan testimoni',
    game: 'Meja kartu',
  }

  /* --------------------------------------------------------- daftar tempat */

  /**
   * Saringan daftar tempat, dikendalikan dari baris legenda.
   *
   * Di layar sentuh tidak ada hover, jadi nama penanda di peta praktis tidak
   * pernah terbaca (labelnya hanya muncul saat disorot). Daftar ini yang
   * membacakan nama semua koleksi, dan sekaligus menjadi jalan tercepat ke
   * bingkai proyek yang berjumlah 20+ dan berdesakan di denah.
   */
  let listFilter = $state('all')

  /** Penanda yang dipilih dengan klik/ketuk. `null` = tidak ada yang dipilih. */
  let selectedId = $state(null)

  /** Ulah tampilan di layar sempit: denah atau daftar (lihat §50.6.3). */
  let viewMode = $state('map')

  /** Kelompok daftar yang dilipat, per jenis penanda. */
  let collapsedKinds = $state({})

  function toggleFilter(key) {
    listFilter = listFilter === key ? 'all' : key
  }

  function toggleGroup(kind) {
    collapsedKinds = { ...collapsedKinds, [kind]: !collapsedKinds[kind] }
  }

  /**
   * Klik penanda = **memilih**, bukan langsung berjalan: pemain melihat dulu
   * benda mana yang dimaksud (dan di baris rak atas/bawah yang mana) sebelum
   * menekan Datangi. Menekan penanda yang sama sekali lagi melepas pilihan.
   */
  function selectStation(station) {
    if (!station?.id) return
    selectedId = selectedId === station.id ? null : station.id
    if (selectedId) viewMode = 'map'
  }

  // Penanda yang sedang “aktif” di peta: yang diklik (menempel) didahulukan,
  // lalu yang disorot kursor. Keduanya hanya **menandai** — karakter baru
  // berjalan setelah tombol Datangi ditekan.
  const focus = $derived(
    stations.find((station) => station.id === (selectedId ?? hoveredId)) ?? null,
  )

  // Urutan kelompok tetap (bukan urut jarak antar-jenis), supaya baris tidak
  // berpindah tempat saat karakter berjalan.
  const KIND_ORDER = ['section', 'project', 'board', 'game', 'visitor']

  const rosterGroups = $derived.by(() => {
    if (!live) return []
    const x = live.player.x
    const z = live.player.z
    const rows = stations.map((station) => ({
      ...station,
      distance: Math.hypot(station.x - x, station.z - z),
    }))

    return KIND_ORDER.filter((kind) => listFilter === 'all' || kind === listFilter)
      .map((kind) => {
        const kindRows = rows
          .filter((station) => station.kind === kind)
          .sort((a, b) => a.distance - b.distance)
        return {
          kind,
          label: KIND_LABEL[kind] ?? 'Koleksi',
          count: kindRows.length,
          rows: kindRows,
          open: !collapsedKinds[kind],
        }
      })
      .filter((group) => group.count > 0)
  })

  const rosterCount = $derived(rosterGroups.reduce((total, group) => total + group.count, 0))

  const rosterTitle = $derived(
    listFilter === 'all' ? 'Semua tempat' : (KIND_LABEL[listFilter] ?? 'Tempat'),
  )

  const mapAlt = $derived(
    `Denah museum dengan ${stats.total} penanda: ${stats.sections} meja bagian, ` +
      `${stats.projects} bingkai proyek, ${stats.visitors} pengunjung.`,
  )

  /* ------------------------------------------------------- kerucut pandang */

  /**
   * Kerucut pandang kamera.
   *
   * Arahnya diambil dari `camera.pov` — arah gambar yang sudah diturunkan dari
   * kamera yang merender (`getMapState()`), lebarnya dari `camera.halfAngle`
   * (FOV horizontal asli), dan **jangkauannya dari `camera.reach`** sehingga
   * kerucut memendek saat diorama diperbesar dengan roda mouse dan memanjang
   * saat kamera ditarik mundur. Puncaknya di karakter, lalu kerucut dipotong
   * oleh tepi lantai supaya tidak pernah tumpah ke margin kertas.
   */
  const view = $derived.by(() => {
    if (!live) return null

    const camera = live.camera ?? {}
    const raw = camera.pov ?? camera.view
    const rawLength = raw ? Math.hypot(raw.x, raw.z) : 0
    const yaw = camera.yaw ?? 0
    // Cadangan hanya dipakai bila kamera tidak melaporkan arah yang masuk akal.
    const vx = rawLength > 1e-4 ? raw.x / rawLength : Math.sin(yaw)
    const vz = rawLength > 1e-4 ? raw.z / rawLength : Math.cos(yaw)
    const halfAngle = Math.min(0.95, Math.max(0.28, camera.halfAngle ?? 0.46))

    const originX = live.player.x
    const originZ = live.player.z
    // Jangkauan ikut zoom kamera, dibatasi separuh denah supaya tetap di lantai.
    const reach = Math.min(span * 0.46, Math.max(3.2, camera.reach ?? 9.4))
    const steps = 16

    const rim = []
    for (let index = 0; index <= steps; index += 1) {
      const angle = -halfAngle + (2 * halfAngle * index) / steps
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const dx = vx * cos - vz * sin
      const dz = vx * sin + vz * cos
      rim.push(`${svg(originX + dx * reach).toFixed(1)},${svg(originZ + dz * reach).toFixed(1)}`)
    }

    const apex = `${svg(originX).toFixed(1)},${svg(originZ).toFixed(1)}`
    const edge = (angle) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return {
        x: svg(originX + (vx * cos - vz * sin) * reach).toFixed(1),
        y: svg(originZ + (vx * sin + vz * cos) * reach).toFixed(1),
      }
    }
    const left = edge(-halfAngle)
    const right = edge(halfAngle)

    return {
      fan: `${apex} ${rim.join(' ')}`,
      rays: `${left.x},${left.y} ${apex} ${right.x},${right.y}`,
      tip: { x: svg(originX + vx * reach), y: svg(originZ + vz * reach) },
      // Bearing 0° = utara, searah jarum jam seperti kompas.
      bearing: Math.round((((Math.atan2(vx, -vz) * 180) / Math.PI) + 360) % 360),
    }
  })

  /* -------------------------------------------------------- bentuk piksel */

  /**
   * Lingkaran bergaya piksel: tiap titik sudut dibulatkan ke kisi, jadi tepinya
   * bertangga seperti gambar 8-bit, bukan lingkaran halus.
   */
  function pixelRing(radius, cell = 15, steps = 48) {
    const points = []
    let lastX = null
    let lastY = null
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2
      const x = Math.round((500 + Math.cos(angle) * radius) / cell) * cell
      const y = Math.round((500 + Math.sin(angle) * radius) / cell) * cell
      if (x === lastX && y === lastY) continue
      lastX = x
      lastY = y
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  }

  const plazaPoints = $derived(pixelRing(plazaRadius))
  const inkPoints = $derived(pixelRing(inkRadius, 12, 56))
  const treePoints = $derived(pixelRing(treeRadius, 10, 28))

  const coord = (value) => (Number.isFinite(value) ? value.toFixed(1) : '—')
  const meters = (value) => `${value.toFixed(1)} m`

  function visit(station) {
    if (!station?.view) return
    onVisit?.(station.view)
  }
</script>

<div
  class="map-backdrop"
  role="presentation"
  transition:fade={{ duration: 150 }}
  onclick={(event) => {
    // Hanya klik latar yang menutup peta; klik di dalam lembar tidak.
    if (event.target === event.currentTarget) onClose()
  }}
>
  <div
    class="map-sheet"
    class:map-mode={viewMode === 'map'}
    class:list-mode={viewMode === 'list'}
    role="dialog"
    aria-modal="true"
    aria-labelledby="map-title"
    tabindex="-1"
    transition:fly={{ y: 18, duration: 210, opacity: 0.2 }}
  >
    <span class="rod rod-top" aria-hidden="true"></span>
    <span class="rod rod-bottom" aria-hidden="true"></span>

    <!-- Bar atas bergaya HUD permainan: identitas + telemetri posisi. -->
    <header class="hud-bar">
      <div class="hud-id">
        <span class="seal" aria-hidden="true">圖</span>
        <div class="hud-text">
          <p class="eyebrow">
            <span class="live-dot" aria-hidden="true"></span>Peta hidup · dibaca dari dunia 3D
          </p>
          <h2 id="map-title">Denah Museum</h2>
        </div>
      </div>

      <dl class="telemetry" aria-label="Posisi karakter">
        <div>
          <dt>X</dt>
          <dd>{coord(live?.player?.x)}</dd>
        </div>
        <div>
          <dt>Z</dt>
          <dd>{coord(live?.player?.z)}</dd>
        </div>
        <div>
          <dt>Arah</dt>
          <dd>{view ? `${view.bearing}°` : '—'}</dd>
        </div>
        <div>
          <dt>Langkah</dt>
          <dd>{live?.player?.walking ? 'Berjalan' : 'Diam'}</dd>
        </div>
      </dl>

      <button class="close" type="button" onclick={onClose}>
        Tutup <span aria-hidden="true">×</span>
      </button>
    </header>

    {#if !live}
      <p class="loading">Menyiapkan denah…</p>
    {:else}
      <div class="map-body">
        <!-- Layar sempit: dua tab di atas denah — denah atau daftar objek.
             Di desktop keduanya tampil berdampingan, jadi tab ini disembunyikan. -->
        <div class="view-tabs" role="group" aria-label="Tampilan peta">
          <button
            class="view-tab"
            class:on={viewMode === 'map'}
            type="button"
            aria-pressed={viewMode === 'map'}
            onclick={() => (viewMode = 'map')}
          >
            <span aria-hidden="true">◱</span> Peta
          </button>
          <button
            class="view-tab"
            class:on={viewMode === 'list'}
            type="button"
            aria-pressed={viewMode === 'list'}
            onclick={() => (viewMode = 'list')}
          >
            <span aria-hidden="true">☰</span> Daftar objek
            <b>{rosterCount}</b>
          </button>
        </div>

        <section class="stage-wrap" aria-label="Denah museum">
          <div class="frame">
            <span class="corner corner-tl" aria-hidden="true"></span>
            <span class="corner corner-tr" aria-hidden="true"></span>
            <span class="corner corner-bl" aria-hidden="true"></span>
            <span class="corner corner-br" aria-hidden="true"></span>

            <svg
              class="ground"
              viewBox="0 0 1000 1000"
              role="img"
              aria-label={mapAlt}
              shape-rendering="crispEdges"
              focusable="false"
            >
              <defs>
                <pattern
                  id="map-grid"
                  width={cellSize}
                  height={cellSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path d={`M${cellSize} 0H0V${cellSize}`} class="grid-line" />
                </pattern>
                <!-- Di luar lantai: arsiran miring seperti bingkai peta cetak. -->
                <pattern
                  id="map-hatch"
                  width="22"
                  height="22"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="22" class="hatch-line" />
                </pattern>
                <!-- Kerucut pandang: titik-titik 50 % (dither), bukan bidang datar. -->
                <pattern id="map-cone" width="18" height="18" patternUnits="userSpaceOnUse">
                  <rect width="9" height="9" class="cone-dot" />
                  <rect x="9" y="9" width="9" height="9" class="cone-dot" />
                </pattern>
                <clipPath id="map-floor-clip">
                  <rect
                    x={plate.at}
                    y={plate.at}
                    width={plate.size}
                    height={plate.size}
                  />
                </clipPath>
              </defs>

              <rect
                class="void"
                x="0"
                y="0"
                width="1000"
                height="1000"
                fill="url(#map-hatch)"
              />

              <g clip-path="url(#map-floor-clip)">
                <rect
                  class="floor"
                  x={plate.at}
                  y={plate.at}
                  width={plate.size}
                  height={plate.size}
                />
                <rect
                  x={plate.at}
                  y={plate.at}
                  width={plate.size}
                  height={plate.size}
                  fill="url(#map-grid)"
                />

                <polygon class="plaza" points={plazaPoints} />
                <polygon class="plaza-ring" points={inkPoints} />
                <polygon class="tree" points={treePoints} />

                <!-- Kerucut pandang kamera, di bawah perabot dan penanda. -->
                <polygon class="cone" points={view?.fan ?? ''} fill="url(#map-cone)" />
                <polyline class="cone-edge" points={view?.rays ?? ''} />

                {#each furniture as station (station.id)}
                  {#if station.shape === 'circle'}
                    <circle
                      class="furniture furniture-round"
                      cx={svg(station.ax)}
                      cy={svg(station.az)}
                      r={station.footprint.r * unit}
                    />
                  {:else}
                    <g
                      transform={`translate(${svg(station.ax)} ${svg(
                        station.az,
                      )}) rotate(${-station.rotation * 57.2958})`}
                    >
                      <rect
                        class="furniture"
                        class:frame-bed={station.kind === 'project'}
                        class:board-bed={station.kind === 'board'}
                        x={(-station.footprint.w / 2) * unit}
                        y={(-station.footprint.d / 2) * unit}
                        width={station.footprint.w * unit}
                        height={station.footprint.d * unit}
                      />
                      {#if station.kind === 'project'}
                        <line
                          class="furniture-edge"
                          x1={(-station.footprint.w / 2) * unit}
                          y1={(station.footprint.d / 2) * unit}
                          x2={(station.footprint.w / 2) * unit}
                          y2={(station.footprint.d / 2) * unit}
                        />
                      {/if}
                    </g>
                  {/if}
                {/each}

                {#if targetPoint}
                  <line
                    class="route"
                    x1={playerPoint.x}
                    y1={playerPoint.y}
                    x2={targetPoint.x}
                    y2={targetPoint.y}
                  />
                  <g class="target" transform={`translate(${targetPoint.x} ${targetPoint.y})`}>
                    <circle class="target-pulse" r="30" />
                    <rect x="-29" y="-6" width="16" height="12" />
                    <rect x="13" y="-6" width="16" height="12" />
                    <rect x="-6" y="-29" width="12" height="16" />
                    <rect x="-6" y="13" width="12" height="16" />
                  </g>
                {/if}

                {#if markerPoint}
                  <rect
                    class="marker"
                    x={markerPoint.x - 8}
                    y={markerPoint.y - 8}
                    width="16"
                    height="16"
                  />
                {/if}

                <!-- Titik arah pandang di ujung kerucut. -->
                {#if view}
                  <polygon
                    class="sight"
                    points={`${view.tip.x},${view.tip.y - 16} ${view.tip.x + 12},${view.tip.y} ${
                      view.tip.x
                    },${view.tip.y + 16} ${view.tip.x - 12},${view.tip.y}`}
                  />
                {/if}

                <!-- Karakter: sprite blok yang diputar sesuai arah hadap. -->
                <g class="player" transform={`translate(${playerPoint.x} ${playerPoint.y})`}>
                  <circle class="player-pulse" r="46" />
                  <g transform={`rotate(${-facingDeg})`}>
                    <g class="avatar-arrow">
                      <rect x="-4" y="22" width="8" height="30" />
                      <rect x="-12" y="50" width="24" height="8" />
                      <rect x="-6" y="58" width="12" height="8" />
                    </g>
                    <rect class="avatar-shadow" x="-15" y="-15" width="32" height="32" />
                    <rect class="avatar-body" x="-18" y="-18" width="36" height="36" />
                    <rect class="avatar-plate" x="-11" y="-11" width="22" height="10" />
                    <rect class="avatar-eye" x="-8" y="5" width="6" height="6" />
                    <rect class="avatar-eye" x="2" y="5" width="6" height="6" />
                  </g>
                </g>
              </g>

              <!-- Dinding nyata museum: utara dan barat saja. -->
              <line
                class="wall"
                x1={svg(-half)}
                y1={northY}
                x2={svg(half)}
                y2={northY}
              />
              <line class="wall" x1={westY} y1={svg(-half)} x2={westY} y2={svg(half)} />
              <line
                class="wall-seg"
                x1={svg(-half)}
                y1={northY}
                x2={svg(half)}
                y2={northY}
              />
              <line class="wall-seg" x1={westY} y1={svg(-half)} x2={westY} y2={svg(half)} />
              <rect
                class="wall-post"
                x={westY - 11}
                y={northY - 11}
                width="22"
                height="22"
              />

              <!-- Tepi ruangan yang terbuka (timur & selatan). -->
              <line
                class="edge-open"
                x1={svg(half)}
                y1={svg(-half)}
                x2={svg(half)}
                y2={svg(half)}
              />
              <line
                class="edge-open"
                x1={svg(-half)}
                y1={svg(half)}
                x2={svg(half)}
                y2={svg(half)}
              />

              <g class="labels" shape-rendering="geometricPrecision">
                <text class="zone" x="500" y={northY + 46} text-anchor="middle">
                  GALERI UTARA
                </text>
                <text class="zone" x="500" y={500 + plazaRadius * 0.72} text-anchor="middle">
                  PLAZA
                </text>
                <text
                  class="zone zone-gate"
                  x="500"
                  y={svg(half) - 18}
                  text-anchor="middle"
                >
                  PINTU MASUK
                </text>
              </g>

              <!-- Kompas: bearing 0° = utara. -->
              <g
                class="compass"
                transform={`translate(${svg(half) - 66} ${svg(half) - 78})`}
                shape-rendering="geometricPrecision"
              >
                <circle class="compass-disc" r="34" />
                <path class="compass-needle" d="M0 -22 L9 6 L0 0 L-9 6 Z" />
                <text class="compass-n" x="0" y="-40" text-anchor="middle">北</text>
              </g>

              <!-- Skala: 5 meter. -->
              <g
                class="scale"
                transform={`translate(${svg(-half) + 26} ${svg(half) - 34})`}
                shape-rendering="geometricPrecision"
              >
                <line class="scale-bar" x1="0" y1="0" x2={svgLen(5)} y2="0" />
                <line class="scale-tick" x1="0" y1="-8" x2="0" y2="8" />
                <line class="scale-tick" x1={svgLen(5)} y1="-8" x2={svgLen(5)} y2="8" />
                <text class="scale-text" x={svgLen(5) / 2} y="-13" text-anchor="middle">
                  5 m
                </text>
              </g>
            </svg>

            <div class="pins">
              {#each stations as station (station.id)}
                <button
                  class="pin pin-{station.kind}"
                  class:active={station.active}
                  class:pending={station.pending}
                  class:upper={station.rank > 0}
                  class:seen={hoveredId === station.id}
                  class:on={selectedId === station.id}
                  style="left:{pct(station.x)}%; top:{pct(station.z)}%; --accent:{station.accent}"
                  type="button"
                  aria-label="Pilih {station.label}"
                  aria-pressed={selectedId === station.id}
                  onclick={() => selectStation(station)}
                  onmouseenter={() => (hoveredId = station.id)}
                  onmouseleave={() => (hoveredId = null)}
                  onfocus={() => (hoveredId = station.id)}
                  onblur={() => (hoveredId = null)}
                >
                  <span class="pin-seal" aria-hidden="true">{station.seal}</span>
                  <span class="pin-label">{station.label}</span>
                </button>
              {/each}
            </div>
          </div>

          {#if focus}
            <!-- Bilah pilihan: dipakai di layar sempit, tempat kartu sisi
                 disembunyikan, supaya penanda yang dipilih tetap punya
                 tombol Datangi. Penanda sendiri hanya **memilih**. -->
            <div class="stage-pick" style="--accent:{focus.accent}">
              <span class="stage-pick-seal" aria-hidden="true">{focus.seal}</span>
              <span class="stage-pick-text">
                <b>{focus.label}</b>
                <small>
                  {KIND_LABEL[focus.kind] ?? 'Koleksi'}{#if focus.rank > 0} · baris atas{/if} ·
                  {meters(Math.hypot(focus.x - live.player.x, focus.z - live.player.z))}
                </small>
              </span>
              <button class="stage-pick-go" type="button" onclick={() => visit(focus)}>
                Datangi <span aria-hidden="true">→</span>
              </button>
            </div>
          {/if}

          <p class="stage-foot">
            <span class="foot-key" aria-hidden="true">◎</span> kamu di sini ·
            <span class="foot-key" aria-hidden="true">▲</span> arah pandang kamera
          </p>
        </section>

        <aside class="side" aria-label="Keterangan peta">
          <!-- Kartu ini **selalu** ada, bukan disisipkan saat kursor masuk. Kolom
               samping yang tingginya berubah membuat `.map-body` tiba-tiba punya
               bilah gulir, lebar denah menyusut, penanda di bawah kursor bergeser,
               `mouseleave` terpicu, kartu hilang — lalu berulang: berkedip. -->
          <div class="panel picked" style="--accent:{focus?.accent ?? 'var(--vermilion)'}">
            <p class="panel-title">{focus ? 'Penanda terpilih' : 'Penanda'}</p>
            {#if focus}
              <div class="picked-head">
                <span class="picked-seal" aria-hidden="true">{focus.seal}</span>
                <div>
                  <p class="picked-kind">{KIND_LABEL[focus.kind] ?? 'Koleksi'}</p>
                  <p class="picked-name">{focus.label}</p>
                </div>
              </div>
              {#if focus.rank > 0}
                <p class="picked-note">Baris atas · dibaca dengan melangkah mundur</p>
              {/if}
              <p class="picked-dist">{meters(Math.hypot(focus.x - live.player.x, focus.z - live.player.z))} dari karaktermu</p>
              <button class="picked-go" type="button" onclick={() => visit(focus)}>
                Datangi <span aria-hidden="true">→</span>
              </button>
            {:else}
              <p class="picked-empty">
                Ketuk penanda di denah untuk memilihnya. Karakter baru berjalan setelah kamu
                menekan Datangi.
              </p>
            {/if}
          </div>

          <div class="panel">
            <p class="panel-title">Jenis penanda</p>
            <ul class="legend">
              {#each legend as row (row.key)}
                <li>
                  <button
                    class="legend-btn"
                    class:on={listFilter === row.key}
                    type="button"
                    aria-pressed={listFilter === row.key}
                    onclick={() => toggleFilter(row.key)}
                  >
                    <span class="dot" style="--dot:{row.color}" aria-hidden="true"></span>
                    <span class="legend-label">{row.label}</span>
                    <b>{row.count}</b>
                  </button>
                </li>
              {/each}
            </ul>
          </div>

          <div class="panel roster">
            <div class="roster-head">
              <p class="panel-title">{rosterTitle}</p>
              <b class="roster-count">{rosterCount}</b>
            </div>
            {#if rosterGroups.length}
              <ul class="roster-list">
                {#each rosterGroups as group (group.kind)}
                  <li class="roster-group">
                    <button
                      class="group-btn"
                      class:closed={!group.open}
                      type="button"
                      aria-expanded={group.open}
                      onclick={() => toggleGroup(group.kind)}
                    >
                      <span class="group-caret" aria-hidden="true">▾</span>
                      <span class="group-name">{group.label}</span>
                      <b>{group.count}</b>
                    </button>

                    {#if group.open}
                      <ul class="group-rows">
                        {#each group.rows as station (station.id)}
                          <li>
                            <button
                              class="roster-row"
                              class:here={station.active}
                              class:on={selectedId === station.id}
                              type="button"
                              style="--accent:{station.accent}"
                              aria-label="Pilih {station.label}"
                              aria-pressed={selectedId === station.id}
                              onclick={() => selectStation(station)}
                            >
                              <span class="roster-seal" aria-hidden="true">{station.seal}</span>
                              <span class="roster-main">
                                <span class="roster-name">{station.label}</span>
                                {#if station.rank > 0}
                                  <span class="roster-kind">baris atas</span>
                                {/if}
                              </span>
                              <span class="roster-dist">{meters(station.distance)}</span>
                            </button>
                          </li>
                        {/each}
                      </ul>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="roster-empty">Tidak ada penanda jenis ini di museum.</p>
            {/if}
          </div>

          <p class="side-hint">
            Ketuk penanda atau baris daftar untuk memilihnya di denah, lalu tekan Datangi —
            karakter berjalan dan panelnya terbuka setelah ia tiba.
          </p>
        </aside>
      </div>
    {/if}

    <footer class="foot">
      <p>{title || 'Portofolio'} · {stats.total} penanda di denah</p>
      <div class="foot-actions">
        <span class="hint-key" aria-hidden="true">I</span>
        <button class="enter" type="button" onclick={onClose}>Kembali ke museum</button>
      </div>
    </footer>
  </div>
</div>

<style>
  /* ------------------------------------------------------------------ latar */

  .map-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: radial-gradient(
      120% 100% at 50% 0%,
      rgba(38, 29, 22, 0.55),
      rgba(9, 6, 5, 0.84)
    );
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
  }

  .map-sheet {
    position: relative;
    width: min(1040px, 100%);
    /* Tinggi **definitif**, bukan sekadar `max-height`. Dengan hanya
       `max-height`, `.map-body` (flex: 1) tetap mengikuti tinggi isinya, jadi
       daftar yang panjang membuat isi lembar terpotong oleh `overflow: hidden`
       — tampak “keluar dari kotak”, dan tidak ada yang bisa digulir. */
    height: min(92vh, 880px);
    height: min(92dvh, 880px);
    max-height: min(92dvh, 880px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid rgba(36, 28, 22, 0.6);
    border-radius: 0;
    background:
      repeating-linear-gradient(90deg, rgba(112, 84, 46, 0.03) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(0deg, rgba(112, 84, 46, 0.022) 0 1px, transparent 1px 4px),
      radial-gradient(130% 120% at 22% 0%, #f8f0dd 0%, #eddfc2 55%, #ddcaa6 100%);
    color: var(--ink);
    box-shadow:
      10px 10px 0 rgba(10, 7, 5, 0.45),
      0 30px 74px rgba(0, 0, 0, 0.5),
      inset 0 0 0 6px rgba(248, 238, 216, 0.3),
      inset 0 0 0 7px rgba(36, 28, 22, 0.12);
  }

  /* Batang gulungan di kedua sisi lembar, seperti peta yang dibuka. */
  .rod {
    position: absolute;
    left: 0;
    width: 4px;
    height: 92px;
    background: linear-gradient(180deg, rgba(36, 28, 22, 0), rgba(36, 28, 22, 0.24), rgba(36, 28, 22, 0));
    pointer-events: none;
  }

  .rod-top {
    top: 18%;
  }

  .rod-bottom {
    bottom: 18%;
  }

  /* --------------------------------------------------------------- bar HUD */

  .hud-bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px 12px;
    border-bottom: 2px solid rgba(36, 28, 22, 0.18);
    background: linear-gradient(180deg, rgba(36, 28, 22, 0.06), rgba(36, 28, 22, 0));
  }

  .hud-id {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    min-width: 0;
  }

  .seal {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    border: 2px solid #241a14;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-seal);
    font-size: 18px;
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.32);
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.5);
  }

  .live-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--vermilion);
    animation: live 2.6s ease-in-out infinite;
  }

  @keyframes live {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  h2 {
    margin-top: 3px;
    font-family: var(--font-mono);
    font-size: clamp(16px, 2.1vw, 22px);
    font-weight: 600;
    line-height: 1.12;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-shadow: 3px 3px 0 rgba(178, 58, 48, 0.16);
  }

  /* Telemetri bergaya HUD: empat sel angka, bukan paragraf. */
  .telemetry {
    display: grid;
    grid-auto-flow: column;
    margin: 0 0 0 auto;
    border: 2px solid rgba(36, 28, 22, 0.26);
    background: rgba(255, 251, 240, 0.55);
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.1);
  }

  .telemetry > div {
    min-width: 60px;
    padding: 4px 9px 5px;
    border-left: 1px solid rgba(36, 28, 22, 0.16);
  }

  .telemetry > div:first-child {
    border-left: 0;
  }

  .telemetry dt {
    font-family: var(--font-mono);
    font-size: 7px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .telemetry dd {
    margin: 1px 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }

  .close {
    flex: 0 0 auto;
    padding: 4px 0;
    border-bottom: 1px solid rgba(36, 28, 22, 0.3);
    background: none;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.66);
    cursor: pointer;
    touch-action: manipulation;
  }

  .close:hover {
    color: var(--ink);
  }

  .loading {
    padding: 44px 24px 52px;
    text-align: center;
    font-size: 12px;
    color: rgba(36, 28, 22, 0.5);
  }

  /* ------------------------------------------------------------------ isi */

  .map-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 236px;
    /* Satu baris yang mengisi tinggi lembar: kolom samping tidak bisa
       memanjangkan isi, jadi tidak ada bilah gulir yang datang-pergi (dulu
       itulah penyebab penanda “berkedip” saat disorot). */
    grid-template-rows: minmax(0, 1fr);
    gap: 20px;
    padding: 14px 24px 4px;
    /* `stable` memesan ruang bilah gulir sejak awal sehingga lebar kolom denah
       tidak pernah menyusut saat isi kolom samping bertambah. */
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .stage-wrap {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 8px;
    min-width: 0;
  }

  /* `display: grid` di atas mengalahkan atribut `hidden`, jadi tampilan yang
     disembunyikan harus benar-benar dikeluarkan dari tata letak. */
  .stage-wrap[hidden] {
    display: none;
  }

  /* Papan denah: bingkai tinta dengan penjuru bertanda. */
  .frame {
    position: relative;
    width: min(100%, 496px);
    aspect-ratio: 1 / 1;
    /* Label penanda digantung di bawah capnya (`top: 100%`), jadi penanda di
       tepi bawah bisa menuliskannya melewati papan. Papan yang memotong,
       bukan halaman yang ikut melebar. */
    overflow: hidden;
    border: 2px solid rgba(36, 28, 22, 0.55);
    background: #eee0c1;
    box-shadow:
      6px 6px 0 rgba(36, 28, 22, 0.16),
      inset 0 0 0 3px rgba(248, 238, 216, 0.5);
  }

  /* Denah memakai tinggi layar yang tersedia, bukan ukuran tetap: di layar tinggi
     ia membesar, di layar pendek ia mengecil supaya lembar tidak perlu digulir. */
  @supports (height: 100dvh) {
    .frame {
      width: min(100%, 640px, 64dvh);
    }
  }

  .corner {
    position: absolute;
    z-index: 2;
    width: 15px;
    height: 15px;
    border: 2px solid rgba(36, 28, 22, 0.5);
    pointer-events: none;
  }

  .corner-tl {
    top: 5px;
    left: 5px;
    border-right: 0;
    border-bottom: 0;
  }

  .corner-tr {
    top: 5px;
    right: 5px;
    border-left: 0;
    border-bottom: 0;
  }

  .corner-bl {
    bottom: 5px;
    left: 5px;
    border-right: 0;
    border-top: 0;
  }

  .corner-br {
    bottom: 5px;
    right: 5px;
    border-left: 0;
    border-top: 0;
  }

  .ground {
    display: block;
    width: 100%;
    height: 100%;
  }

  .stage-foot {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.44);
  }

  .foot-key {
    color: rgba(178, 58, 48, 0.75);
    font-size: 10px;
  }

  /* ------------------------------------------- denah (gaya peta permainan) */

  .hatch-line {
    stroke: rgba(36, 28, 22, 0.075);
    stroke-width: 1;
  }

  .floor {
    fill: #f2e5c7;
    stroke: rgba(36, 28, 22, 0.34);
    stroke-width: 3;
  }

  .grid-line {
    fill: none;
    stroke: rgba(92, 68, 42, 0.13);
    stroke-width: 2;
  }

  .plaza {
    fill: rgba(255, 252, 243, 0.82);
    stroke: rgba(36, 28, 22, 0.22);
    stroke-width: 3;
  }

  .plaza-ring {
    fill: none;
    stroke: rgba(178, 58, 48, 0.34);
    stroke-width: 3;
    stroke-dasharray: 10 8;
  }

  .tree {
    fill: rgba(207, 143, 159, 0.42);
    stroke: rgba(122, 74, 86, 0.55);
    stroke-width: 3;
  }

  .cone-dot {
    fill: rgba(178, 58, 48, 0.1);
  }

  /* Kerucut pandang: satu-satunya bidang merah di peta, jadi harus terbaca. */
  .cone {
    stroke: rgba(178, 58, 48, 0.24);
    stroke-width: 2;
    stroke-linejoin: miter;
  }

  .cone-edge {
    fill: none;
    stroke: rgba(178, 58, 48, 0.5);
    stroke-width: 3;
    stroke-dasharray: 14 10;
    stroke-linejoin: miter;
    stroke-linecap: butt;
  }

  .sight {
    fill: rgba(178, 58, 48, 0.55);
    stroke: rgba(36, 28, 22, 0.4);
    stroke-width: 2;
  }

  .furniture {
    fill: rgba(255, 251, 240, 0.7);
    stroke: rgba(36, 28, 22, 0.3);
    stroke-width: 2;
  }

  .furniture-round {
    fill: rgba(255, 251, 240, 0.65);
  }

  .frame-bed {
    fill: rgba(169, 139, 184, 0.22);
    stroke: rgba(90, 64, 104, 0.5);
  }

  .board-bed {
    fill: rgba(178, 58, 48, 0.16);
    stroke: rgba(140, 44, 37, 0.5);
  }

  .furniture-edge {
    stroke: rgba(90, 64, 104, 0.55);
    stroke-width: 2.5;
  }

  .route {
    stroke: rgba(178, 58, 48, 0.6);
    stroke-width: 4;
    stroke-dasharray: 12 9;
    stroke-linecap: butt;
    animation: march 1.6s linear infinite;
  }

  @keyframes march {
    to {
      stroke-dashoffset: -42;
    }
  }

  .target rect {
    fill: rgba(178, 58, 48, 0.8);
  }

  .target-pulse {
    fill: none;
    stroke: rgba(178, 58, 48, 0.45);
    stroke-width: 2;
    animation: ping 2.2s ease-out infinite;
  }

  @keyframes ping {
    0% {
      opacity: 0.9;
    }
    70%,
    100% {
      opacity: 0;
    }
  }

  .marker {
    fill: none;
    stroke: rgba(178, 58, 48, 0.5);
    stroke-width: 3;
  }

  .player-pulse {
    fill: rgba(178, 58, 48, 0.1);
    stroke: rgba(178, 58, 48, 0.32);
    stroke-width: 2;
    animation: breathe 3.4s ease-in-out infinite;
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.95;
    }
  }

  .avatar-shadow {
    fill: rgba(36, 28, 22, 0.12);
  }

  .avatar-arrow rect {
    fill: #241a14;
  }

  .avatar-body {
    fill: var(--vermilion);
    stroke: #241a14;
    stroke-width: 3;
  }

  .avatar-plate {
    fill: #fbf3e3;
  }

  .avatar-eye {
    fill: #241a14;
  }

  .wall {
    stroke: #2b211a;
    stroke-width: 15;
    stroke-linecap: butt;
  }

  /* Sambungan balok dinding: garis terang bertangga di atas balok gelap. */
  .wall-seg {
    stroke: rgba(244, 233, 210, 0.5);
    stroke-width: 8;
    stroke-dasharray: 20 16;
    stroke-linecap: butt;
  }

  .wall-post {
    fill: #2b211a;
  }

  .edge-open {
    stroke: rgba(36, 28, 22, 0.3);
    stroke-width: 4;
    stroke-dasharray: 14 12;
    stroke-linecap: butt;
  }

  .zone {
    fill: rgba(36, 28, 22, 0.42);
    font-family: var(--font-mono);
    font-size: 19px;
    font-weight: 600;
    letter-spacing: 3px;
  }

  .zone-gate {
    fill: rgba(140, 44, 37, 0.6);
    font-size: 16px;
  }

  .compass-disc {
    fill: rgba(255, 251, 240, 0.66);
    stroke: rgba(36, 28, 22, 0.28);
    stroke-width: 2;
  }

  .compass-needle {
    fill: rgba(178, 58, 48, 0.75);
  }

  .compass-n {
    fill: rgba(36, 28, 22, 0.55);
    font-family: var(--font-seal);
    font-size: 17px;
  }

  .scale-bar,
  .scale-tick {
    stroke: rgba(36, 28, 22, 0.55);
    stroke-width: 3;
  }

  .scale-text {
    fill: rgba(36, 28, 22, 0.5);
    font-family: var(--font-mono);
    font-size: 16px;
    letter-spacing: 1px;
  }

  /* --------------------------------------------------------------- penanda */

  .pins {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pin {
    position: absolute;
    display: grid;
    justify-items: center;
    padding: 4px;
    border: 0;
    background: none;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: pointer;
    color: var(--ink);
    touch-action: manipulation;
  }

  .pin-seal {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border: 2px solid #241a14;
    border-radius: 0;
    background: rgba(251, 243, 227, 0.96);
    color: var(--accent, var(--vermilion-deep));
    font-family: var(--font-seal);
    font-size: 12px;
    line-height: 1;
    box-shadow:
      3px 3px 0 rgba(36, 28, 22, 0.28),
      inset 0 0 0 2px rgba(255, 250, 236, 0.7);
    transition:
      transform 0.12s steps(2, end),
      box-shadow 0.12s steps(2, end);
  }

  .pin:hover .pin-seal,
  .pin:focus-visible .pin-seal {
    transform: translate(-1px, -2px);
    box-shadow:
      5px 5px 0 rgba(36, 28, 22, 0.3),
      inset 0 0 0 2px rgba(255, 250, 236, 0.7);
  }

  /* Penanda yang disorot, aktif, atau sedang dituju naik di atas tetangganya. */
  .pin.active,
  .pin.pending {
    z-index: 4;
  }

  .pin:hover,
  .pin:focus-visible {
    z-index: 6;
  }

  /* Bingkai baris atas digantung di atas bingkai bawahnya. */
  .pin.upper .pin-seal {
    box-shadow:
      3px 3px 0 rgba(36, 28, 22, 0.28),
      6px 6px 0 rgba(36, 28, 22, 0.14);
  }

  .pin.active .pin-seal {
    background: var(--accent, var(--vermilion));
    color: #fdf5e4;
    box-shadow:
      3px 3px 0 rgba(36, 28, 22, 0.4),
      inset 0 0 0 2px rgba(255, 250, 236, 0.4);
  }

  .pin.pending .pin-seal {
    animation: pending 1.8s ease-in-out infinite;
  }

  @keyframes pending {
    0%,
    100% {
      box-shadow:
        0 0 0 2px rgba(178, 58, 48, 0.55),
        3px 3px 0 rgba(36, 28, 22, 0.28);
    }
    50% {
      box-shadow:
        0 0 0 6px rgba(178, 58, 48, 0.16),
        3px 3px 0 rgba(36, 28, 22, 0.28);
    }
  }

  /* Label digantung di bawah cap dan tidak ikut menentukan tinggi tombol,
     supaya pusat cap benar-benar jatuh di koordinat penanda. */
  .pin-label {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    max-width: 108px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 1px 4px;
    border: 2px solid rgba(36, 28, 22, 0.28);
    background: rgba(250, 242, 224, 0.94);
    font-family: var(--font-mono);
    font-size: 8px;
    line-height: 1.4;
    letter-spacing: 0.02em;
    color: rgba(36, 28, 22, 0.78);
    pointer-events: none;
  }

  /* Penanda yang dipilih atau sedang dituju tetap membawa namanya, jadi
     memilih dari peta langsung terbaca tanpa perlu hover. */
  .pin.on .pin-seal {
    transform: translate(-1px, -2px);
    box-shadow:
      4px 4px 0 rgba(36, 28, 22, 0.34),
      inset 0 0 0 2px rgba(255, 250, 236, 0.8);
    outline: 2px solid rgba(178, 58, 48, 0.85);
    outline-offset: 2px;
  }

  .pin.on .pin-label {
    display: block;
    color: var(--ink);
    font-weight: 600;
    border-color: rgba(178, 58, 48, 0.7);
  }

  .pin.on {
    z-index: 5;
  }

  .pin.active .pin-label,
  .pin.pending .pin-label {
    color: var(--ink);
    font-weight: 600;
  }

  /* Bingkai dan pengunjung boleh banyak: namanya hanya saat disorot. */
  .pin-project .pin-seal {
    width: 14px;
    height: 18px;
    font-size: 7px;
  }

  .pin-visitor .pin-seal {
    width: 17px;
    height: 17px;
    font-size: 9px;
    border-radius: 50%;
  }

  .pin-board .pin-seal,
  .pin-game .pin-seal {
    width: 21px;
    height: 21px;
    font-size: 10px;
  }

  .pin-project .pin-label,
  .pin-visitor .pin-label {
    display: none;
  }

  .pin-project:hover .pin-label,
  .pin-project:focus-visible .pin-label,
  .pin-project.seen .pin-label,
  .pin-visitor:hover .pin-label,
  .pin-visitor:focus-visible .pin-label,
  .pin-visitor.seen .pin-label {
    display: block;
  }

  /* --------------------------------------------------------------- samping */

  .side {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 12px;
  }

  .panel {
    flex: 0 0 auto;
    padding: 9px 10px 10px;
    border: 2px solid rgba(36, 28, 22, 0.22);
    background: rgba(255, 251, 240, 0.5);
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.1);
  }

  .panel-title {
    margin-bottom: 6px;
    font-family: var(--font-mono);
    font-size: 7.5px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.46);
  }

  .legend {
    display: grid;
    /* Sama seperti daftar: kolom `auto` mengikuti max-content dan bisa melebar
       melewati panel. */
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
    min-width: 0;
  }

  .legend li {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .legend-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    padding: 3px 4px;
    border: 0;
    background: none;
    color: rgba(36, 28, 22, 0.7);
    font-size: 10.5px;
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }

  .legend-btn:hover,
  .legend-btn:focus-visible {
    background: rgba(178, 58, 48, 0.1);
  }

  /* Baris yang sedang menyaring daftar di bawahnya. */
  .legend-btn.on {
    background: rgba(178, 58, 48, 0.14);
    box-shadow: inset 2px 0 0 var(--vermilion);
    color: var(--ink);
  }

  .legend-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legend b {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--ink);
  }

  .dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border: 2px solid rgba(36, 28, 22, 0.36);
    background: var(--dot, var(--gold));
  }

  .picked {
    border-left: 5px solid var(--accent, var(--vermilion));
    min-width: 0;
    /* Panel ini mengikuti isi; jangan biarkan satu nama panjang mendorong
       kolom samping melebihi 236 px. */
    overflow: hidden;
  }

  .picked-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin-bottom: 4px;
  }

  .picked-head > div {
    min-width: 0;
  }

  .picked-seal {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
    border: 2px solid var(--accent, var(--vermilion));
    color: var(--accent, var(--vermilion));
    font-family: var(--font-seal);
    font-size: 12px;
  }

  .picked-kind {
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.46);
  }

  .picked-name {
    /* Nama proyek bisa panjang: patahkan, jangan melebarkan panel. */
    overflow-wrap: anywhere;
    font-family: var(--font-display);
    font-size: 14.5px;
    font-weight: 600;
    line-height: 1.12;
  }

  .picked-note {
    font-size: 9.5px;
    font-style: italic;
    line-height: 1.4;
    color: rgba(36, 28, 22, 0.5);
  }

  .picked-dist {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    color: rgba(36, 28, 22, 0.56);
  }

  .picked-empty {
    font-size: 9.5px;
    line-height: 1.5;
    color: rgba(36, 28, 22, 0.52);
  }

  /* --------------------------------------------------- tab denah / daftar */

  /* Hanya untuk lembar satu kolom: di desktop denah dan daftar tampil
     berdampingan, jadi tidak ada yang perlu ditukar. */
  .view-tabs {
    display: none;
  }

  .view-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 1;
    min-height: 40px;
    padding: 0 10px;
    border: 2px solid rgba(36, 28, 22, 0.28);
    background: rgba(250, 244, 231, 0.6);
    color: rgba(36, 28, 22, 0.62);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    touch-action: manipulation;
  }

  .view-tab b {
    font-size: 8.5px;
    font-weight: 500;
    color: rgba(36, 28, 22, 0.46);
  }

  .view-tab.on {
    border-color: #241a14;
    background: var(--vermilion);
    color: #f8eed7;
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.4);
  }

  .view-tab.on b {
    color: rgba(248, 238, 215, 0.7);
  }

  /* ------------------------------------------------- bilah pilihan di denah */

  /* Di desktop detail penanda ada di kolom samping, jadi bilah ini tidak perlu. */
  .stage-pick {
    display: none;
  }

  .stage-pick-seal {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    border: 2px solid var(--accent, var(--vermilion));
    color: var(--accent, var(--vermilion));
    font-family: var(--font-seal);
    font-size: 11px;
    line-height: 1;
  }

  .stage-pick-text {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .stage-pick-text b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
  }

  .stage-pick-text small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.5);
  }

  .stage-pick-go {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 10px;
    border: 2px solid #241a14;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.4);
    cursor: pointer;
    touch-action: manipulation;
  }

  .stage-pick-go:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(36, 28, 22, 0.4);
  }

  .picked-go {
    margin-top: 7px;
    padding: 6px 11px;
    border: 2px solid #241a14;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.45);
    cursor: pointer;
    touch-action: manipulation;
  }

  /* ------------------------------------------------------- daftar tempat */

  .roster-head {
    display: flex;
    flex: 0 0 auto;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    margin-bottom: 5px;
  }

  .roster-head .panel-title {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .roster-count {
    flex: 0 0 auto;
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 600;
    color: var(--vermilion);
  }

  .roster-list {
    display: grid;
    /* Kolom eksplisit `minmax(0, 1fr)`: kolom `auto` pada grid mengikuti
       max-content anaknya, sehingga nama panjang mendorong isi keluar dari
       kotak panel (itulah yang terlihat di ponsel). */
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    min-width: 0;
    /* Daftar bisa berisi 30+ koleksi; ia mengisi sisa tinggi kolom lalu
       bergulir sendiri, jadi denah di sebelahnya tidak pernah ikut bergeser. */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(36, 28, 22, 0.34) transparent;
  }

  .roster-list::-webkit-scrollbar {
    width: 7px;
  }

  .roster-list::-webkit-scrollbar-thumb {
    background: rgba(36, 28, 22, 0.3);
  }

  .roster-list::-webkit-scrollbar-track {
    background: rgba(36, 28, 22, 0.06);
  }

  .roster {
    display: flex;
    flex-direction: column;
    /* `flex: 1 1 auto` inilah yang membuat daftar punya tinggi terbatas dan bisa
       digulir. Tanpa ini `.panel { flex: 0 0 auto }` membuat panel setinggi
       seluruh isinya: tidak ada yang bisa digulir, dan kelebihannya terpotong. */
    flex: 1 1 auto;
    /* Desktop: daftar tempat diletakkan paling atas di kolom samping. */
    order: -1;
    min-width: 0;
    min-height: 0;
  }

  .roster-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    min-width: 0;
  }

  .group-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    margin-top: 4px;
    padding: 3px 4px;
    border: 0;
    border-top: 1px dashed rgba(36, 28, 22, 0.16);
    background: none;
    color: rgba(36, 28, 22, 0.66);
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    touch-action: manipulation;
  }

  .roster-group:first-child .group-btn {
    margin-top: 0;
    border-top: 0;
  }

  .group-btn:hover,
  .group-btn:focus-visible {
    background: rgba(178, 58, 48, 0.08);
    color: var(--ink);
  }

  .group-caret {
    width: 9px;
    font-size: 8px;
    transition: transform 0.14s ease;
  }

  .group-btn.closed .group-caret {
    transform: rotate(-90deg);
  }

  .group-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .group-btn b {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 500;
    color: rgba(36, 28, 22, 0.5);
  }

  .group-rows {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    min-width: 0;
    padding-left: 6px;
  }

  .roster-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    padding: 4px;
    border: 0;
    background: none;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }

  .roster-row:hover,
  .roster-row:focus-visible {
    background: rgba(178, 58, 48, 0.1);
  }

  /* Titik yang sedang di dekati karakter. */
  .roster-row.here {
    background: rgba(201, 160, 92, 0.2);
    box-shadow: inset 2px 0 0 var(--accent, var(--vermilion));
  }

  .roster-seal {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: 2px solid var(--accent, var(--vermilion));
    color: var(--accent, var(--vermilion));
    font-family: var(--font-seal);
    font-size: 9px;
    line-height: 1;
  }

  .roster-main {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .roster-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10.5px;
    line-height: 1.2;
  }

  .roster-kind {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.46);
  }

  .roster-dist {
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 500;
    color: rgba(36, 28, 22, 0.6);
  }

  .roster-empty {
    padding: 6px 4px;
    font-size: 10px;
    color: rgba(36, 28, 22, 0.5);
  }

  .side-hint {
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px dashed rgba(36, 28, 22, 0.18);
    font-size: 10px;
    line-height: 1.55;
    color: rgba(36, 28, 22, 0.56);
  }

  /* ------------------------------------------------------------------ kaki */

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 24px 14px;
    border-top: 1px dashed rgba(36, 28, 22, 0.2);
  }

  .foot p {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.04em;
    color: rgba(36, 28, 22, 0.48);
  }

  .foot-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  .hint-key {
    display: inline-grid;
    place-items: center;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border: 2px solid rgba(36, 28, 22, 0.28);
    font-family: var(--font-mono);
    font-size: 8px;
    color: rgba(36, 28, 22, 0.55);
  }

  .enter {
    padding: 8px 14px;
    border: 2px solid #241a14;
    background: var(--vermilion);
    color: #f8eed7;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 rgba(36, 28, 22, 0.45);
    cursor: pointer;
    touch-action: manipulation;
  }

  .picked-go:active,
  .enter:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(36, 28, 22, 0.45);
  }

  /* ------------------------------------------------------- layar sentuh */

  /* Jendela pendek dan lebar (mis. 1440×500): kolom samping boleh bergulir
     sendiri daripada terpotong, dan daftar tidak boleh dipaksa jadi nol. */
  @media (max-height: 640px) and (min-width: 901px) {
    .side {
      overflow-y: auto;
    }

    .roster {
      min-height: 132px;
    }
  }

  @media (pointer: coarse) {
    .close {
      padding: 9px 2px;
    }

    .pin {
      padding: 7px;
    }

    .pin-seal {
      width: 30px;
      height: 30px;
      font-size: 13px;
    }

    .pin-project {
      padding: 3px;
    }

    .pin-project .pin-seal {
      width: 17px;
      height: 20px;
      font-size: 8px;
    }

    .pin-visitor .pin-seal {
      width: 21px;
      height: 21px;
      font-size: 10px;
    }

    .pin-label {
      font-size: 10.5px;
    }

    .picked-go,
    .enter {
      min-height: 44px;
      padding: 0 14px;
    }

    .legend-btn {
      min-height: 40px;
    }

    .roster-row {
      min-height: 44px;
      padding: 6px 4px;
    }
  }

  @media (max-width: 900px) {
    .map-backdrop {
      padding: 8px;
    }

    /* `94dvh` + padding latar (2 × 8 px) masih muat di layar mana pun. */
    .map-sheet {
      height: 94vh;
      height: 94dvh;
      max-height: 94vh;
      max-height: 94dvh;
    }

    .hud-bar {
      flex-wrap: wrap;
      gap: 10px;
      padding: 14px 16px 10px;
    }

    .telemetry {
      order: 3;
      width: 100%;
      margin: 0;
      grid-auto-flow: column;
    }

    .telemetry > div {
      min-width: 0;
      flex: 1;
    }

    .map-body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      grid-auto-rows: min-content;
      align-content: start;
      gap: 12px;
      padding: 12px 16px 6px;
      /* Lembar kembali bergulir di sini: tab, denah, lalu daftar. */
      overflow-y: auto;
    }

    /* Tab denah / daftar objek. */
    .view-tabs {
      display: flex;
      gap: 8px;
      grid-column: 1 / -1;
    }

    .frame {
      width: min(100%, 440px);
    }

    .side {
      display: grid;
      /* `auto-fit` merosot ke satu kolom di layar sempit dan tetap dua kolom
         di tablet. `minmax(min(230px, 100%), 1fr)` mencegah jalur minimum yang
         lebih lebar dari wadahnya (itu yang membuat isi melewati kotak). */
      grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
      gap: 10px;
      min-width: 0;
      padding-bottom: 4px;
      overflow: visible;
    }

    .side > .panel {
      min-width: 0;
      max-width: 100%;
    }

    /* Detail penanda pindah ke bilah di bawah denah; kolom samping hanya
       memuat saringan dan daftar. */
    .side > .picked {
      display: none;
    }

    .stage-pick {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      max-width: 440px;
      padding: 6px 8px;
      border: 2px solid rgba(36, 28, 22, 0.28);
      background: rgba(250, 242, 224, 0.9);
      box-shadow: 3px 3px 0 rgba(36, 28, 22, 0.22);
    }

    .side-hint {
      grid-column: 1 / -1;
      margin-top: 0;
    }

    /* Dua tampilan bergantian: denah atau daftar objek. */
    .map-sheet.map-mode .side {
      display: none;
    }

    .map-sheet.list-mode .stage-wrap {
      display: none;
    }

    /* Lembar sudah bergulir sendiri di layar sempit: daftar tidak perlu
       gulir bersarang yang lebih sulit dikendalikan dengan jari. */
    .roster {
      flex: 0 0 auto;
      /* Urutan DOM (legenda lalu daftar) dipertahankan di sini: saringan
         sebaiknya di atas isi yang disaringnya. */
      order: 0;
      min-height: 0;
    }

    .roster-list {
      flex: none;
      max-height: none;
      overflow: visible;
    }

    .foot {
      padding: 10px 16px 14px;
    }
  }

  @media (max-width: 620px) {
    .stage-foot,
    .foot p {
      display: none;
    }

    .telemetry > div:nth-child(4) {
      display: none;
    }

    .frame {
      width: min(100%, 100%);
    }

    /* Denah sudah selebar kolom; bilah pilihan ikut selebar itu. */
    .stage-pick {
      max-width: 100%;
    }

    .side {
      grid-template-columns: 1fr;
    }

    .enter {
      width: 100%;
    }

    .foot-actions {
      flex: 1;
    }

    .pin-label {
      display: none;
    }

    .pin.active .pin-label,
    .pin.pending .pin-label,
    .pin.on .pin-label,
    .pin:hover .pin-label,
    .pin.seen .pin-label {
      display: block;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot,
    .route,
    .target-pulse,
    .player-pulse,
    .pin.pending .pin-seal {
      animation: none;
    }
  }
</style>
