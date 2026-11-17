<script>
  import { EXPERIENCE_LABEL } from '../panel-utils.js'

  let { data } = $props()

  let type = $state('all')

  const experiences = $derived(data.experiences ?? [])
  const types = $derived([...new Set(experiences.map((item) => item.type).filter(Boolean))])
  const filtered = $derived(
    type === 'all' ? experiences : experiences.filter((item) => item.type === type),
  )
  const counters = $derived(
    types.map((key) => ({
      key,
      label: EXPERIENCE_LABEL[key] ?? key,
      count: experiences.filter((item) => item.type === key).length,
    })),
  )
</script>

<div class="experience-view">
  <section class="panel-section">
    <div class="filter-row">
      <button class="filter-chip" class:active={type === 'all'} type="button" onclick={() => (type = 'all')}>
        Semua <span class="num">{experiences.length}</span>
      </button>
      {#each counters as item (item.key)}
        <button
          class="filter-chip"
          class:active={type === item.key}
          type="button"
          onclick={() => (type = item.key)}
        >
          {item.label} <span class="num">{item.count}</span>
        </button>
      {/each}
    </div>

    {#if filtered.length}
      <div class="exp-list">
        {#each filtered as item (item.id)}
          <article class="exp-item">
            <div class="exp-head">
              <strong>{item.title}</strong>
              <small>{item.period || ''}</small>
            </div>
            <p class="exp-org">
              {item.organization || '—'}
              <span class="type-badge">{EXPERIENCE_LABEL[item.type] ?? item.type}</span>
            </p>
            {#if item.description}<p>{item.description}</p>{/if}
            {#if (item.highlights ?? []).length}
              <ul class="plain-list">
                {#each item.highlights as highlight (highlight)}
                  <li>{highlight}</li>
                {/each}
              </ul>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <p class="empty-state">Belum ada pengalaman pada kategori ini.</p>
    {/if}
  </section>
</div>

<style>
  .num {
    margin-left: 3px;
    font-family: var(--font-mono);
    font-size: 8px;
    opacity: 0.6;
  }

  .exp-org {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    font-size: 10.5px;
    color: var(--vermilion-deep);
  }
</style>
