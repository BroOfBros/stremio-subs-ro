const express = require("express");
const cors = require("cors");
const path = require("path");
const querystring = require("querystring");
const dotenv = require("dotenv");

const helmet = require("helmet");
const { addonInterface, subtitlesHandler } = require("./addon");
const SubsRoClient = require("./lib/subsro");
const proxyRouter = require("./lib/proxy");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.set("trust proxy", true); // Essential for BeamUp/Dokku proxies

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP to allow custom configuration page scripts/styles
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(proxyRouter);

const decodeConfig = (configStr) => {
  if (!configStr) return {};
  try {
    const base64 = configStr
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(configStr.length + ((4 - (configStr.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  } catch (e) {
    return {};
  }
};

app.get("/", (req, res) => res.redirect("/configure.html"));
app.get("/:config/configure", (req, res) => res.redirect("/configure.html"));

// Manifest
app.get("/:config?/manifest.json", (req, res) => {
  const { config } = req.params;
  const userConfig = decodeConfig(config);
  const hasConfig = config && Object.keys(userConfig).length > 0;

  // Shallow clone with spread (40× faster than JSON.parse/stringify)
  const manifest = {
    ...addonInterface.manifest,
    behaviorHints: {
      ...addonInterface.manifest.behaviorHints,
      configurationRequired: !hasConfig,
    },
  };

  res.set("Cache-Control", "public, max-age=86400"); // 1 day
  res.json(manifest);
});

// API Validation Endpoint
app.get("/api/validate/:apiKey", async (req, res) => {
  const { apiKey } = req.params;
  const client = new SubsRoClient(apiKey);
  const isValid = await client.validate();
  res.json({ valid: isValid });
});

// Subtitles
app.get("/:config?/subtitles/:type/:id/:extra?.json", async (req, res) => {
  const { config, type, id, extra } = req.params;
  const userConfig = decodeConfig(config);

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  let host = req.headers["x-forwarded-host"] || req.get("host");

  // Fix for BeamUp: if x-forwarded-proto is present, the proxy is handling SSL.
  // In many Dokku setups, req.get('host') might still include the internal port (e.g. :5571).
  // We MUST strip it so the URL used by Stremio is reachable from outside.
  if (req.headers["x-forwarded-proto"] && host.includes(":")) {
    host = host.split(":")[0];
  }

  userConfig.baseUrl = `${protocol}://${host}`;

  try {
    let extraObj = {};
    if (extra) {
      try {
        extraObj = JSON.parse(extra);
      } catch (e) {
        extraObj = querystring.parse(extra);
      }
    }
    const response = await subtitlesHandler({
      type,
      id,
      extra: extraObj,
      config: userConfig,
    });

    const subCount = response.subtitles.length;
    const firstUrl = response.subtitles[0]?.url;
    console.log(
      `[SUBS] Served ${subCount} subs for ${id}. First URL: ${
        firstUrl || "none"
      }`
    );

    res.set("Cache-Control", "public, max-age=900"); // 15 minutes
    res.json(response);
  } catch (e) {
    console.error(`[ERROR] Subtitle handler error: ${e.message}`);
    res.status(500).json({ subtitles: [] });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 [${new Date().toISOString()}] Addon DEPLOYED with BeamUp Fix - Port ${PORT}`
  );
});
