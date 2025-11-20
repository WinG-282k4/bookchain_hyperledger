const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

// Khai bao bien USER_NAME
const USER_NAME = "sv102220126";

async function registerUser() {
    try {
        // Load connection profile
        const ccpPath = path.resolve('/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if user already exists - su dung bien USER_NAME
        const userIdentity = await wallet.get(USER_NAME);
        if (userIdentity) {
            console.log(`User "${USER_NAME}" already exists in wallet`);
            return;
        }

        // Check if admin exists
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Admin identity not found. Run enrollAdmin.js first!');
            return;
        }

        // Create CA client
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Get admin identity
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register user - su dung bien USER_NAME
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: USER_NAME,
            role: 'client'
        }, adminUser);

        // Enroll user - su dung bien USER_NAME
        const enrollment = await ca.enroll({
            enrollmentID: USER_NAME,
            enrollmentSecret: secret
        });

        // Create identity and add to wallet - su dung bien USER_NAME
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put(USER_NAME, x509Identity);
        console.log(`Successfully registered and enrolled user "${USER_NAME}"`);

    } catch (error) {
        console.error(`Failed to register user: ${error}`);
        process.exit(1);
    }
}

registerUser();
