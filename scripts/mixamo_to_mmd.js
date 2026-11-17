/**
 * Alat bantu animasi Mixamo → MMD.
 *
 * Konversi FBX → VMD **tidak** dilakukan di sini: berkas FBX Mixamo di-retarget
 * lewat <https://rig.reze.one/> (browser, tanpa akun) lalu VMD hasilnya disimpan
 * ke `public/motions/`. Lihat README bagian "Animasi dari Mixamo".
 *
 * Skrip ini yang memeriksa hasilnya:
 *
 *   bun run motions:check                     # semua VMD di public/motions
 *   bun run motions:check public/motions/jump-idle.vmd
 *
 * Yang dilaporkan: durasi, jumlah tulang, apakah tulang wajib MMD ada, dan
 * apakah klip membawa translasi tulang akar (yang dibuang oleh
 * `AnimationController` karena posisi karakter diurus controller).
 */

const SHIFT_JIS = new TextDecoder('shift_jis')

/** Tulang MMD yang harus ada agar klip terlihat benar di model ini. */
export const REQUIRED_BONES = ['センター', '上半身', '頭', '首', '左腕', '右腕', '左足', '右足']

/** Tulang akar yang translasinya dibuang saat klip dipakai museum. */
export const ROOT_BONES = ['センター', '全ての親', 'グルーブ']

export const MIXAMO_TO_MMD_BONE_MAP = {
  // Pelvis / Hips
  mixamorigHips: 'センター',
  'mixamorig:Hips': 'センター',
  Hips: 'センター',

  // Spine & Head
  mixamorigSpine: '下半身',
  'mixamorig:Spine': '下半身',
  Spine: '下半身',
  mixamorigSpine1: '上半身',
  'mixamorig:Spine1': '上半身',
  Spine1: '上半身',
  mixamorigSpine2: '上半身2',
  'mixamorig:Spine2': '上半身2',
  Spine2: '上半身2',
  mixamorigNeck: '首',
  'mixamorig:Neck': '首',
  Neck: '首',
  mixamorigHead: '頭',
  'mixamorig:Head': '頭',
  Head: '頭',

  // Left Arm
  mixamorigLeftShoulder: '左肩',
  'mixamorig:LeftShoulder': '左肩',
  LeftShoulder: '左肩',
  mixamorigLeftArm: '左腕',
  'mixamorig:LeftArm': '左腕',
  LeftArm: '左腕',
  mixamorigLeftForeArm: '左ひじ',
  'mixamorig:LeftForeArm': '左ひじ',
  LeftForeArm: '左ひじ',
  mixamorigLeftHand: '左手首',
  'mixamorig:LeftHand': '左手首',
  LeftHand: '左手首',

  // Right Arm
  mixamorigRightShoulder: '右肩',
  'mixamorig:RightShoulder': '右肩',
  RightShoulder: '右肩',
  mixamorigRightArm: '右腕',
  'mixamorig:RightArm': '右腕',
  RightArm: '右腕',
  mixamorigRightForeArm: '右ひじ',
  'mixamorig:RightForeArm': '右ひじ',
  RightForeArm: '右ひじ',
  mixamorigRightHand: '右手首',
  'mixamorig:RightHand': '右手首',
  RightHand: '右手首',

  // Left Leg
  mixamorigLeftUpLeg: '左足',
  'mixamorig:LeftUpLeg': '左足',
  LeftUpLeg: '左足',
  mixamorigLeftLeg: '左ひざ',
  'mixamorig:LeftLeg': '左ひざ',
  LeftLeg: '左ひざ',
  mixamorigLeftFoot: '左足首',
  'mixamorig:LeftFoot': '左足首',
  LeftFoot: '左足首',
  mixamorigLeftToeBase: '左つま先',
  'mixamorig:LeftToeBase': '左つま先',
  LeftToeBase: '左つま先',

  // Right Leg
  mixamorigRightUpLeg: '右足',
  'mixamorig:RightUpLeg': '右足',
  RightUpLeg: '右足',
  mixamorigRightLeg: '右ひざ',
  'mixamorig:RightLeg': '右ひざ',
  RightLeg: '右ひざ',
  mixamorigRightFoot: '右足首',
  'mixamorig:RightFoot': '右足首',
  RightFoot: '右足首',
  mixamorigRightToeBase: '右つま先',
  'mixamorig:RightToeBase': '右つま先',
  RightToeBase: '右つま先',
}

/** Nama tulang Mixamo → nama tulang MMD (null bila tidak dikenal). */
export function mapMixamoBoneToMMD(mixamoBoneName) {
  const cleanName = String(mixamoBoneName).replace(/^[a-zA-Z0-9_]+:/, '')
  return MIXAMO_TO_MMD_BONE_MAP[mixamoBoneName] ?? MIXAMO_TO_MMD_BONE_MAP[cleanName] ?? null
}

