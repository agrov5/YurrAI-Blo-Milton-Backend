interface Config {
  port: number;
}

const config: Config = {
  port: Number(process.env.PORT) || 8080,
};

export default config;
