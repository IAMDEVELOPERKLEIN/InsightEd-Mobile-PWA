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
      },
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G'
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
      },
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      max_memory_restart: '1G'
    }
  ]
};
