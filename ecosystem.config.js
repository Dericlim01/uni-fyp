module.exports = {
  apps: [
    {
      name: "security-blockchain",
      script: "./node_modules/hardhat/internal/cli/cli.js",
      args: "node",
      cwd: "./security-blockchain",
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm Z"
    },
    {
      name: "iot-gateway",
      script: "gateway.js",
      cwd: "./iot-gateway",
      watch: true,
      ignore_watch: ["node_modules", "logs"],
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z"
    }
  ]
};
