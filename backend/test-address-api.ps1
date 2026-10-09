$BASE = "http://localhost:3000/api"
$EMAIL = "muhamadafifajiputra@gmail.com"
$PASS  = "12345678"

Write-Host "`n[TEST 1] POST /auth/login" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body "{`"email`":`"$EMAIL`",`"password`":`"$PASS`"}"
$TOKEN = $login.tokens.accessToken
Write-Host "PASS - Login: $($login.user.name)" -ForegroundColor Green

$H = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

Write-Host "`n[TEST 2] GET /addresses?lat=-7.5567&lng=110.8418" -ForegroundColor Cyan
$addresses = Invoke-RestMethod -Uri "$BASE/addresses?lat=-7.5567&lng=110.8418" -Headers $H
Write-Host "PASS - $($addresses.Count) alamat" -ForegroundColor Green
$addresses | ForEach-Object { Write-Host "  - [$($_.label)] jarak: $($_.distanceKm)km | primary: $($_.isPrimary)" }

Write-Host "`n[TEST 3] POST /addresses (create)" -ForegroundColor Cyan
$body = '{"label":"Kost Test","addressDetail":"Jl. Veteran No. 99, Jebres","latitude":-7.5612,"longitude":110.8450,"recipientName":"Test Runner","recipientPhone":"+6289900000001","isPrimary":false}'
$created = Invoke-RestMethod -Uri "$BASE/addresses" -Method POST -Headers $H -Body $body
$NEW_ID = $created.id
Write-Host "PASS - Created id: $NEW_ID | label: $($created.label)" -ForegroundColor Green

Write-Host "`n[TEST 4] PATCH /addresses/$NEW_ID (update)" -ForegroundColor Cyan
$updated = Invoke-RestMethod -Uri "$BASE/addresses/$NEW_ID" -Method PATCH -Headers $H -Body '{"label":"Kost Test Updated"}'
Write-Host "PASS - label baru: $($updated.label)" -ForegroundColor Green

Write-Host "`n[TEST 5] PATCH /addresses/$NEW_ID/primary" -ForegroundColor Cyan
$primary = Invoke-RestMethod -Uri "$BASE/addresses/$NEW_ID/primary" -Method PATCH -Headers $H -Body '{}'
Write-Host "PASS - isPrimary: $($primary.isPrimary)" -ForegroundColor Green

$after = Invoke-RestMethod -Uri "$BASE/addresses" -Headers $H
$allPrimary = @($after | Where-Object { $_.isPrimary -eq $true })
if ($allPrimary.Count -eq 1) {
    Write-Host "PASS - Hanya 1 primary (constraint OK)" -ForegroundColor Green
} else {
    Write-Host "FAIL - Ada $($allPrimary.Count) primary!" -ForegroundColor Red
}

Write-Host "`n[TEST 6] DELETE /addresses/$NEW_ID" -ForegroundColor Cyan
$deleted = Invoke-RestMethod -Uri "$BASE/addresses/$NEW_ID" -Method DELETE -Headers $H
Write-Host "PASS - $($deleted.message)" -ForegroundColor Green

$after2 = Invoke-RestMethod -Uri "$BASE/addresses" -Headers $H
$stillExists = @($after2 | Where-Object { $_.id -eq $NEW_ID })
if ($stillExists.Count -eq 0) {
    Write-Host "PASS - Verified: alamat sudah terhapus" -ForegroundColor Green
} else {
    Write-Host "FAIL - Alamat masih ada di DB!" -ForegroundColor Red
}

Write-Host "`n========== SEMUA TEST SELESAI ==========" -ForegroundColor Cyan
