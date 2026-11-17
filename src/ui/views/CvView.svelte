<script>
  import { EXPERIENCE_LABEL, isUrl, safeHref } from '../panel-utils.js'

  let { profile, data } = $props()

  const hardSkills = $derived((data.skills ?? []).filter((skill) => skill.category === 'hard'))
  const softSkills = $derived((data.skills ?? []).filter((skill) => skill.category !== 'hard'))
  const experiences = $derived(data.experiences ?? [])

  const contacts = $derived(
    [
      ['Email', profile.email],
      ['GitHub', profile.github],
      ['LinkedIn', profile.linkedin],
      ['Instagram', profile.instagram],
    ].filter(([, value]) => value),
  )

  const hasCvFile = $derived(isUrl(profile.cv_url) || String(profile.cv_url ?? '').startsWith('/'))

  const escape = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  function buildDocument() {
    const list = (items) => items.map((item) => `<li>${escape(item)}</li>`).join('')
    const skillLine = (items) =>
      items.map((skill) => `<li><span>${escape(skill.name)}</span><span>${skill.level}%</span></li>`).join('')

    const experienceHtml = experiences
      .map(
        (item) => `
          <div class="entry">
            <div class="entry-head"><strong>${escape(item.title)}</strong><span>${escape(item.period)}</span></div>
            <p class="org">${escape(item.organization)} · ${escape(EXPERIENCE_LABEL[item.type] ?? item.type)}</p>
            ${item.description ? `<p>${escape(item.description)}</p>` : ''}
            ${(item.highlights ?? []).length ? `<ul>${list(item.highlights)}</ul>` : ''}
          </div>`,
      )
      .join('')

    return `<!doctype html>
<html lang="id"><head><meta charset="utf-8" /><title>CV ${escape(profile.name)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:38px 42px;font-family:'Segoe UI',Arial,sans-serif;color:#1d1814;font-size:12px;line-height:1.55}
  h1{margin:0;font-size:25px;letter-spacing:-.4px}
  h2{margin:18px 0 7px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b23a30;border-bottom:1px solid #ddd0b4;padding-bottom:5px}
  .sub{margin:3px 0 0;color:#6a5c4c}
  .meta{margin-top:8px;font-size:10.5px;color:#6a5c4c}
  .meta span{margin-right:12px}
  ul{margin:4px 0 0;padding-left:16px}
  li{margin:2px 0}
  .entry{margin-bottom:10px}
  .entry-head{display:flex;justify-content:space-between;gap:12px}
  .entry-head span{color:#7a6a58;font-size:10.5px}
  .org{margin:1px 0 2px;color:#b23a30;font-size:10.5px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:0 26px}
  .cols li{display:flex;justify-content:space-between;gap:10px}
  .cols li span:last-child{color:#8a7962;font-size:10.5px}
  p{margin:3px 0}
</style></head>
<body>
  <h1>${escape(profile.name)}</h1>
  <p class="sub">${escape(profile.headline || profile.competence || '')}</p>
  <p class="meta">
    ${[profile.class_name, profile.location, profile.email].filter(Boolean).map((value) => `<span>${escape(value)}</span>`).join('')}
  </p>
  ${profile.bio ? `<h2>Profil</h2><p>${escape(profile.bio)}</p>` : ''}
  ${(profile.education ?? []).length ? `<h2>Pendidikan</h2><ul>${list(profile.education)}</ul>` : ''}
  ${
    hardSkills.length || softSkills.length
      ? `<h2>Keahlian</h2><div class="cols"><ul>${skillLine(hardSkills)}</ul><ul>${skillLine(softSkills)}</ul></div>`
      : ''
  }
  ${experienceHtml ? `<h2>Pengalaman</h2>${experienceHtml}` : ''}
  ${(profile.organizations ?? []).length ? `<h2>Organisasi</h2><ul>${list(profile.organizations)}</ul>` : ''}
  ${profile.career_goal ? `<h2>Tujuan karier</h2><p>${escape(profile.career_goal)}</p>` : ''}
</body></html>`
  }

  function printCv() {
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)

    const doc = frame.contentDocument
    doc.open()
    doc.write(buildDocument())
    doc.close()

    const cleanup = () => setTimeout(() => frame.remove(), 400)
    frame.contentWindow.addEventListener('afterprint', cleanup)
    setTimeout(() => {
      frame.contentWindow.focus()
      frame.contentWindow.print()
      cleanup()
    }, 120)
  }
