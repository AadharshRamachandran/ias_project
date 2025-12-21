/* eslint-disable no-undef */
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const { API_URL, PRIVATE_KEY } = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
// Build networks object conditionally so running a local node doesn't require
// external env vars (API_URL/PRIVATE_KEY) to be present.
const networks = {};
if (API_URL && PRIVATE_KEY) {
  networks.mumbai = {
    url: API_URL,
    accounts: [`0x${PRIVATE_KEY}`],
  };
}

module.exports = {
  solidity: "0.8.9",
  networks,
  paths: {
    artifacts: "./src/components/artifacts",
  },
};