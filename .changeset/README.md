# Changesets

Cada cambio que deba quedar en el changelog lleva un changeset:

```bash
npm run changeset          # elige paquetes (host, @microapps/*) y tipo de bump
npm run changeset:status   # qué se versionaría
npm run changeset:version  # aplica bumps y escribe CHANGELOG.md
```

Todos los paquetes son privados: se versionan pero no se publican a npm ni se crean tags.
Las micro apps (`microapp-catalog`, `microapp-profile`) tienen su propio `.changeset/`.
