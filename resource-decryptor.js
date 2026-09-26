const crypto = require('crypto');
const fs = require('fs');
const chacha20 = require('chacha20');
const RagePackfile = require('./rpf.js');
const path = require('path');
const uuid = require('uuid')

class ResourceDecryptor {
    constructor() {
        this.FILE_NAME = "resource.rpf";
    }

    xorDecrypt(encryptedData, key = 0x69) {
        const cleanHex = encryptedData.replaceAll(" ", "");
        const data = Buffer.from(cleanHex, 'hex');
        return Buffer.from(data.map(byte => byte ^ key));
    }

    processResourceUri(resourceUri) {
        const raw = Buffer.from(resourceUri, 'base64');
        const offset = 19;
        const remaining = raw.slice(offset);

        const iv = remaining.slice(remaining.length - 8, remaining.length);
        let key = remaining.slice(0, remaining.length - 8);

        key = this.xorDecrypt(key.toString('hex'));
        key = key.slice(0, key.length - 2);

        return {
            key: key.toString('hex'),
            iv: iv.toString('hex')
        };
    }

    calculateChaChaKey(key, fileName = null) {
        const key_raw = Buffer.from(key, 'hex');
        const hmac = crypto.createHmac('sha256', key_raw);

        hmac.update(fileName || this.FILE_NAME);
        const result = hmac.digest('hex');

        return result;
    }

    async dumpToFolder(folderName, filePath) {
        const rpf = new RagePackfile();
        const outputDirectory = `./${folderName}`;

        if (await rpf.openArchive(filePath)) {
            const allFiles = rpf.getAllFiles('/');

            for (const filePath of allFiles) {
                const content = await rpf.readFile(filePath);
                if (content) {
                    const fullPath = path.join(outputDirectory, filePath);
                    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.promises.writeFile(fullPath, content);
                }
            }

            await rpf.close();
            return true;
        } else {
            console.log("[!] Failed to open archive.");
            return false;
        }
    }

    async decryptAndDump(resourceUri, encryptedRPF, outputFolder, customFileName = null) {

        try {
            const resourceUriResult = this.processResourceUri(resourceUri);

            const chachaKey = this.calculateChaChaKey(resourceUriResult.key, customFileName);

            const key = chachaKey;
            const iv = resourceUriResult.iv;
            
            const encryptedContent = await fs.promises.readFile(encryptedRPF)

            const decrypted = chacha20.decrypt(Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'), encryptedContent);

            const tmpDir = "./tmp";
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const decryptedFilePath = "./tmp/" + uuid.v7() + "-dec.tmp";

            await fs.promises.writeFile(decryptedFilePath, decrypted);

            await this.dumpToFolder(outputFolder, decryptedFilePath);

            try {
                await fs.promises.unlink(decryptedFilePath);
            } catch (cleanupError) {
                console.warn(`[-] Could not clean up temporary file: ${cleanupError.message}`);
            }

            return {
                success: true,
                decryptedFile: decryptedFilePath,
                outputFolder: outputFolder
            };

        } catch (error) {
            console.error('[!] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async decryptResource(resourceUri, targetFile, outputFile = null, customFileName = null) {
        try {
            const resourceUriResult = this.processResourceUri(resourceUri);
            const chachaKey = this.calculateChaChaKey(resourceUriResult.key, customFileName);

            const ciphertext = fs.readFileSync(targetFile);
            const decrypted = chacha20.decrypt(
                Buffer.from(chachaKey, 'hex'),
                Buffer.from(resourceUriResult.iv, 'hex'),
                ciphertext
            );

            const outputPath = outputFile || targetFile + ".decrypted";
            fs.writeFileSync(outputPath, decrypted);

            return {
                success: true,
                outputPath: outputPath,
                decryptedSize: decrypted.length
            };

        } catch (error) {
            console.error('Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async dumpDecryptedFile(decryptedFilePath, outputFolder) {
        return await this.dumpToFolder(outputFolder, decryptedFilePath);
    }
}


module.exports = ResourceDecryptor;
