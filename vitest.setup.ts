// Charge .env.local pour les tests qui touchent la vraie base (Railway) —
// les mêmes variables que le serveur de dev, `process.loadEnvFile` est du
// Node natif (20.6+), pas besoin d'une dépendance dotenv supplémentaire.
try {
  process.loadEnvFile(new URL("./.env.local", import.meta.url));
} catch {
  // Absent en CI si jamais un jour testé sans base réelle — les tests
  // d'intégration échoueront alors explicitement plutôt que silencieusement.
}
