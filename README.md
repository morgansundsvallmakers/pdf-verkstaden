# PDF-verkstaden

En liten samling PDF-verktyg som körs direkt i webbläsaren.

- Slå ihop PDF-filer och ändra deras ordning.
- Dela en PDF i två delar med förhandsvisning runt delningspunkten.
- Gör en enkel fyrsidig broschyr med förhandsvisning av original och ark.

Filerna bearbetas lokalt i webbläsaren och laddas inte upp till någon server.
Ingen inloggning krävs.

## Teknik

Projektet är medvetet enkelt och består av vanlig HTML, CSS och JavaScript utan byggsteg.
PDF-filer ändras med `pdf-lib`. Förhandsvisningar renderas lokalt med PDF.js.

De bibliotek som behövs för körning ligger lokalt i projektet så att sidan inte behöver hämta externa skript när den används.
