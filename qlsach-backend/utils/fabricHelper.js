const { Wallets, Gateway } = require("fabric-network");
const path = require("path");
const fs = require("fs");

const ccpPath = path.resolve(
  "/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
);
let ccp = {};
try {
  ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
} catch (e) {
  console.warn("Could not load CCP from", ccpPath);
}

const GUEST_FABRIC_ID = process.env.GUEST_FABRIC_ID || "sv102220126";

async function connectToNetwork(fabricId) {
  try {
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get(fabricId);
    if (!identity) {
      throw new Error(
        `User identity ${fabricId} not found in wallet. Run registerUser.js!`
      );
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: fabricId,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("qlsach");
    return { gateway, contract };
  } catch (err) {
    console.error("connectToNetwork error", err);
    throw err;
  }
}

module.exports = { connectToNetwork, GUEST_FABRIC_ID };
