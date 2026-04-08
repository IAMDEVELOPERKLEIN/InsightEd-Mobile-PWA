module.exports = {
  apps: [
    {
      name: "insighted-staging",
      script: "api/index.js",
      watch: false,
      instances: "max",
      exec_mode: "cluster",
      env: {
        PORT: 5001,
        NODE_ENV: "staging",
        UPLOAD_DIR: "/tmp/insighted-pdf-tmp"
      }
    },
    {
      name: "insighted-backend",
      script: "api/index.js",
      watch: false,
      instances: "max",
      exec_mode: "cluster",
      env: {
        PORT: 5000,
        NODE_ENV: "production",
        UPLOAD_DIR: "/tmp/insighted-pdf-tmp"
      }
    }
  ]
};
