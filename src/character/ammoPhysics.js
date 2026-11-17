/*
 * Jembatan ke fisika Bullet (Ammo.js) untuk @moeru/three-mmd.
 *
 * Modul ini sengaja terpisah dari `Character.js` supaya bisa diimpor secara
 * dinamis: paketnya opsional. Bila `@moeru/three-mmd-physics-ammo` belum
 * terpasang (atau wasm Ammo gagal dimuat di browser), museum tetap hidup dengan
 * fisika spring bone — bukan halaman kosong.
 *
 * Pemakaian: `MMDAmmoPlugin` didaftarkan ke `MMDLoader` SEBELUM model dimuat.
 * Plugin itulah yang menginisialisasi runtime Ammo bersama; jadi tidak perlu
 * memanggil `initAmmo()` sendiri.
 */
import { MMDAmmoPlugin } from '@moeru/three-mmd-physics-ammo'

export { MMDAmmoPlugin }
