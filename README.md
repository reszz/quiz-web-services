# API Reservasi Lapangan Olahraga

REST API untuk sistem reservasi lapangan olahraga (futsal, badminton, basket, mini soccer, tenis) menggunakan **NestJS**. Pengguna dapat melihat daftar dan jadwal lapangan, memesan slot waktu, melihat reservasi, dan membatalkan booking. Sistem menolak pemesanan pada jadwal yang bentrok.

Kuis Proyek Individu, Praktek Pemrograman Web 3 (Sesi 5).

| | |
|---|---|
| Nama | Salira Restu Gusti |
| NIM / Kelas | 240414018 / 3-IF |
| Program Studi | Teknik Informatika, IDE LPKIA Bandung |

## Batasan implementasi

- NestJS dengan **Controller** dan **Service**.
- Data disimpan sementara di **array** (memori). Data hilang saat server di-restart.
- Request body berupa object biasa. **Tanpa** DTO, class-validator, dan database. Validasi dilakukan manual di Service.
- Autentikasi dan frontend tidak termasuk cakupan.

## Teknologi

- Node.js 18 atau lebih baru
- NestJS 10 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- TypeScript

## Cara menjalankan

```bash
# 1. Install dependency
npm install

# 2. Jalankan mode development (auto-reload)
npm run start:dev

# atau build lalu jalankan
npm run build
node dist/main.js
```

API aktif di `http://localhost:3000`. Port dapat diubah lewat environment variable `PORT`.

## Struktur project

```text
src/
  main.ts                      entry point
  app.module.ts                registrasi controller dan service
  common/
    response.ts                helper format response: ok() dan fail()
    time.util.ts               validasi tanggal/jam dan deteksi overlap
  fields/
    fields.controller.ts       endpoint /fields
    fields.service.ts          data dan logika lapangan
  bookings/
    bookings.controller.ts     endpoint /bookings
    bookings.service.ts        logika booking dan konflik jadwal
  users/
    users.controller.ts        endpoint /users/:userId/bookings
postman/
  reservasi-lapangan.postman_collection.json
```

## Model data

**Field (lapangan)**

| Properti | Tipe | Keterangan |
|---|---|---|
| id | number | Dibuat otomatis |
| name | string | Nama lapangan |
| sportType | string | Jenis olahraga (disimpan huruf kecil) |
| pricePerHour | number | Harga per jam, harus lebih dari 0 |
| status | string | `AVAILABLE` atau `MAINTENANCE` |

Data awal: 5 lapangan (id 1 sampai 5). Lapangan id 5 berstatus `MAINTENANCE` untuk bahan uji.

**Booking (reservasi)**

| Properti | Tipe | Keterangan |
|---|---|---|
| id | number | Dibuat otomatis |
| userId | string | Opsional di request. Jika kosong, memakai `customerName` huruf kecil |
| fieldId | number | Id lapangan |
| date | string | Format `YYYY-MM-DD` |
| startTime, endTime | string | Format `HH:mm` |
| customerName | string | Nama pemesan |
| totalPrice | number | `pricePerHour` dikali durasi jam, dihitung saat booking |
| status | string | `BOOKED`, `CANCELLED`, atau `COMPLETED` |
| createdAt, updatedAt | string | Waktu ISO 8601 |
| cancelledAt | string | Hanya ada jika dibatalkan |

## Daftar endpoint

### Endpoint utama 

| Method | Path | Fungsi | Status sukses |
|---|---|---|---|
| GET | `/fields` | Daftar lapangan | 200 |
| GET | `/fields/:id` | Detail lapangan | 200 |
| GET | `/fields/:id/availability?date=YYYY-MM-DD` | Slot terpakai dan slot kosong | 200 |
| POST | `/bookings` | Buat reservasi | 201 |
| GET | `/bookings` | Daftar reservasi | 200 |
| GET | `/bookings/:id` | Detail reservasi | 200 |
| GET | `/users/:userId/bookings` | Reservasi milik satu user | 200 |
| PATCH | `/bookings/:id/cancel` | Batalkan reservasi | 200 |
| GET | `/users` | Daftar Users | 200 | 

### Endpoint tambahan (CRUD lengkap)

