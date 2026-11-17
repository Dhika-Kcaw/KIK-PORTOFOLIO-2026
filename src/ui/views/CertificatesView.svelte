<script>
  import { isUrl, safeHref } from '../panel-utils.js'

  let { data } = $props()

  const certificates = $derived(data.certificates ?? [])
  const awards = $derived(certificates.filter((item) => item.category === 'award'))
  const diplomas = $derived(certificates.filter((item) => item.category !== 'award'))
</script>

<div class="certificates-view">
  {#each [{ title: 'Sertifikat', note: 'Bukti pembelajaran dan pelatihan', items: diplomas }, { title: 'Prestasi', note: 'Piagam dan pencapaian lomba', items: awards }] as group (group.title)}
    <section class="panel-section">
      <header class="section-head">
        <div>
          <p class="kicker">{group.items.length} berkas</p>
          <h4>{group.title}</h4>
          <p class="lede">{group.note}</p>
        </div>
      </header>

      {#if group.items.length}
        <div class="cert-grid">
          {#each group.items as item (item.id)}
            <article class="cert-card">
              <span class="cert-thumb">
                {#if item.image_url}
                  <img src={item.image_url} alt={`Dokumentasi ${item.title}`} loading="lazy" />
                {:else}
                  <span class="cert-seal" aria-hidden="true">證</span>
                {/if}
              </span>
              <span class="cert-copy">
                <small>{[item.year, item.issuer].filter(Boolean).join(' · ') || 'Arsip'}</small>
                <strong>{item.title}</strong>
                {#if item.description}<span>{item.description}</span>{/if}
                {#if item.documentation}
                  {#if isUrl(item.documentation)}
                    <a class="cert-link" href={safeHref(item.documentation)} target="_blank" rel="noreferrer">
                      Lihat dokumentasi ↗
                    </a>
                  {:else}
                    <span class="cert-link muted">Dokumentasi: {item.documentation}</span>
                  {/if}
                {/if}
              </span>
            </article>
          {/each}
        </div>
      {:else}
        <p class="empty-line">Belum ada {group.title.toLowerCase()} yang diunggah.</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .cert-seal {
    font-family: var(--font-seal);
    font-size: 26px;
    color: rgba(127, 155, 134, 0.7);
  }

  .cert-link {
    margin-top: 5px;
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--vermilion-deep);
  }

  .cert-link.muted {
    text-transform: none;
    letter-spacing: 0;
    color: rgba(36, 28, 22, 0.45);
  }
</style>
