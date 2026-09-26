const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const msgpack = require('msgpack-lite');
const ResourceDecryptor = require('./resource-decryptor');
const uuid = require('uuid');

// ─── Config ────────────────────────────────────────────────────────────────

let server_url;
let download_streams;
let download_only_streams;
let cfx_token;       // optional: CFX ticket from config.json

axios.defaults.timeout = 0;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Generate a random 64-bit unsigned integer as string (like the real FiveM client does) */
function generateGuid() {
    const hi = Math.floor(Math.random() * 0xFFFFFFFF);
    const lo = Math.floor(Math.random() * 0xFFFFFFFF);
    return (BigInt(hi) * BigInt(0x100000000) + BigInt(lo)).toString();
}

/** Parse response — FiveM can return JSON or msgpack */
function parseResponse(data, contentType = '') {
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
        // Try msgpack first if it looks binary, fallback to JSON
        try {
            const decoded = msgpack.decode(data);
            if (decoded && typeof decoded === 'object') return decoded;
        } catch (_) {}
        try {
            return JSON.parse(data.toString('utf8'));
        } catch (_) {}
        return null;
    }
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch (_) { return null; }
}

// ─── Config loader ─────────────────────────────────────────────────────────

const load_config = async () => {
    const config = JSON.parse(await fs.readFile('./config.json', 'utf8'));

    server_url          = config.server_url.replace(/\/$/, '');
    download_streams    = config.save_streams;
    download_only_streams = config.save_only_streams;
    cfx_token           = config.cfx_token || null;   // optional

    console.log(`[+] Starting to dump ${server_url}`);
    if (cfx_token) console.log(`[+] CFX token loaded from config`);
};

// ─── CFX ticket exchange ───────────────────────────────────────────────────

/**
 * Exchange a Rockstar/Steam token for a FiveM entitlement ticket.
 * Requires cfx_token (Rockstar auth token) in config.json.
 * This replicates what the FiveM client does before connecting.
 */
async function get_cfx_ticket(guid) {
    if (!cfx_token) return null;

    console.log(`[*] Attempting CFX ticket exchange...`);

    try {
        const res = await axios.post(
            'https://lambda.fivem.net/api/ticket/create',
            new URLSearchParams({
                token:     cfx_token,
                guid:      guid,
                server_url: server_url,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent':   'CitizenFX/1',
                },
                httpsAgent,
                timeout: 15000,
            }
        );

        const data = parseResponse(res.data);
        if (data && data.ticket) {
            console.log(`[+] CFX ticket obtained successfully`);
            return data.ticket;
        }

        console.log(`[!] Ticket exchange response: ${JSON.stringify(data)}`);
        return null;
    } catch (err) {
        console.log(`[!] CFX ticket exchange failed: ${err.message}`);
        return null;
    }
}

// ─── getConfiguration ──────────────────────────────────────────────────────

/**
 * POST /client with method=getConfiguration
 * Tries without ticket first, then with ticket if available.
 */