| Method | Path | Fungsi | Status sukses |
|---|---|---|---|
| POST | `/fields` | Tambah lapangan | 201 |
| PUT | `/fields/:id` | Ganti seluruh data lapangan | 200 |
| PATCH | `/fields/:id` | Ubah sebagian data lapangan | 200 |
| DELETE | `/fields/:id` | Hapus lapangan | 200 |
| GET | `/bookings` | Daftar reservasi | 200 |
| PUT | `/bookings/:id` | Ganti seluruh data reservasi | 200 |
| PATCH | `/bookings/:id` | Ubah sebagian (misalnya geser jam) | 200 |
| PATCH | `/bookings/:id/complete` | Tandai reservasi selesai | 200 |
| DELETE | `/bookings/:id` | Hapus reservasi permanen | 200 |

### Query parameter

| Endpoint | Parameter | Contoh |
|---|---|---|
| `GET /fields` | `sportType`, `status` | `/fields?sportType=futsal` |
| `GET /fields/:id/availability` | `date` (wajib) | `/fields/2/availability?date=2026-11-05` |
| `GET /bookings` | `fieldId`, `date`, `status` | `/bookings?status=BOOKED&date=2026-11-05` |
| `GET /users/:userId/bookings` | `status` | `/users/budi/bookings?status=BOOKED` |

## Aturan bisnis

- Jam operasional **08:00 sampai 22:00**. Booking di luar jam itu ditolak.
- `endTime` harus lebih besar dari `startTime`.
- Dua booking **bentrok** jika berada di lapangan dan tanggal yang sama dan rentang jamnya tumpang tindih. Booking berurutan (misalnya 18:00-19:00 lalu 19:00-20:00) **tidak** bentrok.
- Reservasi berstatus `CANCELLED` **tidak** dianggap memakai slot, sehingga slotnya bisa dipesan lagi. Status `BOOKED` dan `COMPLETED` tetap menghalangi.
- Lapangan berstatus `MAINTENANCE` tidak bisa dipesan.
- Reservasi hanya bisa diubah atau dibatalkan selama berstatus `BOOKED`.
- Lapangan yang masih memiliki reservasi `BOOKED` tidak bisa dihapus.

## Format response

Sukses:

```json
{
  "success": true,
  "message": "Reservasi berhasil dibuat",
  "data": {}
}
```

Gagal:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Jadwal bentrok dengan reservasi lain",
  "conflictWith": {}
}
```

## Status code

| Status | Situasi |
|---|---|
| 200 OK | Baca, ubah, batalkan, atau hapus berhasil |
| 201 Created | Lapangan atau reservasi berhasil dibuat |
| 400 Bad Request | Input tidak valid (format tanggal/jam, jam terbalik, id bukan angka, field wajib kosong) |
| 404 Not Found | Lapangan atau reservasi tidak ditemukan |
| 409 Conflict | Jadwal bentrok, reservasi sudah dibatalkan, status tidak sesuai, atau lapangan masih punya reservasi aktif |
| 422 Unprocessable Entity | Lapangan sedang `MAINTENANCE` |

## Contoh request dan response

### Booking berhasil (201)

```http
POST /bookings
Content-Type: application/json

{
  "fieldId": 2,
  "date": "2026-11-05",
  "startTime": "18:00",
  "endTime": "19:00",
  "customerName": "Budi"
}
```

```json
{
  "success": true,
  "message": "Reservasi berhasil dibuat",
  "data": {
    "id": 1,
    "userId": "budi",
    "fieldId": 2,
    "date": "2026-11-05",
    "startTime": "18:00",
    "endTime": "19:00",
    "customerName": "Budi",
    "totalPrice": 60000,
    "status": "BOOKED",
    "createdAt": "2026-11-03T09:20:23.026Z",
    "updatedAt": "2026-11-03T09:20:23.026Z"
  }
}
```

### Jadwal bentrok (409)

Request yang sama dengan `startTime` `18:30` dan `endTime` `19:30` pada lapangan dan tanggal yang sama.

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Jadwal bentrok dengan reservasi lain",
  "conflictWith": {
    "bookingId": 1,
    "date": "2026-11-05",
    "startTime": "18:00",
    "endTime": "19:00"
  }
}
```

### Lapangan tidak ditemukan (404)

`GET /fields/99`

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Lapangan dengan id 99 tidak ditemukan"
}
```

### Reservasi sudah dibatalkan (409)

`PATCH /bookings/1/cancel` untuk kedua kalinya.

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Reservasi dengan id 1 sudah dibatalkan sebelumnya"
}
```

