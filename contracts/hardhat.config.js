require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",

  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",

      // El chain ID por defecto de Ganache es 1337.
      // Si el despliegue falla, abrir Ganache → Settings → Server y verificar el Chain ID indicado.
      chainId: 1337,

      // Asignar a la variable de entorno GANACHE_PRIVATE_KEY una de las claves privadas
      // mostradas en la pestaña "Accounts" de Ganache (la clave 0x..., no la dirección).
      accounts: process.env.GANACHE_PRIVATE_KEY ? [process.env.GANACHE_PRIVATE_KEY] : [],
    },
  },
};
