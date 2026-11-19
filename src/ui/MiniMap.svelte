<script>
  import { onMount } from 'svelte'

  /**
   * Mini map: potret kecil dunia yang selalu terlihat di sudut kanan bawah.
   *
   * Sumbernya sama dengan peta besar (`PortfolioApp.getMapState()`), hanya
   * digambar jauh lebih ringkas: lantai bergaris kotak, plaza, dua dinding,
   * kerucut pandang, penanda koleksi, rute, dan posisi karakter. Karena membaca
   * dunia — bukan salinan denah — ia ikut berubah saat proyek/pengunjung
   * bertambah atau karakter berpindah.
   *
   * Penempatan: kanan bawah, di atas cap 往生堂 dan di atas bar tombol sistem
   * layar sentuh. Lihat komentar `.mini` di blok gaya untuk angka-angkanya.
   */
  let { source = null, onOpen } = $props()

  let live = $state(null)

  // Peta kecil tidak perlu sehalus peta besar: 6 potret per detik sudah cukup
  // dan jauh lebih hemat daripada menggambar tiap bingkai.
  const POLL_MS = 160

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

  // Skala sama dengan peta besar: dunia `[-half-1, half+1]` → 0–1000 unit SVG.
  const half = $derived(live?.half ?? 18)
  const span = $derived(half * 2 + 2)
  const svg = (value) => ((value + span / 2) / span) * 1000
  const svgLen = (value) => (value / span) * 1000

  const plate = $derived({ at: svg(-half), size: svgLen(half * 2) })
  const gridStep = $derived(svgLen(2))
  const plazaRadius = $derived(svgLen(live?.plaza?.radius ?? 5.2))
  const treeRadius = $derived(svgLen(1.32))

  const player = $derived({ x: svg(live?.player?.x ?? 0), y: svg(live?.player?.z ?? 0) })
  const facing = $derived(((live?.player?.heading ?? 0) * 180) / Math.PI)

  const northWall = $derived(live?.walls?.z != null ? svg(live.walls.z) : svg(-half + 1.9))
  const westWall = $derived(live?.walls?.x != null ? svg(live.walls.x) : svg(-half + 1.9))

  const stations = $derived(live?.stations ?? [])
  const total = $derived(stations.length)

  const target = $derived(
    live?.destination ? { x: svg(live.destination.x), y: svg(live.destination.z) } : null,
  )

  function pinSize(station) {
    if (station.rank > 0) return 22
    if (station.kind === 'section') return 25
    if (station.kind === 'board' || station.kind === 'game') return 21
    return 17
  }

  /**
   * Kerucut pandang kamera, versi kecil.
   *
   * Arah (`camera.pov`), lebar (`camera.halfAngle`), dan jangkauan
   * (`camera.reach`) dibaca dari potret kamera yang merender, bukan ditebak dari
   * `yaw`, sehingga peta kecil tidak pernah menunjukkan arah atau panjang yang
   * berbeda dari peta besar maupun dari layar 3D — termasuk saat roda mouse
   * memperbesar/memperkecil diorama.
   */
  const viewCone = $derived.by(() => {
    if (!live) return null
    const camera = live.camera ?? {}
    const raw = camera.pov ?? camera.view
    const rawLength = raw ? Math.hypot(raw.x, raw.z) : 0
    const yaw = camera.yaw ?? 0
    const vx = rawLength > 1e-4 ? raw.x / rawLength : Math.sin(yaw)
    const vz = rawLength > 1e-4 ? raw.z / rawLength : Math.cos(yaw)
    const halfAngle = Math.min(0.95, Math.max(0.28, camera.halfAngle ?? 0.46))
    // Jangkauan mengikuti zoom; peta kecil memakai batas lebih pendek supaya
    // kerucut tidak menutupi seluruh denahnya.
    const reach = Math.min(9, Math.max(3, (camera.reach ?? 9.4) * 0.8))
    const px = live.player.x
    const pz = live.player.z
    const points = [`${svg(px).toFixed(1)},${svg(pz).toFixed(1)}`]

    for (let index = 0; index <= 10; index += 1) {
      const angle = -halfAngle + (2 * halfAngle * index) / 10
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const dx = vx * cos - vz * sin
      const dz = vx * sin + vz * cos
      points.push(`${svg(px + dx * reach).toFixed(1)},${svg(pz + dz * reach).toFixed(1)}`)
    }
    return points.join(' ')
  })
</script>

<button
  class="mini"
  type="button"
  onclick={() => onOpen?.()}
  title="Buka peta museum (I)"
  aria-label="Buka peta museum"
