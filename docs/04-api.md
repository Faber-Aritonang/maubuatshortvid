# 04 — API backend (opsional, kontrak v0.1)

Prototype berjalan penuh tanpa backend. Bagian ini hanya dipakai bila
`VITE_SUPABASE_URL` diisi — untuk simpan project dan kuota.

## Auth
Supabase Auth standar (email+password / magic link). Tidak ada kode custom.
`profiles.id` = `auth.users.id` via trigger.

## Operasi data (langsung via supabase-js, RLS menjaga)

```js
// simpan
await supabase.from('projects').upsert({ id, owner: user.id, title, payload })
// load
await supabase.from('projects').select('*').order('updated_at', {ascending:false})
// kuota sebelum export online
await supabase.rpc('consume_credit', { p_kind: 'export' })
```

## Kontrak `payload` (JSON project)

```json
{
  "version": 1,
  "scenes": [
    {"text":"Halo, ini scene 1","style":"karaoke","camera":"push","transition":"fade","dur":4,"bg":210}
  ],
  "audioUrl": null
}
```

Validasi: `scenes` 1..20, `text` 1..500 char, `dur` 2..15 dtk,
`style/camera/transition` harus dari daftar di `styles.js`.

## Konversi WebM -> MP4 (opsional, di laptop)

```bash
ffmpeg -i export.webm -c:v libx264 -pix_fmt yuv420p -c:a aac export.mp4
```
