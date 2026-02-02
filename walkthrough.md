# ElectricityExplorer - Valmiusraportti

Ohjelma on valmis ja se on toteutettu nykyaikaisena React-sovelluksena, joka toimii suoraan selaimessa.

## Toteutetut ominaisuudet

- **Excel-tuki**: Ohjelma lukee sähkönkulutusraportit (Fingrid Datahub) ja pörssihintatiedot (.xlsx ja .csv).
- **Älykäs laskenta**: Laskee automaattisesti säästöt tai lisäkustannukset verrattuna kiinteähintaiseen sopimukseen.
- **Visuaalinen dashboard**:
    - **Säästö-hero**: Selkeä näyttö kokonaissäästöstä.
    - **Kuukausivertailu**: Pylväskaavio, joka näyttää pörssisähkön vs. kiinteän hinnan kuukausittain.
    - **Kertymägraafi**: Aluekaavio säästön kehittymisestä ajan myötä.
- **Premium UI**: Moderni "ElectricityExplorer"-teema lasiefekteillä ja dynaamisilla animaatioilla.

## Käyttöohje

1.  Siirry hakemistoon `H:\Repos\Sähkö`.
2.  Varmista, että palvelin on käynnissä (`npm run dev`).
3.  Avaa selain osoitteeseen [http://localhost:5173/](http://localhost:5173/).
4.  Syötä kiinteän sopimuksesi hinta (esim. 8.5 snt/kWh).
5.  Valitse tiedostot hakemistosta `H:\Repos\Sähkö`:
    - Kulutus: `electricity_report_01-01-2025_31-12-2025 (1).xlsx`
    - Hinta: `sahkon-hinta-010121-020226.xlsx`
6.  Paina **Laske vertailu**.

## Tekniset tiedot

- **Frontend**: Vite + React + TypeScript
- **Tyylit**: Vanilla CSS (Premium design system)
- **Kirjastot**: SheetJS (XLSX), Recharts (Graafit), Lucide React (Ikonit)

---
*Huomautus: Ohjelma on täysin asiakaspuolinen (client-side), eli datasi ei lähetetä mihinään palvelimelle.*
