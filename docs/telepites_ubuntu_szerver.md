# Pilot Erőforrás — Telepítés Ubuntu szerverre (kezdőknek)

Az alkalmazás tisztán statikus (csak HTML + JS fájlok) — nincs szükség adatbázis-szerverre, Node.js-re, vagy PHP-ra. Egyetlen webszervert kell telepíteni, ami kiszolgálja a fájlokat.

Ez az útmutató az **Nginx** webszervert használja (a legelterjedtebb választás Ubuntu-n).

---

## Amire szükséged van

- Ubuntu szerver (20.04 vagy újabb) — pl. VPS, helyi gép, vagy virtuális gép
- SSH hozzáférés a szerverhez
- A projekt fájljai a Windows gépeden

---

## 1. lépés — Kapcsolódj a szerverhez SSH-val

Windows-on nyisd meg a **PowerShell**-t vagy a **CMD**-t, és írd be:

```bash
ssh felhasznalonev@szerver-ip-cim
```

Pl.:
```bash
ssh ubuntu@192.168.1.100
```

Add meg a jelszót, és most már a szerveren vagy.

---

## 2. lépés — Nginx telepítése a szerveren

A szerveren futtasd ezeket a parancsokat:

```bash
sudo apt update
sudo apt install nginx -y
```

Ellenőrizd, hogy fut-e:

```bash
sudo systemctl status nginx
```

Ha `active (running)` szöveget látsz, minden rendben.

---

## 3. lépés — Fájlok feltöltése a szerverre

**Windows gépen** nyisd meg a PowerShell-t (ne az SSH ablakot), és futtasd:

```powershell
scp -r "C:\Users\User\Documents\GitHub\pilot-eroforras\src" felhasznalonev@szerver-ip-cim:/tmp/pilot-src
```

Pl.:
```powershell
scp -r "C:\Users\User\Documents\GitHub\pilot-eroforras\src" ubuntu@192.168.1.100:/tmp/pilot-src
```

Ez feltölti a teljes `src/` mappát a szerverre a `/tmp/pilot-src` helyre.

---

## 4. lépés — Fájlok elhelyezése a megfelelő helyre

Vissza az **SSH ablakba** (a szerveren):

```bash
sudo mkdir -p /var/www/pilot
sudo cp -r /tmp/pilot-src/* /var/www/pilot/
sudo chown -R www-data:www-data /var/www/pilot
```

---

## 5. lépés — Nginx beállítása

Hozz létre egy konfigurációs fájlt:

```bash
sudo nano /etc/nginx/sites-available/pilot
```

A megnyíló szerkesztőbe másold be ezt (az IP-t írd át a saját szervered IP-jére vagy domain nevére):

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/pilot;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # WASM fájlokhoz helyes MIME type
    types {
        application/wasm wasm;
    }
}
```

Mentés és kilépés: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 6. lépés — Nginx aktiválása és újraindítása

```bash
sudo ln -s /etc/nginx/sites-available/pilot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Ha az `nginx -t` azt írja: `syntax is ok` és `test is successful` — minden jó.

---

## 7. lépés — Tűzfal beállítása (ha szükséges)

Ha a szerveren be van kapcsolva a tűzfal (UFW):

```bash
sudo ufw allow 'Nginx HTTP'
sudo ufw status
```

---

## 8. lépés — Megnyitás böngészőben

A Windows gépeden nyisd meg a böngészőt, és írd be a szerver IP-jét:

```
http://szerver-ip-cim/index.html
```

Pl.:
```
http://192.168.1.100/index.html
```

A programnak be kell töltődnie.

---

## Frissítés (ha megváltoztak a fájlok)

Ha a Windows gépen módosítottál valamit, és fel akarod tölteni újra:

```powershell
# Windows PowerShell-ben:
scp -r "C:\Users\User\Documents\GitHub\pilot-eroforras\src\*" ubuntu@192.168.1.100:/var/www/pilot/
```

---

## Fontos tudnivalók

| Kérdés | Válasz |
|--------|--------|
| Kell-e adatbázis-szerver (MySQL stb.)? | **Nem.** Az adatok a böngészőben tárolódnak (IndexedDB). |
| Mindenki ugyanazt az adatot látja? | **Nem.** Minden felhasználónak saját, böngészőhöz kötött adattára van. |
| Kell-e internetkapcsolat a szerver mellé? | Csak az első betöltésnél, ha a sql.js CDN-ről töltődik. Lásd lent az offline opciót. |
| HTTP vagy HTTPS kell? | HTTP is működik. HTTPS-hez Let's Encrypt + Certbot szükséges (opcionális). |

---

## Opcionális: HTTPS beállítása (Let's Encrypt)

Ha a szerverednek van domain neve (pl. `pilot.cegem.hu`), ingyenes SSL tanúsítvány szerezhető:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d pilot.cegem.hu
```

A Certbot automatikusan beállítja az HTTPS-t és megújítja a tanúsítványt.

---

## Hibaelhárítás

**A böngésző nem nyílik meg / nem érhető el a szerver**
- Ellenőrizd, hogy az Nginx fut: `sudo systemctl status nginx`
- Ellenőrizd a tűzfalat: `sudo ufw status`
- Próbáld meg a szerveren belülről: `curl http://localhost/index.html`

**Fehér oldal vagy hibás betöltés**
- Nyisd meg a böngésző fejlesztői eszközét (`F12` → Console fül)
- Leggyakoribb ok: a `.wasm` fájl rossz MIME type-pal töltődik be — ezt az Nginx config `types` blokkja javítja (fent már benne van)

**Permission denied hiba feltöltéskor**
```bash
sudo chown -R www-data:www-data /var/www/pilot
sudo chmod -R 755 /var/www/pilot
```
