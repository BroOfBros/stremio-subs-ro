const manifest = {
  id: "org.stremio.subsro",
  version: "1.0.1",
  name: "Subs.ro Subtitles",
  description: "Romanian subtitles from Subs.ro (unofficial)",
  logo: "https://raw.githubusercontent.com/allecsc/stremio-subs-ro/refs/heads/master/public/logo.png",
  catalogs: [],
  resources: [
    {
      name: "subtitles",
      types: ["movie", "series"],
      idPrefixes: ["tt"],
    },
  ],
  types: ["subtitles"],
  behaviorHints: {
    configurable: true,
    configurationRequired: true,
  },
};

module.exports = manifest;
