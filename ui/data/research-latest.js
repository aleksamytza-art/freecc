window.RESEARCH = {
  "request": {
    "id": "glamping-plots-sk",
    "goal": "Find 10 plots for a glamping business: under €20,000, mild year-round climate, legal for tourist accommodation, scenic setting",
    "country": "sk",
    "budgetEur": 20000,
    "count": 10,
    "minAreaM2": 800,
    "queries": [
      "pozemok",
      "parcela",
      "zahrada",
      "luka"
    ],
    "source": {
      "id": "bazos-reality",
      "label": "Bazos.sk — search restricted to land listings",
      "searchUrl": "https://www.bazos.sk/search.php?hledat={q}&cenado={max}",
      "note": "Search endpoint of the public classifieds, budget-capped. Detail pages live on the reality.bazos.sk subdomain and are linked absolutely from the result rows. The site answers 404 while serving a valid body, so the parser trusts parsed rows rather than the status code."
    },
    "weights": {
      "price": 30,
      "area": 20,
      "access": 15,
      "scenery": 20,
      "climate": 15
    },
    "gates": {
      "mechanical": [
        "type",
        "plausible",
        "title",
        "price",
        "area",
        "location"
      ],
      "unverified": [
        "legality",
        "climate",
        "scenery"
      ]
    },
    "plausibility": {
      "minPriceEur": 300,
      "maxPricePerM2": 400
    }
  },
  "tree": {
    "root": {
      "id": "R0",
      "label": "Find 10 plots for a glamping business: under €20,000, mild year-round climate, legal for tourist accommodation, scenic setting",
      "kind": "root",
      "params": {
        "budgetEur": 20000,
        "count": 10,
        "minAreaM2": 800,
        "country": "sk",
        "queries": [
          "pozemok",
          "parcela",
          "zahrada",
          "luka"
        ]
      }
    },
    "nodes": [
      {
        "id": "D1",
        "label": "Budget fit",
        "question": "Is the asking price real and at most 20,000 EUR?",
        "gate": "price",
        "adjustable": {
          "key": "price",
          "min": 0,
          "max": 100,
          "value": 30,
          "unit": "weight"
        },
        "params": {
          "budgetEur": 20000
        },
        "kind": "mechanical"
      },
      {
        "id": "D2",
        "label": "Usable land area",
        "question": "Is the plot at least 800 m², and is the size stated on the listing page?",
        "gate": "area",
        "adjustable": {
          "key": "area",
          "min": 0,
          "max": 100,
          "value": 20,
          "unit": "weight"
        },
        "params": {
          "minAreaM2": 800
        },
        "kind": "mechanical"
      },
      {
        "id": "D3",
        "label": "Access & infrastructure",
        "question": "Does the listing state a road access, utilities or a nearby village?",
        "gate": "location",
        "adjustable": {
          "key": "access",
          "min": 0,
          "max": 100,
          "value": 15,
          "unit": "weight"
        },
        "kind": "mechanical"
      },
      {
        "id": "D4",
        "label": "Scenery & setting",
        "question": "Is the setting attractive for glamping (nature, quiet, views)?",
        "gate": null,
        "adjustable": {
          "key": "scenery",
          "min": 0,
          "max": 100,
          "value": 20,
          "unit": "weight"
        },
        "kind": "unverified",
        "why": "No mechanical source: judged from listing prose only. Treated as a ranking signal, never as a passed gate."
      },
      {
        "id": "D5",
        "label": "Year-round mild climate",
        "question": "Does the location have a mild year-round climate?",
        "gate": null,
        "adjustable": {
          "key": "climate",
          "min": 0,
          "max": 100,
          "value": 15,
          "unit": "weight"
        },
        "kind": "unverified",
        "why": "Requires a climate dataset or a cited meteorological source. Not fetched yet, so it can only ever reduce confidence."
      },
      {
        "id": "D6",
        "label": "Legality for tourist accommodation",
        "question": "Does local law permit a glamping site on this plot?",
        "gate": null,
        "adjustable": {
          "key": "legality",
          "min": 0,
          "max": 100,
          "value": 0,
          "unit": "weight"
        },
        "kind": "unverified",
        "why": "A legal question: needs the municipal zoning plan or the authority’s statement. No mechanical check is possible here, and pretending otherwise would be the worst thing this app could do."
      }
    ],
    "edges": [
      [
        "D1",
        "R0"
      ],
      [
        "D2",
        "R0"
      ],
      [
        "D3",
        "R0"
      ],
      [
        "D4",
        "R0"
      ],
      [
        "D5",
        "R0"
      ],
      [
        "D6",
        "R0"
      ],
      [
        "R0",
        "OUT"
      ]
    ]
  },
  "criteria": {
    "mechanical": [
      "Budget fit",
      "Usable land area",
      "Access & infrastructure"
    ],
    "unverified": [
      {
        "label": "Scenery & setting",
        "why": "No mechanical source: judged from listing prose only. Treated as a ranking signal, never as a passed gate."
      },
      {
        "label": "Year-round mild climate",
        "why": "Requires a climate dataset or a cited meteorological source. Not fetched yet, so it can only ever reduce confidence."
      },
      {
        "label": "Legality for tourist accommodation",
        "why": "A legal question: needs the municipal zoning plan or the authority’s statement. No mechanical check is possible here, and pretending otherwise would be the worst thing this app could do."
      }
    ]
  },
  "source": {
    "id": "bazos",
    "label": "Bazos.sk (classifieds)",
    "home": "https://www.bazos.sk/"
  },
  "generatedAt": "2026-10-18T15:03:53.579Z",
  "stats": {
    "queries": 4,
    "searchPages": 4,
    "rowsSeen": 80,
    "rejectedType": 26,
    "rejectedImplausible": 22,
    "filteredByBudget": 8,
    "duplicates": 9,
    "detailPages": 15,
    "fetchFailures": 0,
    "admissible": 13,
    "shortlisted": 15,
    "returned": 10
  },
  "sourceLog": [
    {
      "kind": "search",
      "url": "https://www.bazos.sk/search.php?hledat=pozemok&cenado=20000",
      "status": 200,
      "bytes": 48258,
      "rows": 20
    },
    {
      "kind": "search",
      "url": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "status": 200,
      "bytes": 48851,
      "rows": 20
    },
    {
      "kind": "search",
      "url": "https://www.bazos.sk/search.php?hledat=zahrada&cenado=20000",
      "status": 200,
      "bytes": 48397,
      "rows": 20
    },
    {
      "kind": "search",
      "url": "https://www.bazos.sk/search.php?hledat=luka&cenado=20000",
      "status": 200,
      "bytes": 46280,
      "rows": 20
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196602395/staskov-olesna-8390-m2-pozemky-v-intravilane-obce.php",
      "status": 200,
      "bytes": 24323,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196593382/znizena-cena-pozemky-v-krasnej-prirode-stebnik-bardejov.php",
      "status": 200,
      "bytes": 27466,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/195595770/ihrac-pozemok-na-predaj.php",
      "status": 200,
      "bytes": 35182,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196226037/pozemok-zahrada.php",
      "status": 200,
      "bytes": 25976,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196212747/ponukame-na-predaj-pozemok-v-obci-bajtava.php",
      "status": 200,
      "bytes": 27609,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196052469/pozemok-1674m2-velky-saris-kralova-hora-investicna-prilezito.php",
      "status": 200,
      "bytes": 37692,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196491638/rekreacny-pozemok-pri-lese-glampingkosichamre6175m2.php",
      "status": 200,
      "bytes": 26854,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196496921/zaujimavy-pozemok.php",
      "status": 200,
      "bytes": 23584,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196493393/vinica-s-pozemkom-na-vystvabu-chaty-zemberovce-znizena-c.php",
      "status": 200,
      "bytes": 27848,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196574417/pozemok-so-starsim-rd-v-obci-polina-okr-revuca.php",
      "status": 200,
      "bytes": 33089,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://ostatne.bazos.sk/inzerat/196612409/prdam-zberatelsku-kartu-luka-doncic.php",
      "status": 200,
      "bytes": 20438,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://sluzby.bazos.sk/inzerat/196439006/kupacia-kada-sud-virivka.php",
      "status": 200,
      "bytes": 26973,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196531121/znizena-cena-investicny-pozemok-v-stupave-568m2-dohoda-mozn.php",
      "status": 200,
      "bytes": 32637,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/196584237/na-predaj-pozemok-o-vymere-603-m-v-obci-svodin-nemecky-svo.php",
      "status": 200,
      "bytes": 26183,
      "ok": true
    },
    {
      "kind": "detail",
      "url": "https://reality.bazos.sk/inzerat/195800856/vysnivana-zahrada.php",
      "status": 200,
      "bytes": 22746,
      "ok": true
    }
  ],
  "candidates": [
    {
      "url": "https://reality.bazos.sk/inzerat/196593382/znizena-cena-pozemky-v-krasnej-prirode-stebnik-bardejov.php",
      "title": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV",
      "priceRaw": "2 920 €",
      "priceEur": 2920,
      "pricePlaceholder": false,
      "location": "Bardejov, 086 33",
      "description": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV Ponúkam na predaj súbor 4 parciel s celkovou výmerou 2 794 m² v katastrálnom území Stebník, okres Bardejov. Parcely vytvárajú 3 samostatné pozemkové celky, pričom dve parcely na seba nadväzujú a spolu tvoria jeden dlhý pozemok pod lesom ...",
      "areaM2": 2794,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesty",
          "asfalt",
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les",
          "lesa",
          "potok",
          "luka",
          "lúka"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"2 920 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV - Bardejov | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: V"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€2920 found on the page; within the €20000 budget",
            "evidence": "tvar, šírku približne 12 m a dĺžku približne 26 – 36 m. ZNÍŽENÁ CENA: 2 920 € 3. POZEMOK V STREDE LÚKY – 1 209 m² Pekný a dobre využiteľný pozemo"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "2794 m² meets the 800 m² floor",
            "evidence": "TEBNÍK, BARDEJOV Ponúkam na predaj súbor 4 parciel s celkovou výmerou 2 794 m² v katastrálnom území Stebník, okres Bardejov. Parcely vytvárajú 3"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Bardejov\" found on the page",
            "evidence": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV - Bardejov | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubrik"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 93,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.85,
          "contribution": 25.6,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 27466,
      "fetchedAt": "2026-10-18T15:03:42.757Z",
      "excerpt": "ZNÍŽENÁ CENA – POZEMKY V KRÁSNEJ PRÍRODE – STEBNÍK, BARDEJOV - Bardejov | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatn"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196226037/pozemok-zahrada.php",
      "title": "Pozemok záhrada",
      "priceRaw": "5 000 €",
      "priceEur": 5000,
      "pricePlaceholder": false,
      "location": "Považská Bystrica, 018 12",
      "description": "Predám v katastrálnom území obce Brvnište bol využívaný ako záhrada/sad Parcela registra C 1645/29 127m2 a pozemok Parcela registra E 2447 kde som 1/3 vlastník 174m2 nachádzajú sa do 100 m od hlavnej cesty pozemok je vhodný ako záhrada dá sa na ňom postaviť menšia Záhradná chatka poprípade doviesť m ...",
      "areaM2": 29127,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=pozemok&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesta",
          "cesty",
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Pozemok záhrada · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"5 000 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Pozemok záhrada - Považská Bystrica | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrad"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€5000 found on the page; within the €20000 budget",
            "evidence": "rípade doviesť mobilný dom prístup je veľmi dobrý cena za komplet dva 5000€ volať len vážny záujem na obhliadky nechodím je to kúsok od hlavnej"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "29127 m² meets the 800 m² floor",
            "evidence": "í obce Brvnište bol využívaný ako záhrada/sad Parcela registra C 1645/29 127m2 a pozemok Parcela registra E 2447 kde som 1/3 vlastník 174m2 nachád"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Považská Bystrica\" found on the page",
            "evidence": "Pozemok záhrada - Považská Bystrica | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 88,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.75,
          "contribution": 22.5,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 25976,
      "fetchedAt": "2026-10-18T15:03:44.415Z",
      "excerpt": "Pozemok záhrada - Považská Bystrica | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (miesto): Okolie: km Cena od: "
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196602395/staskov-olesna-8390-m2-pozemky-v-intravilane-obce.php",
      "title": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce",
      "priceRaw": "1 000 €",
      "priceEur": 1000,
      "pricePlaceholder": false,
      "location": "Čadca, 023 52",
      "description": "Spoločnosť Slovak Estate s.r.o. ponúka na predaj spoluvlastnícke podiely lesov a ornej pôdy v intraviláne obce v katastrálnom území Staškov a Olešná, okres Čadca. – Výmera predávaných pozemkov tvorí celkom 8390 m2. Pozemky sú evidované na liste vlastníctva č. 5161 pre katastrálne územie Staškov, ...",
      "areaM2": 8390,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "signals": {
        "access": [
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"1 000 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce - Čadca | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubri"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€1000 found on the page; within the €20000 budget",
            "evidence": "fón: 094... zobraz číslo Lokalita: 023 52 Čadca Videlo: 73 ľudí Cena: 1 000 € Všetky inzeráty a hodnotenie užívateľa Pridať do obľúbených Označiť"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "8390 m² meets the 800 m² floor",
            "evidence": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce - Čadca | Bazoš.sk ... inzercia pre kaž"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Čadca\" found on the page",
            "evidence": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce - Čadca | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Do"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 80,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.95,
          "contribution": 28.5,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 0.25,
          "contribution": 3.8,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 24323,
      "fetchedAt": "2026-10-18T15:03:41.926Z",
      "excerpt": "Staškov, Olešná - 8390 m2 pozemky v intraviláne obce - Čadca | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (mies"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/195595770/ihrac-pozemok-na-predaj.php",
      "title": "Ihráč - pozemok na predaj",
      "priceRaw": "2 999 €",
      "priceEur": 2999,
      "pricePlaceholder": false,
      "location": "Žiar nad Hronom, 965 01",
      "description": "Základné informácie: Ponúkame na predaj pozemok s výmerou 979 m² ( trojuholníkový tvar ) v katastrálnom území Ihráč, okres Žiar nad Hronom . Pozemok je zapísaný na liste vlastníctva ako trvalý trávny porast a nachádza sa v krásnom prostredí okolitej prírody. K pozemku vedie obecná asfaltová cesta, ...",
      "areaM2": 979,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesta",
          "cesty",
          "asfalt",
          "elektr",
          "voda",
          "plyn"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les",
          "lesa"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Ihráč - pozemok na predaj · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"2 999 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Ihráč - pozemok na predaj - Žiar nad Hronom | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom "
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€2999 found on the page; within the €20000 budget",
            "evidence": "ta ponúka ideálne podmienky pre oddych, relax. Cena pozemku celkom je 2999,- Eur. Parcela registra „C\" evidovaná na katastrálnej mape č.1107, LV"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "979 m² meets the 800 m² floor",
            "evidence": "iť/ Topovať Základné informácie: Ponúkame na predaj pozemok s výmerou 979 m² ( trojuholníkový tvar ) v katastrálnom území Ihráč, okres Žiar nad"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Žiar nad Hronom\" found on the page",
            "evidence": "Ihráč - pozemok na predaj - Žiar nad Hronom | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Au"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 75,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.85,
          "contribution": 25.5,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 0.41,
          "contribution": 8.2,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 35182,
      "fetchedAt": "2026-10-18T15:03:43.595Z",
      "excerpt": "Ihráč - pozemok na predaj - Žiar nad Hronom | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (miesto): Okolie: km C"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196491638/rekreacny-pozemok-pri-lese-glampingkosichamre6175m2.php",
      "title": "Rekreačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2",
      "priceRaw": "15 000 €",
      "priceEur": 15000,
      "pricePlaceholder": false,
      "location": "Košice-okolie, 044 65",
      "description": "Hľadáte miesto, kde sa obklopíte čistou prírodou a pritom zostanete na skok od Košíc? Ponúkame na predaj pozemok v katastrálnom území Košické Hámre, v lokalite známej ako Sivecké lúky, pod vrchom Sivec a v blízkosti Ružína. Celková výmera pozemku je 6 175 m2. Druh pozemku je trvalý trávny porast. K ...",
      "areaM2": 6175,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=luka&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesta",
          "elektr",
          "siet",
          "sieť"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les",
          "lesa",
          "luka",
          "lúka"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Rekreačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2 · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"15 000 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Rekreačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2 - Košice-okolie | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát "
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€15000 found on the page; within the €20000 budget",
            "evidence": ".. zobraz číslo Lokalita: 044 65 Košice-okolie Videlo: 140 ľudí Cena: 15 000 € Všetky inzeráty a hodnotenie užívateľa Pridať do obľúbených Označiť"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "6175 m² meets the 800 m² floor",
            "evidence": "Rekreačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2 - Košice-okolie | Bazoš.sk ... inzercia pre každého Obľúbené inzerá"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Košice-okolie\" found on the page",
            "evidence": "reačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2 - Košice-okolie | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 65,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.25,
          "contribution": 7.5,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 26854,
      "fetchedAt": "2026-10-18T15:03:46.849Z",
      "excerpt": "Rekreačný pozemok pri lese (glamping,...),Košic.Hámre,6175m2 - Košice-okolie | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá O"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196212747/ponukame-na-predaj-pozemok-v-obci-bajtava.php",
      "title": "Ponúkame na predaj pozemok v obci Bajtava.",
      "priceRaw": "7 950 €",
      "priceEur": 7950,
      "pricePlaceholder": false,
      "location": "Nové Zámky, 943 65",
      "description": "Ponúkame na predaj pozemok v obci Bajtava. Pozemok evidovaný ako vinica , parcely reg, „ C \" evidované na katastrálnej mape. Výmera pozemku 3025 m2, mimo zastavaného územia obce, za rodinnými domami, za ich záhradami. Vinica bola registrovaná. Šírka 26-18 m, dĺžka 142 m. Pozemok s pekným výhľado ...",
      "areaM2": 3025,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=zahrada&cenado=20000",
      "signals": {
        "access": [
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Ponúkame na predaj pozemok v obci Bajtava. · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"7 950 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Ponúkame na predaj pozemok v obci Bajtava. - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Au"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€7950 found on the page; within the €20000 budget",
            "evidence": "Pozemok s pekným výhľadom na obec a na okolitú prírodu. Znížená cena: 7950 Eur Bližšie info: 0908/659 793 Meno: Alizka Telefón: 090... zobraz čí"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "3025 m² meets the 800 m² floor",
            "evidence": "a , parcely reg, „ C \" evidované na katastrálnej mape. Výmera pozemku 3025 m2, mimo zastavaného územia obce, za rodinnými domami, za ich záhrada"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Nové Zámky\" found on the page",
            "evidence": "Ponúkame na predaj pozemok v obci Bajtava. - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto De"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 64,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.6,
          "contribution": 18.1,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 0.25,
          "contribution": 3.8,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 27609,
      "fetchedAt": "2026-10-18T15:03:45.241Z",
      "excerpt": "Ponúkame na predaj pozemok v obci Bajtava. - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (miesto): "
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196531121/znizena-cena-investicny-pozemok-v-stupave-568m2-dohoda-mozn.php",
      "title": "ZNÍŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN",
      "priceRaw": "9 990 €",
      "priceEur": 9990,
      "pricePlaceholder": false,
      "location": "Malacky, 900 31",
      "description": "Typ: Pozemky - komerčné Ulica: . Obec: Stupava BUDÚCA KOMERČNÁ ZÓNA-podľa UPI (územnoplánovacia informácia): Hlavné funkčné využitie: Podnikateľské a výrobné aktivity bez negatívneho vplyvu na životné prostredie a zvýšených nárokov na dopravnú obsluhu (remeselné dielne, prenajímateľná adm ...",
      "areaM2": 568,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesty",
          "asfalt",
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "ZNÍŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"9 990 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "ZNÍŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN - Malacky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Vš"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€9990 found on the page; within the €20000 budget",
            "evidence": ": 090... zobraz číslo Lokalita: 900 31 Malacky Videlo: 683 ľudí Cena: 9 990 € Všetky inzeráty a hodnotenie užívateľa Pridať do obľúbených Označiť"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": false,
            "detail": "568 m² is below the 800 m² floor",
            "evidence": "ZNÍŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN - Malacky | Bazoš.sk ... inzercia pre každého Obľúbené"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Malacky\" found on the page",
            "evidence": "ŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN - Malacky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 5,
        "failed": 1,
        "unverified": 3,
        "admissible": true
      },
      "score": 53,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.5,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 0.24,
          "contribution": 4.7,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 32637,
      "fetchedAt": "2026-10-18T15:03:51.960Z",
      "excerpt": "ZNÍŽENÁ CENA-investičný POZEMOK v Stupave 568 m2-DOHODA MOŽN - Malacky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné"
    },
    {
      "url": "https://ostatne.bazos.sk/inzerat/196612409/prdam-zberatelsku-kartu-luka-doncic.php",
      "title": "Prdam zberatelsku kartu Luka Doncic",
      "priceRaw": "550 €",
      "priceEur": 550,
      "pricePlaceholder": false,
      "location": "Nitra, 949 01",
      "description": "Predam zberatelsku kartu luka Doncic",
      "areaM2": null,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=luka&cenado=20000",
      "signals": {
        "access": [
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "luka",
          "lúka"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": false,
            "detail": "host ostatne.bazos.sk is not the real-estate section",
            "evidence": "Prdam zberatelsku kartu Luka Doncic · ostatne.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"550 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Prdam zberatelsku kartu Luka Doncic - Nitra | Bazoš.sk ... bazár pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a z"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€550 found on the page; within the €20000 budget",
            "evidence": "fón: 091... zobraz číslo Lokalita: 949 01 Nitra Videlo: 13 ľudí Cena: 550 € Všetky inzeráty a hodnotenie užívateľa Pridať do obľúbených Označiť"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": false,
            "detail": "no m² figure found for this listing",
            "evidence": ""
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Nitra\" found on the page",
            "evidence": "Prdam zberatelsku kartu Luka Doncic - Nitra | Bazoš.sk ... bazár pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 4,
        "failed": 2,
        "unverified": 3,
        "admissible": false
      },
      "score": 51,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.97,
          "contribution": 29.2,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 0,
          "contribution": 0,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 0.25,
          "contribution": 3.8,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 20438,
      "fetchedAt": "2026-10-18T15:03:50.383Z",
      "excerpt": "Prdam zberatelsku kartu Luka Doncic - Nitra | Bazoš.sk ... bazár pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (miesto): Okolie: km Cena"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196584237/na-predaj-pozemok-o-vymere-603-m-v-obci-svodin-nemecky-svo.php",
      "title": "Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo",
      "priceRaw": "12 000 €",
      "priceEur": 12000,
      "pricePlaceholder": false,
      "location": "Nové Zámky, 943 54",
      "description": "Typ: Stavebný pozemok Obec: Svodín Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svodín), okres Nové Zámky. Ponúkame rovinatý a slnečný pozemok situovaný v pokojnej časti obce, s dobrým prístupom a príjemným okolím. parcela sa nachádza v katastrálnom území Nemecký Svodín, v blízkosti ...",
      "areaM2": 603,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=parcela&cenado=20000",
      "signals": {
        "access": [
          "pristup",
          "prístup",
          "cesta",
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"12 000 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo:"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€12000 found on the page; within the €20000 budget",
            "evidence": "cia Katastrálne územie: Nemecký Svodín 📞 Kontakt: 0905 448 424 Cena: 12 000 € V prípade záujmu ma kontaktujte, rád poskytnem viac informácií aleb"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": false,
            "detail": "603 m² is below the 800 m² floor",
            "evidence": "Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo - Nové Zámky | Bazoš.sk ... inzercia pr"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Nové Zámky\" found on the page",
            "evidence": "predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto De"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 5,
        "failed": 1,
        "unverified": 3,
        "admissible": true
      },
      "score": 49,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.4,
          "contribution": 12,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 0.25,
          "contribution": 5,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 1,
          "contribution": 15,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 26183,
      "fetchedAt": "2026-10-18T15:03:52.795Z",
      "excerpt": "Na predaj pozemok o výmere 603 m² v obci Svodín (Nemecký Svo - Nové Zámky | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Osta"
    },
    {
      "url": "https://reality.bazos.sk/inzerat/196496921/zaujimavy-pozemok.php",
      "title": "Zaujímavý Pozemok",
      "priceRaw": "17 000 €",
      "priceEur": 17000,
      "pricePlaceholder": false,
      "location": "Veľký Krtíš, 991 42",
      "description": "Predám krásny 0,5 hektárový (5151 m²) pozemok. Je to lúka s lesom, 800 metrov od rybníka v extraviláne obce Hrušov, sú to parcely registra \"C\" Trvalý trávnatý porast, číslo 6550 a 6551. Elektrina 3x400V v dosahu cca.150m, vodovodné potrubie, ktoré si dali urobiť miestni podielnici prechádza cez poz ...",
      "areaM2": 5151,
      "searchUrl": "https://www.bazos.sk/search.php?hledat=luka&cenado=20000",
      "signals": {
        "access": [
          "asfalt",
          "elektr"
        ],
        "scenery": [
          "vyhlad",
          "výhľad",
          "les",
          "rybnik",
          "rybník",
          "klud",
          "kľud",
          "luka",
          "lúka"
        ]
      },
      "gates": {
        "checks": [
          {
            "id": "type",
            "label": "Listing is a plot of land, not an object",
            "critical": true,
            "ok": true,
            "detail": "real-estate section + land wording",
            "evidence": "Zaujímavý Pozemok · reality.bazos.sk"
          },
          {
            "id": "plausible",
            "label": "Price is plausible for land (not a placeholder or unit price)",
            "critical": true,
            "ok": true,
            "detail": "price looks like a land price",
            "evidence": "list view says \"17 000 €\""
          },
          {
            "id": "title",
            "label": "Title wording appears on the page",
            "critical": true,
            "ok": true,
            "detail": "100% of the title's words found on the page",
            "evidence": "Zaujímavý Pozemok - Veľký Krtíš | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada El"
          },
          {
            "id": "price",
            "label": "Asking price is stated on the page",
            "critical": true,
            "ok": true,
            "detail": "€17000 found on the page; within the €20000 budget",
            "evidence": "4... zobraz číslo Lokalita: 991 42 Veľký Krtíš Videlo: 135 ľudí Cena: 17 000 € Všetky inzeráty a hodnotenie užívateľa Pridať do obľúbených Označiť"
          },
          {
            "id": "area",
            "label": "Plot size is stated on the page",
            "critical": false,
            "ok": true,
            "detail": "5151 m² meets the 800 m² floor",
            "evidence": "- [14.10. 2026] Zmazať/ Upraviť/ Topovať Predám krásny 0,5 hektárový (5151 m²) pozemok. Je to lúka s lesom, 800 metrov od rybníka v extraviláne"
          },
          {
            "id": "location",
            "label": "Location appears on the page",
            "critical": false,
            "ok": true,
            "detail": "\"Veľký Krtíš\" found on the page",
            "evidence": "Zaujímavý Pozemok - Veľký Krtíš | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto D"
          },
          {
            "id": "legality",
            "label": "Legality — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs the municipal zoning plan or an authority statement",
            "evidence": ""
          },
          {
            "id": "climate",
            "label": "Climate — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "needs a cited climate dataset for this locality",
            "evidence": ""
          },
          {
            "id": "scenery",
            "label": "Scenery — no mechanical source",
            "critical": false,
            "ok": null,
            "status": "unverified",
            "detail": "judged from listing prose only; not a gate",
            "evidence": ""
          }
        ],
        "passed": 6,
        "failed": 0,
        "unverified": 3,
        "admissible": true
      },
      "score": 49,
      "parts": [
        {
          "key": "price",
          "weight": 30,
          "value": 0.15,
          "contribution": 4.5,
          "counted": true
        },
        {
          "key": "area",
          "weight": 20,
          "value": 1,
          "contribution": 20,
          "counted": true
        },
        {
          "key": "access",
          "weight": 15,
          "value": 0.5,
          "contribution": 7.5,
          "counted": true
        },
        {
          "key": "scenery",
          "weight": 20,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        },
        {
          "key": "climate",
          "weight": 15,
          "value": null,
          "contribution": 0,
          "counted": false,
          "why": "unverified — weight excluded"
        }
      ],
      "coverage": {
        "supportedWeight": 65,
        "declaredWeight": 100,
        "percent": 65
      },
      "pageBytes": 23584,
      "fetchedAt": "2026-10-18T15:03:47.649Z",
      "excerpt": "Zaujímavý Pozemok - Veľký Krtíš | Bazoš.sk ... inzercia pre každého Obľúbené inzeráty Moje inzeráty Pridať inzerát Čo: Všetky rubriky Auto Deti Dom a záhrada Elektro Foto Hudba Knihy Mobily Motocykle Nábytok Oblečenie PC Práca Reality Služby Stroje Šport Vstupenky Zvieratá Ostatné PSČ (miesto): Okolie: km Cena od: - do"
    }
  ],
  "notes": [
    "Prices, sizes and locations are taken from the listing page and re-checked against that same page.",
    "Climate, legality and scenery have no mechanical source in this run: they are listed as gaps, not scored as true.",
    "One request per query and per shortlisted plot, at least 750 ms apart. This is a demonstrator, not a crawler."
  ]
};