>
  <span class="mini-head">
    <span class="mini-title">Peta</span>
    <span class="mini-live" aria-hidden="true">
      <span class="mini-dot"></span>
      <span class="mini-live-text">hidup</span>
    </span>
  </span>

  <span class="mini-stage">
    <svg
      viewBox="0 0 1000 1000"
      shape-rendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="mini-grid"
          width={gridStep}
          height={gridStep}
          patternUnits="userSpaceOnUse"
          x={plate.at}
          y={plate.at}
        >
          <path class="grid-line" d={`M ${gridStep} 0 L 0 0 L 0 ${gridStep}`} />
        </pattern>
        <clipPath id="mini-floor">
          <rect x={plate.at} y={plate.at} width={plate.size} height={plate.size} />
        </clipPath>
      </defs>

      <rect class="void" x="0" y="0" width="1000" height="1000" />
      <rect class="floor" x={plate.at} y={plate.at} width={plate.size} height={plate.size} />
      <rect
        x={plate.at}
        y={plate.at}
        width={plate.size}
        height={plate.size}
        fill="url(#mini-grid)"
      />

      <g clip-path="url(#mini-floor)">
        <circle class="plaza" cx="500" cy="500" r={plazaRadius} />
        <circle class="tree" cx="500" cy="500" r={treeRadius} />

        {#if viewCone}
          <polygon class="cone" points={viewCone} />
        {/if}

        {#if target}
          <line class="route" x1={player.x} y1={player.y} x2={target.x} y2={target.y} />
          <rect
            class="target"
            x={target.x - 11}
            y={target.y - 11}
            width="22"
            height="22"
            transform={`rotate(45 ${target.x} ${target.y})`}
          />
        {/if}

        <g class="avatar" transform={`translate(${player.x} ${player.y}) rotate(${-facing})`}>
          <rect class="avatar-arrow" x="-4" y="28" width="8" height="40" />
          <rect class="avatar-arrow" x="-13" y="64" width="26" height="9" />
          <rect class="avatar-body" x="-18" y="-18" width="36" height="36" />
          <rect class="avatar-plate" x="-11" y="-11" width="22" height="11" />
        </g>
      </g>

      <line class="wall" x1={svg(-half)} y1={northWall} x2={svg(half)} y2={northWall} />
      <line class="wall" x1={westWall} y1={svg(-half)} x2={westWall} y2={svg(half)} />

      {#each stations as station (station.id)}
        <rect
          class="pin"
          class:upper={station.rank > 0}
          class:active={station.active}
          x={svg(station.x) - pinSize(station)}
          y={svg(station.z) - pinSize(station)}
          width={pinSize(station) * 2}
          height={pinSize(station) * 2}
          fill={station.accent}
        />
      {/each}
    </svg>

    <span class="compass" aria-hidden="true">北</span>
    <span class="scan" aria-hidden="true"></span>
  </span>

  <span class="mini-foot">
    <span class="mini-total">{total} titik</span>
    <span class="mini-open">
      <span class="mini-key" aria-hidden="true">I</span>
      Buka
    </span>
  </span>
</button>

<style>
  /*
   * Kanan bawah, 96 px dari dasar layar.
   *
   * Angka itu bukan hiasan: di desktop ia duduk tepat di atas cap 往生堂
   * (`bottom: 28px`, `right: 30px`), di jendela sempit ia di atas baris tombol
   * sistem yang turun ke `bottom: 20px`, dan di layar sentuh ia di atas bar
   * tombol setinggi ±46 px. Jadi tidak ada yang bertumpuk di posisi mana pun.
   */
  .mini {
    position: fixed;
    right: 30px;
    bottom: 96px;
    z-index: 12;
    display: grid;
    gap: 4px;
    width: 172px;
    padding: 6px;
    border: 2px solid rgba(244, 234, 212, 0.24);
    border-radius: 0;
    background: linear-gradient(180deg, rgba(28, 21, 15, 0.9), rgba(15, 11, 8, 0.92));
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
    text-align: left;
    box-shadow:
      5px 5px 0 rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(244, 234, 212, 0.05);
    transition:
      border-color 0.12s steps(2, end),
      transform 0.12s steps(2, end),
      box-shadow 0.12s steps(2, end);
  }

  .mini:hover,
  .mini:focus-visible {
    border-color: rgba(201, 160, 92, 0.6);
    transform: translate(-1px, -1px);
    box-shadow:
      6px 6px 0 rgba(0, 0, 0, 0.48),
      inset 0 0 0 1px rgba(244, 234, 212, 0.08);
  }

  .mini:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.4);
  }

  /* ------------------------------------------------------------ bar atas */

  .mini-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 1px;
  }

  .mini-title {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(201, 160, 92, 0.95);
  }

  .mini-live {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(244, 234, 212, 0.42);
  }

  .mini-dot {
    width: 4px;
    height: 4px;
    background: #d9564a;
    box-shadow: 0 0 0 1px rgba(217, 86, 74, 0.35);
    animation: live-pulse 2.4s steps(2, end) infinite;
  }

  @keyframes live-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
  }

  /* ---------------------------------------------------------------- denah */

  .mini-stage {
    position: relative;
    display: block;
    border: 1px solid rgba(244, 234, 212, 0.12);
    background: #0f0b08;
    overflow: hidden;
  }

  /* Penjuru bingkai: dua sudut dari setiap pseudo-element. */
  .mini-stage::before,
  .mini-stage::after {
    content: '';
    position: absolute;
    width: 9px;
    height: 9px;
    border: 1px solid rgba(201, 160, 92, 0.55);
    pointer-events: none;
    z-index: 2;
  }

  .mini-stage::before {
    top: 2px;
    left: 2px;
    border-right: 0;
    border-bottom: 0;
  }

  .mini-stage::after {
    right: 2px;
    bottom: 2px;
    border-left: 0;
    border-top: 0;
  }

  .mini-stage svg {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
  }

  /* Garis pindaian tipis, seperti layar perangkat di dalam dunia. */
  .scan {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.16) 0 1px,
      rgba(0, 0, 0, 0) 1px 3px
    );
    pointer-events: none;
  }

  .compass {
    position: absolute;
    top: 3px;
    right: 5px;
    font-family: var(--font-seal);
    font-size: 9px;
    line-height: 1;
    color: rgba(201, 160, 92, 0.8);
    pointer-events: none;
  }

  .void {
    fill: #0d0a07;
  }

  .floor {
    fill: rgba(244, 234, 212, 0.07);
    stroke: rgba(244, 234, 212, 0.16);
    stroke-width: 6;
  }

  .grid-line {
    fill: none;
    stroke: rgba(244, 234, 212, 0.07);
    stroke-width: 2;
  }

  .plaza {
    fill: rgba(244, 234, 212, 0.07);
    stroke: rgba(244, 234, 212, 0.14);
    stroke-width: 5;
  }

  .tree {
    fill: rgba(207, 143, 159, 0.26);
    stroke: none;
  }

  .wall {
    stroke: rgba(244, 234, 212, 0.42);
    stroke-width: 24;
    stroke-linecap: square;
  }

  /* Kerucut pandang: arah dan panjang yang sama dengan peta besar. */
  .cone {
    fill: rgba(217, 86, 74, 0.16);
    stroke: rgba(217, 86, 74, 0.4);
    stroke-width: 3;
    stroke-linejoin: miter;
  }

  .route {
    stroke: rgba(217, 86, 74, 0.7);
    stroke-width: 9;
    stroke-dasharray: 22 16;
    animation: route-march 1.4s linear infinite;
  }

  @keyframes route-march {
    to {
      stroke-dashoffset: -38;
    }
  }

  .target {
    fill: none;
    stroke: rgba(217, 86, 74, 0.75);
    stroke-width: 4;
  }

  .pin {
    opacity: 0.9;
  }

  .pin.upper {
    opacity: 1;
    stroke: rgba(250, 242, 224, 0.85);
    stroke-width: 3;
  }

  .pin.active {
    stroke: rgba(250, 242, 224, 1);
    stroke-width: 4;
  }

  /* Sprite karakter: blok vermilion dengan panah arah yang ikut berputar. */
  .avatar-arrow {
    fill: #f1e3c6;
  }

  .avatar-body {
    fill: #d9564a;
    stroke: #100c09;
    stroke-width: 5;
  }

  .avatar-plate {
    fill: #f7eedb;
  }

  /* ------------------------------------------------------------ bar bawah */

  .mini-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 1px;
  }

  .mini-total {
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(244, 234, 212, 0.42);
  }

  .mini-open {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(201, 160, 92, 0.85);
  }

  .mini-key {
    display: inline-grid;
    place-items: center;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    border: 1px solid rgba(244, 234, 212, 0.22);
    color: rgba(244, 234, 212, 0.6);
    font-size: 7px;
    line-height: 1;
  }

  @media (max-width: 860px) {
    .mini {
      right: 20px;
      bottom: 86px;
      width: 160px;
    }
  }

  /* Jendela sempit tanpa sentuh: baris tombol sistem turun ke sudut ini juga. */
  @media (max-width: 720px) {
    .mini {
      right: 16px;
      bottom: 62px;
      width: 132px;
    }
  }

  /*
   * Layar sentuh: bar sistem memenuhi lebar di paling bawah (±46 px + safe area),
   * jadi peta kecil naik ke atasnya. Petunjuk gestur di `.hud.touch .dock`
   * menyempit ke kiri supaya keduanya tidak bertabrakan (lihat `Hud.svelte`).
   */
  @media (pointer: coarse) {
    .mini {
      right: calc(12px + env(safe-area-inset-right, 0px));
      bottom: calc(74px + env(safe-area-inset-bottom, 0px));
      width: 96px;
      padding: 4px;
      gap: 3px;
      box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.42);
    }

    .mini-title {
      font-size: 7.5px;
      letter-spacing: 0.18em;
    }

    .mini-live-text,
    .mini-open,
    .compass {
      display: none;
    }

    .mini-foot {
      justify-content: flex-end;
    }

    .mini-total {
      font-size: 6.5px;
    }
  }

  /* Ponsel mendatar: tinggi layar habis untuk diorama, peta kecil disembunyikan. */
  @media (max-height: 460px) {
    .mini {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mini,
    .mini-dot,
    .route {
      animation: none;
      transition: none;
    }
  }
</style>