</script>

<div class="cv-view">
  <div class="cv-toolbar">
    <div>
      <p class="kicker">Resume satu halaman</p>
      <h4>CV Digital</h4>
    </div>
    <div class="cv-actions">
      {#if hasCvFile}
        <a class="button" href={safeHref(profile.cv_url)} target="_blank" rel="noreferrer" download>Unduh CV (PDF)</a>
      {/if}
      <button class="button primary" type="button" onclick={printCv}>Cetak / Simpan PDF</button>
    </div>
  </div>

  <article class="cv-sheet">
    <header class="cv-head">
      <div>
        <h3>{profile.name}</h3>
        <p>{profile.headline || profile.role}</p>
        <p>{[profile.class_name, profile.competence].filter(Boolean).join(' · ')}</p>
      </div>
      <div class="cv-contact">
        {#each contacts as [label, value] (label)}
          <span>{value}</span>
        {/each}
        {#if profile.location}<span>{profile.location}</span>{/if}
      </div>
    </header>

    {#if profile.bio}
      <section class="cv-section">
        <p class="cv-section-title">Profil</p>
        <p class="cv-text">{profile.bio}</p>
      </section>
    {/if}

    {#if (profile.education ?? []).length}
      <section class="cv-section">
        <p class="cv-section-title">Pendidikan</p>
        {#each profile.education as item (item)}
          <div class="cv-line"><span>{item}</span></div>
        {/each}
      </section>
    {/if}

    <section class="cv-section">
      <p class="cv-section-title">Keahlian</p>
      <div class="cv-skill-cols">
        {#each [{ title: 'Hard skill', items: hardSkills }, { title: 'Soft skill', items: softSkills }] as group (group.title)}
          {#if group.items.length}
            <div>
              <p class="cv-sub">{group.title}</p>
              {#each group.items as skill (skill.id)}
                <div class="cv-line"><span>{skill.name}</span><span>{skill.level}%</span></div>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    </section>

    {#if experiences.length}
      <section class="cv-section">
        <p class="cv-section-title">Pengalaman</p>
        {#each experiences as item (item.id)}
          <div class="cv-entry">
            <div class="cv-line">
              <span><strong>{item.title}</strong></span>
              <span>{item.period}</span>
            </div>
            <p class="cv-sub">
              {item.organization}
              {#if item.type}· {EXPERIENCE_LABEL[item.type] ?? item.type}{/if}
            </p>
            {#if item.description}<p class="cv-text small">{item.description}</p>{/if}
          </div>
        {/each}
      </section>
    {/if}

    {#if (profile.organizations ?? []).length}
      <section class="cv-section">
        <p class="cv-section-title">Organisasi & kepanitiaan</p>
        {#each profile.organizations as item (item)}
          <div class="cv-line"><span>{item}</span></div>
        {/each}
      </section>
    {/if}

    {#if profile.career_goal}
      <section class="cv-section">
        <p class="cv-section-title">Tujuan karier</p>
        <p class="cv-text">{profile.career_goal}</p>
      </section>
    {/if}
  </article>
</div>

<style>
  .cv-toolbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .cv-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .cv-text {
    margin-top: 5px;
    font-size: 11.5px;
    line-height: 1.68;
    color: rgba(36, 28, 22, 0.62);
    white-space: pre-line;
  }

  .cv-text.small {
    font-size: 10.5px;
  }

  .cv-sub {
    margin: 2px 0 3px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(36, 28, 22, 0.45);
  }

  .cv-skill-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 24px;
    margin-top: 3px;
  }

  .cv-entry {
    padding: 4px 0;
  }

  .cv-entry strong {
    font-size: 11.5px;
  }

  @media (max-width: 700px) {
    .cv-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .cv-skill-cols {
      grid-template-columns: 1fr;
    }
  }
</style>
