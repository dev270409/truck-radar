# Autisti da Geotab: conferma e creazione account

Implementazione del 24/11/2026.

## 1. Perché

Geotab registra già i nomi dei conducenti sui tracciati (`GeotabTripSnapshot.driverName`), ma non sono account Truck Radar: non possono accedere alla PWA né vedere i propri viaggi. L'admin deve solo **confermare** i nominativi; il sistema crea l'account e le credenziali.

## 2. Flusso

1. L'admin apre **Autisti e team → Importa da Geotab** (`/dashboard/users/geotab`).
2. Truck Radar raggruppa i tracciati per `geotabDriverId` e mostra: nome, numero tracciati, ultimo viaggio, stato account.
3. L'admin seleziona i conducenti e clicca **Conferma autisti**.
4. Per ogni conducente:
   - se esiste già un utente con lo stesso nome, viene **collegato** (nessun duplicato);
   - se non esiste, viene creato un utente **AUTISTA** con:
     - nome e cognome ricavati dal nome Geotab;
     - email di accesso generata `nome.cognome@autisti.truck-radar.it`;
     - password temporanea di 12 caratteri;
     - ruolo AUTISTA, account attivo, nessun permesso gestionale.
5. La pagina mostra le credenziali con:
   - campi email/password;
   - pulsante **Copia messaggio** per singolo autista;
   - **Copia tutte le credenziali**.
6. Dopo la conferma, i viaggi già importati vengono collegati ai nuovi autisti confrontando il nome Geotab con l'utente creato (`enrichDriversFromGeotab`).
7. L'autista accede da `https://www.truck-radar.it/login` e vede i suoi viaggi in `/dashboard/autista`.

## 3. Regole e sicurezza

- L'email `@autisti.truck-radar.it` è un **identificativo di accesso**, non una casella di posta: non riceve email.
- La password è salvata solo come hash bcrypt e viene mostrata **una sola volta** al momento della creazione.
- Al primo accesso l'autista può cambiarla da Account.
- Se un nome corrisponde a un ADMIN/UFFICIO esistente, l'account viene solo collegato: non viene creato un doppione.
- Limite piano rispettato (`driverLimit`).
- Operazione riservata all'ADMIN, con rate limit e `AuditLog`.
- Il collegamento è salvato in `GeotabDriverLink` (`companyId`, `geotabDriverId`, `userId`).

## 4. Assegnazione automatica dei viaggi

`enrichDriversFromGeotab(companyId)`:

- legge i match `TripGeotabMatch` con `driverId` ancora vuoto;
- recupera `driverName` dal tracciato Geotab;
- trova l'utente AUTISTA con lo stesso nome normalizzato;
- assegna `driverId` e imposta:
  - `COMPLETATO` se il viaggio è passato;
  - `ASSEGNATO` se è futuro.

## 5. Account TAROS (esempio reale)

Conferma eseguita sull'account `tapesolegto@gmail.com`:

| Conducente Geotab | Esito | Account |
|---|---|---|
| ALEXANDRU BOLOZAN | creato | `alexandru.bolozan@autisti.truck-radar.it` |
| IOAN SILVIU NEGOITA | creato | `ioan.silviu.negoita@autisti.truck-radar.it` |
| OLEG TAPES | collegato | `tapesolegto@gmail.com` (ADMIN, nessun doppione) |

- **22 viaggi** già importati assegnati automaticamente ad Alexandru (i viaggi di ottobre Energy Trucks risultano suoi).
- 3 viaggi restano senza autista: 1 non collegato a Geotab, 1 storico, 1 riferito a OLEG/admin.
- Login verificato per entrambi i nuovi account: `/api/autista/trips` 200; Alexandru vede 22 viaggi.

## 6. Prossimi passi

1. Permettere all'admin di cambiare l'email di accesso in una email reale.
2. Invio automatico delle credenziali via email/WhatsApp quando sarà configurato il provider.
3. Associazione autista ↔ mezzo predefinito.
4. Firma digitale e cambio password obbligatorio al primo accesso.