async function get_configuration() {
    const guid   = generateGuid();
    const ticket = await get_cfx_ticket(guid);

    const attempts = [];

    // Build attempts: with ticket (if we have one) then without
    if (ticket) {
        attempts.push({ label: 'with CFX ticket', body: `method=getConfiguration&guid=${guid}&token=${ticket}` });
    }
    attempts.push({ label: 'without ticket (guid only)', body: `method=getConfiguration&guid=${guid}` });
    attempts.push({ label: 'bare method', body: `method=getConfiguration` });

    for (const attempt of attempts) {
        console.log(`[*] Trying ${attempt.label}...`);

        try {
            const res = await axios.post(
                `${server_url}/client`,
                attempt.body,
                {
                    headers: {
                        'User-Agent':   'CitizenFX/1',
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    responseType: 'arraybuffer',
                    httpsAgent,
                    timeout: 15000,
                }
            );

            const parsed = parseResponse(res.data, res.headers['content-type']);

            if (!parsed) {
                console.log(`[!] Could not parse server response`);
                continue;
            }

            if (parsed.error) {
                console.log(`[!] Server rejected (${attempt.label}): ${parsed.error}`);
                continue;
            }

            // Success!
            const resources = parsed.resources || parsed.Resources || [];
            if (resources.length > 0) {
                console.log(`[+] Got configuration! Found ${resources.length} resources.`);
                return { data: parsed, ok: true };
            } else {
                console.log(`[!] Response OK but resources list is empty.`);
                console.log(`    Response keys: ${Object.keys(parsed).join(', ')}`);
                // Still return it — maybe resources are under a different key
                return { data: parsed, ok: true };
            }

        } catch (err) {
            console.log(`[!] Request failed (${attempt.label}): ${err.message}`);
        }
    }

    console.log(`\n[✗] All attempts failed. The server requires a valid FiveM session ticket.`);
    console.log(`    → Add "cfx_token" to config.json with your Rockstar auth token.`);
    console.log(`    → You can capture it with Fiddler/mitmproxy while launching FiveM.`);
    return { data: null, ok: false };
}

// ─── File downloader ───────────────────────────────────────────────────────

async function download_file_buffer(url, outputPath) {
    const response = await axios({
        method:       'GET',
        url,
        httpsAgent,
        headers:      { 'User-Agent': 'CitizenFX/1' },
        responseType: 'arraybuffer',
        timeout:      0,
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.data);

    return outputPath;
}

// ─── Main ──────────────────────────────────────────────────────────────────

(async () => {
    await load_config();

    const configuration = await get_configuration();
    if (!configuration.ok) return;

    const data = configuration.data;

    // Resources may be under different keys depending on the server version
    const resources = data.resources || data.Resources || [];

    if (resources.length === 0) {
        console.log(`[!] No resources found in server response.`);
        console.log(`    Available keys in response: ${Object.keys(data).join(', ')}`);
        return;
    }

    console.log(`\n[+] Dumping ${resources.length} resources...\n`);

    const server_folder_name = server_url.replace(/[^\w.-]/g, '_');
    let success_count = 0;
    let fail_count = 0;

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const prefix = `[${i + 1}/${resources.length}]`;

        try {
            console.log(`${prefix} Processing: ${resource.name}`);

            const decryptor = new ResourceDecryptor();

            // Extract URI key (v3# format)
            const uri_b64 = resource.uri
                ? resource.uri.split('v3#')[1]
                : null;

            // ── Download & decrypt resource.rpf ──
            if (!download_only_streams) {
                if (!uri_b64) {
                    console.log(`${prefix}   [!] No URI found for ${resource.name}, skipping RPF`);
                } else {
                    const hash = resource.files && resource.files['resource.rpf'];

                    let rpf_url;
                    if (resource.fileServer) {
                        rpf_url = `${resource.fileServer}/${resource.name}/resource.rpf${hash ? `?hash=${hash}` : ''}`;
                    } else {
                        rpf_url = `${server_url}/files/${resource.name}/resource.rpf${hash ? `?hash=${hash}` : ''}`;
                    }

                    const tmp_path = `./tmp/${uuid.v7()}.tmp`;

                    await download_file_buffer(rpf_url, tmp_path);
                    await decryptor.decryptAndDump(uri_b64, tmp_path, `./${server_folder_name}/${resource.name}`);
                    await fs.unlink(tmp_path).catch(() => {});
                }
            }

            // ── Download stream files ──
            if (resource.streamFiles && (download_streams || download_only_streams)) {
                for (const [fileName, fileData] of Object.entries(resource.streamFiles)) {
                    const stream_url = resource.fileServer
                        ? `${resource.fileServer}/${resource.name}/${fileName}?hash=${fileData.hash}`
                        : `${server_url}/files/${resource.name}/${fileName}?hash=${fileData.hash}`;

                    const tmp_path = `./tmp/${uuid.v7()}.tmp`;
                    const out_dir  = `./${server_folder_name}/${resource.name}/stream`;

                    await fs.mkdir(out_dir, { recursive: true });
                    await download_file_buffer(stream_url, tmp_path);

                    if (uri_b64) {
                        await decryptor.decryptResource(uri_b64, tmp_path, `${out_dir}/${fileName}`, fileName);
                    } else {
                        // No encryption key — save raw
                        await fs.copyFile(tmp_path, `${out_dir}/${fileName}`);
                    }

                    await fs.unlink(tmp_path).catch(() => {});
                }
            }

            console.log(`${prefix} ✓ Done: ${resource.name}`);
            success_count++;

        } catch (err) {
            console.error(`${prefix} ✗ Failed: ${resource.name} — ${err.message}`);
            fail_count++;
        }
    }

    console.log(`\n[+] Finished! ${success_count} ok, ${fail_count} failed.`);
    console.log(`[+] Output folder: ./${server_url.replace(/[^\w.-]/g, '_')}/`);
})();