/** Baca nama berukuran tetap (Shift-JIS, diisi nol). */
function decodeName(bytes, offset, length) {
  let end = offset
  while (end < offset + length && bytes[end] !== 0) end += 1
  return SHIFT_JIS.decode(bytes.subarray(offset, end))
}

const SIGNATURE = 'Vocaloid Motion Data 0002'
const BONE_FRAME_BYTES = 111

/** Baca byte VMD menjadi data yang bisa diperiksa (bagian tulang saja). */
export function readVmd(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 54) throw new Error('Berkas terlalu kecil untuk VMD')

  const signature = String.fromCharCode(...bytes.subarray(0, 30)).replace(/\0+$/, '')
  if (signature !== SIGNATURE) {
    throw new Error(`Tanda tangan bukan VMD: ${JSON.stringify(signature)}`)
  }

  const view = new DataView(buffer)
  const modelName = decodeName(bytes, 30, 20)
  const count = view.getUint32(50, true)
  const boneKeyFrames = []

  let offset = 54
  for (let index = 0; index < count; index += 1) {
    if (offset + BONE_FRAME_BYTES > bytes.length) {
      throw new Error(`Berkas terpotong: keyframe ${index + 1} dari ${count} tidak lengkap`)
    }
    boneKeyFrames.push({
      boneName: decodeName(bytes, offset, 15),
      frameNumber: view.getUint32(offset + 15, true),
      position: [
        view.getFloat32(offset + 19, true),
        view.getFloat32(offset + 23, true),
        view.getFloat32(offset + 27, true),
      ],
      rotation: [
        view.getFloat32(offset + 31, true),
        view.getFloat32(offset + 35, true),
        view.getFloat32(offset + 39, true),
        view.getFloat32(offset + 43, true),
      ],
    })
    offset += BONE_FRAME_BYTES
  }

  return { signature, modelName, boneKeyFrames }
}

/** Ringkas isi klip: durasi (30 fps), tulang, dan pemakaian akar. */
export function summarizeMotion(vmd) {
  const bones = new Map()
  let lastFrame = 0
  let rootTranslation = false

  for (const frame of vmd.boneKeyFrames) {
    lastFrame = Math.max(lastFrame, frame.frameNumber)
    const entry = bones.get(frame.boneName) ?? { keys: 0, first: frame.frameNumber, last: frame.frameNumber }
    entry.keys += 1
    entry.first = Math.min(entry.first, frame.frameNumber)
    entry.last = Math.max(entry.last, frame.frameNumber)
    bones.set(frame.boneName, entry)

    if (ROOT_BONES.includes(frame.boneName)) {
      const [x, y, z] = frame.position
      if (Math.hypot(x, y, z) > 0.001) rootTranslation = true
    }
  }

  return {
    modelName: vmd.modelName,
    duration: lastFrame / 30,
    boneCount: bones.size,
    keyCount: vmd.boneKeyFrames.length,
    rootTranslation,
    missingBones: REQUIRED_BONES.filter((bone) => !bones.has(bone)),
  }
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

if (import.meta.main) {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const directory = path.join(import.meta.dir, '..', 'public', 'motions')
  const args = process.argv.slice(2)

  let entries = []
  try {
    entries = await fs.readdir(directory)
  } catch (error) {
    console.log(`Folder ${directory} belum ada.`)
  }

  const targets =
    args.length > 0
      ? args
      : entries
          .filter((file) => file.endsWith('.vmd'))
          .sort()
          .map((file) => path.join(directory, file))

  if (targets.length === 0) {
    console.log(`Tidak ada berkas .vmd di ${directory}`)
  }

  let failed = 0
  for (const target of targets) {
    const label = path.basename(target)
    try {
      const buffer = await fs.readFile(target)
      const motion = summarizeMotion(readVmd(buffer))
      const notes = []
      if (motion.rootTranslation) notes.push('ada translasi akar (dibuang saat dipakai)')
      if (motion.missingBones.length > 0) notes.push(`tulang hilang: ${motion.missingBones.join(', ')}`)

      console.log(
        `${label}: ${(buffer.length / 1024).toFixed(1)} KB · ${motion.duration.toFixed(2)} s · ` +
          `${motion.boneCount} tulang · ${motion.keyCount} keyframe · model "${motion.modelName}"`,
      )
      if (notes.length > 0) console.log(`  ⚠ ${notes.join(' · ')}`)
    } catch (error) {
      failed += 1
      console.log(`${label}: GAGAL — ${error.message}`)
    }
  }

  if (failed > 0) process.exitCode = 1
}
