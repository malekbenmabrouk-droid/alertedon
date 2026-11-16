# AlerteDon — interface web

Interface du système d'alerte ciblée des donneurs de sang. Elle rend visibles et utilisables les six cas d'utilisation de l'API FastAPI du dépôt.

## Démarrer

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

L'interface démarre sur des **données de démonstration** (en mémoire, mêmes règles que le serveur) : aucun backend n'est nécessaire.

Pour utiliser la vraie API, lancez le serveur à la racine du dépôt puis choisissez « API FastAPI » dans le sélecteur **Source** en haut à droite :

```bash
python -m uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

En développement, les appels à `/api` sont redirigés par Vite vers le serveur, sans configuration CORS.

## Configuration

Copier `.env.example` en `.env` si besoin :

| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_API_BASE_URL` | URL de l'API vue par le navigateur | `/api` |
| `VITE_API_PROXY_TARGET` | Adresse du serveur FastAPI (proxy de dev) | `http://127.0.0.1:8000` |
| `VITE_DEFAULT_SOURCE` | Source au premier lancement : `demo` ou `api` | `demo` |

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript puis build dans `dist/` |
| `npm run preview` | Sert le build (avec le même proxy `/api`) |
| `npm test` | Tests (couche API, règles, tableau, rendu de l'application) |

## Écrans

L'interface suit le diagramme de cas d'utilisation : un espace par acteur, choisi en haut de page.

**Espace Centre de transfusion** (acteur : agent du centre)

| Écran | Cas d'utilisation |
|---|---|
| Aujourd'hui | UC6 — besoin le plus urgent, chiffres clés, carte des centres et des zones de 30 km, dernières réponses |
| Besoins | UC2 — déclarer un besoin (panneau en trois étapes), qui inclut UC3 · UC6 — suivre, filtrer, trier, exporter |
| Détail d'un besoin | UC3 — tri des donneurs expliqué, carte de la zone, renvoi des messages, aucun doublon · UC5 — enregistrer un don |
| Donneurs | Consultation seule du registre : répartition par groupe, disponibilité, export. Coordonnées masquées |
| Validation | 11 scénarios d'acceptation UC1 à UC6 exécutés en direct + suite pytest du serveur |

**Espace Donneur** (acteur : donneur)

| Écran | Cas d'utilisation |
|---|---|
| Devenir donneur | UC1 — la personne s'inscrit elle-même (groupe, ville, canal, consentement), puis arrive sur son espace |
| Retrouver mon espace | Accès par le téléphone ou l'e-mail donné à l'inscription |
| Mon espace | UC4 — alertes reçues, choix d'un moment ou refus, historique, déconnexion |

### Protection des donneurs

- Le personnel du centre ne voit qu'une version masquée des téléphones et e-mails ; l'export CSV ne les contient pas et la recherche ne porte pas dessus.
- Le centre ne peut pas ouvrir l'espace d'un donneur ni répondre à sa place.
- L'espace donneur est lié à l'onglet du navigateur (sessionStorage) et se ferme avec « Se déconnecter » ou à la fermeture de l'onglet.
- Un contact inconnu reçoit toujours le même message, pour ne pas révéler qui est inscrit.
- Limite connue : le serveur actuel n'a pas d'authentification. Une vraie mise en production demanderait un code de vérification envoyé par SMS ou e-mail côté serveur.

## Identité visuelle

Fraunces (titres, chiffres) et Instrument Sans (texte). Neutres ivoire et nude pour le fond ; le bordeaux et le rouge sang sont réservés au sang lui-même, à l'urgence et à l'action principale de chaque écran. Thèmes clair et sombre, mouvement réduit respecté.

Raccourcis : `Ctrl K` palette de commandes, `N` nouveau besoin, `G` puis `B`/`D`/`E`/`V` pour naviguer, `T` thème, `?` aide.

## Structure

```
src/
├── types/        Contrats de l'API (miroir des schémas FastAPI)
├── domain/       Règles de ciblage (compatibilité, zone, éligibilité, anti-relance)
├── services/     Client HTTP, client API réel, source de démonstration, contexte de source
├── hooks/        Chargement, mutations, raccourcis, thème, réseau
├── components/   Composants d'interface réutilisables
├── features/     Écrans par cas d'utilisation, visite guidée, validation
├── lib/          Formatage, export CSV, libellés
└── styles/       Jetons de design, base, composants
```

L'API n'expose pas de liste des donneurs ni des centres : en mode API, ils sont lus par identifiant (`GET /donneurs/{id}`) jusqu'à une suite de réponses 404.
