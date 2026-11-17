<script>
  let { data } = $props()

  const groups = $derived([
    {
      key: 'hard',
      title: 'Hard skill',
      description: 'Kemampuan teknis yang dipakai sehari-hari dalam membangun produk.',
      items: (data.skills ?? []).filter((skill) => skill.category === 'hard'),
    },
    {
      key: 'soft',
      title: 'Soft skill',
      description: 'Cara bekerja bersama orang, mengelola waktu, dan menyampaikan gagasan.',
      items: (data.skills ?? []).filter((skill) => skill.category !== 'hard'),
    },
  ])

  const average = (items) =>
    items.length ? Math.round(items.reduce((total, item) => total + Number(item.level ?? 0), 0) / items.length) : 0
</script>

<div class="skills-view">
  {#each groups as group (group.key)}
    <section class="panel-section">
      <header class="section-head">
        <div>
          <p class="kicker">{group.items.length} catatan</p>
          <h4>{group.title}</h4>
          <p class="lede">{group.description}</p>
        </div>
        <div class="group-score">
          <strong>{average(group.items)}<small>%</small></strong>
          <span>Rata-rata</span>
        </div>
      </header>

      {#if group.items.length}
        <div class="skill-list">
          {#each group.items as skill (skill.id)}
            <div class="skill-row">
              <span class="skill-name">{skill.name}</span>
              <span class="skill-value">{skill.level}%</span>
              <span class="skill-meter" aria-hidden="true">
                <span class="skill-bar" style={`width:${Math.max(0, Math.min(100, Number(skill.level ?? 0)))}%`}></span>
              </span>
              {#if skill.note}<span class="skill-note">{skill.note}</span>{/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-line">Belum ada keahlian pada kategori ini.</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .skill-list {
    margin-top: 4px;
  }

  .group-score {
    display: grid;
    justify-items: end;
    padding-left: 16px;
    border-left: 1px solid rgba(36, 28, 22, 0.12);
  }

  .group-score strong {
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 1;
    color: var(--vermilion-deep);
  }

  .group-score strong small {
    margin-left: 1px;
    font-size: 12px;
    color: rgba(36, 28, 22, 0.45);
  }

  .group-score span {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.42);
  }

  .skill-note {
    grid-column: 1 / -1;
    margin-top: 2px;
    font-size: 10px;
    color: rgba(36, 28, 22, 0.45);
  }
</style>
