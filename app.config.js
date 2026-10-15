module.exports = ({ config }) => {
  const mapboxDownloadToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!mapboxDownloadToken) {
    throw new Error(
      "Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN. Set it in the root .env file or your build environment."
    );
  }

  return {
    ...config,
    plugins: config.plugins.map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === "@rnmapbox/maps") {
        return [
          plugin[0],
          {
            ...plugin[1],
            RNMapboxMapsDownloadToken: mapboxDownloadToken,
          },
        ];
      }

      return plugin;
    }),
  };
};