### Validasi gagal (400)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validasi gagal",
  "errors": [
    "date wajib berformat YYYY-MM-DD yang valid",
    "customerName wajib diisi (string)",
    "endTime harus lebih besar dari startTime"
  ]
}
```

### Cek ketersediaan (200)

`GET /fields/2/availability?date=2026-11-05` setelah ada booking 18:00-19:00 dan 19:00-20:00.

```json
{
  "success": true,
  "message": "Ketersediaan lapangan",
  "data": {
    "field": { "id": 2, "name": "Badminton Court 1", "status": "AVAILABLE" },
    "date": "2026-11-05",
    "operatingHours": { "open": "08:00", "close": "22:00" },
    "bookedSlots": [
      { "bookingId": 1, "startTime": "18:00", "endTime": "19:00", "status": "BOOKED" },
      { "bookingId": 2, "startTime": "19:00", "endTime": "20:00", "status": "BOOKED" }
    ],
    "availableSlots": [
      { "startTime": "08:00", "endTime": "18:00" },
      { "startTime": "20:00", "endTime": "22:00" }
    ]
  }
}
```

## Skenario pengujian

Uji secara berurutan karena data tersimpan di memori. Restart server untuk mengulang dari awal.

| No | Skenario | Request | Hasil |
|---|---|---|---|
| 1 | Daftar lapangan | `GET /fields` | 200 |
| 1 | Cek ketersediaan | `GET /fields/2/availability?date=2026-11-05` | 200 |
| 2 | Booking berhasil | `POST /bookings` | 201 |
| 3 | Jadwal bentrok | `POST /bookings` jam 18:30-19:30 | 409 |
| 4 | Lapangan tidak ada | `GET /fields/99` | 404 |
| 4 | Reservasi tidak ada | `PATCH /bookings/999/cancel` | 404 |
| 5 | Batalkan booking | `PATCH /bookings/1/cancel` | 200 |
| 5 | Slot tersedia lagi | `GET /fields/2/availability?date=2026-11-05` | 200 |
| 5 | Booking ulang slot yang sama | `POST /bookings` jam 18:00-19:00 | 201 |

### Dengan Postman

1. Klik **Import**, lalu pilih `postman/reservasi-lapangan.postman_collection.json`.
2. Variabel `baseUrl` sudah diisi `http://localhost:3000`.
3. Jalankan request di folder **1. Skenario wajib quiz** secara berurutan, lalu folder CRUD.

### Dengan curl

```bash
# Booking berhasil
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{"fieldId":2,"date":"2026-11-05","startTime":"18:00","endTime":"19:00","customerName":"Budi"}'

# Batalkan reservasi
curl -X PATCH http://localhost:3000/bookings/1/cancel

# Cek ketersediaan
curl "http://localhost:3000/fields/2/availability?date=2026-11-05"
```

Pengguna Windows PowerShell: gunakan `curl.exe`, dan simpan body JSON ke file lalu kirim dengan `-d "@booking.json"`.

## Catatan desain

- **`userId` opsional.** Contoh body pada soal tidak memuat `userId`, tetapi ada endpoint `/users/:userId/bookings`. Jika `userId` tidak dikirim, sistem memakai `customerName` huruf kecil sebagai penanda pemilik.
- **Cancel memakai PATCH.** Pembatalan mengubah status menjadi `CANCELLED` dan tidak menghapus data, sehingga riwayat tetap tersimpan.
- **409 untuk bentrok, 422 untuk maintenance.** Bentrok adalah tabrakan dengan data yang sudah ada. Maintenance adalah aturan bisnis yang menolak input yang sebenarnya valid.
- **Satu module.** `FieldsController` memerlukan `BookingsService` dan sebaliknya `BookingsService` memerlukan `FieldsService`. Memisahnya menjadi dua module menimbulkan dependensi melingkar, jadi semuanya didaftarkan di `AppModule`.
- **Body JSON yang rusak** (misalnya tanda kutip kurang) masih memakai format error bawaan NestJS, bukan format response di atas.

## Pengembangan lanjutan

- DTO dan class-validator dengan `ValidationPipe` global.
- Database (PostgreSQL dengan Prisma atau TypeORM), dengan konflik jadwal dijaga oleh transaksi atau constraint.
- Autentikasi JWT agar `userId` berasal dari token.
- Dokumentasi otomatis dengan Swagger.
- Penolakan booking untuk waktu yang sudah lewat dan penanganan zona waktu.
- Unit test (Jest) untuk fungsi `isOverlap` dan pengecekan konflik.
